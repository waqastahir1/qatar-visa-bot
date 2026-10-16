from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./qatar_bot.db"

    TRUECAPTCHA_USER: str = ""
    TRUECAPTCHA_KEY: str = ""

    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""

    QVC_URL: str = "https://www.qatarvisacenter.com"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
