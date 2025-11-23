class ArtQuiz {
    constructor() {
        this.score = 0;
        this.sessionScore = 0;
        this.currentQuestion = null;
        this.artworks = [];
        this.filteredArtworks = [];
        this.artists = [];
        this.categories = [];
        this.movements = [];
        this.selectedCategory = 'All';
        this.selectedArtist = null;
        this.fiftyFiftyUsed = false;
        this.mode = null;
        this.currentArtworkIndex = 0;
        this.dataSource = 'nga';
        this.myCollection = globalCollection;
        this.currentCollectionIndex = 0;
        this.quizSource = 'all';
        this.usedArtworks = [];
        this.correctlyAnswered = [];
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
        } else if (mode === 'collection') {
            document.getElementById('loading').style.display = 'none';
            this.showCollection();
        }
    }

    async loadData() {
        try {
            const sourceName = this.dataSource === 'editors' ? "Editor's Choice" : 'Wiki collection';
            document.getElementById('loading').textContent = `Loading ${sourceName}...`;
            console.log('Starting data load...');
            
            const [artworksResponse, artistsResponse, movementsResponse] = await Promise.all([
                fetch(`/api/artworks?source=${this.dataSource}`),
                fetch(`/api/artists?source=${this.dataSource}`),
                fetch(`/api/movements?source=${this.dataSource}`)
            ]);
            
            if (!artworksResponse.ok || !artistsResponse.ok || !movementsResponse.ok) {
                throw new Error('Failed to load data from server');
            }
            
            this.artworks = await artworksResponse.json();
            this.artists = await artistsResponse.json();
            this.movements = await movementsResponse.json();
            
            // Add imageUrl for display (use image_url from wikidata)
            this.artworks = this.artworks.map(artwork => ({
                ...artwork,
                title: artwork.title || artwork.artwork,
                imageUrl: artwork.image_url || artwork.iiifurl
            }));
            
            this.filterArtworks();
            
            console.log(`Loaded ${this.artworks.length} artworks, ${this.artists.length} artists, and ${this.movements.length} movements`);
            
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
        // Filter by selected artist if specified
        if (this.selectedArtist) {
            this.filteredArtworks = this.artworks.filter(artwork => 
                artwork.artist === this.selectedArtist
            ).sort(() => 0.5 - Math.random());
        } else {
            this.filteredArtworks = [...this.artworks].sort(() => 0.5 - Math.random());
        }
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
        const sourceArtworks = this.quizSource === 'collection' ? this.myCollection : this.filteredArtworks;
        
        if (sourceArtworks.length === 0) {
            const message = this.quizSource === 'collection' 
                ? 'Your collection is empty. Add some artworks first!' 
                : 'No artworks available. Please refresh the page.';
            document.getElementById('loading').textContent = message;
            return;
        }

        // Filter out correctly answered artworks
        const availableArtworks = sourceArtworks.filter(artwork => 
            !this.correctlyAnswered.includes(artwork.artwork_id)
        );
        
        // If all artworks have been answered correctly, show congratulations
        if (availableArtworks.length === 0) {
            this.showCongratulations();
            return;
        }

        // Select random artwork from available ones
        const randomArtwork = availableArtworks[Math.floor(Math.random() * availableArtworks.length)];
        console.log(`Selected artwork: ${randomArtwork.title} by ${randomArtwork.artist}`);
        const correctArtist = randomArtwork.artist;

        // Generate 3 wrong options from appropriate source
        const sourceArtists = this.quizSource === 'collection' 
            ? [...new Set(this.myCollection.map(artwork => artwork.artist))]
            : this.artists;
            
        const wrongArtists = sourceArtists
            .filter(artist => artist !== correctArtist)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);

        // If not enough wrong artists in collection, fill from all artists
        if (wrongArtists.length < 3 && this.quizSource === 'collection') {
            const additionalArtists = this.artists
                .filter(artist => artist !== correctArtist && !wrongArtists.includes(artist))
                .sort(() => 0.5 - Math.random())
                .slice(0, 3 - wrongArtists.length);
            wrongArtists.push(...additionalArtists);
        }

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
            document.getElementById('loading').textContent = `Image failed to load: ${artwork.title || artwork.artwork}`;
            document.getElementById('loading').style.display = 'block';
            document.getElementById('quiz').style.display = 'none';
        };
        artworkImage.src = artwork.imageUrl;
        document.getElementById('artwork-info').textContent = artwork.title || artwork.artwork || 'Untitled';
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
        const movementHint = document.getElementById('movement-hint');
        if (movementHint) movementHint.remove();
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

    showMovementHint() {
        const { artwork } = this.currentQuestion;
        const movement = artwork.movement || 'Unknown';
        
        // Remove existing hint if any
        const existingHint = document.getElementById('movement-hint');
        if (existingHint) existingHint.remove();
        
        // Create and show movement hint
        const hintDiv = document.createElement('div');
        hintDiv.id = 'movement-hint';
        hintDiv.textContent = `Movement: ${movement}`;
        
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
            this.sessionScore++;
            lifetimeScore++;
            this.correctlyAnswered.push(this.currentQuestion.artwork.artwork_id);
            resultDiv.textContent = 'Correct! Well done!';
            resultDiv.className = 'correct';
        } else {
            resultDiv.textContent = `Incorrect. The correct answer is ${correctArtist}.`;
            resultDiv.className = 'incorrect';
        }

        // Update score
        document.getElementById('score-value').textContent = this.sessionScore;

        // Save quiz progress
        this.saveQuizProgress(isCorrect);

        // Show next button
        document.getElementById('next-btn').style.display = 'block';
        document.getElementById('next-btn').onclick = () => this.nextQuestion();
    }

    async saveQuizProgress(isCorrect) {
        if (!currentUser) return;
        
        try {
            await fetch('/api/user/quiz-result', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                credentials: 'include',
                body: JSON.stringify({
                    correct: isCorrect ? 1 : 0,
                    total: 1
                })
            });
        } catch (error) {
            console.error('Error saving quiz progress:', error);
        }
    }

    showCongratulations() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('quiz').style.display = 'none';
        document.getElementById('score').style.display = 'none';
        document.getElementById('quiz-back-btn').style.display = 'none';
        
        const container = document.getElementById('quiz-container');
        let congratsDiv = document.getElementById('congratulations');
        
        if (!congratsDiv) {
            congratsDiv = document.createElement('div');
            congratsDiv.id = 'congratulations';
            congratsDiv.innerHTML = `
                <h2 style="margin-bottom: 30px;">🎉 Congratulations! 🎉</h2>
                <p style="margin-bottom: 20px; font-size: 18px;">You've answered all questions correctly!</p>
                <p style="margin-bottom: 20px; font-size: 20px;">Session Score: <strong>${this.sessionScore}</strong></p>
                <p style="margin-bottom: 40px; font-size: 18px;">Lifetime Score: <strong>${lifetimeScore}</strong></p>
                <button onclick="backToMenu()" style="padding: 15px 30px; font-size: 16px; background-color: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer;">Back to Menu</button>
            `;
            congratsDiv.style.textAlign = 'center';
            congratsDiv.style.padding = '50px';
            container.appendChild(congratsDiv);
        }
        
        congratsDiv.style.display = 'block';
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
        document.getElementById('browse-title').textContent = artwork.title || artwork.artwork || 'Untitled';
        document.getElementById('browse-artist').textContent = `Artist: ${artwork.artist}`;
        document.getElementById('browse-year').textContent = `Year: ${artwork.year || 'Unknown'}`;
        document.getElementById('browse-collection').textContent = `Museum: ${artwork.museum || artwork.collection || 'Louvre'}`;
        
        const artTypeElement = document.getElementById('browse-art-type');
        const artType = artwork.art_type || 'Unknown';
        if (artType === 'Unknown') {
            artTypeElement.style.display = 'none';
        } else {
            artTypeElement.style.display = 'block';
            artTypeElement.textContent = `Type: ${artType}`;
        }
        
        const materialElement = document.getElementById('browse-material');
        const material = artwork.material || 'Unknown';
        if (material === 'Unknown') {
            materialElement.style.display = 'none';
        } else {
            materialElement.style.display = 'block';
            materialElement.textContent = `Material: ${material}`;
        }
        
        const movementElement = document.getElementById('browse-movement');
        const movement = artwork.movement || 'Unknown';
        if (movement === 'Unknown') {
            movementElement.style.display = 'none';
        } else {
            movementElement.style.display = 'block';
            movementElement.textContent = `Movement: ${movement}`;
        }
        
        this.updateHeartButton();
        
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

    showCollection() {
        if (this.myCollection.length === 0) {
            document.getElementById('collection-empty').style.display = 'block';
            document.getElementById('collection-grid').style.display = 'none';
            document.getElementById('collection-detail').style.display = 'none';
        } else {
            document.getElementById('collection-empty').style.display = 'none';
            this.showCollectionGrid();
        }
        document.getElementById('collection-container').style.display = 'block';
    }

    showCollectionGrid() {
        document.getElementById('collection-grid').style.display = 'block';
        document.getElementById('collection-detail').style.display = 'none';
        
        const thumbnailsContainer = document.getElementById('collection-thumbnails');
        thumbnailsContainer.innerHTML = '';
        
        this.myCollection.forEach((artwork, index) => {
            const thumbnailDiv = document.createElement('div');
            thumbnailDiv.className = 'collection-thumbnail';
            thumbnailDiv.onclick = () => this.showCollectionDetail(index);
            
            const img = document.createElement('img');
            img.src = artwork.imageUrl || artwork.image_url;
            img.alt = artwork.title || artwork.artwork || 'Untitled';
            img.onerror = () => {
                img.alt = `Failed to load: ${artwork.title || artwork.artwork}`;
            };
            
            const title = document.createElement('p');
            title.textContent = artwork.title || artwork.artwork || 'Untitled';
            
            thumbnailDiv.appendChild(img);
            thumbnailDiv.appendChild(title);
            thumbnailsContainer.appendChild(thumbnailDiv);
        });
    }

    showCollectionDetail(index) {
        this.currentCollectionIndex = index;
        document.getElementById('collection-grid').style.display = 'none';
        document.getElementById('collection-detail').style.display = 'block';
        this.showCollectionArtwork();
    }

    showCollectionArtwork() {
        const artwork = this.myCollection[this.currentCollectionIndex];
        
        const collectionImage = document.getElementById('collection-image');
        collectionImage.onerror = () => {
            console.error('Failed to load collection image:', artwork.imageUrl);
            collectionImage.alt = `Image failed to load: ${artwork.title}`;
        };
        collectionImage.src = artwork.imageUrl || artwork.image_url;
        document.getElementById('collection-title').textContent = artwork.title || artwork.artwork || 'Untitled';
        document.getElementById('collection-artist').textContent = `Artist: ${artwork.artist}`;
        document.getElementById('collection-year').textContent = `Year: ${artwork.year || 'Unknown'}`;
        document.getElementById('collection-museum').textContent = `Museum: ${artwork.museum || artwork.collection || 'Unknown'}`;
        
        const collectionArtTypeElement = document.getElementById('collection-art-type');
        const collectionArtType = artwork.art_type || 'Unknown';
        if (collectionArtType === 'Unknown') {
            collectionArtTypeElement.style.display = 'none';
        } else {
            collectionArtTypeElement.style.display = 'block';
            collectionArtTypeElement.textContent = `Type: ${collectionArtType}`;
        }
        
        const collectionMaterialElement = document.getElementById('collection-material');
        const collectionMaterial = artwork.material || 'Unknown';
        if (collectionMaterial === 'Unknown') {
            collectionMaterialElement.style.display = 'none';
        } else {
            collectionMaterialElement.style.display = 'block';
            collectionMaterialElement.textContent = `Material: ${collectionMaterial}`;
        }
        
        const collectionMovementElement = document.getElementById('collection-movement');
        const collectionMovement = artwork.movement || 'Unknown';
        if (collectionMovement === 'Unknown') {
            collectionMovementElement.style.display = 'none';
        } else {
            collectionMovementElement.style.display = 'block';
            collectionMovementElement.textContent = `Movement: ${collectionMovement}`;
        }
    }

    nextCollectionArtwork() {
        this.currentCollectionIndex = (this.currentCollectionIndex + 1) % this.myCollection.length;
        this.showCollectionArtwork();
    }

    prevCollectionArtwork() {
        this.currentCollectionIndex = (this.currentCollectionIndex - 1 + this.myCollection.length) % this.myCollection.length;
        this.showCollectionArtwork();
    }

    removeFromCollection() {
        const artwork = this.myCollection[this.currentCollectionIndex];
        const artworkTitle = artwork.title || 'this artwork';
        
        if (confirm(`Are you sure you want to remove "${artworkTitle}" from your collection?`)) {
            this.myCollection.splice(this.currentCollectionIndex, 1);
            globalCollection = this.myCollection;
            saveUserCollection();
            
            if (this.myCollection.length === 0) {
                this.showCollection();
            } else {
                if (this.currentCollectionIndex >= this.myCollection.length) {
                    this.currentCollectionIndex = 0;
                }
                this.showCollectionGrid();
            }
        }
    }

    addToCollection() {
        const currentArtwork = this.filteredArtworks[this.currentArtworkIndex];
        
        // Check if artwork is already in collection
        const isAlreadyInCollection = this.myCollection.some(item => 
            item.artwork_id === currentArtwork.artwork_id
        );
        
        if (!isAlreadyInCollection) {
            this.myCollection.push(currentArtwork);
            globalCollection = this.myCollection;
            saveUserCollection();
            this.updateHeartButton();
            // Show feedback
            const btn = document.getElementById('add-to-collection-btn');
            const originalText = btn.textContent;
            btn.textContent = '♥ Added!';
            setTimeout(() => {
                btn.textContent = originalText;
                this.updateHeartButton();
            }, 1000);
        }
    }

    updateHeartButton() {
        const currentArtwork = this.filteredArtworks[this.currentArtworkIndex];
        const btn = document.getElementById('add-to-collection-btn');
        
        if (this.myCollection.some(item => item.artwork_id === currentArtwork.artwork_id)) {
            btn.textContent = '♥ In Collection';
            btn.classList.add('in-collection');
        } else {
            btn.textContent = '♡ Add to Collection';
            btn.classList.remove('in-collection');
        }
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
        }).sort(() => 0.5 - Math.random());
        
        this.currentArtworkIndex = 0;
        this.showArtwork();
    }
}

// Global functions for source, mode and category selection
let quiz;
let selectedMode;
let selectedSource;
let globalCollection = [];
let currentUser = null;
let lifetimeScore = 0;

// Login functions
async function login() {
    const username = document.getElementById('username-input').value.trim();
    const password = document.getElementById('password-input').value.trim();
    
    if (!username || !password) {
        alert('Please enter both username and password');
        return;
    }
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            credentials: 'include',
            body: JSON.stringify({username, password})
        });
        
        const data = await response.json();
        if (data.success) {
            currentUser = data.username;
            globalCollection = data.profile.collection || [];
            lifetimeScore = data.profile.quiz_stats ? data.profile.quiz_stats.correct : 0;
            document.getElementById('welcome-user').textContent = `Welcome, ${username}!`;
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('mode-selection').style.display = 'block';
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}

async function logout() {
    try {
        await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        currentUser = null;
        globalCollection = [];
        lifetimeScore = 0;
        document.getElementById('username-input').value = '';
        document.getElementById('password-input').value = '';
        document.getElementById('login-screen').style.display = 'block';
        document.getElementById('mode-selection').style.display = 'none';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

async function saveUserCollection() {
    if (!currentUser) return;
    
    try {
        await fetch('/api/user/collection', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            credentials: 'include',
            body: JSON.stringify({collection: globalCollection})
        });
    } catch (error) {
        console.error('Error saving collection:', error);
    }
}

function startGame(mode) {
    document.getElementById('mode-selection').style.display = 'none';
    
    quiz = new ArtQuiz();
    quiz.selectedCategory = 'All';
    quiz.dataSource = mode === 'editors' ? 'editors' : 'louvre';
    
    if (mode === 'quiz') {
        document.getElementById('quiz-selection-lifetime-score').textContent = lifetimeScore;
        document.getElementById('quiz-source-selection').style.display = 'block';
    } else if (mode === 'browse') {
        document.getElementById('browse-container').style.display = 'block';
        quiz.init('browse');
    } else if (mode === 'editors') {
        document.getElementById('editors-choice-container').style.display = 'block';
        showEditorsChoice();
    } else if (mode === 'collection') {
        document.getElementById('collection-container').style.display = 'block';
        quiz.init('collection');
    }
}

async function showEditorsChoice() {
    const artists = [
        'Leonardo da Vinci', 'Michelangelo', 'Raphael', 'Caravaggio', 'Titian',
        'Sandro Botticelli', 'Rembrandt van Rijn', 'Johannes Vermeer', 'Peter Paul Rubens',
        'Diego Velázquez', 'Francisco Goya', 'El Greco', 'Jean-Auguste-Dominique Ingres',
        'Eugène Delacroix', 'Édouard Manet', 'Claude Monet', 'Pierre-Auguste Renoir',
        'Vincent van Gogh', 'Paul Cézanne', 'Henri Matisse', 'Pablo Picasso',
        'Wassily Kandinsky', 'Edgar Degas', 'Georges Seurat', 'Marc Chagall'
    ];
    
    // Load artworks
    const response = await fetch('/api/artworks?source=editors');
    const artworks = await response.json();
    
    const grid = document.getElementById('editors-artist-grid');
    grid.innerHTML = '';
    
    artists.forEach(artist => {
        // Find first artwork by this artist
        const artwork = artworks.find(a => a.artist === artist);
        
        const card = document.createElement('div');
        card.className = 'artist-card';
        card.onclick = () => browseArtistWorks(artist);
        
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
}

async function browseArtistWorks(artist) {
    document.getElementById('editors-choice-container').style.display = 'none';
    document.getElementById('artist-profile-container').style.display = 'block';
    
    // Load artist info
    const infoResponse = await fetch(`/api/artist-info/${encodeURIComponent(artist)}`);
    const artistInfo = await infoResponse.json();
    
    // Load artworks
    const artworksResponse = await fetch('/api/artworks?source=editors');
    const allArtworks = await artworksResponse.json();
    const artistArtworks = allArtworks.filter(a => a.artist === artist);
    
    // Display artist info
    document.getElementById('artist-name').textContent = artist;
    
    // Display artist details
    document.getElementById('artist-years').textContent = artistInfo.years || '';
    document.getElementById('artist-country').textContent = artistInfo.country || '';
    document.getElementById('artist-movement').textContent = artistInfo.movement || '';
    document.getElementById('artist-period').textContent = artistInfo.period || '';
    
    const summaryElement = document.getElementById('artist-summary');
    if (artistInfo.is_html) {
        summaryElement.innerHTML = artistInfo.artist_summary || 'No summary available.';
    } else {
        summaryElement.textContent = artistInfo.artist_summary || 'No summary available.';
    }
    document.getElementById('artist-wiki-link').href = artistInfo.wiki_link || '#';
    document.getElementById('artist-image').src = artistInfo.image_url || 'https://via.placeholder.com/200x200?text=' + encodeURIComponent(artist);
    
    // Display artworks
    const grid = document.getElementById('artist-artworks-grid');
    grid.innerHTML = '';
    
    artistArtworks.forEach(artwork => {
        const card = document.createElement('div');
        card.className = 'artist-artwork-card';
        card.onclick = () => showArtworkDetail(artwork, artist);
        
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
}

let currentArtistContext = null;
let currentDetailArtwork = null;

function showArtworkDetail(artwork, artist) {
    currentArtistContext = artist;
    currentDetailArtwork = artwork;
    document.getElementById('artist-profile-container').style.display = 'none';
    document.getElementById('artwork-detail-container').style.display = 'block';
    
    // Display artwork details
    document.getElementById('detail-artwork-image').src = artwork.image_url || artwork.imageUrl;
    document.getElementById('detail-artwork-title').textContent = artwork.title || artwork.artwork || 'Untitled';
    document.getElementById('detail-artwork-artist').textContent = `Artist: ${artwork.artist}`;
    document.getElementById('detail-artwork-year').textContent = `Year: ${artwork.year || 'Unknown'}`;
    document.getElementById('detail-artwork-museum').textContent = `Museum: ${artwork.museum || artwork.location || 'Unknown'}`;
    
    const typeElement = document.getElementById('detail-artwork-type');
    const artType = artwork.art_type || 'Unknown';
    if (artType === 'Unknown') {
        typeElement.style.display = 'none';
    } else {
        typeElement.style.display = 'block';
        typeElement.textContent = `Type: ${artType}`;
    }
    
    const materialElement = document.getElementById('detail-artwork-material');
    const material = artwork.material || 'Unknown';
    if (material === 'Unknown') {
        materialElement.style.display = 'none';
    } else {
        materialElement.style.display = 'block';
        materialElement.textContent = `Material: ${material}`;
    }
    
    const movementElement = document.getElementById('detail-artwork-movement');
    const movement = artwork.movement || 'Unknown';
    if (movement === 'Unknown') {
        movementElement.style.display = 'none';
    } else {
        movementElement.style.display = 'block';
        movementElement.textContent = `Movement: ${movement}`;
    }
    
    // Add Wikipedia link
    const wikiLink = document.getElementById('detail-artwork-wiki-link');
    if (wikiLink) wikiLink.remove();
    
    const artworkTitle = artwork.title || artwork.artwork;
    if (artworkTitle) {
        const link = document.createElement('a');
        link.id = 'detail-artwork-wiki-link';
        link.href = `https://en.wikipedia.org/wiki/${encodeURIComponent(artworkTitle.replace(/ /g, '_'))}`;
        link.target = '_blank';
        link.textContent = 'Read more on Wikipedia →';
        document.getElementById('detail-artwork-info').appendChild(link);
    }
    
    updateDetailHeartButton();
}

function addToCollectionFromDetail() {
    if (!currentDetailArtwork) return;
    
    const isAlreadyInCollection = globalCollection.some(item => 
        item.artwork_id === currentDetailArtwork.artwork_id
    );
    
    if (!isAlreadyInCollection) {
        globalCollection.push({...currentDetailArtwork, imageUrl: currentDetailArtwork.image_url || currentDetailArtwork.imageUrl});
        saveUserCollection();
        updateDetailHeartButton();
        const btn = document.getElementById('detail-add-to-collection-btn');
        const originalText = btn.textContent;
        btn.textContent = '♥ Added!';
        setTimeout(() => {
            btn.textContent = originalText;
            updateDetailHeartButton();
        }, 1000);
    }
}

function updateDetailHeartButton() {
    if (!currentDetailArtwork) return;
    
    const btn = document.getElementById('detail-add-to-collection-btn');
    if (!btn) return;
    
    if (globalCollection.some(item => item.artwork_id === currentDetailArtwork.artwork_id)) {
        btn.textContent = '♥ In Collection';
        btn.classList.add('in-collection');
    } else {
        btn.textContent = '♡ Add to Collection';
        btn.classList.remove('in-collection');
    }
}

function backToArtistProfile() {
    document.getElementById('artwork-detail-container').style.display = 'none';
    if (currentArtistContext) {
        browseArtistWorks(currentArtistContext);
    } else {
        document.getElementById('artist-profile-container').style.display = 'block';
    }
}

function backToEditorsChoice() {
    document.getElementById('artist-profile-container').style.display = 'none';
    document.getElementById('editors-choice-container').style.display = 'block';
}

function startQuiz(source) {
    document.getElementById('quiz-source-selection').style.display = 'none';
    document.getElementById('quiz-container').style.display = 'block';
    
    quiz = new ArtQuiz();
    quiz.selectedCategory = 'All';
    quiz.dataSource = 'louvre';
    quiz.quizSource = source;
    
    // Initialize score displays
    document.getElementById('score-value').textContent = quiz.sessionScore;
    
    quiz.init('quiz');
}

function backToMenu() {
    document.getElementById('quiz-container').style.display = 'none';
    document.getElementById('quiz-source-selection').style.display = 'none';
    document.getElementById('browse-container').style.display = 'none';
    document.getElementById('editors-choice-container').style.display = 'none';
    document.getElementById('artist-profile-container').style.display = 'none';
    document.getElementById('artwork-detail-container').style.display = 'none';
    document.getElementById('collection-container').style.display = 'none';
    
    // Hide congratulations if visible
    const congratsDiv = document.getElementById('congratulations');
    if (congratsDiv) {
        congratsDiv.style.display = 'none';
    }
    
    document.getElementById('mode-selection').style.display = 'block';
    currentArtistContext = null;
    currentDetailArtwork = null;
    quiz = null;
}

// Initialize and check login status when page loads
document.addEventListener('DOMContentLoaded', async () => {
    await checkLoginStatus();
});



async function checkLoginStatus() {
    try {
        const response = await fetch('/api/user/profile', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.username;
            globalCollection = data.profile.collection || [];
            lifetimeScore = data.profile.quiz_stats ? data.profile.quiz_stats.correct : 0;
            document.getElementById('welcome-user').textContent = `Welcome, ${data.username}!`;
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('mode-selection').style.display = 'block';
        } else {
            // Not logged in, show login screen
            document.getElementById('login-screen').style.display = 'block';
            document.getElementById('mode-selection').style.display = 'none';
        }
    } catch (error) {
        console.error('Error checking login status:', error);
        document.getElementById('login-screen').style.display = 'block';
        document.getElementById('mode-selection').style.display = 'none';
    }
}