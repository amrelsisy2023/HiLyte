"""
Credits Blueprint - AI credit management
"""

from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from models import AICreditTransaction

credits_bp = Blueprint('credits', __name__)

@credits_bp.route('/balance', methods=['GET'])
@login_required
def get_balance():
    """Get user's current credit balance"""
    balance = current_user.get_credit_balance()
    return jsonify({
        'balance': balance,
        'monthlySpent': 0,  # TODO: Calculate monthly spending
        'totalSpent': 0     # TODO: Calculate total spending
    })

@credits_bp.route('/transactions', methods=['GET'])
@login_required
def get_transactions():
    """Get user's credit transactions"""
    transactions = AICreditTransaction.query.filter_by(user_id=current_user.id).order_by(AICreditTransaction.created_at.desc()).limit(50).all()
    return jsonify([t.to_dict() for t in transactions])