import motor.motor_asyncio
import os
import json
import datetime
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "Final_Year")
LOCAL_HISTORY_FILE = "analysis_history.json"

# Initialize MongoDB client
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=2000)
db = client[DB_NAME]
history_collection = db["analysis_history"]

async def save_to_local(data: dict):
    """Fallback: Save to a local JSON file if MongoDB is offline."""
    history = []
    if os.path.exists(LOCAL_HISTORY_FILE):
        with open(LOCAL_HISTORY_FILE, "r") as f:
            try:
                history = json.load(f)
            except:
                history = []
    
    # Prepend to keep it sorted (newest first)
    history.insert(0, data)
    # Keep only last 50
    history = history[:50]
    
    with open(LOCAL_HISTORY_FILE, "w") as f:
        json.dump(history, f, indent=4)

async def save_analysis(data: dict):
    try:
        # Try MongoDB first
        await history_collection.insert_one(data.copy())
        print("Successfully saved to MongoDB")
    except Exception as e:
        print(f"MongoDB offline/error, using local fallback: {e}")
        # Local fallback
        await save_to_local(data)

async def get_history(limit: int = 10):
    try:
        # Try MongoDB first (with a short timeout)
        cursor = history_collection.find().sort("_id", -1).limit(limit)
        history = []
        async for document in cursor:
            document["_id"] = str(document["_id"])
            history.append(document)
        
        if len(history) > 0:
            return history
    except:
        pass
    
    # If MongoDB fails or is empty, try local file
    if os.path.exists(LOCAL_HISTORY_FILE):
        with open(LOCAL_HISTORY_FILE, "r") as f:
            try:
                return json.load(f)[:limit]
            except:
                return []
    
    return []
