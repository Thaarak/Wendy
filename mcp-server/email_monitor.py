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
# REMOVE: from wendy_mcp_server import agent_orchestrator

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
        self.agent_orchestrator = None  # Will be set after initialization
        self.seen_message_ids = set()  # Track processed emails
        
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
        """Check Gmail for any new emails (not just from guests)."""
        if not self.service:
            print("❌ Gmail service not initialized")
            return
        try:
            query = ""
            print(f"🔍 Checking for emails with query: {query or '[all emails]'}")
            results = self.service.users().messages().list(userId='me', q=query, maxResults=50).execute()
            messages = results.get('messages', [])
            if not messages:
                print("📧 No new emails found")
                return
            print(f"📧 Found {len(messages)} potential reply emails")
            for message in messages:
                msg_id = message['id']
                if msg_id in self.seen_message_ids:
                    continue
                msg_meta = self.service.users().messages().get(userId='me', id=msg_id, format='metadata').execute()
                internal_date = int(msg_meta['internalDate'])
                if internal_date > getattr(self, 'startup_internal_date', 0):
                    await self.process_email_message(msg_id)
                    self.seen_message_ids.add(msg_id)
            import time
            self.last_check_time = datetime.now()
        except Exception as e:
            print(f"❌ Error checking for replies: {e}")
    
    async def process_email_message(self, message_id: str):
        """Process a single email message."""
        try:
            message = self.service.users().messages().get(
                userId='me', 
                id=message_id,
                format='full'
            ).execute()
            
            # Extract headers
            headers = message['payload']['headers']
            subject = next((h['value'] for h in headers if h['name'] == 'Subject'), '')
            from_header = next((h['value'] for h in headers if h['name'] == 'From'), '')
            message_id_header = next((h['value'] for h in headers if h['name'] == 'Message-ID'), None)
            
            # Extract sender email
            sender_email = self.extract_email_from_header(from_header)
            
            # Get email body
            email_content = self.extract_email_body(message['payload'])
            
            print(f"📧 Processing email from {sender_email}: {subject[:50]}...")
            
            # Skip if sender is Wendy herself
            if sender_email.lower() == self.account_email.lower():
                print(f"Skipping own email: {sender_email}")
                return

            # Build context for the agent
            context = {
                "source": "email",
                "sender_email": sender_email,
                "subject": subject,
                "in_reply_to": message.get('threadId'),
                "raw_email": email_content,
            }
            # Call the agent orchestrator
            if self.agent_orchestrator:
                result = await self.agent_orchestrator.handle_event(email_content, context=context)
                # If the agent returns a reply, send it as a confirmation email
                reply_message = result.get('reply') or result.get('reply_message')
                if reply_message:
                    await self.send_confirmation_email(sender_email, reply_message, in_reply_to=message_id_header)
                else:
                    # Default simple confirmation
                    await self.send_confirmation_email(sender_email, "Your RSVP has been recorded. Thank you!", in_reply_to=message_id_header)
            else:
                print("⚠️ Agent orchestrator not initialized")
                
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
    
    async def send_confirmation_email(self, to_email: str, message: str, in_reply_to: str = None):
        """Send a simple confirmation email to the sender, replying to the original email."""
        import asyncio
        from email.mime.text import MIMEText
        smtp_host = "smtp.gmail.com"
        smtp_port = 465
        smtp_user = "wendy.weddingplanning@gmail.com"
        smtp_pass = self.email_service.smtp_pass if hasattr(self.email_service, 'smtp_pass') else None
        msg = MIMEText(message, 'plain')
        msg['Subject'] = 'RSVP Confirmation'
        msg['From'] = smtp_user
        msg['To'] = to_email
        if in_reply_to:
            msg['In-Reply-To'] = in_reply_to
            msg['References'] = in_reply_to
        loop = asyncio.get_event_loop()
        def send_email():
            import smtplib
            with smtplib.SMTP_SSL(smtp_host, smtp_port) as server:
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
        await loop.run_in_executor(None, send_email)
        print(f"✅ Sent confirmation email to {to_email}")
    
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
        import asyncio
        self.main_loop = asyncio.get_event_loop()  # Store the main event loop
        # On startup, record the latest message's internalDate
        try:
            results = self.service.users().messages().list(userId='me', maxResults=1, q='').execute()
            if 'messages' in results:
                msg = self.service.users().messages().get(userId='me', id=results['messages'][0]['id'], format='metadata').execute()
                self.startup_internal_date = int(msg['internalDate'])
            else:
                import time
                self.startup_internal_date = int(time.time() * 1000)
            print(f"📅 Only processing emails after: {self.startup_internal_date}")
        except Exception as e:
            print(f"⚠️ Could not determine startup internalDate: {e}")
            import time
            self.startup_internal_date = int(time.time() * 1000)
        # Schedule the monitoring task
        schedule.every(interval_minutes).minutes.do(self.run_check)
        # Run in a separate thread
        def run_scheduler():
            import time
            while self.is_running:
                schedule.run_pending()
                time.sleep(1)
        self.scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
        self.scheduler_thread.start()
        # Run initial check
        if hasattr(self, 'main_loop'):
            asyncio.run_coroutine_threadsafe(self.check_for_replies(), self.main_loop)
        else:
            print("⚠️ No main event loop found for initial async email check")

    def run_check(self):
        """Wrapper to run the async check function from a thread."""
        import asyncio
        if hasattr(self, 'main_loop'):
            asyncio.run_coroutine_threadsafe(self.check_for_replies(), self.main_loop)
        else:
            print("⚠️ No main event loop found for async email check")
    
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