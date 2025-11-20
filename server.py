from flask import Flask, jsonify, send_from_directory, request, session
from flask_cors import CORS
import pandas as pd
import os
import json
from datetime import datetime

app = Flask(__name__, static_folder='.')
app.secret_key = 'art-quiz-secret-key-2024'
CORS(app, supports_credentials=True)

# Load Wikidata artworks from CSV file
try:
    wikidata_df = pd.read_csv('wikidata_artworks.csv')
    wikidata_df = wikidata_df.fillna('')
    wikidata_artworks = wikidata_df.to_dict('records')
    print(f"Loaded {len(wikidata_artworks)} wikidata artworks")
except Exception as e:
    print(f"Error loading wikidata artworks: {e}")
    wikidata_artworks = []

# Simple user data storage (in production, use a proper database)
USER_DATA_FILE = 'user_data.json'

def load_user_data():
    if os.path.exists(USER_DATA_FILE):
        with open(USER_DATA_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_user_data(data):
    with open(USER_DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def get_user_profile(username):
    users = load_user_data()
    return users.get(username, {
        'collection': [],
        'quiz_history': [],
        'quiz_stats': {'correct': 0, 'total': 0}
    })

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)

@app.route('/api/artworks')
def get_artworks():
    return jsonify(wikidata_artworks)

@app.route('/api/artists')
def get_artists():
    artists = list(set([artwork['artist'] for artwork in wikidata_artworks if artwork['artist']]))
    return jsonify(artists)

@app.route('/api/categories')
def get_categories():
    categories = list(set([artwork['category'] for artwork in wikidata_artworks if artwork['category']]))
    return jsonify(['All'] + categories)

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    users = load_user_data()
    
    # Check if user exists
    if username in users:
        # Verify password
        if users[username].get('password') != password:
            return jsonify({'error': 'Invalid password'}), 401
    else:
        # Create new user
        users[username] = get_user_profile(username)
        users[username]['password'] = password
        save_user_data(users)
    
    session['username'] = username
    user_profile = get_user_profile(username)
    return jsonify({'success': True, 'username': username, 'profile': user_profile})

@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('username', None)
    return jsonify({'success': True})

@app.route('/api/user/collection', methods=['GET', 'POST'])
def user_collection():
    if 'username' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    username = session['username']
    users = load_user_data()
    
    if request.method == 'GET':
        user_profile = get_user_profile(username)
        return jsonify(user_profile['collection'])
    
    elif request.method == 'POST':
        data = request.get_json()
        collection = data.get('collection', [])
        
        if username not in users:
            users[username] = get_user_profile(username)
        
        users[username]['collection'] = collection
        save_user_data(users)
        return jsonify({'success': True})

@app.route('/api/user/profile')
def get_profile():
    if 'username' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    username = session['username']
    user_profile = get_user_profile(username)
    return jsonify({'username': username, 'profile': user_profile})

@app.route('/api/user/quiz-result', methods=['POST'])
def save_quiz_result():
    if 'username' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    username = session['username']
    data = request.get_json()
    correct = data.get('correct', 0)
    total = data.get('total', 0)
    
    users = load_user_data()
    if username not in users:
        users[username] = get_user_profile(username)
    
    # Initialize quiz_stats if not exists
    if 'quiz_stats' not in users[username]:
        users[username]['quiz_stats'] = {'correct': 0, 'total': 0}
    
    # Update stats
    users[username]['quiz_stats']['correct'] += correct
    users[username]['quiz_stats']['total'] += total
    
    save_user_data(users)
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True, port=7860, host='0.0.0.0')