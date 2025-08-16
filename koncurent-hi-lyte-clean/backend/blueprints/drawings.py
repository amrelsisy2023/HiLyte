"""
Drawings Blueprint - File upload and management
"""

import os
import json
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename
from PIL import Image
import pdf2image
import uuid

from extensions import db
from models import Drawing, DrawingProfile, Folder, Project

drawings_bp = Blueprint('drawings', __name__)

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

@drawings_bp.route('/drawings', methods=['GET'])
@login_required
def get_drawings():
    """Get user's drawings"""
    drawings = Drawing.query.filter_by(user_id=current_user.id).all()
    return jsonify([drawing.to_dict() for drawing in drawings])

@drawings_bp.route('/drawings', methods=['POST'])
@login_required
def upload_drawing():
    """Upload new drawing"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400
        
        # Get form data
        folder_id = request.form.get('folderId')
        project_id = request.form.get('projectId')
        
        # Generate unique filename
        filename = secure_filename(file.filename or 'unknown_file.pdf')
        unique_filename = f"{uuid.uuid4()}_{filename}"
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
        
        # Save file
        file.save(file_path)
        
        # Convert PDF to images if needed
        total_pages = 1
        if filename.lower().endswith('.pdf'):
            total_pages = _convert_pdf_to_images(file_path)
        
        # Create drawing record
        drawing = Drawing(
            name=filename,
            file_path=unique_filename,
            user_id=current_user.id,
            folder_id=int(folder_id) if folder_id else None,
            project_id=int(project_id) if project_id else None,
            total_pages=total_pages,
            file_size=os.path.getsize(file_path),
            file_type=filename.rsplit('.', 1)[1].lower(),
            processing_status='complete'
        )
        
        db.session.add(drawing)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'drawing': drawing.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Drawing upload failed: {str(e)}")
        return jsonify({'error': 'Upload failed'}), 500

def _convert_pdf_to_images(pdf_path):
        """Convert PDF pages to images"""
        try:
            pages = pdf2image.convert_from_path(pdf_path, dpi=300)
            pages_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'pages')
            
            os.makedirs(pages_dir, exist_ok=True)
            
            for i, page in enumerate(pages, 1):
                page_path = os.path.join(pages_dir, f'page.{i}.png')
                page.save(page_path, 'PNG')
            
            return len(pages)
        except Exception as e:
            current_app.logger.error(f"PDF conversion failed: {str(e)}")
            return 1

@drawings_bp.route('/folders', methods=['GET'])
@login_required
def get_folders():
    """Get user's folders"""
    folders = Folder.query.all()  # For now, show all folders
    return jsonify([folder.to_dict() for folder in folders])

@drawings_bp.route('/folders', methods=['POST'])
@login_required
def create_folder():
    """Create new folder"""
    try:
        data = request.get_json()
        folder = Folder(
            name=data['name'],
            project_id=data.get('projectId')
        )
        db.session.add(folder)
        db.session.commit()
        return jsonify(folder.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Folder creation failed'}), 500

@drawings_bp.route('/projects', methods=['GET'])
@login_required
def get_projects():
    """Get projects"""
    projects = Project.query.all()
    return jsonify([project.to_dict() for project in projects])