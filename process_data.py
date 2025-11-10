import pandas as pd

# Load CSV files
objects = pd.read_csv('objects.csv')
images = pd.read_csv('published_images.csv')

# Merge on objectid/depictstmsobjectid
merged = objects.merge(images[['depictstmsobjectid', 'iiifurl', 'iiifthumburl']], 
                      left_on='objectid', right_on='depictstmsobjectid', how='inner')

# Select and rename columns
result = merged[['iiifurl', 'iiifthumburl', 'objectid', 'title', 'attribution', 'wikidataid', 
                'classification', 'subclassification', 'beginyear', 'medium']].copy()

# Filter out rows with missing essential data
result = result.dropna(subset=['iiifurl', 'objectid', 'title', 'attribution'])
result = result[result['attribution'].str.strip() != '']

# Save to new CSV
result.to_csv('artworks.csv', index=False)
print(f"Created artworks.csv with {len(result)} rows")