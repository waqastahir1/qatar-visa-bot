"""
CAPTCHA Handler — Manual Resolution Strategy

No paid API is used. When CAPTCHA is detected on the QVC website:
  1. An email alert is sent to notify you
  2. The bot pauses and waits for you to solve it manually in the browser window
  3. After the wait period, the bot continues

This is reliable because the browser runs in headed (visible) mode,
so you can always see and interact with it when needed.
"""

import asyncio
from typing import Optional


class CaptchaHandler:
    def __init__(self, wait_seconds: int = 60, on_log=None):
        """
        wait_seconds: how long to pause for manual CAPTCHA solving
        on_log: logging callback from BotEngine
        """
        self.wait_seconds = wait_seconds
        self.on_log = on_log

    def _log(self, message: str, level: str = "WARNING"):
        if self.on_log:
            self.on_log(message, level, None)

    async def wait_for_manual_solve(self):
        """
        Pauses the bot and counts down, giving the user time
        to manually solve the CAPTCHA in the visible browser window.
        """
        self._log(
            f"CAPTCHA detected! Please solve it in the browser. "
            f"Bot paused for {self.wait_seconds} seconds...",
            "WARNING",
        )

        for remaining in range(self.wait_seconds, 0, -10):
            if remaining % 10 == 0:
                self._log(f"Waiting for CAPTCHA... {remaining}s remaining", "WARNING")
            await asyncio.sleep(min(10, remaining))

        self._log("Resuming after CAPTCHA wait.", "INFO")
