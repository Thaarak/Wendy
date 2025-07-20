"""
Wendy Wedding Planning HTTP Server

This server provides HTTP endpoints for wedding planning including:
- Guest management with SQLite database
- Email invitation system
- RSVP tracking
- Venue finding with AI
"""

import os
import httpx
import smtplib
from datetime import datetime
from email.mime.text import MIMEText
from pathlib import Path
from typing import Any, List, Optional

import anthropic
import aiosqlite
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(
    title="Wendy Wedding Planning Server",
    description="AI-powered wedding planning assistant with guest management, email invitations, and venue finding.",
    version="1.0.0"
)


# Pydantic models
class Guest(BaseModel):
    id: int
    name: str
    email: str
    rsvp: str
    created_at: str


class SendInviteRequest(BaseModel):
    email: str
    name: Optional[str] = None


class SendInviteResponse(BaseModel):
    result: str


class UpdateRSVPRequest(BaseModel):
    email: str
    rsvp: str


class UpdateRSVPResponse(BaseModel):
    result: str


class FindVenuesRequest(BaseModel):
    location: str


class FindVenuesResponse(BaseModel):
    result: str


# Database helper class
class Database:
    """Simple async wrapper for SQLite."""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self.conn: aiosqlite.Connection | None = None

    async def connect(self):
        """Connect to the database."""
        self.conn = await aiosqlite.connect(self.db_path)
        self.conn.row_factory = aiosqlite.Row
        await self.init_schema()

    async def close(self):
        """Close the database connection."""
        if self.conn:
            await self.conn.close()

    async def init_schema(self):
        """Initialize the database schema."""
        if not self.conn:
            raise RuntimeError("Database not connected")

        cursor = await self.conn.cursor()

        # Create guests table
        await cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS guests (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                rsvp TEXT DEFAULT 'unknown',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        await self.conn.commit()

    async def add_guest(self, name: str, email: str) -> dict:
        """Add a new guest to the database."""
        if not self.conn:
            raise RuntimeError("Database not connected")

        cursor = await self.conn.cursor()
        
        # Use upsert to handle duplicate emails
        await cursor.execute(
            """
            INSERT OR REPLACE INTO guests (name, email, rsvp, created_at)
            VALUES (?, ?, 'unknown', CURRENT_TIMESTAMP)
            """,
            (name, email)
        )
        
        await self.conn.commit()
        
        # Get the inserted/updated guest
        await cursor.execute("SELECT * FROM guests WHERE email = ?", (email,))
        row = await cursor.fetchone()
        return dict(row) if row else None

    async def get_all_guests(self) -> list[dict]:
        """Get all guests."""
        if not self.conn:
            raise RuntimeError("Database not connected")

        cursor = await self.conn.execute("SELECT * FROM guests ORDER BY created_at DESC")
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def update_guest_rsvp(self, email: str, rsvp: str) -> dict | None:
        """Update a guest's RSVP status."""
        if not self.conn:
            raise RuntimeError("Database not connected")

        cursor = await self.conn.cursor()
        await cursor.execute(
            "UPDATE guests SET rsvp = ? WHERE email = ?",
            (rsvp, email)
        )
        await self.conn.commit()
        
        # Get the updated guest
        await cursor.execute("SELECT * FROM guests WHERE email = ?", (email,))
        row = await cursor.fetchone()
        return dict(row) if row else None


# Email helper class
class EmailService:
    """Email service for sending invitations."""
    
    def __init__(self):
        self.smtp_host = "smtp.gmail.com"
        self.smtp_port = 465
        self.smtp_user = "wendy.weddingplanning@gmail.com"
        self.smtp_pass = "ovzy uzkz szmm vech"  # App password
        
    def send_invitation(self, to_email: str, guest_name: str = None) -> bool:
        """Send a wedding invitation email."""
        try:
            # Create message
            msg = MIMEText(
                f"""
                Dear {guest_name or 'Guest'},
                
                You are cordially invited to our wedding!
                
                We would be honored by your presence on our special day.
                Please RSVP at your earliest convenience.
                
                Best regards,
                The Happy Couple
                """,
                'plain'
            )
            
            msg['Subject'] = 'You are invited to our wedding!'
            msg['From'] = self.smtp_user
            msg['To'] = to_email
            
            # Send email
            with smtplib.SMTP_SSL(self.smtp_host, self.smtp_port) as server:
                server.login(self.smtp_user, self.smtp_pass)
                server.send_message(msg)
                
            print(f"✅ Invitation sent to {to_email}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to send invitation to {to_email}: {e}")
            return False


# Global instances
db: Database | None = None
email_service: EmailService | None = None


@app.on_event("startup")
async def startup_event():
    """Initialize database and email service on startup."""
    global db, email_service
    
    # Setup database
    db_path = Path(__file__).parent / "wedding.db"
    db = Database(str(db_path))
    await db.connect()
    print(f"✅ Connected to SQLite database: {db_path}")
    
    # Setup email service
    email_service = EmailService()
    print("✅ Email service initialized")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    global db
    if db:
        await db.close()
        print("🔒 Closed database connection")


# HTTP endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.post("/tools/send_invite", response_model=SendInviteResponse)
async def send_invite(request: SendInviteRequest):
    """
    Send a wedding invitation email and add the guest to the database.
    """
    if not db or not email_service:
        raise HTTPException(status_code=500, detail="Server not initialized")
    
    try:
        # Send email invitation
        guest_name = request.name or request.email
        email_sent = email_service.send_invitation(request.email, guest_name)
        
        if not email_sent:
            return SendInviteResponse(
                result=f"❌ Failed to send invitation to {request.email}. Please try again."
            )
        
        # Add guest to database
        guest_data = await db.add_guest(guest_name, request.email)
        
        if guest_data:
            return SendInviteResponse(
                result=f"✅ Invitation sent to {request.email} and guest added to the database!"
            )
        else:
            return SendInviteResponse(
                result=f"✅ Invitation sent to {request.email}, but there was an issue adding to database."
            )
            
    except Exception as e:
        return SendInviteResponse(
            result=f"❌ Error processing invitation for {request.email}: {str(e)}"
        )


@app.post("/tools/update_rsvp", response_model=UpdateRSVPResponse)
async def update_rsvp(request: UpdateRSVPRequest):
    """
    Update the RSVP status for a guest.
    """
    if not db:
        raise HTTPException(status_code=500, detail="Server not initialized")
    
    try:
        updated_guest = await db.update_guest_rsvp(request.email, request.rsvp)
        
        if updated_guest:
            return UpdateRSVPResponse(
                result=f"✅ RSVP updated for {request.email} to '{request.rsvp}'"
            )
        else:
            return UpdateRSVPResponse(
                result=f"❌ Guest with email {request.email} not found."
            )
            
    except Exception as e:
        return UpdateRSVPResponse(
            result=f"❌ Error updating RSVP for {request.email}: {str(e)}"
        )


@app.post("/tools/find_venues", response_model=FindVenuesResponse)
async def find_venues(request: FindVenuesRequest):
    """
    Find wedding venues using AI.
    """
    try:
        
        http_client = httpx.Client(
        headers={"anthropic-beta":"web-search-2025-03-05"} 
        )
        client = anthropic.Anthropic(
            # defaults to os.environ.get("ANTHROPIC_API_KEY")
            api_key=os.environ.get("ANTHROPIC_API_KEY"),
            http_client=http_client
        )


        # Create the message with the beta API and web search tools
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            temperature=1,
            system="You are an AI agent designed to help with wedding planning. You have access to a tool which performs web searches to find and gather information about wedding venues in a specified location. Respond only with the final answer relevant to the user query. Do not show your reasoning, planning, or any intermediate steps. Format the response clearly with Markdown headings and bullet points as appropriate. ",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"""
                                The user is looking for wedding venues in: {request.location}

                                Please perform the following tasks:
                                1. Use the web search tool to find wedding venues in {request.location}
                                2. Select 3 top results from the search. Avoid encrypted pages
                                3. For each selected venue:
                                a. Visit the venue's website
                                b. Scrape the following essential information:
                                    - Venue name
                                    - Address
                                    - Email contact
                                    - Phone number (if available)
                                    - Capacity (if available)

                                Present the gathered information in the following format only and nothing else. Do not show your reasoning, planning, or any intermediate steps:
                                
                                <venues>
                                <venue>
                                <name>[Venue Name]</name>
                                <address>[Full Address]</address>
                                <email>[Email Address]</email>
                                <phone>[Phone Number]</phone>
                                <capacity>[Capacity Information]</capacity>    
                                </venue>
                                [Repeat for each venue]
                                </venues>

                                If you cannot find any suitable venues in the specified location, respond with:

                                <error>Unable to find wedding venues in {request.location}. Please try a different location or expand your search area.</error>

                                """
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
        
        return FindVenuesResponse(result=str(message.content))
        
    except Exception as e:
        return FindVenuesResponse(result=f"❌ Error finding venues: {str(e)}")


@app.get("/resources/list_guests", response_model=List[Guest])
async def list_guests():
    """List all guests in the wedding database."""
    if not db:
        raise HTTPException(status_code=500, detail="Server not initialized")
    
    guest_rows = await db.get_all_guests()
    
    guests = []
    for row in guest_rows:
        guests.append(
            Guest(
                id=row["id"],
                name=row["name"],
                email=row["email"],
                rsvp=row["rsvp"],
                created_at=row["created_at"],
            )
        )
    
    return guests


@app.get("/resources/get_guest/{guest_id}", response_model=Guest)
async def get_guest(guest_id: int):
    """Get a specific guest by ID."""
    if not db:
        raise HTTPException(status_code=500, detail="Server not initialized")
    
    # Get all guests and find the one we want
    guest_rows = await db.get_all_guests()
    
    for row in guest_rows:
        if row["id"] == guest_id:
            return Guest(
                id=row["id"],
                name=row["name"],
                email=row["email"],
                rsvp=row["rsvp"],
                created_at=row["created_at"],
            )
    
    raise HTTPException(status_code=404, detail="Guest not found")


if __name__ == "__main__":
    import uvicorn
    print("Starting Wendy Wedding Planning HTTP Server...")
    uvicorn.run(app, host="0.0.0.0", port=8000) 