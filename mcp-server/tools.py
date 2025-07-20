import smtplib
from email.mime.text import MIMEText
from typing import Any, Dict, List
import openai
import json
from datetime import datetime

# --- Tool: Send Invite ---
class SendInviteTool:
    name = "send_invite"
    description = """
    Send a wedding invitation to a guest.
    Input: { "email": "guest@example.com", "name": "Guest Name" }
    Output: { "success": true, "message": "Invitation sent!" }
    When to use: When a user asks to invite someone.
    Example: "Invite John to my wedding"
    """
    def __init__(self, smtp_user, smtp_pass, db=None):
        self.smtp_host = "smtp.gmail.com"
        self.smtp_port = 465
        self.smtp_user = smtp_user
        self.smtp_pass = smtp_pass
        self.db = db  # Add db reference for adding guest
    async def run(self, input: Dict[str, Any]) -> Dict[str, Any]:
        try:
            msg = MIMEText(f"""
                Dear {input.get('name', 'Guest')},
                You are cordially invited to our wedding!
                Please RSVP at your earliest convenience.
                Best regards,
                The Happy Couple
            """, 'plain')
            msg['Subject'] = 'You are invited to our wedding!'
            msg['From'] = self.smtp_user
            msg['To'] = input['email']
            # SMTP is blocking, so run in thread
            import asyncio
            loop = asyncio.get_event_loop()
            def send_email():
                with smtplib.SMTP_SSL(self.smtp_host, self.smtp_port) as server:
                    server.login(self.smtp_user, self.smtp_pass)
                    server.send_message(msg)
            await loop.run_in_executor(None, send_email)
            # Add guest to DB after sending invite
            if self.db:
                await self.db.add_guest(input.get('name', input['email']), input['email'])
            return {"success": True, "message": f"Invitation sent to {input['email']}"}
        except Exception as e:
            return {"success": False, "message": f"Failed to send invitation: {e}"}

# --- Tool: Update RSVP ---
class UpdateRSVPTool:
    name = "update_rsvp"
    description = """
    Update a guest's RSVP status.
    Input: { "email": "guest@example.com", "rsvp": "yes|no|maybe" }
    Output: { "success": true, "message": "RSVP updated!" }
    When to use: When a user wants to update a guest's RSVP.
    Example: "Update John Smith's RSVP to yes"
    """
    def __init__(self, db):
        self.db = db
    async def run(self, input: Dict[str, Any]) -> Dict[str, Any]:
        try:
            guest = await self.db.update_guest_rsvp(input['email'], input['rsvp'])
            if guest:
                return {"success": True, "message": f"RSVP updated for {input['email']}"}
            else:
                return {"success": False, "message": f"Guest not found: {input['email']}"}
        except Exception as e:
            return {"success": False, "message": f"Failed to update RSVP: {e}"}

# --- Tool: List Guests ---
class ListGuestsTool:
    name = "list_guests"
    description = """
    List all guests, optionally filtered by RSVP status.
    Input: { "rsvp_filter": "yes|no|maybe|unknown|null" }
    Output: { "guests": [ {"name": ..., "email": ..., "rsvp": ...} ] }
    When to use: When a user wants to see the guest list.
    Example: "Show me all my guests"
    """
    def __init__(self, db):
        self.db = db
    async def run(self, input: Dict[str, Any]) -> Dict[str, Any]:
        print("ListGuestsTool called with input:", input)
        try:
            rsvp = input.get('rsvp_filter')
            if rsvp:
                guests = await self.db.get_guests_by_rsvp(rsvp)
            else:
                guests = await self.db.get_all_guests()
            # Limit to 10 guests for demo
            guests = guests[:10]
            result = {"guests": guests}
            print("ListGuestsTool returning:", result)
            return result
        except Exception as e:
            print("ListGuestsTool error:", e)
            return {"guests": [], "error": str(e)}

# --- Tool: Follow Up ---
class FollowUpTool:
    name = "follow_up"
    description = """
    Send follow-up emails to all guests with RSVP 'maybe'.
    Input: { }
    Output: { "success": true, "message": "Follow-up emails sent!" }
    When to use: When a user wants to remind 'maybe' guests.
    Example: "Send follow-up emails to maybe responses"
    """
    def __init__(self, db, email_service):
        self.db = db
        self.email_service = email_service
    async def run(self, input: Dict[str, Any]) -> Dict[str, Any]:
        try:
            maybe_guests = await self.db.get_maybe_guests()
            for guest in maybe_guests:
                await self.email_service.send_follow_up(guest['email'], guest['name'])
            return {"success": True, "message": f"Follow-up emails sent to {len(maybe_guests)} guests"}
        except Exception as e:
            return {"success": False, "message": f"Failed to send follow-ups: {e}"}

# --- Tool: Process Email Response ---
class ProcessEmailResponseTool:
    name = "process_email_response"
    description = """
    Analyze an email response and update RSVP if it contains RSVP information.
    Input: { "sender_email": "guest@example.com", "email_content": "..." }
    Output: { "success": true, "message": "RSVP updated!" }
    When to use: When a guest replies to an invitation.
    Example: "Process RSVP from guest@example.com"
    """
    def __init__(self, db, openai_api_key):
        self.db = db
        self.openai_client = openai.AsyncOpenAI(api_key=openai_api_key)
    async def run(self, input: Dict[str, Any]) -> Dict[str, Any]:
        try:
            prompt = f"""
            Analyze this email response for RSVP information:
            Email content: {input['email_content']}
            Determine if this contains an RSVP response. Look for:
            - "Yes, I'll come", "I'll be there", "Count me in" → RSVP: yes
            - "No, I can't make it", "I won't be able to attend" → RSVP: no  
            - "Maybe", "I'll let you know", "I'm not sure" → RSVP: maybe
            - No RSVP content → RSVP: null
            Respond with JSON:
            {{
              "rsvp_status": "yes|no|maybe|null",
              "confidence": 0.0-1.0,
              "reasoning": "brief explanation"
            }}
            """
            response = await self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            result = json.loads(response.choices[0].message.content)
            if result.get('rsvp_status') and result.get('confidence', 0) > 0.7:
                # Ensure guest exists before updating RSVP
                guest = await self.db.get_guest_by_email(input['sender_email'])
                if not guest:
                    await self.db.add_guest(input['sender_email'], input['sender_email'])
                await self.db.update_guest_rsvp(input['sender_email'], result['rsvp_status'])
                return {"success": True, "message": f"RSVP updated to {result['rsvp_status']}"}
            else:
                return {"success": False, "message": f"Low confidence or no RSVP found: {result}"}
        except Exception as e:
            return {"success": False, "message": f"Failed to process email: {e}"}

# --- Tool Registry ---
class ToolRegistry:
    def __init__(self, db, email_service, smtp_user, smtp_pass, openai_api_key):
        self.tools = [
            SendInviteTool(smtp_user, smtp_pass, db),
            UpdateRSVPTool(db),
            ListGuestsTool(db),
            FollowUpTool(db, email_service),
            ProcessEmailResponseTool(db, openai_api_key),
        ]
    def get_tools(self) -> List[Any]:
        return self.tools
    def get_tool_by_name(self, name: str):
        for tool in self.tools:
            if tool.name == name:
                return tool
        return None 