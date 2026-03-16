import google.generativeai as genai
import os
from dotenv import load_dotenv
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
print(f"API Key: {os.getenv('GEMINI_API_KEY')[:10]}...")
try:
    model = genai.GenerativeModel('gemini-pro-latest')


    response = model.generate_content("Hello")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
