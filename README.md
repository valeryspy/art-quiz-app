---
title: Art Quiz App
emoji: 🐳
colorFrom: purple
colorTo: gray
sdk: docker
app_port: 7860
---

# Art Quiz App

![Python](https://img.shields.io/badge/python-v3.9+-blue.svg)
![Flask](https://img.shields.io/badge/flask-v2.3.3-green.svg)
![JavaScript](https://img.shields.io/badge/javascript-ES6-yellow.svg)
![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=flat&logo=css3&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-brightgreen.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)
![Contributions](https://img.shields.io/badge/contributions-welcome-orange.svg)

An interactive web application that tests your knowledge of famous artworks from the National Gallery of Art collection.

Live Demo Here: https://valeryspy-art-quiz-app.hf.space/

## Features

### 🎯 Quiz Mode
- Guess the artist from displayed artwork
- Multiple choice questions with 4 options
- **50/50 Hint**: Removes 2 wrong answers (single use)
- **Year Hint**: Shows artwork creation date
- Score tracking

### 🖼️ Browse Mode
- View artworks with complete information
- Browse through the entire collection
- See artist, title, year, and medium details

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Python Flask
- **Data**: National Gallery of Art Open Data
- **Image Service**: IIIF (International Image Interoperability Framework)

## Setup

### Prerequisites
- Python 3.9+
- pip

### Installation

1. **Clone or download the project**
2. **Install dependencies**:
   ```bash
   pip3 install -r requirements.txt
   ```

3. **Process the data** (if needed):
   ```bash
   python3 process_data.py
   ```

4. **Start the server**:
   ```bash
   python3 server.py
   ```

5. **Open your browser** and go to:
   ```
   http://localhost:8000
   ```

## Data Source

This app uses the [National Gallery of Art's Open Data](https://github.com/NationalGalleryOfArt/opendata) collection, featuring thousands of artworks with high-quality images served via IIIF.

## API Endpoints

- `GET /api/artworks` - Returns all artwork data
- `GET /api/artists` - Returns list of unique artists

## File Structure

```
art-quiz-app/
├── index.html          # Main HTML file
├── style.css           # Styling
├── script.js           # Frontend JavaScript
├── server.py           # Flask backend
├── process_data.py     # Data processing script
├── requirements.txt    # Python dependencies
├── objects.csv         # Raw NGA objects data
├── published_images.csv # Raw NGA images data
└── artworks.csv        # Processed artwork data
```

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project uses public domain artworks from the National Gallery of Art.