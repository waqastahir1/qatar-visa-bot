# Qatar Visa Bot

Automated appointment slot monitor and booking assistant for Qatar Visa Center.

## Project Structure

```
Qatar Project/
├── backend/              ← FastAPI + Playwright bot engine
│   ├── main.py           ← API server & WebSocket
│   ├── bot.py            ← Browser automation engine
│   ├── captcha.py        ← TrueCaptcha integration
│   ├── telegram_notif.py ← Telegram alerts
│   ├── database.py       ← SQLite setup
│   ├── models.py         ← Database models
│   ├── config.py         ← App settings
│   ├── requirements.txt
│   └── .env              ← Your API keys (create from .env.example)
│
├── frontend/             ← Next.js Dashboard
│   ├── pages/
│   │   └── index.tsx     ← Main dashboard
│   └── components/
│       ├── ClientTable.tsx
│       ├── ClientModal.tsx
│       ├── BotControls.tsx
│       ├── LogViewer.tsx
│       ├── SettingsPanel.tsx
│       └── StatsCards.tsx
│
├── setup.bat             ← Run once for first-time setup
└── start.bat             ← Run to start the app
```

## First Time Setup

1. Make sure you have installed:
   - Python 3.11+
   - Node.js 18+
   - pip

2. Run setup (once only):
   ```
   setup.bat
   ```

3. Edit `backend/.env` with your credentials:
   ```
   TRUECAPTCHA_USER=your_username
   TRUECAPTCHA_KEY=your_api_key
   TELEGRAM_BOT_TOKEN=optional
   TELEGRAM_CHAT_ID=optional
   ```

## Running the App

```
start.bat
```

Then open: http://localhost:3000

## Usage

1. Open the dashboard at http://localhost:3000
2. Click the Settings gear icon → enter your QVC email/password + API keys
3. Set your date range for monitoring
4. Click "Add Client" → enter passport, visa ref, mobile, email
5. Click "Start Bot" → bot opens Chrome and begins monitoring
6. When a slot is found, it automatically books it and sends a Telegram alert

## Important Notes

- The bot uses **TrueCaptcha** (api.apitruecaptcha.org) for CAPTCHA solving — same service as your existing script
- Check interval is set to 60 seconds by default to avoid detection
- Stealth mode is ON by default (human-like delays)
- Browser runs in **headed mode** (visible) so you can monitor it
- If CAPTCHA fails, the bot waits 15 seconds for manual input

## Updating Selectors

If the QVC website updates its HTML, edit the `SELECTORS` dict in `backend/bot.py`.
Use F12 DevTools on the QVC website to find the correct CSS selectors.
