"""
Flask extensions initialization
Centralizes extension instances to avoid circular imports
"""

from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager

# Initialize extensions
db = SQLAlchemy()
login_manager = LoginManager()

# Configure LoginManager
login_manager.login_view = 'auth.login'
login_manager.login_message = 'Please log in to access this page.'
login_manager.login_message_category = 'info'

@login_manager.user_loader
def load_user(user_id):
    """Load user by ID for Flask-Login"""
    from models import User  # Import here to avoid circular import
    return User.query.get(int(user_id))