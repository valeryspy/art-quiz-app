// API Client
const API = {
    async get(url) {
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) throw new Error(`API error: ${response.statusText}`);
        return response.json();
    },
    
    async post(url, data) {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `API error: ${response.statusText}`);
        }
        return response.json();
    },
    
    async register(username, password) {
        return this.post('/auth/register', { username, password });
    },
    
    async login(username, password) {
        return this.post('/auth/login', { username, password });
    }
};

// Global State
const AppState = {
    currentUser: null,
    collection: [],
    lifetimeScore: 0,
    
    async setUser(username, profile, allArtworks = null) {
        this.currentUser = username;
        
        // profile.collection is now an array of artwork_ids
        const artworkIds = profile.collection || [];
        
        // If we have artwork IDs, fetch full artwork data
        if (artworkIds.length > 0 && allArtworks) {
            this.collection = allArtworks.filter(art => artworkIds.includes(art.artwork_id));
        } else {
            this.collection = [];
        }
        
        this.lifetimeScore = profile.quiz_stats ? profile.quiz_stats.correct : 0;
    },
    
    clearUser() {
        this.currentUser = null;
        this.collection = [];
        this.lifetimeScore = 0;
    },
    
    async addToCollection(artwork) {
        if (!this.collection.some(item => item.artwork_id === artwork.artwork_id)) {
            this.collection.push({
                ...artwork,
                title: artwork.title || artwork.artwork,
                imageUrl: artwork.imageUrl || artwork.image_url
            });
            await API.post('/api/user/collection/add', { artwork_id: artwork.artwork_id });
            return true;
        }
        return false;
    },
    
    async removeFromCollection(artworkId) {
        const index = this.collection.findIndex(item => item.artwork_id === artworkId);
        if (index !== -1) {
            this.collection.splice(index, 1);
            await API.post('/api/user/collection/remove', { artwork_id: artworkId });
            return true;
        }
        return false;
    },
    
    isInCollection(artworkId) {
        return this.collection.some(item => item.artwork_id === artworkId);
    }
};

// Utility Functions
function showElement(id) {
    document.getElementById(id).style.display = 'block';
}

function hideElement(id) {
    document.getElementById(id).style.display = 'none';
}

function navigateTo(path) {
    window.location.href = path;
}
