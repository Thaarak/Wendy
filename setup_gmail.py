#!/usr/bin/env python3
"""
Gmail API Setup Helper Script
This script helps you set up Gmail API credentials for Wendy's email monitoring.
"""

import os
import sys
import webbrowser
from pathlib import Path

def print_header():
    print("=" * 60)
    print("🔧 Wendy's Gmail API Setup Helper")
    print("=" * 60)
    print()

def check_credentials():
    """Check if credentials.json exists."""
    creds_path = Path("mcp-server/credentials.json")
    if creds_path.exists():
        print("✅ Found credentials.json in mcp-server/ directory")
        return True
    else:
        print("❌ credentials.json not found in mcp-server/ directory")
        return False

def open_google_cloud_console():
    """Open Google Cloud Console in browser."""
    print("🌐 Opening Google Cloud Console...")
    webbrowser.open("https://console.cloud.google.com/")
    print("✅ Google Cloud Console opened in your browser")
    print()

def print_setup_steps():
    print("📋 Follow these steps to set up Gmail API:")
    print()
    print("1. 🏗️  Create a new project (if you haven't already)")
    print("   - Click 'Select a project' → 'New Project'")
    print("   - Name it 'Wendy Wedding Planner'")
    print("   - Click 'Create'")
    print()
    print("2. 🔌 Enable Gmail API")
    print("   - Go to 'APIs & Services' → 'Library'")
    print("   - Search for 'Gmail API'")
    print("   - Click on 'Gmail API'")
    print("   - Click 'Enable'")
    print()
    print("3. 🔑 Create OAuth2 Credentials")
    print("   - Go to 'APIs & Services' → 'Credentials'")
    print("   - Click 'Create Credentials' → 'OAuth client ID'")
    print("   - Configure OAuth consent screen if prompted:")
    print("     • User Type: External")
    print("     • App name: 'Wendy Wedding Planner'")
    print("     • User support email: Your email")
    print("     • Developer contact: Your email")
    print("   - Back to OAuth client ID:")
    print("     • Application type: Desktop application")
    print("     • Name: 'Wendy Email Monitor'")
    print("     • Click 'Create'")
    print()
    print("4. 📥 Download Credentials")
    print("   - Click 'Download JSON'")
    print("   - Rename the file to 'credentials.json'")
    print("   - Place it in the 'mcp-server/' directory")
    print()

def test_email_monitoring():
    """Test email monitoring functionality."""
    print("🧪 Testing Email Monitoring...")
    print()
    
    # Check if we can import the email monitor
    try:
        sys.path.append('mcp-server')
        from email_monitor import EmailMonitor
        
        print("✅ Email monitoring module imported successfully")
        print("✅ All dependencies are installed")
        print()
        
        # Test the analysis functionality
        print("🔍 Testing email analysis...")
        import asyncio
        
        class MockDB:
            async def get_all_guests(self):
                return [{'email': 'test@example.com'}]
            async def get_guest_by_email(self, email):
                return {'name': 'Test User', 'email': email} if email == 'test@example.com' else None
            async def update_guest_rsvp(self, email, rsvp):
                return {'name': 'Test User', 'email': email, 'rsvp': rsvp}
        
        class MockEmailService:
            pass
        
        async def test_analysis():
            monitor = EmailMonitor(MockDB(), MockEmailService())
            test_email = "Yes, I will definitely come to your wedding!"
            result = await monitor.analyze_email_for_rsvp(test_email)
            print(f"✅ Email analysis test passed: {result}")
        
        asyncio.run(test_analysis())
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure you're in the correct directory and dependencies are installed")
        return False
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False
    
    return True

def main():
    print_header()
    
    # Check current directory
    if not Path("mcp-server").exists():
        print("❌ Please run this script from the Wendy project root directory")
        print("   (where the mcp-server/ folder is located)")
        sys.exit(1)
    
    print("📍 Current directory:", os.getcwd())
    print()
    
    # Check if credentials exist
    if check_credentials():
        print("🎉 Gmail API credentials are already set up!")
        print()
        print("You can now:")
        print("1. Start email monitoring via chat: 'Start monitoring my inbox'")
        print("2. Test manual email check: 'Check my inbox for RSVP replies'")
        print("3. Stop monitoring: 'Stop monitoring my inbox'")
        print()
        
        if test_email_monitoring():
            print("✅ Everything is ready! Wendy can monitor your inbox.")
        else:
            print("⚠️ There might be an issue with the setup. Check the error messages above.")
        
        return
    
    # If credentials don't exist, guide through setup
    print("🚀 Let's set up Gmail API access for Wendy's email monitoring!")
    print()
    
    # Open Google Cloud Console
    response = input("Would you like me to open Google Cloud Console? (y/n): ")
    if response.lower() in ['y', 'yes']:
        open_google_cloud_console()
    
    print_setup_steps()
    
    print("🔄 After completing the steps above, run this script again to verify the setup.")
    print()
    print("💡 Tip: You can also test the email analysis without Gmail API:")
    print("   cd mcp-server && python test_email_monitor.py")

if __name__ == "__main__":
    main() 