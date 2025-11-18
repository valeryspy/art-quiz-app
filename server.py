from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__, static_folder='.')
CORS(app)

# Load Wikidata artworks from CSV file
try:
    wikidata_df = pd.read_csv('wikidata_artworks.csv')
    wikidata_df = wikidata_df.fillna('')
    wikidata_artworks = wikidata_df.to_dict('records')
    print(f"Loaded {len(wikidata_artworks)} wikidata artworks")
except Exception as e:
    print(f"Error loading wikidata artworks: {e}")
    wikidata_artworks = []

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

if __name__ == '__main__':
    app.run(debug=True, port=7860, host='0.0.0.0')