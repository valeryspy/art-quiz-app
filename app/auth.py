from flask import Blueprint, request, jsonify, session
from app.models import UserManager
from db_auth import register_user, login_user, get_user_data

auth_bp = Blueprint('auth', __name__)
user_manager = UserManager()

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    try:
        user = register_user(username, password)
        session['username'] = username
        session['user_id'] = user['id']
        return jsonify({'success': True, 'username': username, 'user_id': user['id']})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    user = login_user(username, password)
    if user:
        session['username'] = username
        session['user_id'] = user['id']
        user_data = get_user_data(user['id'])
        return jsonify({'success': True, 'username': username, 'user_id': user['id'], 'profile': user_data})
    
    return jsonify({'error': 'Invalid credentials'}), 401

@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.pop('username', None)
    return jsonify({'success': True})

@auth_bp.route('/profile')
def profile():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    username = session.get('username')
    user_id = session['user_id']
    user_data = get_user_data(user_id)
    return jsonify({'username': username, 'profile': user_data})
