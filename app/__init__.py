from flask import Flask
from flask_cors import CORS
import os

def create_app():
    app = Flask(__name__, 
                static_folder='static',
                template_folder='templates')
    
    app.secret_key = os.environ.get('SECRET_KEY', 'art-quiz-secret-key-2024')
    app.config['DATA_FOLDER'] = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
    
    CORS(app, supports_credentials=True)
    
    from app.auth import auth_bp
    from app.api import api_bp
    from app.views import views_bp
    
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(views_bp)
    
    return app
