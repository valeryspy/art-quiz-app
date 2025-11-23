from flask import Blueprint, request, jsonify, session, current_app
from app.models import DataLoader, UserManager

api_bp = Blueprint('api', __name__)
user_manager = UserManager()

def get_data_loader():
    return DataLoader(current_app.config['DATA_FOLDER'])

@api_bp.route('/artworks')
def get_artworks():
    loader = get_data_loader()
    source = request.args.get('source', 'all')
    if source == 'editors':
        return jsonify(loader.editors_choice)
    return jsonify(loader.wikidata_artworks)

@api_bp.route('/artists')
def get_artists():
    loader = get_data_loader()
    source = request.args.get('source', 'all')
    artworks = loader.editors_choice if source == 'editors' else loader.wikidata_artworks
    artists = list(set([a['artist'] for a in artworks if a['artist']]))
    return jsonify(artists)

@api_bp.route('/movements')
def get_movements():
    loader = get_data_loader()
    source = request.args.get('source', 'all')
    artworks = loader.editors_choice if source == 'editors' else loader.wikidata_artworks
    movements = list(set([a['movement'] for a in artworks if 'movement' in a and a['movement']]))
    return jsonify(['All'] + sorted(movements))

@api_bp.route('/artist-info/<artist_name>')
def get_artist_info(artist_name):
    loader = get_data_loader()
    artist_data = next((a for a in loader.artist_info if a['artist'] == artist_name), None)
    
    if not artist_data:
        return jsonify({'error': 'Artist not found'}), 404
    
    if artist_name in loader.artist_desc:
        return jsonify({
            'artist': artist_name,
            'artist_summary': loader.artist_desc[artist_name],
            'wiki_link': artist_data.get('wiki_link', ''),
            'image_url': artist_data.get('image_url', ''),
            'period': artist_data.get('period', ''),
            'years': artist_data.get('years', ''),
            'movement': artist_data.get('movement', ''),
            'country': artist_data.get('country', ''),
            'is_html': True
        })
    
    return jsonify({**artist_data, 'is_html': False})

@api_bp.route('/user/collection', methods=['GET', 'POST'])
def user_collection():
    if 'username' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    username = session['username']
    
    if request.method == 'GET':
        user_profile = user_manager.get_user(username)
        return jsonify(user_profile['collection'])
    
    data = request.get_json()
    collection = data.get('collection', [])
    user_manager.create_or_update_user(username, collection=collection)
    return jsonify({'success': True})

@api_bp.route('/user/quiz-result', methods=['POST'])
def save_quiz_result():
    if 'username' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    username = session['username']
    data = request.get_json()
    correct = data.get('correct', 0)
    total = data.get('total', 0)
    
    user = user_manager.get_user(username)
    stats = user.get('quiz_stats', {'correct': 0, 'total': 0})
    stats['correct'] += correct
    stats['total'] += total
    
    user_manager.create_or_update_user(username, quiz_stats=stats)
    return jsonify({'success': True})
