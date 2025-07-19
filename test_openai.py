import os
import openai
from dotenv import load_dotenv; load_dotenv()

client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
try:
    print(client.models.list())
except Exception as e:
    print("OpenAI error:", e) 