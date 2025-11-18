import requests
import pandas as pd
import time

def fetch_paintings_from_commons():
    all_artworks = []
    
    # Try one category at a time
    categories = [
        'Category:Paintings by Peter Paul Rubens'
    ]
    
    for category in categories:
        params = {
            'action': 'query',
            'format': 'json',
            'list': 'categorymembers',
            'cmtitle': category,
            'cmlimit': 500,
            'cmtype': 'file'
        }
        
        headers = {
            'User-Agent': 'ArtQuizApp/1.0 (https://example.com/contact) requests/2.28.0'
        }
        
        try:
            response = requests.get('https://commons.wikimedia.org/w/api.php', params=params, headers=headers)
            
            if response.status_code != 200:
                print(f"Failed to fetch {category}: {response.status_code}")
                continue
                
            data = response.json()
        except Exception as e:
            print(f"Error fetching {category}: {e}")
            continue
        
        files = data.get('query', {}).get('categorymembers', [])
        print(f"Found {len(files)} files in {category}")
        
        files_processed = 0
        for i, file_info in enumerate(files[:100]):  # Limit to 100 per category
            files_processed += 1
            filename = file_info['title']
            
            # Get file details
            file_params = {
                'action': 'query',
                'format': 'json',
                'titles': filename,
                'prop': 'imageinfo',
                'iiprop': 'url|extmetadata'
            }
            
            file_response = requests.get('https://commons.wikimedia.org/w/api.php', params=file_params, headers=headers)
            file_data = file_response.json()
            
            pages = file_data.get('query', {}).get('pages', {})
            for page_id, page_info in pages.items():
                imageinfo = page_info.get('imageinfo', [{}])[0]
                metadata = imageinfo.get('extmetadata', {})
                
                # Clean title and artist from HTML tags
                import re
                title_raw = metadata.get('ObjectName', {}).get('value', filename.replace('File:', '').split('.')[0])
                artist_raw = metadata.get('Artist', {}).get('value', 'Unknown')
                
                # Remove HTML tags and clean up
                title = re.sub(r'<[^>]+>', '', str(title_raw)).strip()
                artist = re.sub(r'<[^>]+>', '', str(artist_raw)).strip()
                
                # Skip if title or artist is too messy
                if len(title) > 100 or 'File:' in title or len(artist) > 50:
                    continue
                    
                date = metadata.get('DateTimeOriginal', {}).get('value', '')
                
                # Extract year
                year = None
                if date:
                    year_match = re.search(r'\b(\d{4})\b', date)
                    if year_match:
                        year = int(year_match.group(1))
                
                all_artworks.append({
                    'iiifurl': imageinfo.get('url', ''),
                    'iiifthumburl': imageinfo.get('url', ''),
                    'objectid': f'wiki_{len(all_artworks)+1}',
                    'title': title,
                    'attribution': artist,
                    'classification': 'Painting',
                    'beginyear': year,
                    'medium': 'oil on canvas'
                })
            
            time.sleep(0.2)  # Rate limiting
            
        print(f"Actually processed {files_processed} files from {category}")
        time.sleep(1)  # Pause between categories
    
    return all_artworks

def main():
    print("Fetching paintings from Wikimedia Commons...")
    artworks = fetch_paintings_from_commons()
    
    df = pd.DataFrame(artworks)
    df.to_csv('wiki_artworks.csv', index=False)
    print(f"Saved {len(artworks)} artworks to wiki_artworks.csv")

if __name__ == '__main__':
    main()