from flask import Blueprint, request, jsonify, session, current_app
from app.models import DataLoader, UserManager
from db_auth import get_user_data, update_user_data, add_to_collection, remove_from_collection

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

@api_bp.route('/user/collection', methods=['GET'])
def user_collection():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    user_id = session['user_id']
    user_data = get_user_data(user_id)
    # Returns array of artwork_ids
    return jsonify(user_data.get('collection', []))

@api_bp.route('/user/collection/add', methods=['POST'])
def add_artwork():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    user_id = session['user_id']
    data = request.get_json()
    artwork_id = data.get('artwork_id')
    
    if not artwork_id:
        return jsonify({'error': 'artwork_id required'}), 400
    
    success = add_to_collection(user_id, artwork_id)
    return jsonify({'success': success})

@api_bp.route('/user/collection/remove', methods=['POST'])
def remove_artwork():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    user_id = session['user_id']
    data = request.get_json()
    artwork_id = data.get('artwork_id')
    
    if not artwork_id:
        return jsonify({'error': 'artwork_id required'}), 400
    
    success = remove_from_collection(user_id, artwork_id)
    return jsonify({'success': success})

@api_bp.route('/user/quiz-result', methods=['POST'])
def save_quiz_result():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    user_id = session['user_id']
    data = request.get_json()
    correct = data.get('correct', 0)
    total = data.get('total', 0)
    
    user_data = get_user_data(user_id)
    stats = user_data.get('quiz_stats', {'correct': 0, 'total': 0})
    stats['correct'] += correct
    stats['total'] += total
    
    update_user_data(user_id, {'quiz_stats': stats})
    return jsonify({'success': True})
