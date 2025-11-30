import json
from db_auth import supabase, hash_password

# Load existing user_data.json
with open('user_data.json', 'r') as f:
    users = json.load(f)

# Migrate each user to Supabase
for username, data in users.items():
    # Extract artwork_ids from collection
    artwork_ids = [item.get('artwork_id') for item in data.get('collection', []) if item.get('artwork_id')]
    password = data.get('password', 'defaultpass')
    
    # Check if user exists
    result = supabase.table('users').select('id').eq('username', username).execute()
    
    if result.data:
        # User exists, update collection
        user_id = result.data[0]['id']
        supabase.table('user_data').update({
            'collection': artwork_ids,
            'quiz_stats': data.get('quiz_stats', {'correct': 0, 'total': 0}),
            'total_score': data.get('total_score', 0),
            'games_played': data.get('games_played', 0)
        }).eq('user_id', user_id).execute()
        print(f"✓ Updated {username}: {len(artwork_ids)} artworks")
    else:
        # Create new user
        password_hash = hash_password(password)
        user_result = supabase.table('users').insert({
            'username': username,
            'password_hash': password_hash
        }).execute()
        
        user_id = user_result.data[0]['id']
        supabase.table('user_data').insert({
            'user_id': user_id,
            'collection': artwork_ids,
            'quiz_stats': data.get('quiz_stats', {'correct': 0, 'total': 0}),
            'total_score': data.get('total_score', 0),
            'games_played': data.get('games_played', 0)
        }).execute()
        print(f"✓ Created {username}: {len(artwork_ids)} artworks")

print("\nMigration complete!")
