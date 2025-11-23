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
        if (!response.ok) throw new Error(`API error: ${response.statusText}`);
        return response.json();
    }
};

// Global State
const AppState = {
    currentUser: null,
    collection: [],
    lifetimeScore: 0,
    
    setUser(username, profile) {
        this.currentUser = username;
        this.collection = profile.collection || [];
        this.lifetimeScore = profile.quiz_stats ? profile.quiz_stats.correct : 0;
    },
    
    clearUser() {
        this.currentUser = null;
        this.collection = [];
        this.lifetimeScore = 0;
    },
    
    async saveCollection() {
        if (!this.currentUser) return;
        await API.post('/api/user/collection', { collection: this.collection });
    },
    
    addToCollection(artwork) {
        if (!this.collection.some(item => item.artwork_id === artwork.artwork_id)) {
            this.collection.push({
                ...artwork,
                title: artwork.title || artwork.artwork,
                imageUrl: artwork.imageUrl || artwork.image_url
            });
            this.saveCollection();
            return true;
        }
        return false;
    },
    
    removeFromCollection(artworkId) {
        const index = this.collection.findIndex(item => item.artwork_id === artworkId);
        if (index !== -1) {
            this.collection.splice(index, 1);
            this.saveCollection();
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
