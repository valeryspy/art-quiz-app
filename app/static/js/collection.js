class CollectionMode {
    constructor() {
        this.currentIndex = 0;
    }
    
    init() {
        if (AppState.collection.length === 0) {
            showElement('collection-empty');
            hideElement('collection-grid');
            hideElement('collection-detail');
        } else {
            hideElement('collection-empty');
            this.showGrid();
        }
    }
    
    showGrid() {
        showElement('collection-grid');
        hideElement('collection-detail');
        
        const container = document.getElementById('collection-thumbnails');
        container.innerHTML = '';
        
        AppState.collection.forEach((artwork, index) => {
            const div = document.createElement('div');
            div.className = 'collection-thumbnail';
            div.onclick = () => this.showDetail(index);
            
            const img = document.createElement('img');
            img.src = artwork.imageUrl || artwork.image_url;
            img.alt = artwork.title || artwork.artwork || 'Untitled';
            img.onerror = () => img.alt = `Failed to load: ${artwork.title || artwork.artwork}`;
            
            const title = document.createElement('p');
            title.textContent = artwork.title || artwork.artwork || 'Untitled';
            
            div.appendChild(img);
            div.appendChild(title);
            container.appendChild(div);
        });
    }
    
    showDetail(index) {
        this.currentIndex = index;
        hideElement('collection-grid');
        showElement('collection-detail');
        this.displayArtwork();
    }
    
    displayArtwork() {
        const artwork = AppState.collection[this.currentIndex];
        
        const img = document.getElementById('collection-image');
        img.src = artwork.imageUrl || artwork.image_url;
        img.onerror = () => img.alt = `Image failed to load: ${artwork.title}`;
        
        document.getElementById('collection-title').textContent = artwork.title || artwork.artwork || 'Untitled';
        document.getElementById('collection-artist').textContent = `Artist: ${artwork.artist}`;
        document.getElementById('collection-year').textContent = `Year: ${artwork.year || 'Unknown'}`;
        document.getElementById('collection-museum').textContent = `Museum: ${artwork.museum || artwork.collection || 'Unknown'}`;
        
        this.setElementText('collection-art-type', `Type: ${artwork.art_type || 'Unknown'}`);
        this.setElementText('collection-material', `Material: ${artwork.material || 'Unknown'}`);
        this.setElementText('collection-movement', `Movement: ${artwork.movement || 'Unknown'}`);
    }
    
    setElementText(id, text) {
        const el = document.getElementById(id);
        if (text.includes('Unknown')) {
            el.style.display = 'none';
        } else {
            el.style.display = 'block';
            el.textContent = text;
        }
    }
    
    nextArtwork() {
        this.currentIndex = (this.currentIndex + 1) % AppState.collection.length;
        this.displayArtwork();
    }
    
    prevArtwork() {
        this.currentIndex = (this.currentIndex - 1 + AppState.collection.length) % AppState.collection.length;
        this.displayArtwork();
    }
    
    removeArtwork() {
        const artwork = AppState.collection[this.currentIndex];
        const artworkTitle = artwork.title || 'this artwork';
        
        if (confirm(`Are you sure you want to remove "${artworkTitle}" from your collection?`)) {
            AppState.removeFromCollection(artwork.artwork_id);
            
            if (AppState.collection.length === 0) {
                this.init();
            } else {
                if (this.currentIndex >= AppState.collection.length) {
                    this.currentIndex = 0;
                }
                this.showGrid();
            }
        }
    }
}

const collection = new CollectionMode();

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const data = await API.get('/auth/profile');
        AppState.setUser(data.username, data.profile);
        collection.init();
    } catch {
        navigateTo('/');
    }
});

// Navigation
document.getElementById('back-to-grid-btn').addEventListener('click', () => collection.showGrid());
document.getElementById('prev-collection-btn').addEventListener('click', () => collection.prevArtwork());
document.getElementById('next-collection-btn').addEventListener('click', () => collection.nextArtwork());
document.getElementById('remove-from-collection-btn').addEventListener('click', () => collection.removeArtwork());
document.getElementById('collection-back-btn').addEventListener('click', () => navigateTo('/'));
