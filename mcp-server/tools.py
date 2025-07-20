import smtplib
from email.mime.text import MIMEText
from typing import Any, Dict, List
import openai
import json
from datetime import datetime
import os
import httpx
import re
import os
import httpx
import anthropic
import re
from dotenv import load_dotenv
load_dotenv()

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
            details = await self.db.get_wedding_details() if self.db else {"couple_names": "", "wedding_date": "", "location": ""}
            missing = []
            if not details.get('couple_names'):
                missing.append('couple names')
            if not details.get('wedding_date'):
                missing.append('wedding date')
            if not details.get('location'):
                missing.append('location')
            if missing:
                return {"success": False, "message": f"Please provide the following wedding details before sending invites: {', '.join(missing)}."}
            msg = MIMEText(f"""
                Dear {input.get('name', 'Guest')},
                You are cordially invited to our wedding!
                Date: {details['wedding_date']}
                Location: {details['location']}
                We would be honored by your presence on our special day.
                Please RSVP at your earliest convenience.
                Best regards,
                Wendy ({details['couple_names']})
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
    Update any or all wedding details (couple names, wedding date, location).
    Input: { "couple_names"?: string, "wedding_date"?: string, "location"?: string }
    Output: { "success": true, "message": "Wedding details updated!" }
    When to use: Whenever the user provides or wants to update any wedding detail, even if only one field is provided. You can use this tool to update just the date, just the location, just the couple names, or any combination.
    Example: "Change the wedding date to July 27", "Set the location to The Park", "Update the couple names to Alex and Jamie"
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
            if not (couple_names or wedding_date or location):
                return {"success": False, "message": "Please provide at least one wedding detail to update (couple_names, wedding_date, or location)."}
            await self.db.set_wedding_details(couple_names, wedding_date, location)
            return {"success": True, "message": "Wedding details updated!"}
        except Exception as e:
            print(f"❌ Failed to update wedding details: {e}")
            return {"success": False, "message": f"Failed to update wedding details: {e}"}


class FindVenuesTool:
    name = "find_venues"
    description = """
    Search for wedding venues in a specified location using Anthropic Claude with web search and scraping.
    Input: { "location": "City, State or region" }
    Output: { "success": true, "venues": [ { "name": ..., "address": ..., "email": ..., "phone": ..., "capacity": ..., "website": ... } ], "message": "Summary or error" }
    When to use: When the user asks to search for or suggest wedding venues in a location.
    Example: "Find venues in San Francisco", "Show me wedding venues near Austin, TX"
    """

    def __init__(self, db, openai_api_key=None):
        self.db = db
        self.anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY")

    async def run(self, input: dict) -> dict:
        try:
            location = input.get("location")
            if not location:
                return {"success": False, "message": "No location provided.", "venues": []}
            if not self.anthropic_api_key:
                return {"success": False, "message": "ANTHROPIC_API_KEY not set in environment.", "venues": []}

            http_client = httpx.Client(
                headers={
                    "anthropic-beta": "web-search-2025-03-05",
                    "anthropic-version": "2023-06-01"
                }
            )
            client = anthropic.Anthropic(
                api_key=self.anthropic_api_key,
                http_client=http_client,
                default_headers={
                    "anthropic-version": "2023-06-01",
                    "anthropic-beta": "web-search-2025-03-05"
                }
            )

            prompt = f"""
The user is looking for wedding venues in: {location}

Please perform the following tasks:
1. Use the web search tool to find wedding venues in {location}.
2. Select 3 top results from the search. Only include venues that have a real, valid, working email contact for reservations or inquiries. The email must be present on the venue's official website. Do not include venues that only have a web form or no email address.
3. For each selected venue:
   a. Visit the venue's official website.
   b. Scrape the following essential information:
       - Venue name
       - Address
       - Email contact (must be a real, working email address for the venue; skip venues without one)
       - Phone number (if available)
       - Capacity (if available)
       - Website URL (must be the official venue website)

Important rules:
- Only include venues with a real, working email address for reservations or inquiries. Do not include venues with missing, generic, or web form-only contacts.
- The email must be scraped from the venue's official website and should be a direct contact for the venue (not a third-party or aggregator).
- If you cannot find a valid email for a venue, skip that venue and select another.
- If you cannot find at least one suitable venue with a valid email in the specified location, respond with:

<error>Unable to find wedding venues in {location} with a valid email contact. Please try a different location or expand your search area.</error>

Present the gathered information in the following format only and nothing else. Do not show your reasoning, planning, or any intermediate steps:

<venues>
<venue>
<name>[Venue Name]</name>
<address>[Full Address]</address>
<email>[Email Address]</email>
<phone>[Phone Number]</phone>
<capacity>[Capacity Information]</capacity>
<website>[Website URL]</website>
</venue>
[Repeat for each venue]
</venues>
"""

            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                temperature=1,
                system="You are an AI agent designed to help with wedding planning. You have access to a tool which performs web searches to find and gather information about wedding venues in a specified location. Respond only with the final answer relevant to the user query. Do not show your reasoning, planning, or any intermediate steps. Format the response clearly with Markdown headings and bullet points as appropriate.",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt
                            }
                        ]
                    }
                ],
                tools=[
                    {
                        "name": "web_search",
                        "type": "web_search_20250305",
                        "max_uses": 5
                    }
                ]
            )

            result = str(message.content)
            venues = []
            venues_match = re.search(r"<venues>([\s\S]*?)</venues>", result)
            if venues_match:
                venues_block = venues_match.group(1)
                venue_regex = re.compile(r"<venue>([\s\S]*?)</venue>")
                for match in venue_regex.finditer(venues_block):
                    venue_xml = match.group(1)
                    def extract(tag):
                        m = re.search(rf"<{tag}>([\s\S]*?)</{tag}>", venue_xml)
                        return m.group(1).strip() if m else ""
                    venues.append({
                        "name": extract("name"),
                        "address": extract("address"),
                        "email": extract("email"),
                        "phone": extract("phone"),
                        "capacity": extract("capacity"),
                        "website": extract("website"),
                    })
            elif "<error>" in result:
                return {"success": False, "venues": [], "message": result}
            else:
                return {"success": False, "venues": [], "message": "No venues found in response."}

            return {
                "success": True,
                "venues": venues,
                "message": f"Found {len(venues)} venues in {location}."
            }
        except Exception as e:
            print(f"❌ Error in FindVenuesTool: {e}")
            return {"success": False, "venues": [], "message": f"❌ Error finding venues: {str(e)}"}

# --- Tool: Make Venue Reservation ---
class MakeVenueReservationTool:
    name = "make_venue_reservation"
    description = """
    Make a reservation request at a wedding venue.
    Input: {
        "user_name": "Name of the person making the reservation",
        "user_email": "Their email",
        "venue_name": "Venue to book",
        "venue_email": "Venue contact email",
        "budget": "Budget for the venue",
        "guest_count": Number of guests,
        "event_date": "YYYY-MM-DD",
        "special_notes": "Any additional requests" (optional),
        "context": { ... } (optional, for orchestrator context)
    }
    Output: { "success": true, "message": "Reservation sent!", "reservation_id": ... }
    When to use: When the user asks to book, reserve, or make a reservation at a wedding venue.
    Example: "Book Grand Ballroom for 120 guests on 2024-10-15"
    """

    def __init__(self, db, smtp_user, smtp_pass):
        self.db = db
        self.smtp_host = "smtp.gmail.com"
        self.smtp_port = 465
        self.smtp_user = smtp_user
        self.smtp_pass = smtp_pass

    async def run(self, input: Dict[str, Any]) -> Dict[str, Any]:
        try:
            required = ["user_name", "user_email", "venue_name", "budget", "guest_count", "event_date"]
            for field in required:
                if not input.get(field):
                    return {"success": False, "message": f"Missing required field: {field}"}
            venue_email = input.get("venue_email")
            # If not provided, try to get from context
            context = input.get("context")
            if not venue_email and context and "last_venues" in context:
                venue_name = input.get("venue_name")
                for venue in context["last_venues"]:
                    if venue["name"].lower() == venue_name.lower():
                        venue_email = venue.get("email")
                        break
            if not venue_email:
                return {"success": False, "message": "Venue email not found. Please specify the venue email."}

            # --- Use OpenAI to generate a professional reservation email ---
            openai_api_key = os.environ.get("OPENAI_API_KEY")
            if not openai_api_key:
                return {"success": False, "message": "OPENAI_API_KEY not set in environment."}
            openai_client = openai.AsyncOpenAI(api_key=openai_api_key)
            prompt = f"""
You are a professional wedding planner assistant. Write a formal, polite, and information-rich email to a wedding venue to request a reservation. Include all the following details:
- Venue name: {input['venue_name']}
- User name: {input['user_name']}
- User email: {input['user_email']}
- Event date: {input['event_date']}
- Guest count: {input['guest_count']}
- Budget: {input['budget']}
- Special notes: {input.get('special_notes', 'None')}

The email should:
- Be addressed to the venue (use the venue name in the greeting if possible)
- Clearly state the user's interest in booking the venue for a wedding
- List all the details above in a natural, professional way
- Ask about availability and next steps
- Be concise, warm, and professional
- End with the user's name and email as signature

Respond with only the email body, no subject line or extra commentary.
"""
            response = await openai_client.chat.completions.create(
                model="gpt-3.5-turbo-1106",
                messages=[{"role": "user", "content": prompt}],
            )
            email_body = response.choices[0].message.content.strip()

            msg = MIMEText(email_body, 'plain')
            msg['Subject'] = f"Wedding Venue Reservation Inquiry: {input['event_date']}"
            msg['From'] = self.smtp_user
            msg['To'] = venue_email

            # Send email (blocking, so run in thread)
            import asyncio
            loop = asyncio.get_event_loop()
            def send_email():
                with smtplib.SMTP_SSL(self.smtp_host, self.smtp_port) as server:
                    server.login(self.smtp_user, self.smtp_pass)
                    server.send_message(msg)
            await loop.run_in_executor(None, send_email)

            # Optionally, log reservation in DB (stubbed)
            # reservation_id = await self.db.add_reservation(...)

            return {
                "success": True,
                "message": f"Reservation request sent to {venue_email}",
                # "reservation_id": reservation_id
            }
        except Exception as e:
            print(f"❌ Failed to make venue reservation: {e}")
            return {"success": False, "message": f"Failed to make reservation: {e}"}

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
            FindVenuesTool(db, openai_api_key),  # <-- Add this
            MakeVenueReservationTool(db, smtp_user, smtp_pass),  # <-- Add this
        ]
    def get_tools(self) -> List[Any]:
        return self.tools
    def get_tool_by_name(self, name: str):
        for tool in self.tools:
            if tool.name == name:
                return tool
        return None 