import requests
import pandas as pd
import hashlib
import time

# SPARQL query: artworks from major museums (ordered by sitelinks)
query = """
SELECT ?artwork ?artworkLabel ?artist ?artistLabel ?year 
       ?location ?locationLabel ?image ?sitelinks 
       ?material ?materialLabel ?genre ?genreLabel ?artType ?artTypeLabel ?movement ?movementLabel
WHERE {
  ?artwork wdt:P170 ?artist;           # created by artist
           wdt:P571 ?year;             # creation date
           wdt:P18 ?image;             # image
           wikibase:sitelinks ?sitelinks. 

  # Bind location properly
  ?artwork wdt:P276 ?location .
  FILTER(?location IN (
    wd:Q19675,      # Louvre Museum
    wd:Q6373,       # British Museum
    wd:Q160236,     # Metropolitan Museum of Art
    wd:Q2943,       # Vatican Museums
    wd:Q190804,     # Rijksmuseum
    wd:Q132783,     # State Hermitage Museum
    wd:Q160112,     # Museo del Prado
    wd:Q193375,     # Tate Modern
    wd:Q23402,      # Musée d'Orsay
    wd:Q180788,     # National Gallery London
    wd:Q51252,      # Uffizi Gallery
    wd:Q239303,     # Art Institute of Chicago
    wd:Q207694,     # Tokyo National Museum
    wd:Q201469,     # Guggenheim Museum NYC
    wd:Q1976985     # Nelson-Atkins Museum of Art
  ))

  OPTIONAL { ?artwork wdt:P186 ?material. }   # material used
  OPTIONAL { ?artwork wdt:P136 ?genre. }      # genre
  OPTIONAL { ?artwork wdt:P31 ?artType. }     # instance of (art type)
  OPTIONAL { ?artwork wdt:P135 ?movement. }   # art movement

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY DESC(?sitelinks)
LIMIT 100000
"""

url = "https://query.wikidata.org/sparql"
headers = {"Accept": "application/sparql-results+json"}

response = requests.get(url, params={"query": query}, headers=headers)
data = response.json()

# Parse results and group by artwork+artist to handle duplicates
artwork_dict = {}
for item in data['results']['bindings']:
    title = item['artworkLabel']['value']
    artist = item['artistLabel']['value']
    year_raw = item['year']['value']
    
    # Get additional fields
    material = item.get('materialLabel', {}).get('value', '')
    genre = item.get('genreLabel', {}).get('value', '')
    museum = item.get('locationLabel', {}).get('value', '')
    art_type = item.get('artTypeLabel', {}).get('value', '')
    movement = item.get('movementLabel', {}).get('value', '')


    
    # Create unique key for artwork+artist
    key = f"{title}_{artist}"
    
    # Get original image URL and create thumbnail
    original_url = item['image']['value']
    if 'Special:FilePath' in original_url:
        image_url = original_url + '?width=400'
    else:
        image_url = original_url
    
    if key in artwork_dict:
        # Add year to existing entry
        existing_year = artwork_dict[key]['year']
        new_year = year_raw[:4] if year_raw else ''
        if new_year and new_year not in str(existing_year):
            artwork_dict[key]['year'] = f"{existing_year}-{new_year}"
    else:
        # Skip artworks with invalid or blank artist names
        if (not artist or 
            artist.startswith('Q') and artist[1:].isdigit() or
            'wikidata.org' in artist or
            'genid' in artist):
            continue
            
        # Generate unique IDs
        artwork_id = hashlib.md5(f"{artist}_{title}".encode()).hexdigest()[:12]
        artist_id = hashlib.md5(artist.encode()).hexdigest()[:12]
        
        # New artwork entry
        artwork_dict[key] = {
            "image_url": image_url,
            "artwork_id": artwork_id,
            "artist_id": artist_id,
            "title": title,
            "artist": artist,
            "category": "Painting",
            "year": year_raw[:4] if year_raw else '',
            "museum": museum,
            "material": material if material else "Unknown",
            "genre": genre if genre else "Unknown",
            "art_type": art_type if art_type else "Unknown",
            "movement": movement if movement else "Unknown"
        }

results = list(artwork_dict.values())

# Load unmatched artworks and fetch them from Wikidata
try:
    unmatched_df = pd.read_csv('unmatched_artworks.csv')
    print(f"\nFetching {len(unmatched_df)} unmatched artworks...")
    
    for _, row in unmatched_df.iterrows():
        artist_name = row['artist_x']
        artwork_name = row['artwork']
        
        # SPARQL query for specific artwork
        specific_query = f"""
        SELECT ?artwork ?artworkLabel ?artist ?artistLabel ?year 
               ?location ?locationLabel ?image
               ?material ?materialLabel ?genre ?genreLabel ?artType ?artTypeLabel ?movement ?movementLabel
        WHERE {{
          ?artwork wdt:P170 ?artist;
                   rdfs:label ?artworkLabel;
                   wdt:P18 ?image.
          ?artist rdfs:label ?artistLabel.
          
          FILTER(LANG(?artworkLabel) = "en")
          FILTER(LANG(?artistLabel) = "en")
          FILTER(CONTAINS(LCASE(?artworkLabel), LCASE("{artwork_name}")))
          FILTER(CONTAINS(LCASE(?artistLabel), LCASE("{artist_name}")))
          
          OPTIONAL {{ ?artwork wdt:P571 ?year. }}
          OPTIONAL {{ ?artwork wdt:P276 ?location. }}
          OPTIONAL {{ ?artwork wdt:P186 ?material. }}
          OPTIONAL {{ ?artwork wdt:P136 ?genre. }}
          OPTIONAL {{ ?artwork wdt:P31 ?artType. }}
          OPTIONAL {{ ?artwork wdt:P135 ?movement. }}
          
          SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
        }}
        LIMIT 1
        """
        
        try:
            time.sleep(1)  # Rate limiting
            resp = requests.get(url, params={"query": specific_query}, headers=headers, timeout=30)
            specific_data = resp.json()
            
            if specific_data['results']['bindings']:
                item = specific_data['results']['bindings'][0]
                title = item['artworkLabel']['value']
                artist = item['artistLabel']['value']
                
                key = f"{title}_{artist}"
                if key not in artwork_dict:
                    year_raw = item.get('year', {}).get('value', '')
                    material = item.get('materialLabel', {}).get('value', '')
                    genre = item.get('genreLabel', {}).get('value', '')
                    museum = item.get('locationLabel', {}).get('value', '')
                    art_type = item.get('artTypeLabel', {}).get('value', '')
                    movement = item.get('movementLabel', {}).get('value', '')
                    
                    original_url = item['image']['value']
                    image_url = original_url + '?width=400' if 'Special:FilePath' in original_url else original_url
                    
                    artwork_id = hashlib.md5(f"{artist}_{title}".encode()).hexdigest()[:12]
                    artist_id = hashlib.md5(artist.encode()).hexdigest()[:12]
                    
                    artwork_dict[key] = {
                        "image_url": image_url,
                        "artwork_id": artwork_id,
                        "artist_id": artist_id,
                        "title": title,
                        "artist": artist,
                        "category": "Painting",
                        "year": year_raw[:4] if year_raw else '',
                        "museum": museum if museum else "Unknown",
                        "material": material if material else "Unknown",
                        "genre": genre if genre else "Unknown",
                        "art_type": art_type if art_type else "Unknown",
                        "movement": movement if movement else "Unknown"
                    }
                    print(f"  Added: {title} by {artist}")
                else:
                    print(f"  Skipped (duplicate): {artwork_name}")
            else:
                print(f"  Not found: {artwork_name} by {artist_name}")
        except requests.exceptions.Timeout:
            print(f"  Timeout: {artwork_name} - skipping")
        except Exception as e:
            print(f"  Error fetching {artwork_name}: {str(e)[:50]}")
            continue
            
except FileNotFoundError:
    print("\nNo unmatched_artworks.csv found, skipping...")
except Exception as e:
    print(f"\nError processing unmatched artworks: {e}")

results = list(artwork_dict.values())

# Convert to DataFrame
df = pd.DataFrame(results)
print(f"\nTotal artworks: {len(df)}")
print(df.head())

# Save to CSV
df.to_csv("wikidata_artworks.csv", index=False)
print("\nSaved to wikidata_artworks.csv")
