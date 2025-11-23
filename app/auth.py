from flask import Blueprint, request, jsonify, session
from app.models import UserManager

auth_bp = Blueprint('auth', __name__)
user_manager = UserManager()

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    users = user_manager.load_users()
    
    if username in users:
        if users[username].get('password') != password:
            return jsonify({'error': 'Invalid password'}), 401
    else:
        user_manager.create_or_update_user(username, password=password)
    
    session['username'] = username
    user_profile = user_manager.get_user(username)
    return jsonify({'success': True, 'username': username, 'profile': user_profile})

@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.pop('username', None)
    return jsonify({'success': True})

@auth_bp.route('/profile')
def profile():
    if 'username' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    username = session['username']
    user_profile = user_manager.get_user(username)
    return jsonify({'username': username, 'profile': user_profile})
