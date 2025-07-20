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
        if 'email' not in input or not input['email']:
            print("❌ send_invite called without an email!")
            return {"success": False, "message": "No email address provided for invitation."}
        try:
            # Always fetch the latest wedding details from DB right before sending
            details = await self.db.get_wedding_details() if self.db else {"couple_names": "", "wedding_date": "", "location": "", "time": ""}
            missing = []
            if not details.get('couple_names'):
                missing.append('couple names')
            if not details.get('wedding_date'):
                missing.append('wedding date')
            if not details.get('location'):
                missing.append('location')
            if not details.get('time'):
                missing.append('time')
            if missing:
                return {"success": False, "message": f"Please provide the following wedding details before sending invites: {', '.join(missing)}."}
            print(f"[SendInviteTool] Preparing to send invite to: {input['email']} (Name: {input.get('name', 'Guest')})")
            print(f"[SendInviteTool] Using SMTP user: {self.smtp_user}")
            print(f"[SendInviteTool] Wedding details: {details}")
            # Build a visually improved, colorful HTML email
            html_body = f"""
            <!DOCTYPE html>
            <html>
              <head>
                <link href='https://fonts.googleapis.com/css?family=Dancing+Script:700|Georgia:400,700&display=swap' rel='stylesheet'>
              </head>
              <body style=\"background: linear-gradient(135deg, #fdf6f0 0%, #ffe5ec 100%); padding: 40px 0;\">
                <table align=\"center\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width: 520px; background: #fff; border-radius: 18px; box-shadow: 0 4px 24px rgba(181,131,141,0.10); font-family: 'Georgia', serif;\">
                  <tr>
                    <!-- Floral banner removed -->
                  </tr>
                  <tr>
                    <td style=\"padding: 0 32px 32px 32px; text-align: center;\">
                      <h2 style=\"color: #22223b; font-size: 2em; margin: 16px 0 0 0; font-weight: 700;\">You're Invited!</h2>
                      <div style=\"color: #6d6875; font-size: 1.2em; margin-bottom: 0.5em;\">to the wedding of</div>
                      <div style=\"font-family: 'Dancing Script', cursive; color: #b5838d; font-size: 2.5em; font-weight: 700; margin-bottom: 18px;\">{details['couple_names']}</div>
                      <p style=\"color: #22223b; font-size: 1.1em; margin-bottom: 0.5em;\">Dear {input.get('name', 'Guest')},</p>
                      <p style=\"color: #7c2d6a; font-size: 1.15em; margin-bottom: 1.5em; font-weight: 500;\">We would be honored by your presence on our special day.</p>
                      <table align=\"center\" style=\"margin: 0 auto 24px auto;\">
                        <tr>
                          <td style=\"padding: 8px 0; font-size: 1.1em;\">
                            <span style=\"font-size: 1.2em;\">📅</span> <strong>Date:</strong> {details['wedding_date']}
                          </td>
                        </tr>
                        <tr>
                          <td style=\"padding: 8px 0; font-size: 1.1em;\">
                            <span style=\"font-size: 1.2em;\">⏰</span> <strong>Time:</strong> {details['time']}
                          </td>
                        </tr>
                        <tr>
                          <td style=\"padding: 8px 0; font-size: 1.1em;\">
                            <span style=\"font-size: 1.2em;\">📍</span> <strong>Location:</strong> {details['location']}
                          </td>
                        </tr>
                      </table>
                      <a href=\"mailto:wendy.weddingplanning@gmail.com?subject=RSVP\" style=\"display: inline-block; background: linear-gradient(90deg, #b5838d 0%, #ffb4a2 100%); color: #fff; padding: 14px 38px; border-radius: 8px; text-decoration: none; font-size: 1.1em; font-weight: 600; margin-top: 18px; box-shadow: 0 2px 8px rgba(181,131,141,0.10);\">Reply to RSVP</a>
                      <hr style=\"border: none; border-top: 2px solid #ffb4a2; width: 60%; margin: 32px auto 16px auto;\">
                      <div style=\"color: #6d6875; font-size: 1em; margin-top: 12px;\">
                        <span style=\"font-style: italic;\">Best regards,</span><br>
                        Wendy ({details['couple_names']})
                      </div>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
            """
            msg = MIMEText(html_body, 'html')
            msg['Subject'] = 'You are invited to our wedding!'
            msg['From'] = self.smtp_user
            msg['To'] = input['email']
            import asyncio
            loop = asyncio.get_event_loop()
            def send_email():
                import smtplib
                try:
                    print(f"[SendInviteTool] Connecting to SMTP server: {self.smtp_host}:{self.smtp_port}")
                    with smtplib.SMTP_SSL(self.smtp_host, self.smtp_port) as server:
                        print("[SendInviteTool] Logging in to SMTP server...")
                        server.login(self.smtp_user, self.smtp_pass)
                        print("[SendInviteTool] Sending email...")
                        server.send_message(msg)
                        print(f"[SendInviteTool] Email sent successfully to {input['email']}")
                except Exception as smtp_e:
                    print(f"[SendInviteTool][ERROR] Failed to send email to {input['email']}: {smtp_e}")
                    raise
            await loop.run_in_executor(None, send_email)
            # Add guest to DB after sending invite
            if self.db:
                await self.db.add_guest(input.get('name', input['email']), input['email'])
            return {"success": True, "message": f"Invitation sent to {input['email']}"}
        except Exception as e:
            print(f"❌ Failed to send invitation to {input.get('email')}: {e}")
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
            print(f"❌ Failed to update RSVP for {input.get('email')}: {e}")
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
            print(f"❌ ListGuestsTool error: {e}")
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
            print(f"❌ Failed to send follow-ups: {e}")
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
            print(f"❌ Failed to process email response for {input.get('sender_email')}: {e}")
            return {"success": False, "message": f"Failed to process email: {e}"}

# --- Tool: Update Wedding Details ---
class UpdateWeddingDetailsTool:
    name = "update_wedding_details"
    description = """
    Update any or all wedding details (couple names, wedding date, location, time).
    Input: { "couple_names"?: string, "wedding_date"?: string, "location"?: string, "time"?: string }
    Output: { "success": true, "message": "Wedding details updated!" }
    When to use: Whenever the user provides or wants to update any wedding detail, even if only one field is provided. You can use this tool to update just the date, just the location, just the couple names, just the time, or any combination.
    Example: "Change the wedding date to July 27", "Set the location to The Park", "Update the couple names to Alex and Jamie", "Set the time to 5pm"
    """
    def __init__(self, db):
        self.db = db
    async def run(self, input: Dict[str, Any]) -> Dict[str, Any]:
        try:
            # Fetch current details
            current = await self.db.get_wedding_details()
            couple_names = input.get('couple_names', current.get('couple_names', ''))
            wedding_date = input.get('wedding_date', current.get('wedding_date', ''))
            location = input.get('location', current.get('location', ''))
            time = input.get('time', current.get('time', ''))
            if not (couple_names or wedding_date or location or time):
                return {"success": False, "message": "Please provide at least one wedding detail to update (couple_names, wedding_date, location, or time)."}
            await self.db.set_wedding_details(couple_names, wedding_date, location, time)
            return {"success": True, "message": "Wedding details updated!"}
        except Exception as e:
            print(f"❌ Failed to update wedding details: {e}")
            return {"success": False, "message": f"Failed to update wedding details: {e}"}

# --- Tool Registry ---
class ToolRegistry:
    def __init__(self, db, email_service, smtp_user, smtp_pass, openai_api_key):
        self.tools = [
            SendInviteTool(smtp_user, smtp_pass, db),
            UpdateRSVPTool(db),
            ListGuestsTool(db),
            FollowUpTool(db, email_service),
            ProcessEmailResponseTool(db, openai_api_key),
            UpdateWeddingDetailsTool(db),  # Register the new tool
        ]
    def get_tools(self) -> List[Any]:
        return self.tools
    def get_tool_by_name(self, name: str):
        for tool in self.tools:
            if tool.name == name:
                return tool
        return None 