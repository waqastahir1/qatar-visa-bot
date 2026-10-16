"""
Qatar Visa Center Bot - FastAPI Backend
Run with: uvicorn main:app --reload --port 8000
"""

import asyncio
import json
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from database import get_db, init_db
from models import Client, BotLog, BotSetting
from bot import BotEngine


app = FastAPI(title="Qatar Visa Bot API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow web app, Electron desktop app, and any local origin
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── WebSocket Connection Manager ───────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, data: dict):
        disconnected = []
        for ws in self.active:
            try:
                await ws.send_json(data)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            self.disconnect(ws)


manager = ConnectionManager()

# ─── Bot Engine ─────────────────────────────────────────────────────

bot_task: Optional[asyncio.Task] = None
bot_engine: Optional[BotEngine] = None


def make_bot_engine() -> BotEngine:
    def on_log(message: str, level: str, client_id: Optional[int]):
        asyncio.create_task(
            _save_and_broadcast_log(message, level, client_id)
        )

    def on_status_change(status: str):
        asyncio.create_task(
            manager.broadcast({"type": "status", "status": status})
        )

    return BotEngine(on_log=on_log, on_status_change=on_status_change)


async def _save_and_broadcast_log(message: str, level: str, client_id: Optional[int]):
    async with (await app.state.db_factory()) as session:
        log = BotLog(message=message, level=level, client_id=client_id)
        session.add(log)
        await session.commit()

    await manager.broadcast({
        "type": "log",
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "level": level,
        "message": message,
    })


# ─── Startup / Shutdown ─────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    await init_db()

    from database import AsyncSessionLocal
    app.state.db_factory = AsyncSessionLocal

    # Auto-start bot if it was running before (optional)


@app.on_event("shutdown")
async def shutdown():
    global bot_task, bot_engine
    if bot_engine and bot_engine.is_running:
        await bot_engine.stop()
    if bot_task:
        bot_task.cancel()


# ─── Pydantic Schemas ───────────────────────────────────────────────

class ClientCreate(BaseModel):
    name: str
    passport: str
    visa: str
    mobile: str
    email: str
    priority: str = "normal"
    is_active: bool = True


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    passport: Optional[str] = None
    visa: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    priority: Optional[str] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None


class SettingsUpdate(BaseModel):
    settings: dict


# ─── Client Endpoints ───────────────────────────────────────────────

@app.get("/api/clients")
async def get_clients(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Client).order_by(Client.created_at.desc()))
    clients = result.scalars().all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "passport": c.passport,
            "visa": c.visa,
            "mobile": c.mobile,
            "email": c.email,
            "priority": c.priority,
            "status": c.status,
            "booked_date": c.booked_date,
            "booked_time": c.booked_time,
            "is_active": c.is_active,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in clients
    ]


@app.post("/api/clients", status_code=201)
async def create_client(data: ClientCreate, db: AsyncSession = Depends(get_db)):
    client = Client(**data.dict())
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return {"id": client.id, "message": "Client added successfully"}


@app.put("/api/clients/{client_id}")
async def update_client(
    client_id: int,
    data: ClientUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    for field, value in data.dict(exclude_none=True).items():
        setattr(client, field, value)

    await db.commit()
    return {"message": "Client updated"}


@app.delete("/api/clients/{client_id}")
async def delete_client(client_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    await db.delete(client)
    await db.commit()
    return {"message": "Client deleted"}


# ─── Settings Endpoints ─────────────────────────────────────────────

@app.get("/api/settings")
async def get_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BotSetting))
    rows = result.scalars().all()
    return {row.key: row.value for row in rows}


@app.put("/api/settings")
async def update_settings(data: SettingsUpdate, db: AsyncSession = Depends(get_db)):
    for key, value in data.settings.items():
        result = await db.execute(select(BotSetting).where(BotSetting.key == key))
        setting = result.scalar_one_or_none()
        if setting:
            setting.value = str(value)
        else:
            db.add(BotSetting(key=key, value=str(value)))
    await db.commit()
    return {"message": "Settings saved"}


# ─── Bot Control Endpoints ──────────────────────────────────────────

@app.post("/api/bot/start")
async def start_bot(db: AsyncSession = Depends(get_db)):
    global bot_task, bot_engine

    if bot_engine and bot_engine.is_running:
        return {"message": "Bot is already running"}

    # Load settings from DB
    result = await db.execute(select(BotSetting))
    rows = result.scalars().all()
    settings = {row.key: row.value for row in rows}

    # Load active clients from DB
    c_result = await db.execute(
        select(Client).where(Client.is_active == True, Client.status != "booked")
    )
    clients = [
        {
            "id": c.id,
            "name": c.name,
            "passport": c.passport,
            "visa": c.visa,
            "mobile": c.mobile,
            "email": c.email,
            "priority": c.priority,
            "status": c.status,
            "is_active": c.is_active,
        }
        for c in c_result.scalars().all()
    ]

    if not clients:
        raise HTTPException(status_code=400, detail="No active clients found. Add clients first.")

    bot_engine = make_bot_engine()
    bot_task = asyncio.create_task(bot_engine.start(settings, clients))

    return {"message": "Bot started"}


@app.post("/api/bot/stop")
async def stop_bot():
    global bot_engine, bot_task
    if not bot_engine or not bot_engine.is_running:
        return {"message": "Bot is not running"}

    await bot_engine.stop()
    if bot_task:
        bot_task.cancel()
    return {"message": "Bot stopped"}


@app.get("/api/bot/status")
async def get_bot_status():
    global bot_engine
    if bot_engine and bot_engine.is_running:
        return {"status": "running"}
    return {"status": "stopped"}


# ─── Logs Endpoint ──────────────────────────────────────────────────

@app.get("/api/logs")
async def get_logs(limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(BotLog).order_by(BotLog.timestamp.desc()).limit(limit)
    )
    logs = result.scalars().all()
    return [
        {
            "id": l.id,
            "timestamp": l.timestamp.strftime("%H:%M:%S") if l.timestamp else "",
            "level": l.level,
            "message": l.message,
            "client_id": l.client_id,
        }
        for l in reversed(logs)
    ]


@app.delete("/api/logs")
async def clear_logs(db: AsyncSession = Depends(get_db)):
    await db.execute(delete(BotLog))
    await db.commit()
    return {"message": "Logs cleared"}


# ─── WebSocket ──────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send current bot status on connect
        status = "running" if (bot_engine and bot_engine.is_running) else "stopped"
        await websocket.send_json({"type": "status", "status": status})

        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
