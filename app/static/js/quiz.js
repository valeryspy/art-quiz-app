class QuizGame {
    constructor() {
        this.artworks = [];
        this.artists = [];
        this.currentQuestion = null;
        this.sessionScore = 0;
        this.fiftyFiftyUsed = false;
        this.correctlyAnswered = [];
        this.quizSource = 'all';
    }
    
    async init(source) {
        this.quizSource = source;
        hideElement('quiz-source-selection');
        showElement('quiz-container');
        
        try {
            const [artworks, artists] = await Promise.all([
                API.get('/api/artworks'),
                API.get('/api/artists')
            ]);
            
            this.artworks = artworks.map(a => ({
                ...a,
                title: a.title || a.artwork,
                imageUrl: a.image_url || a.iiifurl
            }));
            this.artists = artists;
            
            this.generateQuestion();
        } catch (error) {
            document.getElementById('loading').textContent = 'Error loading data: ' + error.message;
        }
    }
    
    generateQuestion() {
        const sourceArtworks = this.quizSource === 'collection' ? AppState.collection : this.artworks;
        
        if (sourceArtworks.length === 0) {
            document.getElementById('loading').textContent = this.quizSource === 'collection' 
                ? 'Your collection is empty. Add some artworks first!' 
                : 'No artworks available.';
            return;
        }
        
        const availableArtworks = sourceArtworks.filter(a => !this.correctlyAnswered.includes(a.artwork_id));
        
        if (availableArtworks.length === 0) {
            this.showCongratulations();
            return;
        }
        
        const artwork = availableArtworks[Math.floor(Math.random() * availableArtworks.length)];
        const correctArtist = artwork.artist;
        
        const sourceArtists = this.quizSource === 'collection' 
            ? [...new Set(AppState.collection.map(a => a.artist))]
            : this.artists;
        
        let wrongArtists = sourceArtists.filter(a => a !== correctArtist)
            .sort(() => 0.5 - Math.random()).slice(0, 3);
        
        if (wrongArtists.length < 3 && this.quizSource === 'collection') {
            wrongArtists.push(...this.artists.filter(a => a !== correctArtist && !wrongArtists.includes(a))
                .sort(() => 0.5 - Math.random()).slice(0, 3 - wrongArtists.length));
        }
        
        const options = [correctArtist, ...wrongArtists].sort(() => 0.5 - Math.random());
        
        this.currentQuestion = { artwork, correctArtist, options };
        this.displayQuestion();
    }
    
    displayQuestion() {
        const { artwork, options } = this.currentQuestion;
        
        hideElement('loading');
        showElement('quiz');
        
        const img = document.getElementById('artwork-image');
        img.src = artwork.imageUrl;
        img.onerror = () => {
            document.getElementById('loading').textContent = 'Image failed to load';
            showElement('loading');
            hideElement('quiz');
        };
        
        document.getElementById('artwork-info').textContent = artwork.title || artwork.artwork || 'Untitled';
        document.getElementById('artwork-medium').textContent = artwork.material || '';
        
        const optionsContainer = document.getElementById('options');
        optionsContainer.innerHTML = '';
        
        options.forEach(artist => {
            const div = document.createElement('div');
            div.className = 'option';
            div.textContent = artist;
            div.onclick = () => this.selectOption(div, artist);
            optionsContainer.appendChild(div);
        });
        
        if (!this.fiftyFiftyUsed) {
            document.getElementById('fifty-fifty-btn').disabled = false;
            document.getElementById('fifty-fifty-btn').textContent = '50/50';
        }
        
        hideElement('result');
        hideElement('next-btn');
        ['year-hint', 'movement-hint', 'museum-hint'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
    }
    
    selectOption(element, selectedArtist) {
        const { correctArtist } = this.currentQuestion;
        const isCorrect = selectedArtist === correctArtist;
        
        document.querySelectorAll('.option').forEach(opt => {
            opt.onclick = null;
            if (opt.textContent === correctArtist) {
                opt.classList.add('correct');
            } else if (opt === element && !isCorrect) {
                opt.classList.add('incorrect');
            }
        });
        
        const resultDiv = document.getElementById('result');
        showElement('result');
        
        if (isCorrect) {
            this.sessionScore++;
            AppState.lifetimeScore++;
            this.correctlyAnswered.push(this.currentQuestion.artwork.artwork_id);
            resultDiv.textContent = 'Correct! Well done!';
            resultDiv.className = 'correct';
        } else {
            resultDiv.textContent = `Incorrect. The correct answer is ${correctArtist}.`;
            resultDiv.className = 'incorrect';
        }
        
        document.getElementById('score-value').textContent = this.sessionScore;
        this.saveQuizProgress(isCorrect);
        showElement('next-btn');
    }
    
    async saveQuizProgress(isCorrect) {
        if (!AppState.currentUser) return;
        try {
            await API.post('/api/user/quiz-result', {
                correct: isCorrect ? 1 : 0,
                total: 1
            });
        } catch (error) {
            console.error('Error saving quiz progress:', error);
        }
    }
    
    useFiftyFifty() {
        if (this.fiftyFiftyUsed) return;
        
        const { correctArtist, options } = this.currentQuestion;
        const wrongOptions = options.filter(o => o !== correctArtist);
        const toRemove = wrongOptions.sort(() => 0.5 - Math.random()).slice(0, 2);
        
        document.querySelectorAll('.option').forEach(opt => {
            if (toRemove.includes(opt.textContent)) {
                opt.style.display = 'none';
            }
        });
        
        const btn = document.getElementById('fifty-fifty-btn');
        btn.disabled = true;
        btn.textContent = '50/50 Used';
        btn.style.backgroundColor = '#6c757d';
        this.fiftyFiftyUsed = true;
    }
    
    showHint(type) {
        const { artwork } = this.currentQuestion;
        const hints = {
            year: `This artwork was created in: ${artwork.year || 'Unknown'}`,
            movement: `Movement: ${artwork.movement || 'Unknown'}`,
            museum: `This artwork is in: ${artwork.museum || artwork.collection || 'Unknown'}`
        };
        
        const existingHint = document.getElementById(`${type}-hint`);
        if (existingHint) existingHint.remove();
        
        const hintDiv = document.createElement('div');
        hintDiv.id = `${type}-hint`;
        hintDiv.textContent = hints[type];
        
        document.getElementById('options-container').insertBefore(
            hintDiv, 
            document.getElementById('options')
        );
    }
    
    showCongratulations() {
        hideElement('loading');
        hideElement('quiz');
        hideElement('score');
        hideElement('quiz-back-btn');
        
        const container = document.getElementById('quiz-container');
        let congratsDiv = document.getElementById('congratulations');
        
        if (!congratsDiv) {
            congratsDiv = document.createElement('div');
            congratsDiv.id = 'congratulations';
            congratsDiv.innerHTML = `
                <h2 style="margin-bottom: 30px;">🎉 Congratulations! 🎉</h2>
                <p style="margin-bottom: 20px; font-size: 18px;">You've answered all questions correctly!</p>
                <p style="margin-bottom: 20px; font-size: 20px;">Session Score: <strong>${this.sessionScore}</strong></p>
                <p style="margin-bottom: 40px; font-size: 18px;">Lifetime Score: <strong>${AppState.lifetimeScore}</strong></p>
                <button onclick="navigateTo('/')" style="padding: 15px 30px; font-size: 16px; background-color: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer;">Back to Menu</button>
            `;
            congratsDiv.style.textAlign = 'center';
            congratsDiv.style.padding = '50px';
            container.appendChild(congratsDiv);
        }
        
        showElement('congratulations');
    }
}

const quiz = new QuizGame();

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const data = await API.get('/auth/profile');
        AppState.setUser(data.username, data.profile);
        document.getElementById('quiz-selection-lifetime-score').textContent = AppState.lifetimeScore;
    } catch {
        navigateTo('/');
    }
});

// Source selection
document.querySelectorAll('#quiz-source-buttons button').forEach(btn => {
    btn.addEventListener('click', () => {
        quiz.init(btn.dataset.source);
    });
});

// Hint buttons
document.getElementById('fifty-fifty-btn').addEventListener('click', () => quiz.useFiftyFifty());
document.getElementById('year-hint-btn').addEventListener('click', () => quiz.showHint('year'));
document.getElementById('movement-hint-btn').addEventListener('click', () => quiz.showHint('movement'));
document.getElementById('museum-hint-btn').addEventListener('click', () => quiz.showHint('museum'));

// Next button
document.getElementById('next-btn').addEventListener('click', () => quiz.generateQuestion());

// Back buttons
document.getElementById('quiz-source-back-btn').addEventListener('click', () => navigateTo('/'));
document.getElementById('quiz-back-btn').addEventListener('click', () => navigateTo('/'));
