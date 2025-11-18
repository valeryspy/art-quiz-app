from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__, static_folder='.')
CORS(app)

# Load NGA data once at startup
nga_df = pd.read_csv('artworks.csv')
nga_df = nga_df.where(pd.notnull(nga_df), None)
nga_data = nga_df.to_dict('records')

# Load Wiki data from CSV file
try:
    wiki_df = pd.read_csv('wiki_artworks.csv')
    wiki_df = wiki_df.fillna('')
    wiki_data = wiki_df.to_dict('records')
    print(f"Loaded {len(wiki_data)} wiki artworks")
except Exception as e:
    print(f"Error loading wiki data: {e}")
    wiki_data = []

# Load Louvre data from CSV file
try:
    louvre_df = pd.read_csv('wikidata_artworks.csv')
    louvre_df = louvre_df.fillna('')
    louvre_data = louvre_df.to_dict('records')
    print(f"Loaded {len(louvre_data)} louvre artworks")
except Exception as e:
    print(f"Error loading louvre data: {e}")
    louvre_data = []

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)

@app.route('/api/artworks')
def get_artworks():
    source = request.args.get('source', 'nga')
    if source == 'wiki':
        return jsonify(wiki_data)
    elif source == 'louvre':
        return jsonify(louvre_data)
    return jsonify(nga_data)

@app.route('/api/artists')
def get_artists():
    source = request.args.get('source', 'nga')
    if source == 'wiki':
        artists = list(set([artwork['attribution'] for artwork in wiki_data if artwork['attribution']]))
        return jsonify(artists)
    elif source == 'louvre':
        artists = list(set([artwork['attribution'] for artwork in louvre_data if artwork['attribution']]))
        return jsonify(artists)
    artists = nga_df['attribution'].dropna().unique().tolist()
    return jsonify(artists)

@app.route('/api/categories')
def get_categories():
    source = request.args.get('source', 'nga')
    if source == 'wiki':
        categories = list(set([artwork['classification'] for artwork in wiki_data if artwork['classification']]))
        return jsonify(['All'] + categories)
    elif source == 'louvre':
        categories = ['Paintings']
        return jsonify(['All'] + categories)
    categories = nga_df['classification'].dropna().unique().tolist()
    return jsonify(['All'] + categories)

if __name__ == '__main__':
    app.run(debug=True, port=7860, host='0.0.0.0')