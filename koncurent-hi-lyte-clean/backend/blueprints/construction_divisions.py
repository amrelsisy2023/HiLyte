"""
Construction Divisions Blueprint
"""

from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from extensions import db
from models import ConstructionDivision

divisions_bp = Blueprint('divisions', __name__)

@divisions_bp.route('/construction-divisions', methods=['GET'])
@login_required
def get_construction_divisions():
    """Get all active construction divisions"""
    divisions = ConstructionDivision.query.filter_by(is_active=True).order_by(ConstructionDivision.sort_order).all()
    return jsonify([div.to_dict() for div in divisions])

@divisions_bp.route('/construction-divisions', methods=['POST'])
@login_required
def create_construction_division():
    """Create new construction division"""
    try:
        data = request.get_json()
        division = ConstructionDivision(
            name=data['name'],
            code=data['code'],
            description=data.get('description'),
            color=data.get('color', '#3b82f6')
        )
        db.session.add(division)
        db.session.commit()
        return jsonify(division.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Division creation failed'}), 500