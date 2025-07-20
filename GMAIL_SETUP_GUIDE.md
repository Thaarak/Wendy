# Gmail API Setup Guide for Wendy's Email Monitoring

This guide will help you set up Gmail API access so Wendy can automatically monitor her inbox for RSVP replies.

## 🚀 Quick Start

1. **Set up Google Cloud Project**
2. **Enable Gmail API**
3. **Create OAuth2 credentials**
4. **Download credentials file**
5. **Start email monitoring**

## 📋 Step-by-Step Instructions

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it something like "Wendy Wedding Planner"
4. Click "Create"

### Step 2: Enable Gmail API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Gmail API"
3. Click on "Gmail API"
4. Click "Enable"

### Step 3: Create OAuth2 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - User Type: External
   - App name: "Wendy Wedding Planner"
   - User support email: Your email
   - Developer contact information: Your email
   - Save and continue through the steps

4. Back to creating OAuth client ID:
   - Application type: Desktop application
   - Name: "Wendy Email Monitor"
   - Click "Create"

### Step 4: Download Credentials

1. After creating the OAuth client ID, click "Download JSON"
2. Rename the downloaded file to `credentials.json`
3. Place it in the `mcp-server/` directory

### Step 5: Test the Setup

1. Restart the Python server:
   ```bash
   cd mcp-server
   source venv/bin/activate
   python wendy_mcp_server.py
   ```

2. The first time you start email monitoring, it will open a browser window for OAuth authentication.

## 🔧 Usage

### Start Email Monitoring

Via Chat:
```
"Start monitoring my inbox for RSVP replies"
```

Via API:
```bash
curl -X POST http://localhost:8000/tools/start_email_monitoring \
  -H "Content-Type: application/json" \
  -d '{"interval_minutes": 5}'
```

### Stop Email Monitoring

Via Chat:
```
"Stop monitoring my inbox"
```

Via API:
```bash
curl -X POST http://localhost:8000/tools/stop_email_monitoring \
  -H "Content-Type: application/json"
```

### Manual Email Check

Via Chat:
```
"Check my inbox for new RSVP replies"
```

Via API:
```bash
curl -X POST http://localhost:8000/tools/manual_email_check \
  -H "Content-Type: application/json"
```

## 🔍 How It Works

1. **Authentication**: Uses OAuth2 to securely access Gmail
2. **Monitoring**: Checks inbox every 5 minutes (configurable)
3. **Filtering**: Only looks for emails from guests in your database
4. **Analysis**: Uses AI to detect RSVP information in emails
5. **Updates**: Automatically updates RSVP status in database

## 📧 Email Processing

Wendy will:

- ✅ **High Confidence (>70%)**: Automatically update RSVP
- ⚠️ **Low Confidence (≤70%)**: Flag for manual review
- 📧 **No RSVP Found**: Log email but take no action

## 🛠️ Troubleshooting

### "credentials.json not found"
- Make sure you downloaded the OAuth credentials file
- Place it in the `mcp-server/` directory
- Rename it to `credentials.json`

### "Gmail authentication failed"
- Check that Gmail API is enabled in Google Cloud Console
- Verify your OAuth consent screen is configured
- Try deleting `token.json` and re-authenticating

### "No emails found"
- Make sure you have guests in your database
- Check that the emails are actually from your guest list
- Try a manual check first

### Permission Issues
- Make sure the OAuth consent screen includes the necessary scopes
- Check that the application is properly configured

## 🔒 Security Notes

- `credentials.json` contains sensitive information - keep it secure
- `token.json` contains your access token - don't share it
- The system only reads emails, never sends or modifies them
- All processing happens locally on your server

## 📊 Monitoring Dashboard

You can see email monitoring activity in the server logs:

```
🔄 Starting email monitoring (checking every 5 minutes)
🔍 Checking for emails with query: from:(guest1@example.com OR guest2@example.com)
📧 Found 2 potential reply emails
📧 Processing email from guest1@example.com: RSVP Response...
✅ Updated John's RSVP to 'yes' (confidence: 0.95)
```

## 🎯 Next Steps

Once email monitoring is set up, Wendy will:

1. **Automatically detect** RSVP replies
2. **Update your guest list** in real-time
3. **Send notifications** about new RSVPs
4. **Track response rates** and follow up with maybe guests

Your wedding planning just got a whole lot smarter! 💍✨

## 🚨 Important Notes

### OAuth Consent Screen Configuration
When setting up the OAuth consent screen, you may need to:
1. Add your email as a test user
2. Publish the app (for production use)
3. Add necessary scopes for Gmail access

### First-Time Authentication
The first time you start email monitoring:
1. A browser window will open
2. You'll be asked to sign in to your Google account
3. Grant permission to access your Gmail
4. The system will save the token for future use

### Testing Without Gmail API
If you want to test the functionality without setting up Gmail API:
```bash
cd mcp-server
source venv/bin/activate
python test_email_monitor.py
```

This will test the email analysis functionality using mock data. 