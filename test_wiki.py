import requests
import pandas as pd

# SPARQL query: best 100 paintings from Louvre (ordered by sitelinks)
query = """
SELECT ?artwork ?artworkLabel ?artist ?artistLabel ?year ?museum ?museumLabel ?image ?sitelinks
WHERE {
  ?artwork wdt:P31 wd:Q3305213;       # instance of painting
           wdt:P170 ?artist;          # created by artist
           wdt:P571 ?year;            # creation date
           wdt:P276 wd:Q19675;        # located in Louvre (Q19675)
           wdt:P18 ?image;            # image
           wikibase:sitelinks ?sitelinks.  # popularity metric

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY DESC(?sitelinks)             # most popular first
LIMIT 100
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
        existing_year = artwork_dict[key]['beginyear']
        new_year = year_raw[:4] if year_raw else ''
        if new_year and new_year not in str(existing_year):
            artwork_dict[key]['beginyear'] = f"{existing_year}-{new_year}"
    else:
        # Skip artworks with invalid artist names (Wikidata IDs)
        if artist.startswith('Q') and artist[1:].isdigit():
            continue
            
        # New artwork entry
        artwork_dict[key] = {
            "iiifurl": image_url,
            "iiifthumburl": image_url,
            "objectid": f"louvre_{len(artwork_dict)+1}",
            "title": title,
            "attribution": artist,
            "classification": "Painting",
            "beginyear": year_raw[:4] if year_raw else '',
            "medium": "Louvre Collection"
        }

results = list(artwork_dict.values())

# Convert to DataFrame
df = pd.DataFrame(results)
print(df.head())

# Optional: save to CSV
df.to_csv("wikidata_artworks.csv", index=False)
