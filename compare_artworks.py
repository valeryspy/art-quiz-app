import pandas as pd

# Load both CSV files
list_df = pd.read_csv('list.csv')
wiki_df = pd.read_csv('wikidata_artworks.csv')

# Normalize strings for comparison
list_df['artwork_norm'] = list_df['artwork'].str.lower().str.strip()
list_df['artist_norm'] = list_df['artist'].str.lower().str.strip()
wiki_df['title_norm'] = wiki_df['title'].str.lower().str.strip()
wiki_df['artist_norm'] = wiki_df['artist'].str.lower().str.strip()

# Merge on normalized artwork title and artist
merged_df = list_df.merge(
    wiki_df,
    left_on=['artwork_norm', 'artist_norm'],
    right_on=['title_norm', 'artist_norm'],
    how='left',
    indicator=True
)

# Filter matches
matches = merged_df[merged_df['_merge'] == 'both'].copy()
no_matches = merged_df[merged_df['_merge'] == 'left_only'].copy()

# Select relevant columns from wikidata for matches
result_df = matches[['artist_x', 'artwork', 'year_x', 'location'] + 
                     [col for col in wiki_df.columns if col not in ['title', 'artist', 'year', 'title_norm', 'artist_norm']]].copy()

# Rename columns
result_df.columns = ['artist', 'artwork', 'year', 'location'] + [col for col in result_df.columns[4:]]

# Save results
result_df.to_csv('list_with_wikidata.csv', index=False)
matches[['artist_x', 'artwork', 'artwork_id']].to_csv('matched_artworks.csv', index=False)
no_matches[['artist_x', 'artwork']].to_csv('unmatched_artworks.csv', index=False)

print(f"Total artworks in list: {len(list_df)}")
print(f"Matched with wikidata: {len(matches)}")
print(f"Not matched: {len(no_matches)}")
print(f"\nResults saved to:")
print("- list_with_wikidata.csv (list with wikidata fields)")
print("- matched_artworks.csv")
print("- unmatched_artworks.csv")
