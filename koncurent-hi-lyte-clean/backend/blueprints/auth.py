"""
Authentication Blueprint
Handles user registration, login, logout, and session management
"""

from flask import Blueprint, request, jsonify, session
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import check_password_hash
import re
from datetime import datetime, timedelta, timezone

from extensions import db
from models import User, AICreditTransaction

auth_bp = Blueprint('auth', __name__)

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"
    return True, "Password is valid"

@auth_bp.route('/register', methods=['POST'])
def register():
    """User registration endpoint"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['email', 'username', 'password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field.capitalize()} is required'}), 400
        
        email = data['email'].lower().strip()
        username = data['username'].strip()
        password = data['password']
        
        # Validate email format
        if not validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Validate password strength
        is_valid, password_message = validate_password(password)
        if not is_valid:
            return jsonify({'error': password_message}), 400
        
        # Check if user already exists
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already registered'}), 400
        
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already taken'}), 400
        
        # Create new user
        user = User(
            email=email,
            username=username,
            first_name=data.get('firstName', ''),
            last_name=data.get('lastName', ''),
            company=data.get('company', ''),
            phone=data.get('phone', ''),
            trial_ends_at=datetime.now(timezone.utc) + timedelta(days=30)
        )
        user.set_password(password)
        
        db.session.add(user)
        db.session.flush()  # Get the user ID
        
        # Add welcome bonus credits
        welcome_bonus = AICreditTransaction(
            user_id=user.id,
            type='signup_bonus',
            amount=10.0,
            balance=10.0,
            description='Welcome bonus - $10 AI Credits gift from Koncurent',
            metadata={'addedAt': datetime.now(timezone.utc).isoformat()}
        )
        db.session.add(welcome_bonus)
        db.session.commit()
        
        return jsonify({
            'message': 'Registration successful',
            'user': user.to_dict(),
            'welcomeBonus': 10.0
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Registration failed'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.get_json()
        
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password are required'}), 400
        
        email = data['email'].lower().strip()
        password = data['password']
        
        # Find user by email
        user = User.query.filter_by(email=email).first()
        
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        if not user.is_active:
            return jsonify({'error': 'Account is disabled'}), 401
        
        # Log user in
        login_user(user, remember=data.get('remember', False))
        
        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict(),
            'creditBalance': user.get_credit_balance()
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Login failed'}), 500

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """User logout endpoint"""
    logout_user()
    return jsonify({'message': 'Logged out successfully'}), 200

@auth_bp.route('/status')
def status():
    """Check authentication status"""
    if current_user.is_authenticated:
        return jsonify({
            'authenticated': True,
            'user': current_user.to_dict(),
            'creditBalance': current_user.get_credit_balance()
        }), 200
    else:
        return jsonify({
            'authenticated': False,
            'user': None
        }), 200

@auth_bp.route('/profile', methods=['GET'])
@login_required
def get_profile():
    """Get user profile"""
    return jsonify({
        'user': current_user.to_dict(),
        'creditBalance': current_user.get_credit_balance()
    }), 200

@auth_bp.route('/profile', methods=['PUT'])
@login_required
def update_profile():
    """Update user profile"""
    try:
        data = request.get_json()
        
        # Update allowed fields
        allowed_fields = ['firstName', 'lastName', 'company', 'phone']
        for field in allowed_fields:
            if field in data:
                setattr(current_user, field.replace('firstName', 'first_name').replace('lastName', 'last_name'), data[field])
        
        current_user.updated_at = datetime.now(timezone.utc)
        db.session.commit()
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': current_user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Profile update failed'}), 500

@auth_bp.route('/change-password', methods=['POST'])
@login_required
def change_password():
    """Change user password"""
    try:
        data = request.get_json()
        
        current_password = data.get('currentPassword')
        new_password = data.get('newPassword')
        
        if not current_password or not new_password:
            return jsonify({'error': 'Current and new passwords are required'}), 400
        
        if not current_user.check_password(current_password):
            return jsonify({'error': 'Current password is incorrect'}), 400
        
        # Validate new password
        is_valid, password_message = validate_password(new_password)
        if not is_valid:
            return jsonify({'error': password_message}), 400
        
        current_user.set_password(new_password)
        current_user.updated_at = datetime.now(timezone.utc)
        db.session.commit()
        
        return jsonify({'message': 'Password changed successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Password change failed'}), 500