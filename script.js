class ArtQuiz {
    constructor() {
        this.score = 0;
        this.currentQuestion = null;
        this.artworks = [];
        this.artists = [];
        this.fiftyFiftyUsed = false;
        this.mode = null;
        this.currentArtworkIndex = 0;
    }

    async init(mode) {
        this.mode = mode;
        await this.loadData();
        if (mode === 'quiz') {
            this.generateQuestion();
        } else if (mode === 'browse') {
            this.showArtwork();
        }
    }

    async loadData() {
        try {
            document.getElementById('loading').textContent = 'Loading NGA collection...';
            console.log('Starting data load...');
            
            const [artworksResponse, artistsResponse] = await Promise.all([
                fetch('/api/artworks'),
                fetch('/api/artists')
            ]);
            
            if (!artworksResponse.ok || !artistsResponse.ok) {
                throw new Error('Failed to load data from server');
            }
            
            this.artworks = await artworksResponse.json();
            this.artists = await artistsResponse.json();
            
            // Add imageUrl for display
            this.artworks = this.artworks.map(artwork => ({
                ...artwork,
                imageUrl: `${artwork.iiifurl}/full/!400,400/0/default.jpg`
            }));
            
            console.log(`Loaded ${this.artworks.length} artworks and ${this.artists.length} artists`);
            
            if (this.artworks.length === 0) {
                document.getElementById('loading').textContent = 'No artwork found';
                return;
            }
        } catch (error) {
            console.error('Error loading data:', error);
            document.getElementById('loading').textContent = 'Error loading data: ' + error.message;
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
        if (this.artworks.length === 0) {
            document.getElementById('loading').textContent = 'No artworks available. Please refresh the page.';
            return;
        }

        // Select random artwork
        const randomArtwork = this.artworks[Math.floor(Math.random() * this.artworks.length)];
        console.log(`Selected artwork: ${randomArtwork.title} by ${randomArtwork.attribution}`);
        const correctArtist = randomArtwork.attribution;

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
        document.getElementById('artwork-medium').textContent = artwork.medium || '';

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

        // Hide result, year hint, and next button
        document.getElementById('result').style.display = 'none';
        document.getElementById('next-btn').style.display = 'none';
        const yearHint = document.getElementById('year-hint');
        if (yearHint) yearHint.remove();
    }

    showYearHint() {
        const { artwork } = this.currentQuestion;
        const year = artwork.beginyear || 'Unknown';
        
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
        if (this.artworks.length === 0) {
            document.getElementById('loading').textContent = 'No artworks available.';
            return;
        }

        const artwork = this.artworks[this.currentArtworkIndex];
        
        const browseImage = document.getElementById('browse-image');
        browseImage.onerror = () => {
            console.error('Failed to load browse image:', artwork.imageUrl);
            browseImage.alt = `Image failed to load: ${artwork.title}`;
        };
        browseImage.src = artwork.imageUrl;
        document.getElementById('browse-title').textContent = artwork.title || 'Untitled';
        document.getElementById('browse-artist').textContent = `Artist: ${artwork.attribution}`;
        document.getElementById('browse-year').textContent = `Year: ${artwork.beginyear || 'Unknown'}`;
        document.getElementById('browse-medium').textContent = `Medium: ${artwork.medium || 'Unknown'}`;
        
        document.getElementById('browse-container').style.display = 'block';
    }

    nextArtwork() {
        this.currentArtworkIndex = (this.currentArtworkIndex + 1) % this.artworks.length;
        this.showArtwork();
    }
}

// Global functions for mode selection
let quiz;

function startQuizMode() {
    document.getElementById('mode-selection').style.display = 'none';
    document.getElementById('quiz-container').style.display = 'block';
    quiz = new ArtQuiz();
    quiz.init('quiz');
}

function startBrowseMode() {
    document.getElementById('mode-selection').style.display = 'none';
    quiz = new ArtQuiz();
    quiz.init('browse');
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