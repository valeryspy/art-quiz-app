# Art Quiz App - Architecture v2.0

## Overview
Refactored from monolithic structure to modular Flask application using Blueprints pattern.

## Directory Structure

```
art-quiz-app/
├── app/
│   ├── __init__.py              # Flask app factory
│   ├── models.py                # Data models (DataLoader, UserManager)
│   ├── auth.py                  # Authentication blueprint
│   ├── api.py                   # API blueprint
│   ├── views/
│   │   └── __init__.py          # Views blueprint (routes)
│   ├── static/
│   │   ├── css/
│   │   │   ├── common.css       # Base styles
│   │   │   └── components.css   # Component styles
│   │   └── js/
│   │       ├── common.js        # API client & state management
│   │       ├── dashboard.js     # Login & mode selection
│   │       ├── quiz.js          # Quiz mode logic
│   │       ├── browse.js        # Browse mode logic
│   │       ├── editors.js       # Editor's Choice logic
│   │       └── collection.js    # Collection mode logic
│   └── templates/
│       ├── base.html            # Base template
│       ├── dashboard.html       # Login & mode selection
│       ├── quiz.html            # Quiz mode
│       ├── browse.html          # Browse mode
│       ├── editors.html         # Editor's Choice
│       └── collection.html      # My Collection
├── data/                        # CSV and JSON data files
├── server.py                    # Application entry point
└── requirements.txt
```

## Architecture Patterns

### 1. Flask Blueprints
- **auth_bp**: Authentication (login, logout, profile)
- **api_bp**: RESTful API endpoints
- **views_bp**: Page rendering routes

### 2. Template Inheritance
- `base.html`: Common layout, CSS, JS includes
- Mode templates: Extend base, add mode-specific content

### 3. JavaScript Modules
- **common.js**: Shared utilities (API client, state management)
- **Mode-specific**: Isolated logic per mode

### 4. Data Layer
- **DataLoader**: Singleton pattern for artwork data
- **UserManager**: User data persistence

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/profile` - Get user profile

### Data API
- `GET /api/artworks?source={all|editors}` - Get artworks
- `GET /api/artists?source={all|editors}` - Get artists
- `GET /api/movements?source={all|editors}` - Get movements
- `GET /api/artist-info/<artist_name>` - Get artist details

### User API
- `GET /api/user/collection` - Get user collection
- `POST /api/user/collection` - Save user collection
- `POST /api/user/quiz-result` - Save quiz result

## Routes

- `GET /` - Dashboard (login & mode selection)
- `GET /quiz` - Quiz mode
- `GET /browse` - Browse mode
- `GET /editors` - Editor's Choice
- `GET /collection` - My Collection

## State Management

Global state managed in `common.js`:
- `AppState.currentUser` - Current logged-in user
- `AppState.collection` - User's artwork collection
- `AppState.lifetimeScore` - User's lifetime quiz score

## Running the Application

```bash
python3 server.py
```

Access at: http://localhost:7860

## Benefits of New Architecture

1. **Modularity**: Each mode is independent
2. **Maintainability**: Easy to locate and modify code
3. **Scalability**: Simple to add new modes/features
4. **Reusability**: Shared utilities reduce duplication
5. **Testability**: Each module can be tested separately
6. **Performance**: Lazy loading of mode-specific code
7. **Best Practices**: Follows Flask and web development standards
