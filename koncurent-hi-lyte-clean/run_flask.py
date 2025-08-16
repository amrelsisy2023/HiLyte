#!/usr/bin/env python3
"""
Flask Application Runner
Starts the Koncurent Hi-LYTE Python/Flask backend server
"""

import os
import sys

# Add backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))

from backend.app import create_app

if __name__ == '__main__':
    # Set environment variables if not already set
    os.environ.setdefault('FLASK_ENV', 'development')
    os.environ.setdefault('FLASK_DEBUG', '1')
    
    # Create Flask app
    app = create_app()
    
    # Run the application
    app.run(
        host='0.0.0.0',
        port=5001,  # Different port to avoid conflict with existing Node.js app
        debug=True,
        use_reloader=True
    )