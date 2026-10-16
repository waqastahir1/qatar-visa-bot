from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from models import Base, BotSetting
from config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed default settings if not present
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        defaults = {
            "bot_running":          "false",
            "start_date":           "",
            "end_date":             "",
            "check_interval":       "60",
            "months_to_monitor":    "2",
            "stealth_mode":         "true",
            "sound_enabled":        "true",
            "auto_book":            "true",
            "auto_click_next":      "true",
            "auto_click_confirm":   "true",
            "captcha_wait_seconds": "60",
            "qvc_email":            "",
            "qvc_password":         "",
            # Gmail notification settings
            "email_enabled":        "false",
            "gmail_sender":         "",
            "gmail_app_password":   "",
            "gmail_recipient":      "",
        }
        for key, value in defaults.items():
            result = await session.execute(
                select(BotSetting).where(BotSetting.key == key)
            )
            existing = result.scalar_one_or_none()
            if not existing:
                session.add(BotSetting(key=key, value=value))
        await session.commit()
