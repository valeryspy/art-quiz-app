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
            
            // Load objects and published images
            console.log('Fetching CSV files...');
            const [objectsResponse, imagesResponse] = await Promise.all([
                fetch('https://raw.githubusercontent.com/NationalGalleryOfArt/opendata/main/data/objects.csv'),
                fetch('https://raw.githubusercontent.com/NationalGalleryOfArt/opendata/main/data/published_images.csv')
            ]);
            
            console.log('Objects response status:', objectsResponse.status);
            console.log('Images response status:', imagesResponse.status);
            
            if (!objectsResponse.ok || !imagesResponse.ok) {
                throw new Error('Failed to fetch CSV files');
            }
            
            const objectsText = await objectsResponse.text();
            const imagesText = await imagesResponse.text();
            
            console.log('Objects CSV length:', objectsText.length);
            console.log('Images CSV length:', imagesText.length);
            
            const objects = this.parseCSV(objectsText);
            const images = this.parseCSV(imagesText);
            
            console.log(`Parsed ${objects.length} objects`);
            console.log(`Parsed ${images.length} images`);
            
            // Create image lookup by object ID
            const imageMap = {};
            images.forEach(img => {
                if (img.depictstmsobjectid && img.iiifurl) {
                    imageMap[img.depictstmsobjectid] = img.iiifurl;
                }
            });
            
            console.log(`Found ${Object.keys(imageMap).length} images with valid IIIF URLs`);
            
            // Filter objects with images and attribution - require working images
            this.artworks = objects.filter(artwork => 
                artwork.attribution && 
                artwork.attribution.trim() !== '' &&
                artwork.attribution.trim() !== 'null' &&
                artwork.title &&
                artwork.objectid &&
                imageMap[artwork.objectid]
            ).map(artwork => ({
                ...artwork,
                imageUrl: `${imageMap[artwork.objectid]}/full/!400,400/0/default.jpg`
            }));

            this.artists = [...new Set(this.artworks.map(artwork => artwork.attribution.trim()))];
            
            console.log(`Final result: ${this.artworks.length} artworks with images and ${this.artists.length} artists`);
            
            if (this.artworks.length === 0) {
                document.getElementById('loading').textContent = 'No artwork found';
                return;
            }
        } catch (error) {
            console.error('Error loading NGA data:', error);
            document.getElementById('loading').textContent = 'Error loading data: ' + error.message;
        }
    }

    parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        const artworks = [];
        
        for (let i = 1; i < lines.length && i < 200000; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === headers.length) {
                const artwork = {};
                headers.forEach((header, index) => {
                    artwork[header] = values[index];
                });
                artworks.push(artwork);
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

        // Display artwork
        document.getElementById('artwork-image').src = artwork.imageUrl;
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
        const year = artwork.year || artwork.displaydate || 'Unknown';
        
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
        
        document.getElementById('browse-image').src = artwork.imageUrl;
        document.getElementById('browse-title').textContent = artwork.title || 'Untitled';
        document.getElementById('browse-artist').textContent = `Artist: ${artwork.attribution}`;
        document.getElementById('browse-year').textContent = `Year: ${artwork.year || artwork.displaydate || 'Unknown'}`;
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