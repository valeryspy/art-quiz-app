import requests
import pandas as pd

# SPARQL query: best 100 paintings from Louvre (ordered by sitelinks)
query = """
SELECT ?artwork ?artworkLabel ?artist ?artistLabel ?year 
       ?location ?locationLabel ?image ?sitelinks 
       ?material ?materialLabel ?genre ?genreLabel ?artType ?artTypeLabel
WHERE {
  ?artwork wdt:P170 ?artist;           # created by artist
           wdt:P571 ?year;             # creation date
           wdt:P18 ?image;             # image
           wikibase:sitelinks ?sitelinks. 

  # Bind location properly
  ?artwork wdt:P276 ?location .
  FILTER(?location = wd:Q19675)        # Louvre

  OPTIONAL { ?artwork wdt:P186 ?material. }   # material used
  OPTIONAL { ?artwork wdt:P136 ?genre. }      # genre
  OPTIONAL { ?artwork wdt:P31 ?artType. }     # instance of (art type)

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY DESC(?sitelinks)
LIMIT 2000
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
            
        # New artwork entry
        artwork_dict[key] = {
            "image_url": image_url,
            "artwork_id": f"wikidata_{len(artwork_dict)+1}",
            "title": title,
            "artist": artist,
            "category": "Painting",
            "year": year_raw[:4] if year_raw else '',
            "museum": museum,
            "material": material if material else "Unknown",
            "genre": genre if genre else "Unknown",
            "art_type": art_type if art_type else "Unknown"
        }

results = list(artwork_dict.values())

# Convert to DataFrame
df = pd.DataFrame(results)
print(df.head())

# Optional: save to CSV
df.to_csv("wikidata_artworks.csv", index=False)
