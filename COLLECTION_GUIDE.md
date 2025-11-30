# User Collection with Unique Artwork IDs

## Overview
User collections now store only artwork IDs (strings) instead of full artwork objects, making the database more efficient and normalized.

## Database Structure

### Artworks Table
Stores all artwork metadata with unique `artwork_id` as primary key:
- `artwork_id` (TEXT, PRIMARY KEY) - Unique identifier for each artwork
- `artist_id` (TEXT) - Artist identifier
- `title`, `artist`, `year`, `image_url`, `museum`, `material`, `genre`, `movement`, `category`

### User Collections
The `user_data.collection` field stores an array of `artwork_id` strings:
```json
{
  "collection": ["482db68d82cf", "91ff159a9a1c", "e76c83d431a4"]
}
```

## API Endpoints

### Get User Collection
```
GET /api/user/collection
Returns: ["artwork_id1", "artwork_id2", ...]
```

### Add to Collection
```
POST /api/user/collection/add
Body: { "artwork_id": "482db68d82cf" }
Returns: { "success": true }
```

### Remove from Collection
```
POST /api/user/collection/remove
Body: { "artwork_id": "482db68d82cf" }
Returns: { "success": true }
```

## Python Functions

```python
from db_auth import add_to_collection, remove_from_collection, get_user_data

# Add artwork to collection
add_to_collection(user_id, "482db68d82cf")

# Remove artwork from collection
remove_from_collection(user_id, "482db68d82cf")

# Get user's collection (returns list of artwork_ids)
user_data = get_user_data(user_id)
artwork_ids = user_data['collection']
```

## Frontend Usage

To display full artwork details, fetch the artwork_ids from the collection endpoint, then look up each artwork in your artworks data:

```javascript
// Get user's collection
const response = await fetch('/api/user/collection');
const artworkIds = await response.json();

// Get all artworks
const artworksResponse = await fetch('/api/artworks');
const allArtworks = await artworksResponse.json();

// Filter to get user's collection with full details
const userCollection = allArtworks.filter(art => 
  artworkIds.includes(art.artwork_id)
);
```

## Benefits
- **Efficient storage**: Only IDs stored, not full objects
- **Data consistency**: Single source of truth for artwork data
- **Easy updates**: Update artwork data once, reflects everywhere
- **Smaller payloads**: Faster API responses
