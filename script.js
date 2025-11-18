class ArtQuiz {
    constructor() {
        this.score = 0;
        this.currentQuestion = null;
        this.artworks = [];
        this.filteredArtworks = [];
        this.artists = [];
        this.categories = [];
        this.selectedCategory = 'All';
        this.fiftyFiftyUsed = false;
        this.mode = null;
        this.currentArtworkIndex = 0;
        this.dataSource = 'nga';
    }

    async init(mode) {
        this.mode = mode;
        await this.loadData();
        if (mode === 'quiz') {
            this.generateQuestion();
        } else if (mode === 'browse') {
            this.populateMuseumSelector();
            this.populateArtistSelector();
            document.getElementById('loading').style.display = 'none';
            this.showArtwork();
        }
    }

    async loadData() {
        try {
            const sourceName = this.dataSource === 'nga' ? 'NGA collection' : 'Wiki collection';
            document.getElementById('loading').textContent = `Loading ${sourceName}...`;
            console.log('Starting data load...');
            
            const [artworksResponse, artistsResponse] = await Promise.all([
                fetch(`/api/artworks?source=${this.dataSource}`),
                fetch(`/api/artists?source=${this.dataSource}`)
            ]);
            
            if (!artworksResponse.ok || !artistsResponse.ok) {
                throw new Error('Failed to load data from server');
            }
            
            this.artworks = await artworksResponse.json();
            this.artists = await artistsResponse.json();
            
            // Add imageUrl for display (use image_url from wikidata)
            this.artworks = this.artworks.map(artwork => ({
                ...artwork,
                imageUrl: artwork.image_url || artwork.iiifurl
            }));
            
            this.filterArtworks();
            
            console.log(`Loaded ${this.artworks.length} artworks and ${this.artists.length} artists`);
            
            if (this.filteredArtworks.length === 0) {
                document.getElementById('loading').textContent = 'No artwork found for this category';
                return;
            }
        } catch (error) {
            console.error('Error loading data:', error);
            document.getElementById('loading').textContent = 'Error loading data: ' + error.message;
        }
    }
    
    filterArtworks() {
        // No filtering - use all artworks
        this.filteredArtworks = this.artworks;
    }

    async parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        const artworks = [];
        const maxRows = Math.min(lines.length, 200000);
        const chunkSize = 500;
        
        for (let i = 1; i < maxRows; i += chunkSize) {
            const endIndex = Math.min(i + chunkSize, maxRows);
            
            // Process chunk
            for (let j = i; j < endIndex; j++) {
                const values = this.parseCSVLine(lines[j]);
                if (values.length === headers.length) {
                    const artwork = {};
                    headers.forEach((header, index) => {
                        artwork[header] = values[index];
                    });
                    artworks.push(artwork);
                }
            }
            
            // Force garbage collection and yield control
            if (i % 2000 === 1) {
                await new Promise(resolve => setTimeout(resolve, 10));
                if (window.gc) window.gc(); // Force GC if available
            }
        }
        
        return artworks;
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    }

    generateQuestion() {
        if (this.filteredArtworks.length === 0) {
            document.getElementById('loading').textContent = 'No artworks available. Please refresh the page.';
            return;
        }

        // Select random artwork
        const randomArtwork = this.filteredArtworks[Math.floor(Math.random() * this.filteredArtworks.length)];
        console.log(`Selected artwork: ${randomArtwork.title} by ${randomArtwork.artist}`);
        const correctArtist = randomArtwork.artist;

        // Generate 3 wrong options
        const wrongArtists = this.artists
            .filter(artist => artist !== correctArtist)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);

        // Combine and shuffle options
        const options = [correctArtist, ...wrongArtists].sort(() => 0.5 - Math.random());

        this.currentQuestion = {
            artwork: randomArtwork,
            correctArtist: correctArtist,
            options: options
        };

        this.displayQuestion();
    }

    displayQuestion() {
        const { artwork, options } = this.currentQuestion;
        
        // Hide loading, show quiz
        document.getElementById('loading').style.display = 'none';
        document.getElementById('quiz').style.display = 'block';

        // Display artwork with error handling
        const artworkImage = document.getElementById('artwork-image');
        artworkImage.onerror = () => {
            console.error('Failed to load image:', artwork.imageUrl);
            document.getElementById('loading').textContent = `Image failed to load: ${artwork.title}`;
            document.getElementById('loading').style.display = 'block';
            document.getElementById('quiz').style.display = 'none';
        };
        artworkImage.src = artwork.imageUrl;
        document.getElementById('artwork-info').textContent = artwork.title || 'Untitled';
        document.getElementById('artwork-medium').textContent = artwork.material || '';

        // Display options
        const optionsContainer = document.getElementById('options');
        optionsContainer.innerHTML = '';
        
        options.forEach(artist => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option';
            optionDiv.textContent = artist;
            optionDiv.onclick = () => this.selectOption(optionDiv, artist);
            optionsContainer.appendChild(optionDiv);
        });

        // Reset hint button (but keep it disabled if already used)
        const fiftyFiftyBtn = document.getElementById('fifty-fifty-btn');
        if (!this.fiftyFiftyUsed) {
            fiftyFiftyBtn.disabled = false;
            fiftyFiftyBtn.textContent = '50/50';
        }

        // Hide result, hints, and next button
        document.getElementById('result').style.display = 'none';
        document.getElementById('next-btn').style.display = 'none';
        const yearHint = document.getElementById('year-hint');
        if (yearHint) yearHint.remove();
        const genreHint = document.getElementById('genre-hint');
        if (genreHint) genreHint.remove();
        const museumHint = document.getElementById('museum-hint');
        if (museumHint) museumHint.remove();
    }

    showYearHint() {
        const { artwork } = this.currentQuestion;
        const year = artwork.year || 'Unknown';
        
        // Remove existing hint if any
        const existingHint = document.getElementById('year-hint');
        if (existingHint) existingHint.remove();
        
        // Create and show year hint
        const hintDiv = document.createElement('div');
        hintDiv.id = 'year-hint';
        hintDiv.textContent = `This artwork was created in: ${year}`;
        
        const optionsContainer = document.getElementById('options-container');
        optionsContainer.insertBefore(hintDiv, document.getElementById('options'));
    }

    showGenreHint() {
        const { artwork } = this.currentQuestion;
        const genre = artwork.genre || 'Unknown';
        
        // Remove existing hint if any
        const existingHint = document.getElementById('genre-hint');
        if (existingHint) existingHint.remove();
        
        // Create and show genre hint
        const hintDiv = document.createElement('div');
        hintDiv.id = 'genre-hint';
        hintDiv.textContent = `This is a: ${genre}`;
        
        const optionsContainer = document.getElementById('options-container');
        optionsContainer.insertBefore(hintDiv, document.getElementById('options'));
    }

    showMuseumHint() {
        const { artwork } = this.currentQuestion;
        const museum = artwork.museum || artwork.collection || 'Unknown';
        
        // Remove existing hint if any
        const existingHint = document.getElementById('museum-hint');
        if (existingHint) existingHint.remove();
        
        // Create and show museum hint
        const hintDiv = document.createElement('div');
        hintDiv.id = 'museum-hint';
        hintDiv.textContent = `This artwork is in: ${museum}`;
        
        const optionsContainer = document.getElementById('options-container');
        optionsContainer.insertBefore(hintDiv, document.getElementById('options'));
    }

    useFiftyFifty() {
        if (this.fiftyFiftyUsed) return;
        
        const { correctArtist, options } = this.currentQuestion;
        const wrongOptions = options.filter(option => option !== correctArtist);
        
        // Remove 2 wrong options randomly
        const toRemove = wrongOptions.sort(() => 0.5 - Math.random()).slice(0, 2);
        
        // Hide the wrong options
        document.querySelectorAll('.option').forEach(optionDiv => {
            if (toRemove.includes(optionDiv.textContent)) {
                optionDiv.style.display = 'none';
            }
        });
        
        // Disable the button and change color to grey
        const fiftyFiftyBtn = document.getElementById('fifty-fifty-btn');
        fiftyFiftyBtn.disabled = true;
        fiftyFiftyBtn.textContent = '50/50 Used';
        fiftyFiftyBtn.style.backgroundColor = '#6c757d';
        this.fiftyFiftyUsed = true;
    }

    selectOption(optionElement, selectedArtist) {
        const { correctArtist } = this.currentQuestion;
        const isCorrect = selectedArtist === correctArtist;

        // Disable all options
        document.querySelectorAll('.option').forEach(option => {
            option.onclick = null;
            if (option.textContent === correctArtist) {
                option.classList.add('correct');
            } else if (option === optionElement && !isCorrect) {
                option.classList.add('incorrect');
            }
        });

        // Show result
        const resultDiv = document.getElementById('result');
        resultDiv.style.display = 'block';
        
        if (isCorrect) {
            this.score++;
            resultDiv.textContent = 'Correct! Well done!';
            resultDiv.className = 'correct';
        } else {
            resultDiv.textContent = `Incorrect. The correct answer is ${correctArtist}.`;
            resultDiv.className = 'incorrect';
        }

        // Update score
        document.getElementById('score-value').textContent = this.score;

        // Show next button
        document.getElementById('next-btn').style.display = 'block';
        document.getElementById('next-btn').onclick = () => this.nextQuestion();
    }

    nextQuestion() {
        this.generateQuestion();
    }

    showArtwork() {
        if (this.filteredArtworks.length === 0) {
            document.getElementById('loading').textContent = 'No artworks available.';
            document.getElementById('loading').style.display = 'block';
            return;
        }

        const artwork = this.filteredArtworks[this.currentArtworkIndex];
        console.log('Showing artwork:', artwork);
        
        const browseImage = document.getElementById('browse-image');
        browseImage.onerror = () => {
            console.error('Failed to load browse image:', artwork.imageUrl);
            browseImage.alt = `Image failed to load: ${artwork.title}`;
        };
        browseImage.src = artwork.imageUrl;
        document.getElementById('browse-title').textContent = artwork.title || 'Untitled';
        document.getElementById('browse-artist').textContent = `Artist: ${artwork.artist}`;
        document.getElementById('browse-year').textContent = `Year: ${artwork.year || 'Unknown'}`;
        document.getElementById('browse-collection').textContent = `Museum: ${artwork.museum || artwork.collection || 'Louvre'}`;
        document.getElementById('browse-art-type').textContent = `Type: ${artwork.art_type || 'Unknown'}`;
        document.getElementById('browse-material').textContent = `Material: ${artwork.material || 'Unknown'}`;
        document.getElementById('browse-genre').textContent = `Genre: ${artwork.genre || 'Unknown'}`;
        

        
        document.getElementById('browse-container').style.display = 'block';
    }

    nextArtwork() {
        this.currentArtworkIndex = (this.currentArtworkIndex + 1) % this.filteredArtworks.length;
        this.showArtwork();
    }

    prevArtwork() {
        this.currentArtworkIndex = (this.currentArtworkIndex - 1 + this.filteredArtworks.length) % this.filteredArtworks.length;
        this.showArtwork();
    }

    populateMuseumSelector() {
        const museumCounts = {};
        this.artworks.forEach(artwork => {
            const museum = artwork.museum || 'Unknown';
            museumCounts[museum] = (museumCounts[museum] || 0) + 1;
        });

        const datalist = document.getElementById('museum-list');
        const input = document.getElementById('museum-select');
        datalist.innerHTML = '';
        
        // Add "All Museums" option
        const allOption = document.createElement('option');
        allOption.value = `All Museums (${this.artworks.length})`;
        datalist.appendChild(allOption);
        
        Object.entries(museumCounts)
            .sort(([,a], [,b]) => b - a)
            .forEach(([museum, count]) => {
                const option = document.createElement('option');
                option.value = `${museum} (${count})`;
                datalist.appendChild(option);
            });
        
        // Set default value
        input.value = `All Museums (${this.artworks.length})`;
    }

    filterByMuseum() {
        this.updateArtistSelector();
        this.applyFilters();
    }

    populateArtistSelector() {
        this.updateArtistSelector();
    }

    updateArtistSelector() {
        const selectedMuseumText = document.getElementById('museum-select').value;
        const selectedMuseum = this.extractMuseumName(selectedMuseumText);
        
        // Filter artworks by selected museum
        const filteredArtworks = selectedMuseum === 'All Museums' 
            ? this.artworks 
            : this.artworks.filter(artwork => (artwork.museum || 'Unknown') === selectedMuseum);
        
        const artistCounts = {};
        filteredArtworks.forEach(artwork => {
            const artist = artwork.artist || 'Unknown';
            artistCounts[artist] = (artistCounts[artist] || 0) + 1;
        });

        const datalist = document.getElementById('artist-list');
        const input = document.getElementById('artist-select');
        const currentSelection = this.extractArtistName(input.value);
        datalist.innerHTML = '';
        
        // Add "All Artists" option
        const allOption = document.createElement('option');
        allOption.value = `All Artists (${filteredArtworks.length})`;
        datalist.appendChild(allOption);
        
        Object.entries(artistCounts)
            .sort(([,a], [,b]) => b - a)
            .forEach(([artist, count]) => {
                const option = document.createElement('option');
                option.value = `${artist} (${count})`;
                datalist.appendChild(option);
            });
        
        // Restore selection if still available, otherwise reset to All
        if (artistCounts[currentSelection]) {
            input.value = `${currentSelection} (${artistCounts[currentSelection]})`;
        } else {
            input.value = `All Artists (${filteredArtworks.length})`;
        }
    }

    extractMuseumName(text) {
        if (!text || text.startsWith('All Museums')) return 'All Museums';
        return text.replace(/ \(\d+\)$/, '');
    }

    extractArtistName(text) {
        if (!text || text.startsWith('All Artists')) return 'All Artists';
        return text.replace(/ \(\d+\)$/, '');
    }

    filterByArtist() {
        this.applyFilters();
    }

    applyFilters() {
        const selectedMuseumText = document.getElementById('museum-select').value;
        const selectedArtistText = document.getElementById('artist-select').value;
        const selectedMuseum = this.extractMuseumName(selectedMuseumText);
        const selectedArtist = this.extractArtistName(selectedArtistText);
        
        this.filteredArtworks = this.artworks.filter(artwork => {
            const museumMatch = selectedMuseum === 'All Museums' || (artwork.museum || 'Unknown') === selectedMuseum;
            const artistMatch = selectedArtist === 'All Artists' || (artwork.artist || 'Unknown') === selectedArtist;
            return museumMatch && artistMatch;
        });
        
        this.currentArtworkIndex = 0;
        this.showArtwork();
    }
}

// Global functions for source, mode and category selection
let quiz;
let selectedMode;
let selectedSource;

function startGame(mode) {
    document.getElementById('mode-selection').style.display = 'none';
    
    quiz = new ArtQuiz();
    quiz.selectedCategory = 'All';
    quiz.dataSource = 'louvre';
    
    if (mode === 'quiz') {
        document.getElementById('quiz-container').style.display = 'block';
        quiz.init('quiz');
    } else {
        document.getElementById('browse-container').style.display = 'block';
        quiz.init('browse');
    }
}

function backToMenu() {
    document.getElementById('quiz-container').style.display = 'none';
    document.getElementById('browse-container').style.display = 'none';
    document.getElementById('mode-selection').style.display = 'block';
    quiz = null;
}

// Initialize mode selection when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Show mode selection by default
});