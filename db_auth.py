import os
import hashlib
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def register_user(username: str, password: str):
    password_hash = hash_password(password)
    result = supabase.table("users").insert({
        "username": username,
        "password_hash": password_hash
    }).execute()
    
    user_id = result.data[0]["id"]
    supabase.table("user_data").insert({
        "user_id": user_id,
        "collection": [],  # Array of artwork_id strings
        "quiz_history": [],
        "total_score": 0,
        "games_played": 0,
        "quiz_stats": {"correct": 0, "total": 0}
    }).execute()
    
    return result.data[0]

def add_to_collection(user_id: str, artwork_id: str):
    """Add artwork_id to user's collection"""
    user_data = get_user_data(user_id)
    collection = user_data.get('collection', [])
    if artwork_id not in collection:
        collection.append(artwork_id)
        update_user_data(user_id, {'collection': collection})
        return True
    return False

def remove_from_collection(user_id: str, artwork_id: str):
    """Remove artwork_id from user's collection"""
    user_data = get_user_data(user_id)
    collection = user_data.get('collection', [])
    if artwork_id in collection:
        collection.remove(artwork_id)
        update_user_data(user_id, {'collection': collection})
        return True
    return False

def login_user(username: str, password: str):
    password_hash = hash_password(password)
    result = supabase.table("users").select("*").eq("username", username).eq("password_hash", password_hash).execute()
    return result.data[0] if result.data else None

def get_user_data(user_id: str):
    result = supabase.table("user_data").select("*").eq("user_id", user_id).execute()
    return result.data[0] if result.data else None

def update_user_data(user_id: str, data: dict):
    supabase.table("user_data").update(data).eq("user_id", user_id).execute()
