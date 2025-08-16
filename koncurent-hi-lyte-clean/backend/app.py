#!/usr/bin/env python3
"""
Koncurent Hi-LYTE - Advanced Construction Document Intelligence Platform
Flask Backend Application

Converted from Node.js/Express to Python/Flask with MySQL
Maintains all original functionality: AI extraction, NLP analysis, OCR, document processing
"""

import os
import logging
from datetime import timedelta
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_login import LoginManager, login_required, current_user
from flask_session import Session
from flask_migrate import Migrate
from werkzeug.middleware.proxy_fix import ProxyFix

# Import configurations and extensions
from config import Config, DevelopmentConfig, ProductionConfig
from extensions import db, login_manager
from models import User, Drawing, ExtractedData, AICreditTransaction

# Import blueprints
from blueprints.auth import auth_bp
from blueprints.drawings import drawings_bp
from blueprints.ai_extraction import ai_bp
from blueprints.construction_divisions import divisions_bp
from blueprints.credits import credits_bp
from blueprints.integrations import integrations_bp

def create_app(config_class=None):
    """Application factory pattern for Flask app creation"""
    app = Flask(__name__)
    
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
    # Load configuration
    if config_class is None:
        config_class = DevelopmentConfig if os.environ.get('FLASK_ENV') == 'development' else ProductionConfig
    
    app.config.from_object(config_class)
    
    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    
    # Configure session
    Session(app)
    
    # Enable CORS for React frontend
    CORS(app, 
         origins=["http://localhost:3000", "http://localhost:5173"],
         supports_credentials=True,
         allow_headers=["Content-Type", "Authorization"])
    
    # Configure Flask-Migrate
    migrate = Migrate(app, db)
    
    # Handle proxy headers if behind reverse proxy
    app.wsgi_app = ProxyFix(app.wsgi_app)
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(drawings_bp, url_prefix='/api')
    app.register_blueprint(ai_bp, url_prefix='/api/ai')
    app.register_blueprint(divisions_bp, url_prefix='/api')
    app.register_blueprint(credits_bp, url_prefix='/api/ai-credits')
    app.register_blueprint(integrations_bp, url_prefix='/api')
    
    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        """Health check endpoint for monitoring"""
        return jsonify({
            'status': 'healthy',
            'service': 'koncurent-hilyte-backend',
            'version': '2.0.0-python'
        })
    
    # AI status endpoint
    @app.route('/api/ai-status')
    def ai_status():
        """Check AI service availability"""
        return jsonify({
            'aiEnabled': bool(os.environ.get('ANTHROPIC_API_KEY')),
            'provider': 'Anthropic Claude 4.0 Sonnet',
            'features': ['Smart Extraction', 'Enhanced NLP', 'OCR', 'Document Analysis']
        })
    
    # Background processing status
    @app.route('/api/background-ai/status')
    def background_status():
        """Background AI processing status"""
        # TODO: Implement with Celery task status
        return jsonify({
            'isProcessing': False,
            'drawingId': None,
            'progress': 0,
            'message': 'No active processing'
        })
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Resource not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        logger.error(f"Internal server error: {str(error)}")
        return jsonify({'error': 'Internal server error'}), 500
    
    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({'error': 'Authentication required'}), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({'error': 'Access forbidden'}), 403
    
    # Create database tables
    with app.app_context():
        try:
            db.create_all()
            logger.info("Database tables created successfully")
        except Exception as e:
            logger.error(f"Error creating database tables: {str(e)}")
    
    logger.info("Koncurent Hi-LYTE Flask backend initialized successfully")
    return app

# Create the application instance
app = create_app()

if __name__ == '__main__':
    # Run the development server
    app.run(
        host='0.0.0.0',
        port=int(os.environ.get('PORT', 5000)),
        debug=os.environ.get('FLASK_ENV') == 'development'
    )