from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd

app = Flask(__name__, static_folder='.')
CORS(app)

# Load data once at startup
artworks_df = pd.read_csv('artworks.csv')
# Replace NaN with None for JSON serialization
artworks_df = artworks_df.where(pd.notnull(artworks_df), None)
artworks_data = artworks_df.to_dict('records')

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)

@app.route('/api/artworks')
def get_artworks():
    return jsonify(artworks_data)

@app.route('/api/artists')
def get_artists():
    artists = artworks_df['attribution'].dropna().unique().tolist()
    return jsonify(artists)

if __name__ == '__main__':
    app.run(debug=True, port=8000, host='0.0.0.0')