"""
Integrations Blueprint - Subscription and user management
"""

from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
import os

integrations_bp = Blueprint('integrations', __name__)

@integrations_bp.route('/subscription/status', methods=['GET'])
@login_required
def get_subscription_status():
    """Get user subscription status"""
    return jsonify({
        'subscriptionStatus': current_user.subscription_status,
        'trialEndsAt': current_user.trial_ends_at.isoformat() if current_user.trial_ends_at else None
    })