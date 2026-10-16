"""
Gmail Email Notifier — uses Python's built-in smtplib (no extra packages needed).

Setup for the user:
  1. Go to your Google Account → Security → 2-Step Verification (enable it)
  2. Go to Google Account → Security → App Passwords
  3. Create an App Password for "Mail"
  4. Use that 16-character code as your Gmail App Password in Settings
  5. The sender and recipient can be the same Gmail address
"""

import smtplib
import ssl
import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
from typing import Optional


class GmailNotifier:
    SMTP_HOST = "smtp.gmail.com"
    SMTP_PORT = 465

    def __init__(self, sender_email: str, app_password: str, recipient_email: str):
        self.sender = sender_email
        self.password = app_password
        self.recipient = recipient_email

    def _build_email(self, subject: str, html_body: str) -> MIMEMultipart:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"Qatar Visa Bot <{self.sender}>"
        msg["To"] = self.recipient
        msg["Subject"] = subject
        msg.attach(MIMEText(html_body, "html"))
        return msg

    def _send_sync(self, subject: str, html_body: str) -> bool:
        """Synchronous send — called via asyncio.to_thread to avoid blocking."""
        try:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(self.SMTP_HOST, self.SMTP_PORT, context=context) as server:
                server.login(self.sender, self.password)
                msg = self._build_email(subject, html_body)
                server.sendmail(self.sender, self.recipient, msg.as_string())
            return True
        except smtplib.SMTPAuthenticationError:
            print("[EMAIL] Authentication failed. Check your Gmail App Password.")
            return False
        except Exception as e:
            print(f"[EMAIL] Failed to send: {e}")
            return False

    async def send(self, subject: str, html_body: str) -> bool:
        """Non-blocking send using a thread."""
        if not self.sender or not self.password or not self.recipient:
            return False
        return await asyncio.to_thread(self._send_sync, subject, html_body)

    # ─── Template Methods ────────────────────────────────────────────

    async def send_bot_started(self) -> bool:
        return await self.send(
            subject="Qatar Visa Bot Started",
            html_body=self._template(
                title="Bot Started",
                color="#3b82f6",
                body="Your Qatar Visa Center appointment bot has started monitoring slots.",
            ),
        )

    async def send_bot_stopped(self) -> bool:
        return await self.send(
            subject="Qatar Visa Bot Stopped",
            html_body=self._template(
                title="Bot Stopped",
                color="#6b7280",
                body="Your Qatar Visa Center appointment bot has been stopped.",
            ),
        )

    async def send_slot_found(self, date: str, time: str) -> bool:
        return await self.send(
            subject=f"Slot Found! {date} at {time} — Qatar Visa Bot",
            html_body=self._template(
                title="Appointment Slot Found!",
                color="#10b981",
                body=f"""
                    <p>An available slot was detected on the Qatar Visa Center website.</p>
                    <table style="margin:16px 0;border-collapse:collapse;">
                        <tr><td style="padding:6px 16px 6px 0;color:#6b7280;font-weight:600;">Date</td>
                            <td style="padding:6px 0;font-weight:700;color:#111827;">{date}</td></tr>
                        <tr><td style="padding:6px 16px 6px 0;color:#6b7280;font-weight:600;">Time</td>
                            <td style="padding:6px 0;font-weight:700;color:#111827;">{time}</td></tr>
                    </table>
                    <p>The bot is attempting to book this slot automatically.</p>
                """,
            ),
        )

    async def send_booking_success(
        self, client_name: str, passport: str, date: str, time: str
    ) -> bool:
        return await self.send(
            subject=f"Appointment Booked! {client_name} — {date}",
            html_body=self._template(
                title="Appointment Confirmed!",
                color="#10b981",
                body=f"""
                    <p>An appointment has been successfully booked at Qatar Visa Center.</p>
                    <table style="margin:16px 0;border-collapse:collapse;">
                        <tr><td style="padding:6px 16px 6px 0;color:#6b7280;font-weight:600;">Client</td>
                            <td style="padding:6px 0;font-weight:700;color:#111827;">{client_name}</td></tr>
                        <tr><td style="padding:6px 16px 6px 0;color:#6b7280;font-weight:600;">Passport</td>
                            <td style="padding:6px 0;font-weight:700;color:#111827;">{passport}</td></tr>
                        <tr><td style="padding:6px 16px 6px 0;color:#6b7280;font-weight:600;">Date</td>
                            <td style="padding:6px 0;font-weight:700;color:#111827;">{date}</td></tr>
                        <tr><td style="padding:6px 16px 6px 0;color:#6b7280;font-weight:600;">Time</td>
                            <td style="padding:6px 0;font-weight:700;color:#111827;">{time}</td></tr>
                    </table>
                    <p style="color:#6b7280;font-size:13px;">Please log in to Qatar Visa Center to confirm and download your appointment letter.</p>
                """,
            ),
        )

    async def send_captcha_alert(self) -> bool:
        return await self.send(
            subject="Action Required — CAPTCHA Detected",
            html_body=self._template(
                title="CAPTCHA Detected",
                color="#f59e0b",
                body="""
                    <p>The Qatar Visa Center bot has detected a CAPTCHA challenge.</p>
                    <p>Please open the browser window and solve the CAPTCHA manually.
                    The bot has been paused and will resume automatically after waiting.</p>
                """,
            ),
        )

    async def send_booking_failed(self, client_name: str, reason: str) -> bool:
        return await self.send(
            subject=f"Booking Failed — {client_name}",
            html_body=self._template(
                title="Booking Failed",
                color="#ef4444",
                body=f"""
                    <p>An attempt to book an appointment for <strong>{client_name}</strong> has failed.</p>
                    <p style="color:#6b7280;">Reason: {reason}</p>
                    <p>The bot will continue monitoring and retry when another slot appears.</p>
                """,
            ),
        )

    # ─── HTML Template ────────────────────────────────────────────────

    def _template(self, title: str, color: str, body: str) -> str:
        now = datetime.now().strftime("%d %b %Y, %I:%M %p")
        return f"""
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
          <div style="max-width:520px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            <div style="background:{color};padding:28px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">{title}</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Qatar Visa Bot • {now}</p>
            </div>
            <div style="padding:28px 32px;color:#374151;font-size:15px;line-height:1.6;">
              {body}
            </div>
            <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">This is an automated message from Qatar Visa Bot.</p>
            </div>
          </div>
        </body>
        </html>
        """
