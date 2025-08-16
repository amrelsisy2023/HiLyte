"""
Configuration classes for Koncurent Hi-LYTE Flask application
Handles environment-specific settings for development and production
"""

import os
from datetime import timedelta

class Config:
    """Base configuration class with common settings"""
    
    # Security
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-change-in-production'
    
    # Database Configuration (MySQL)
    MYSQL_USER = os.environ.get('MYSQL_USER', 'root')
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', '')
    MYSQL_HOST = os.environ.get('MYSQL_HOST', 'localhost')
    MYSQL_PORT = os.environ.get('MYSQL_PORT', '3306')
    MYSQL_DATABASE = os.environ.get('MYSQL_DATABASE', 'koncurent_hilyte')
    
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@"
        f"{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 10,
        'pool_timeout': 20,
        'pool_recycle': -1,
        'pool_pre_ping': True
    }
    
    # Session Configuration
    SESSION_TYPE = 'filesystem'
    SESSION_PERMANENT = False
    SESSION_USE_SIGNER = True
    SESSION_KEY_PREFIX = 'hilyte:'
    PERMANENT_SESSION_LIFETIME = timedelta(days=30)
    
    # File Upload Configuration
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100MB max file size
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'uploads')
    ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}
    
    # AI Services Configuration
    ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY')
    DEFAULT_AI_MODEL = 'claude-sonnet-4-20250514'
    
    # External Integrations
    STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
    STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY')
    SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY')
    
    # Procore Integration
    PROCORE_CLIENT_ID = os.environ.get('PROCORE_CLIENT_ID')
    PROCORE_CLIENT_SECRET = os.environ.get('PROCORE_CLIENT_SECRET')
    PROCORE_COMPANY_ID = os.environ.get('PROCORE_COMPANY_ID')
    PROCORE_ENVIRONMENT = os.environ.get('PROCORE_ENVIRONMENT', 'sandbox')
    
    # Autodesk Integration
    AUTODESK_CLIENT_ID = os.environ.get('AUTODESK_CLIENT_ID')
    AUTODESK_CLIENT_SECRET = os.environ.get('AUTODESK_CLIENT_SECRET')
    
    # Background Task Configuration (Redis/Celery)
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    CELERY_BROKER_URL = REDIS_URL
    CELERY_RESULT_BACKEND = REDIS_URL
    
    # Logging
    LOG_LEVEL = 'INFO'
    
    @staticmethod
    def init_app(app):
        """Initialize configuration with Flask app"""
        # Create upload directory if it doesn't exist
        os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
        os.makedirs(os.path.join(Config.UPLOAD_FOLDER, 'pages'), exist_ok=True)


class DevelopmentConfig(Config):
    """Development environment configuration"""
    DEBUG = True
    LOG_LEVEL = 'DEBUG'
    
    # Development database (use default MySQL setup)
    MYSQL_DATABASE = 'koncurent_hilyte_dev'
    
    # Enable template auto-reload
    TEMPLATES_AUTO_RELOAD = True


class ProductionConfig(Config):
    """Production environment configuration"""
    DEBUG = False
    
    # Production database
    MYSQL_DATABASE = 'koncurent_hilyte_prod'
    
    # Enhanced security for production
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # Logging to file in production
    LOG_TO_FILE = True
    
    @classmethod
    def init_app(cls, app):
        Config.init_app(app)
        
        # Log to file in production
        import logging
        from logging.handlers import RotatingFileHandler
        
        if not app.debug and not app.testing:
            if not os.path.exists('logs'):
                os.mkdir('logs')
            
            file_handler = RotatingFileHandler(
                'logs/hilyte.log', maxBytes=10240, backupCount=10
            )
            file_handler.setFormatter(logging.Formatter(
                '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
            ))
            file_handler.setLevel(logging.INFO)
            app.logger.addHandler(file_handler)
            app.logger.setLevel(logging.INFO)
            app.logger.info('Koncurent Hi-LYTE startup')


class TestingConfig(Config):
    """Testing environment configuration"""
    TESTING = True
    WTF_CSRF_ENABLED = False
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'


# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}