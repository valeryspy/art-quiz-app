class BrowseMode {
    constructor() {
        this.artworks = [];
        this.filteredArtworks = [];
        this.currentIndex = 0;
    }
    
    async init() {
        try {
            const artworks = await API.get('/api/artworks');
            this.artworks = artworks.map(a => ({
                ...a,
                title: a.title || a.artwork,
                imageUrl: a.image_url || a.iiifurl
            }));
            
            this.filteredArtworks = [...this.artworks].sort(() => 0.5 - Math.random());
            this.populateMuseumSelector();
            this.populateArtistSelector();
            hideElement('loading');
            this.showArtwork();
        } catch (error) {
            document.getElementById('loading').textContent = 'Error loading data: ' + error.message;
        }
    }
    
    populateMuseumSelector() {
        const museumCounts = {};
        this.artworks.forEach(a => {
            const museum = a.museum || 'Unknown';
            museumCounts[museum] = (museumCounts[museum] || 0) + 1;
        });
        
        const datalist = document.getElementById('museum-list');
        const input = document.getElementById('museum-select');
        datalist.innerHTML = '';
        
        const allOption = document.createElement('option');
        allOption.value = `All Museums (${this.artworks.length})`;
        datalist.appendChild(allOption);
        
        Object.entries(museumCounts).sort(([,a], [,b]) => b - a).forEach(([museum, count]) => {
            const option = document.createElement('option');
            option.value = `${museum} (${count})`;
            datalist.appendChild(option);
        });
        
        input.value = `All Museums (${this.artworks.length})`;
    }
    
    populateArtistSelector() {
        const selectedMuseum = this.extractName(document.getElementById('museum-select').value);
        const filteredArtworks = selectedMuseum === 'All Museums' 
            ? this.artworks 
            : this.artworks.filter(a => (a.museum || 'Unknown') === selectedMuseum);
        
        const artistCounts = {};
        filteredArtworks.forEach(a => {
            const artist = a.artist || 'Unknown';
            artistCounts[artist] = (artistCounts[artist] || 0) + 1;
        });
        
        const datalist = document.getElementById('artist-list');
        const input = document.getElementById('artist-select');
        datalist.innerHTML = '';
        
        const allOption = document.createElement('option');
        allOption.value = `All Artists (${filteredArtworks.length})`;
        datalist.appendChild(allOption);
        
        Object.entries(artistCounts).sort(([,a], [,b]) => b - a).forEach(([artist, count]) => {
            const option = document.createElement('option');
            option.value = `${artist} (${count})`;
            datalist.appendChild(option);
        });
        
        input.value = `All Artists (${filteredArtworks.length})`;
    }
    
    extractName(text) {
        if (!text || text.startsWith('All')) return text.split(' ')[0] + ' ' + text.split(' ')[1];
        return text.replace(/ \(\d+\)$/, '');
    }
    
    applyFilters() {
        const selectedMuseum = this.extractName(document.getElementById('museum-select').value);
        const selectedArtist = this.extractName(document.getElementById('artist-select').value);
        
        this.filteredArtworks = this.artworks.filter(a => {
            const museumMatch = selectedMuseum === 'All Museums' || (a.museum || 'Unknown') === selectedMuseum;
            const artistMatch = selectedArtist === 'All Artists' || (a.artist || 'Unknown') === selectedArtist;
            return museumMatch && artistMatch;
        }).sort(() => 0.5 - Math.random());
        
        this.currentIndex = 0;
        this.showArtwork();
    }
    
    showArtwork() {
        if (this.filteredArtworks.length === 0) {
            document.getElementById('loading').textContent = 'No artworks available.';
            showElement('loading');
            return;
        }
        
        const artwork = this.filteredArtworks[this.currentIndex];
        
        const img = document.getElementById('browse-image');
        img.src = artwork.imageUrl;
        img.onerror = () => img.alt = `Image failed to load: ${artwork.title}`;
        
        document.getElementById('browse-title').textContent = artwork.title || 'Untitled';
        document.getElementById('browse-artist').textContent = `Artist: ${artwork.artist}`;
        document.getElementById('browse-year').textContent = `Year: ${artwork.year || 'Unknown'}`;
        document.getElementById('browse-collection').textContent = `Museum: ${artwork.museum || artwork.collection || 'Unknown'}`;
        
        this.setElementText('browse-art-type', `Type: ${artwork.art_type || 'Unknown'}`);
        this.setElementText('browse-material', `Material: ${artwork.material || 'Unknown'}`);
        this.setElementText('browse-movement', `Movement: ${artwork.movement || 'Unknown'}`);
        
        this.updateHeartButton();
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
    
    updateHeartButton() {
        const artwork = this.filteredArtworks[this.currentIndex];
        const btn = document.getElementById('add-to-collection-btn');
        
        if (AppState.isInCollection(artwork.artwork_id)) {
            btn.textContent = '♥ In Collection';
            btn.classList.add('in-collection');
        } else {
            btn.textContent = '♡ Add to Collection';
            btn.classList.remove('in-collection');
        }
    }
    
    addToCollection() {
        const artwork = this.filteredArtworks[this.currentIndex];
        if (AppState.addToCollection(artwork)) {
            const btn = document.getElementById('add-to-collection-btn');
            const originalText = btn.textContent;
            btn.textContent = '♥ Added!';
            setTimeout(() => {
                btn.textContent = originalText;
                this.updateHeartButton();
            }, 1000);
        }
    }
    
    nextArtwork() {
        this.currentIndex = (this.currentIndex + 1) % this.filteredArtworks.length;
        this.showArtwork();
    }
    
    prevArtwork() {
        this.currentIndex = (this.currentIndex - 1 + this.filteredArtworks.length) % this.filteredArtworks.length;
        this.showArtwork();
    }
}

const browse = new BrowseMode();

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const data = await API.get('/auth/profile');
        AppState.setUser(data.username, data.profile);
        browse.init();
    } catch {
        navigateTo('/');
    }
});

// Filter events
document.getElementById('museum-select').addEventListener('input', () => {
    browse.populateArtistSelector();
    browse.applyFilters();
});

document.getElementById('artist-select').addEventListener('input', () => {
    browse.applyFilters();
});

document.getElementById('museum-select').addEventListener('focus', function() {
    this.value = '';
});

document.getElementById('artist-select').addEventListener('focus', function() {
    this.value = '';
});

// Navigation
document.getElementById('prev-artwork-btn').addEventListener('click', () => browse.prevArtwork());
document.getElementById('next-artwork-btn').addEventListener('click', () => browse.nextArtwork());
document.getElementById('add-to-collection-btn').addEventListener('click', () => browse.addToCollection());
document.getElementById('browse-back-btn').addEventListener('click', () => navigateTo('/'));
