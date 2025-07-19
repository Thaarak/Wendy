from dotenv import load_dotenv
load_dotenv()
import os
import openai

print("Loaded OpenAI API key:", os.getenv("OPENAI_API_KEY"))

# Mocked LLM for demo/testing

def process_vendor_reply(conversation, latest_message):
    # Return a static prompt for the user
    return '{"action": "prompt_user", "content": "The vendor asked for more details. Please provide the required information."}'

def generate_initial_email(vendor_type, event_date, context=None):
    # Return a static email body for demo/testing
    return f"Hello, I would like to book your {vendor_type} for an event on {event_date}. Please let me know if you are available. Thank you!" 