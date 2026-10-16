"""
Qatar Visa Center - Appointment Bot Engine
Uses Playwright for browser automation.

NOTE ON SELECTORS:
  CSS selectors below are based on common QVC website patterns.
  If the site updates its HTML, update the SELECTORS dict accordingly.
  You can inspect selectors by opening DevTools (F12) on the QVC website.
"""

import asyncio
import json
import random
from datetime import datetime, date, timedelta
from typing import Optional, Callable, Dict, Any
from playwright.async_api import async_playwright, Page, Browser, BrowserContext

from captcha import CaptchaHandler
from email_notif import GmailNotifier


# ─── QVC Website Selectors ─────────────────────────────────────────
# Update these if the website changes its HTML structure
SELECTORS = {
    # Login page
    "login_email":        'input[type="email"], input[name="email"], #email',
    "login_password":     'input[type="password"], input[name="password"], #password',
    "login_button":       'button[type="submit"], input[type="submit"], .login-btn',

    # Appointment booking page
    "booking_menu":       'a[href*="appointment"], a[href*="booking"], .appointment-link',

    # Calendar
    "calendar_next_btn":  '.next-month, button[aria-label*="next"], .fc-next-button',
    "available_date":     '.available, .open, td.enabled:not(.disabled), [class*="available"]',
    "date_cell":          'td[data-date], .day:not(.disabled), .calendar-day',

    # Time slots
    "time_slot":          '.time-slot:not(.disabled), .slot-available, [class*="slot"]:not([class*="disabled"])',

    # Form fields
    "passport_input":     'input[name*="passport"], input[placeholder*="Passport"], #passport',
    "visa_input":         'input[name*="visa"], input[placeholder*="Visa"], #visa',
    "mobile_input":       'input[name*="mobile"], input[name*="phone"], input[type="tel"]',
    "email_input":        'input[name*="email"], input[type="email"]:not([name*="login"])',

    # CAPTCHA
    "captcha_image":      'img[src*="captcha"], .captcha img, #captcha-image',
    "captcha_input":      'input[name*="captcha"], input[placeholder*="captcha"], #captcha',

    # Navigation buttons
    "next_button":        'button:has-text("Next"), input[value="Next"], .btn-next',
    "confirm_button":     'button:has-text("Confirm"), button:has-text("Book"), .btn-confirm',
    "submit_button":      'button[type="submit"], input[type="submit"]',
}
# ────────────────────────────────────────────────────────────────────


class BotEngine:
    def __init__(
        self,
        on_log: Callable[[str, str, Optional[int]], None],
        on_status_change: Callable[[str], None],
    ):
        self.on_log = on_log                  # callback(message, level, client_id)
        self.on_status_change = on_status_change  # callback(status)

        self._running = False
        self._paused = False
        self._browser: Optional[Browser] = None
        self._context: Optional[BrowserContext] = None
        self._page: Optional[Page] = None
        self._playwright = None

        # Injected settings & clients (set before start)
        self.settings: Dict[str, str] = {}
        self.clients: list = []

        self.captcha_handler: Optional[CaptchaHandler] = None
        self.email: Optional[GmailNotifier] = None

    # ─── Public Control ─────────────────────────────────────────────

    async def start(self, settings: Dict[str, str], clients: list):
        if self._running:
            return
        self.settings = settings
        self.clients = clients
        self._setup_services()
        self._running = True
        self.on_status_change("running")
        self.log("Bot started", "INFO")

        if self.email:
            await self.email.send_bot_started()

        await self._run_loop()

    async def stop(self):
        self._running = False
        self.on_status_change("stopped")
        self.log("Bot stopped", "INFO")
        await self._close_browser()
        if self.email:
            await self.email.send_bot_stopped()

    @property
    def is_running(self) -> bool:
        return self._running

    # ─── Setup ──────────────────────────────────────────────────────

    def _setup_services(self):
        # CAPTCHA handler — manual wait strategy (no API key needed)
        wait_secs = int(self.settings.get("captcha_wait_seconds", "60"))
        self.captcha_handler = CaptchaHandler(wait_seconds=wait_secs, on_log=self.on_log)

        # Gmail notifier — only active if credentials are set
        gmail_sender = self.settings.get("gmail_sender", "")
        gmail_password = self.settings.get("gmail_app_password", "")
        gmail_recipient = self.settings.get("gmail_recipient", "")
        if (
            gmail_sender and gmail_password and gmail_recipient
            and self.settings.get("email_enabled") == "true"
        ):
            self.email = GmailNotifier(gmail_sender, gmail_password, gmail_recipient)

    # ─── Main Loop ──────────────────────────────────────────────────

    async def _run_loop(self):
        try:
            await self._launch_browser()
            await self._login()

            interval = int(self.settings.get("check_interval", "60"))

            while self._running:
                try:
                    await self._check_slots()
                except Exception as e:
                    self.log(f"Slot check error: {e}", "ERROR")
                    await self._try_recover()

                if not self._running:
                    break

                # Human-like delay with small random jitter
                jitter = random.randint(-5, 10)
                wait_time = max(30, interval + jitter)
                self.log(f"Waiting {wait_time}s before next check...", "INFO")
                await asyncio.sleep(wait_time)

        except asyncio.CancelledError:
            pass
        except Exception as e:
            self.log(f"Fatal bot error: {e}", "ERROR")
            self.on_status_change("error")
        finally:
            await self._close_browser()

    # ─── Browser ────────────────────────────────────────────────────

    async def _launch_browser(self):
        self.log("Launching browser...", "INFO")
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(
            headless=False,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-setuid-sandbox",
            ],
        )
        self._context = await self._browser.new_context(
            viewport={"width": 1366, "height": 768},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            java_script_enabled=True,
        )
        # Stealth: mask webdriver flag
        await self._context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )
        self._page = await self._context.new_page()
        self.log("Browser launched", "INFO")

    async def _close_browser(self):
        try:
            if self._page:
                await self._page.close()
            if self._context:
                await self._context.close()
            if self._browser:
                await self._browser.close()
            if self._playwright:
                await self._playwright.stop()
        except Exception:
            pass
        finally:
            self._page = None
            self._context = None
            self._browser = None
            self._playwright = None

    # ─── Login ──────────────────────────────────────────────────────

    async def _login(self):
        email = self.settings.get("qvc_email", "")
        password = self.settings.get("qvc_password", "")

        if not email or not password:
            self.log("No login credentials set. Please configure in Settings.", "ERROR")
            await self.stop()
            return

        qvc_url = self.settings.get("qvc_url", "https://www.qatarvisacenter.com")
        self.log(f"Navigating to {qvc_url}...", "INFO")
        await self._page.goto(qvc_url, wait_until="domcontentloaded")
        await self._human_delay(2, 3)

        self.log("Logging in...", "INFO")
        try:
            await self._page.fill(SELECTORS["login_email"], email)
            await self._human_delay(0.5, 1)
            await self._page.fill(SELECTORS["login_password"], password)
            await self._human_delay(0.5, 1)

            # Handle CAPTCHA if present at login
            await self._handle_captcha_if_present()

            await self._page.click(SELECTORS["login_button"])
            await self._page.wait_for_load_state("networkidle", timeout=15000)
            self.log("Login successful", "SUCCESS")
        except Exception as e:
            self.log(f"Login failed: {e}", "ERROR")
            raise

    # ─── Slot Checking ──────────────────────────────────────────────

    async def _check_slots(self):
        active_clients = [c for c in self.clients if c.get("is_active") and c.get("status") != "booked"]
        if not active_clients:
            self.log("No active clients to check for.", "WARNING")
            return

        self.log(f"Checking slots for {len(active_clients)} client(s)...", "INFO")

        try:
            await self._navigate_to_booking_page()
        except Exception as e:
            self.log(f"Could not navigate to booking page: {e}", "ERROR")
            return

        months = int(self.settings.get("months_to_monitor", "2"))
        start_date = self._parse_date(self.settings.get("start_date", ""))
        end_date = self._parse_date(self.settings.get("end_date", ""))

        for month_offset in range(months):
            if not self._running:
                return

            available_slot = await self._scan_current_month(start_date, end_date)

            if available_slot:
                slot_date, slot_time = available_slot
                self.log(f"SLOT FOUND: {slot_date} at {slot_time}", "SUCCESS")

                if self.email:
                    await self.email.send_slot_found(slot_date, slot_time)

                if self.settings.get("auto_book") == "true":
                    # Book for highest priority client first
                    urgent = [c for c in active_clients if c.get("priority") == "urgent"]
                    target = urgent[0] if urgent else active_clients[0]
                    await self._book_slot(target, slot_date, slot_time)
                    return

            # Navigate to next month
            if month_offset < months - 1:
                await self._navigate_next_month()
                nav_speed = int(self.settings.get("months_to_monitor", "2")) * 1000
                await asyncio.sleep(nav_speed / 1000)

    async def _navigate_to_booking_page(self):
        try:
            booking_link = await self._page.query_selector(SELECTORS["booking_menu"])
            if booking_link:
                await booking_link.click()
                await self._page.wait_for_load_state("networkidle", timeout=10000)
                await self._human_delay(1, 2)
        except Exception:
            pass

    async def _scan_current_month(
        self,
        start_date: Optional[date],
        end_date: Optional[date],
    ) -> Optional[tuple]:
        """Scan calendar for available slots in current month view."""
        try:
            await self._human_delay(1, 2)
            available_days = await self._page.query_selector_all(SELECTORS["available_date"])

            for day in available_days:
                day_text = await day.inner_text()
                day_text = day_text.strip()

                if not day_text or not day_text.isdigit():
                    continue

                # Get date attribute if available
                date_attr = await day.get_attribute("data-date")
                if date_attr:
                    try:
                        slot_date = datetime.strptime(date_attr, "%Y-%m-%d").date()
                    except Exception:
                        slot_date = None
                else:
                    slot_date = None

                # Filter by date range
                if start_date and end_date and slot_date:
                    if not (start_date <= slot_date <= end_date):
                        continue

                self.log(f"Found available day: {date_attr or day_text}", "INFO")

                # Click the day
                await day.click()
                await self._human_delay(1, 2)

                # Check for time slots
                time_slots = await self._page.query_selector_all(SELECTORS["time_slot"])
                if time_slots:
                    slot_el = time_slots[0]
                    slot_time = await slot_el.inner_text()
                    return (date_attr or day_text, slot_time.strip())

        except Exception as e:
            self.log(f"Scan error: {e}", "WARNING")

        return None

    async def _navigate_next_month(self):
        try:
            btn = await self._page.query_selector(SELECTORS["calendar_next_btn"])
            if btn:
                await btn.click()
                await self._human_delay(1, 2)
                self.log("Navigated to next month", "INFO")
        except Exception as e:
            self.log(f"Could not navigate next month: {e}", "WARNING")

    # ─── Booking ────────────────────────────────────────────────────

    async def _book_slot(self, client: Dict, slot_date: str, slot_time: str):
        self.log(f"Booking for {client['name']} on {slot_date} {slot_time}...", "INFO")
        try:
            # Click the time slot
            time_slots = await self._page.query_selector_all(SELECTORS["time_slot"])
            if time_slots:
                await time_slots[0].click()
                await self._human_delay(1, 2)

            auto_fill_speed = float(self.settings.get("auto_fill_speed", "1"))

            # Fill passport
            await self._safe_fill(SELECTORS["passport_input"], client["passport"], auto_fill_speed)
            # Fill visa
            await self._safe_fill(SELECTORS["visa_input"], client["visa"], auto_fill_speed)
            # Fill mobile
            await self._safe_fill(SELECTORS["mobile_input"], client["mobile"], auto_fill_speed)
            # Fill email
            await self._safe_fill(SELECTORS["email_input"], client["email"], auto_fill_speed)

            # Handle CAPTCHA
            await self._handle_captcha_if_present()

            # Click Next
            if self.settings.get("auto_click_next") == "true":
                await self._safe_click(SELECTORS["next_button"])
                await self._human_delay(2, 3)
                await self._handle_captcha_if_present()

            # Click Confirm
            if self.settings.get("auto_click_confirm") == "true":
                await self._safe_click(SELECTORS["confirm_button"])
                await self._page.wait_for_load_state("networkidle", timeout=15000)

            self.log(
                f"Booking CONFIRMED for {client['name']} on {slot_date} at {slot_time}",
                "SUCCESS",
                client.get("id"),
            )

            if self.email:
                await self.email.send_booking_success(
                    client["name"], client["passport"], slot_date, slot_time
                )

        except Exception as e:
            self.log(f"Booking failed for {client['name']}: {e}", "ERROR", client.get("id"))
            if self.email:
                await self.email.send_booking_failed(client["name"], str(e))

    # ─── CAPTCHA ────────────────────────────────────────────────────

    async def _handle_captcha_if_present(self):
        try:
            captcha_img = await self._page.query_selector(SELECTORS["captcha_image"])
            captcha_input = await self._page.query_selector(SELECTORS["captcha_input"])

            if not captcha_img or not captcha_input:
                return

            # Send email alert so user knows to look at the browser
            if self.email:
                await self.email.send_captcha_alert()

            # Pause and wait for manual solve in the visible browser window
            await self.captcha_handler.wait_for_manual_solve()

        except Exception:
            pass

    # ─── Recovery ───────────────────────────────────────────────────

    async def _try_recover(self):
        self.log("Attempting session recovery...", "WARNING")
        try:
            await self._page.reload(wait_until="domcontentloaded")
            await self._human_delay(2, 4)
            await self._login()
        except Exception as e:
            self.log(f"Recovery failed: {e}", "ERROR")

    # ─── Helpers ────────────────────────────────────────────────────

    async def _safe_fill(self, selector: str, value: str, delay: float = 1.0):
        try:
            el = await self._page.query_selector(selector)
            if el:
                await el.click()
                await asyncio.sleep(delay * 0.3)
                await el.fill(value)
                await asyncio.sleep(delay * 0.2)
        except Exception:
            pass

    async def _safe_click(self, selector: str):
        try:
            el = await self._page.query_selector(selector)
            if el:
                await el.click()
        except Exception:
            pass

    async def _human_delay(self, min_sec: float, max_sec: float):
        """Simulate human-like delay between actions."""
        stealth = self.settings.get("stealth_mode", "true") == "true"
        if stealth:
            await asyncio.sleep(random.uniform(min_sec, max_sec))
        else:
            await asyncio.sleep(min_sec)

    def _parse_date(self, date_str: str) -> Optional[date]:
        if not date_str:
            return None
        try:
            return datetime.strptime(date_str, "%Y-%m-%d").date()
        except Exception:
            return None

    def log(self, message: str, level: str = "INFO", client_id: Optional[int] = None):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
        self.on_log(message, level, client_id)
