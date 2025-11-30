class EditorsChoice {
    constructor() {
        this.artworks = [];
        this.currentArtist = null;
        this.currentArtwork = null;
        this.artists = [
            'Leonardo da Vinci', 'Michelangelo', 'Raphael', 'Caravaggio', 'Titian',
            'Sandro Botticelli', 'Rembrandt van Rijn', 'Johannes Vermeer', 'Peter Paul Rubens',
            'Diego Velázquez', 'Francisco Goya', 'El Greco', 'Jean-Auguste-Dominique Ingres',
            'Eugène Delacroix', 'Édouard Manet', 'Claude Monet', 'Pierre-Auguste Renoir',
            'Vincent van Gogh', 'Paul Cézanne', 'Henri Matisse', 'Pablo Picasso',
            'Wassily Kandinsky', 'Edgar Degas', 'Georges Seurat', 'Marc Chagall'
        ];
    }
    
    async init() {
        try {
            this.artworks = await API.get('/api/artworks?source=editors');
            this.showArtistGrid();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }
    
    showArtistGrid() {
        const grid = document.getElementById('editors-artist-grid');
        grid.innerHTML = '';
        
        this.artists.forEach(artist => {
            const artwork = this.artworks.find(a => a.artist === artist);
            
            const card = document.createElement('div');
            card.className = 'artist-card';
            card.onclick = () => this.showArtistProfile(artist);
            
            if (artwork) {
                const img = document.createElement('img');
                img.src = artwork.image_url || artwork.imageUrl;
                img.alt = artist;
                img.onerror = () => img.style.display = 'none';
                card.appendChild(img);
            }
            
            const name = document.createElement('h3');
            name.textContent = artist;
            card.appendChild(name);
            grid.appendChild(card);
        });
        
        showElement('editors-choice-container');
        hideElement('artist-profile-container');
        hideElement('artwork-detail-container');
    }
    
    async showArtistProfile(artist) {
        this.currentArtist = artist;
        
        try {
            const artistInfo = await API.get(`/api/artist-info/${encodeURIComponent(artist)}`);
            const artistArtworks = this.artworks.filter(a => a.artist === artist);
            
            document.getElementById('artist-name').textContent = artist;
            document.getElementById('artist-years').textContent = artistInfo.years || '';
            document.getElementById('artist-country').textContent = artistInfo.country || '';
            document.getElementById('artist-movement').textContent = artistInfo.movement || '';
            document.getElementById('artist-period').textContent = artistInfo.period || '';
            
            const summaryEl = document.getElementById('artist-summary');
            if (artistInfo.is_html) {
                summaryEl.innerHTML = artistInfo.artist_summary || 'No summary available.';
            } else {
                summaryEl.textContent = artistInfo.artist_summary || 'No summary available.';
            }
            
            document.getElementById('artist-wiki-link').href = artistInfo.wiki_link || '#';
            document.getElementById('artist-image').src = artistInfo.image_url || 
                'https://via.placeholder.com/200x200?text=' + encodeURIComponent(artist);
            
            const grid = document.getElementById('artist-artworks-grid');
            grid.innerHTML = '';
            
            artistArtworks.forEach(artwork => {
                const card = document.createElement('div');
                card.className = 'artist-artwork-card';
                card.onclick = () => this.showArtworkDetail(artwork);
                
                const img = document.createElement('img');
                img.src = artwork.image_url || artwork.imageUrl;
                img.alt = artwork.title || artwork.artwork;
                img.onerror = () => img.style.display = 'none';
                
                const title = document.createElement('p');
                title.textContent = artwork.title || artwork.artwork || 'Untitled';
                
                card.appendChild(img);
                card.appendChild(title);
                grid.appendChild(card);
            });
            
            hideElement('editors-choice-container');
            showElement('artist-profile-container');
            hideElement('artwork-detail-container');
        } catch (error) {
            console.error('Error loading artist info:', error);
        }
    }
    
    showArtworkDetail(artwork) {
        this.currentArtwork = artwork;
        
        document.getElementById('detail-artwork-image').src = artwork.image_url || artwork.imageUrl;
        document.getElementById('detail-artwork-title').textContent = artwork.title || artwork.artwork || 'Untitled';
        document.getElementById('detail-artwork-artist').textContent = `Artist: ${artwork.artist}`;
        document.getElementById('detail-artwork-year').textContent = `Year: ${artwork.year || 'Unknown'}`;
        document.getElementById('detail-artwork-museum').textContent = `Museum: ${artwork.museum || artwork.location || 'Unknown'}`;
        
        this.setElementText('detail-artwork-type', `Type: ${artwork.art_type || 'Unknown'}`);
        this.setElementText('detail-artwork-material', `Material: ${artwork.material || 'Unknown'}`);
        this.setElementText('detail-artwork-movement', `Movement: ${artwork.movement || 'Unknown'}`);
        
        const wikiLink = document.getElementById('detail-artwork-wiki-link');
        const artworkTitle = artwork.title || artwork.artwork;
        if (artworkTitle && artworkTitle !== 'Untitled') {
            wikiLink.href = `https://en.wikipedia.org/wiki/${encodeURIComponent(artworkTitle.replace(/ /g, '_'))}`;
            wikiLink.style.display = 'inline-block';
        } else {
            wikiLink.style.display = 'none';
        }
        
        this.updateDetailHeartButton();
        
        hideElement('editors-choice-container');
        hideElement('artist-profile-container');
        showElement('artwork-detail-container');
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
    
    updateDetailHeartButton() {
        const btn = document.getElementById('detail-add-to-collection-btn');
        if (AppState.isInCollection(this.currentArtwork.artwork_id)) {
            btn.textContent = '♥ In Collection';
            btn.classList.add('in-collection');
        } else {
            btn.textContent = '♡ Add to Collection';
            btn.classList.remove('in-collection');
        }
    }
    
    addToCollection() {
        if (AppState.addToCollection({
            ...this.currentArtwork,
            imageUrl: this.currentArtwork.image_url || this.currentArtwork.imageUrl
        })) {
            const btn = document.getElementById('detail-add-to-collection-btn');
            const originalText = btn.textContent;
            btn.textContent = '♥ Added!';
            setTimeout(() => {
                btn.textContent = originalText;
                this.updateDetailHeartButton();
            }, 1000);
        }
    }
}

const editors = new EditorsChoice();

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const [data, artworks] = await Promise.all([
            API.get('/auth/profile'),
            API.get('/api/artworks')
        ]);
        await AppState.setUser(data.username, data.profile, artworks);
        editors.init();
    } catch {
        navigateTo('/');
    }
});

// Navigation
document.getElementById('editors-back-btn').addEventListener('click', () => navigateTo('/'));
document.getElementById('artist-back-btn').addEventListener('click', () => editors.showArtistGrid());
document.getElementById('artwork-back-btn').addEventListener('click', () => 
    editors.showArtistProfile(editors.currentArtist)
);
document.getElementById('detail-add-to-collection-btn').addEventListener('click', () => 
    editors.addToCollection()
);
