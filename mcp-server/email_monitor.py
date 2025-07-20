import os
import json
import time
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import schedule
import threading

# Gmail API scopes
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

class EmailMonitor:
    def __init__(self, db_connection, email_service):
        self.db = db_connection
        self.email_service = email_service
        self.creds = None
        self.service = None
        self.last_check_time = None
        self.is_running = False
        # Wendy's email is hardcoded
        self.account_email = "wendy.weddingplanning@gmail.com"
        
    def authenticate_gmail(self):
        """Authenticate with Gmail API using OAuth2 for Wendy's own account only."""
        try:
            # Only ever use token.json/credentials.json for Wendy's account
            if os.path.exists('token.json'):
                self.creds = Credentials.from_authorized_user_file('token.json', SCOPES)
            
            # If credentials are invalid or don't exist, get new ones
            if not self.creds or not self.creds.valid:
                if self.creds and self.creds.expired and self.creds.refresh_token:
                    try:
                        self.creds.refresh(Request())
                    except Exception as refresh_error:
                        print(f"❌ Failed to refresh token: {refresh_error}")
                        # Remove invalid token file
                        if os.path.exists('token.json'):
                            os.remove('token.json')
                        self.creds = None
                
                if not self.creds:
                    # You'll need to download credentials.json from Google Cloud Console
                    if not os.path.exists('credentials.json'):
                        print("❌ credentials.json not found. Please download from Google Cloud Console")
                        return False
                    
                    flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
                    # Use a specific port to avoid conflicts
                    self.creds = flow.run_local_server(port=8080)
                
                # Save credentials for next run
                with open('token.json', 'w') as token:
                    token.write(self.creds.to_json())
            
            # Build the Gmail service
            self.service = build('gmail', 'v1', credentials=self.creds)
            print("✅ Gmail API authenticated successfully")
            return True
            
        except Exception as e:
            print(f"❌ Gmail authentication failed: {e}")
            if "verification" in str(e).lower():
                print("💡 This error occurs because the app hasn't been verified by Google.")
                print("💡 For development, you can:")
                print("   1. Use the app in 'testing' mode (add your email as a test user)")
                print("   2. Or use the manual email check feature instead")
                print("   3. Or complete Google's verification process")
            return False
    
    async def check_for_replies(self):
        """Check Gmail for replies to wedding invitations."""
        if not self.service:
            print("❌ Gmail service not initialized")
            return
        
        try:
            # Get all guests from database
            guests = await self.db.get_all_guests()
            guest_emails = [guest['email'] for guest in guests]
            
            # Search for emails from guests
            query = f"from:({' OR '.join(guest_emails)})"
            if self.last_check_time:
                # Only check emails after last check
                query += f" after:{self.last_check_time.strftime('%Y/%m/%d')}"
            
            print(f"🔍 Checking for emails with query: {query}")
            
            # Search for messages
            results = self.service.users().messages().list(
                userId='me', 
                q=query,
                maxResults=50
            ).execute()
            
            messages = results.get('messages', [])
            
            if not messages:
                print("📧 No new emails found")
                return
            
            print(f"📧 Found {len(messages)} potential reply emails")
            
            # Process each message
            for message in messages:
                await self.process_email_message(message['id'])
            
            # Update last check time
            self.last_check_time = datetime.now()
            
        except HttpError as error:
            print(f"❌ Gmail API error: {error}")
        except Exception as e:
            print(f"❌ Error checking for replies: {e}")
    
    async def process_email_message(self, message_id: str):
        """Process a single email message."""
        try:
            # Get the full message
            message = self.service.users().messages().get(
                userId='me', 
                id=message_id,
                format='full'
            ).execute()
            
            # Extract headers
            headers = message['payload']['headers']
            subject = next((h['value'] for h in headers if h['name'] == 'Subject'), '')
            from_header = next((h['value'] for h in headers if h['name'] == 'From'), '')
            
            # Extract sender email
            sender_email = self.extract_email_from_header(from_header)
            
            # Get email body
            email_content = self.extract_email_body(message['payload'])
            
            print(f"📧 Processing email from {sender_email}: {subject[:50]}...")
            
            # Check if sender is in our guest list
            guest = await self.db.get_guest_by_email(sender_email)
            if not guest:
                print(f"⚠️ Sender {sender_email} not in guest list, skipping")
                return
            
            # Analyze email for RSVP
            analysis = await self.analyze_email_for_rsvp(email_content)
            
            # Update RSVP if high confidence
            if analysis.get('rsvp_status') and analysis.get('confidence', 0) > 0.7:
                await self.db.update_guest_rsvp(sender_email, analysis['rsvp_status'])
                print(f"✅ Updated {guest['name']}'s RSVP to '{analysis['rsvp_status']}' (confidence: {analysis['confidence']:.2f})")
            elif analysis.get('rsvp_status'):
                print(f"⚠️ Low confidence analysis for {guest['name']}: {analysis['rsvp_status']} (confidence: {analysis['confidence']:.2f})")
            else:
                print(f"📧 Email from {guest['name']} processed, no RSVP information found")
                
        except Exception as e:
            print(f"❌ Error processing message {message_id}: {e}")
    
    def extract_email_from_header(self, from_header: str) -> str:
        """Extract email address from From header."""
        import re
        # Look for email pattern in the header
        email_pattern = r'[\w\.-]+@[\w\.-]+\.\w+'
        match = re.search(email_pattern, from_header)
        return match.group(0) if match else ''
    
    def extract_email_body(self, payload) -> str:
        """Extract email body from Gmail message payload."""
        try:
            if 'parts' in payload:
                # Multipart message
                for part in payload['parts']:
                    if part['mimeType'] == 'text/plain':
                        import base64
                        return base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')
            else:
                # Simple message
                if payload['mimeType'] == 'text/plain':
                    import base64
                    return base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8')
            
            return "Email content not available"
        except Exception as e:
            print(f"❌ Error extracting email body: {e}")
            return "Email content not available"
    
    async def analyze_email_for_rsvp(self, email_content: str) -> dict:
        """Analyze email content for RSVP information using OpenAI."""
        try:
            import openai
            openai_client = openai.OpenAI(api_key="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")
            
            prompt = f"""
            Analyze this email response for RSVP information:

            Email content: {email_content}

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
            
            response = openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return result
            
        except Exception as e:
            print(f"Error analyzing email: {e}")
            return {
                "rsvp_status": None,
                "confidence": 0.0,
                "reasoning": f"Error analyzing email: {str(e)}"
            }
    
    def start_monitoring(self, interval_minutes: int = 5):
        """Start the email monitoring service for Wendy's own inbox only."""
        if self.is_running:
            print("⚠️ Email monitoring is already running")
            return
        
        if not self.authenticate_gmail():
            print("❌ Failed to authenticate Gmail, cannot start monitoring")
            return
        
        self.is_running = True
        print(f"🔄 Starting email monitoring for {self.account_email} (checking every {interval_minutes} minutes)")
        
        # Schedule the monitoring task
        schedule.every(interval_minutes).minutes.do(self.run_check)
        
        # Run in a separate thread
        def run_scheduler():
            while self.is_running:
                schedule.run_pending()
                time.sleep(1)
        
        self.scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
        self.scheduler_thread.start()
        
        # Run initial check
        asyncio.create_task(self.check_for_replies())
    
    def run_check(self):
        """Wrapper to run the async check function."""
        asyncio.create_task(self.check_for_replies())
    
    def stop_monitoring(self):
        """Stop the email monitoring service."""
        self.is_running = False
        print("🛑 Email monitoring stopped")
    
    async def manual_check(self):
        """Manually trigger an email check."""
        print("🔍 Manual email check triggered")
        if self.service:
            await self.check_for_replies()
        else:
            print("⚠️ Gmail service not available. Using test mode...")
            await self.test_email_analysis()
    
    async def test_email_analysis(self):
        """Test email analysis with mock data when Gmail API is not available."""
        print("🧪 Testing email analysis with mock data...")
        
        # Mock email data for testing
        test_emails = [
            {
                'sender': 'john@example.com',
                'content': 'Yes, I will definitely come to your wedding! I\'m so excited!',
                'expected_rsvp': 'yes'
            },
            {
                'sender': 'jane@example.com', 
                'content': 'I\'m sorry, but I won\'t be able to attend. I have a prior commitment.',
                'expected_rsvp': 'no'
            },
            {
                'sender': 'bob@example.com',
                'content': 'I\'m not sure yet, I\'ll let you know closer to the date.',
                'expected_rsvp': 'maybe'
            }
        ]
        
        for test_email in test_emails:
            print(f"\n📧 Testing email from {test_email['sender']}:")
            print(f"Content: {test_email['content'][:50]}...")
            
            # Analyze the email
            analysis = await self.analyze_email_for_rsvp(test_email['content'])
            print(f"Analysis: {analysis}")
            
            # Check if sender is in guest list
            guest = await self.db.get_guest_by_email(test_email['sender'])
            if guest:
                print(f"✅ Guest found: {guest['name']}")
                if analysis.get('rsvp_status') and analysis.get('confidence', 0) > 0.7:
                    await self.db.update_guest_rsvp(test_email['sender'], analysis['rsvp_status'])
                    print(f"✅ Updated RSVP to: {analysis['rsvp_status']}")
                else:
                    print(f"⚠️ Low confidence or no RSVP found")
            else:
                print(f"❌ Guest not found: {test_email['sender']}")
        
        print("\n✅ Test email analysis completed!") 