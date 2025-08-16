"""
SQLAlchemy Models for Koncurent Hi-LYTE
Converted from original Drizzle schema to SQLAlchemy with MySQL support
"""

from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Numeric, ForeignKey, JSON
from sqlalchemy.orm import relationship
from werkzeug.security import generate_password_hash, check_password_hash
import uuid

from extensions import db


class User(UserMixin, db.Model):
    """User model for authentication and profile management"""
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Profile fields
    first_name = Column(String(100))
    last_name = Column(String(100))
    company = Column(String(200))
    phone = Column(String(20))
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    
    # Subscription and trial info
    subscription_status = Column(String(50), default='free_trial')
    trial_ends_at = Column(DateTime)
    beta_access = Column(Boolean, default=False)
    
    # 2FA settings
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_method = Column(String(20))  # 'totp', 'sms', 'email'
    two_factor_secret = Column(String(255))
    backup_codes = Column(Text)  # JSON string of backup codes
    
    # Relationships
    drawings = relationship('Drawing', backref='owner', lazy='dynamic')
    credit_transactions = relationship('AICreditTransaction', backref='user', lazy='dynamic')
    extracted_data = relationship('ExtractedData', backref='user', lazy='dynamic')
    
    def set_password(self, password):
        """Set password hash"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check password against hash"""
        return check_password_hash(self.password_hash, password)
    
    def get_credit_balance(self):
        """Get current AI credit balance"""
        transactions = self.credit_transactions.all()
        return sum(t.amount for t in transactions)
    
    def to_dict(self):
        """Convert to dictionary for JSON response"""
        return {
            'id': self.id,
            'email': self.email,
            'username': self.username,
            'firstName': self.first_name,
            'lastName': self.last_name,
            'company': self.company,
            'phone': self.phone,
            'isActive': self.is_active,
            'subscriptionStatus': self.subscription_status,
            'twoFactorEnabled': self.two_factor_enabled,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }


class Project(db.Model):
    """Project model for organizing drawings"""
    __tablename__ = 'projects'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    folders = relationship('Folder', backref='project', lazy='dynamic')
    drawings = relationship('Drawing', backref='project', lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }


class Folder(db.Model):
    """Folder model for organizing drawings within projects"""
    __tablename__ = 'folders'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    project_id = Column(Integer, ForeignKey('projects.id'))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    drawings = relationship('Drawing', backref='folder', lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'projectId': self.project_id,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }


class Drawing(db.Model):
    """Drawing model for PDF documents and their metadata"""
    __tablename__ = 'drawings'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    project_id = Column(Integer, ForeignKey('projects.id'))
    folder_id = Column(Integer, ForeignKey('folders.id'))
    
    # Document properties
    total_pages = Column(Integer, default=1)
    file_size = Column(Integer)  # in bytes
    file_type = Column(String(50), default='pdf')
    
    # Metadata and analysis
    sheet_metadata = Column(JSON)  # JSON array of sheet information
    ai_analysis_complete = Column(Boolean, default=False)
    ocr_complete = Column(Boolean, default=False)
    
    # Upload and processing tracking
    upload_progress = Column(Integer, default=0)
    processing_status = Column(String(50), default='pending')  # pending, processing, complete, error
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    extracted_data = relationship('ExtractedData', backref='drawing', lazy='dynamic')
    drawing_profile = relationship('DrawingProfile', backref='drawing', uselist=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'filePath': self.file_path,
            'userId': self.user_id,
            'projectId': self.project_id,
            'folderId': self.folder_id,
            'totalPages': self.total_pages,
            'fileSize': self.file_size,
            'fileType': self.file_type,
            'sheetMetadata': self.sheet_metadata,
            'aiAnalysisComplete': self.ai_analysis_complete,
            'ocrComplete': self.ocr_complete,
            'uploadProgress': self.upload_progress,
            'processingStatus': self.processing_status,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }


class DrawingProfile(db.Model):
    """Drawing profile for additional metadata and settings"""
    __tablename__ = 'drawing_profiles'
    
    id = Column(Integer, primary_key=True)
    drawing_id = Column(Integer, ForeignKey('drawings.id'), nullable=False, unique=True)
    
    # Project information
    project_name = Column(String(255))
    project_number = Column(String(100))
    client_name = Column(String(255))
    industry = Column(String(100))
    
    # Drawing details
    discipline = Column(String(100))
    drawing_type = Column(String(100))
    scale = Column(String(50))
    revision = Column(String(10))
    issue_date = Column(DateTime)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    def to_dict(self):
        return {
            'id': self.id,
            'drawingId': self.drawing_id,
            'projectName': self.project_name,
            'projectNumber': self.project_number,
            'clientName': self.client_name,
            'industry': self.industry,
            'discipline': self.discipline,
            'drawingType': self.drawing_type,
            'scale': self.scale,
            'revision': self.revision,
            'issueDate': self.issue_date.isoformat() if self.issue_date else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }


class ConstructionDivision(db.Model):
    """CSI Construction Divisions for data organization"""
    __tablename__ = 'construction_divisions'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    code = Column(String(20), nullable=False, unique=True)
    description = Column(Text)
    color = Column(String(7), default='#3b82f6')  # Hex color
    
    # Template and extraction settings
    extraction_template = Column(JSON)  # JSON template for extraction
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    extracted_data = relationship('ExtractedData', backref='division', lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'description': self.description,
            'color': self.color,
            'extractionTemplate': self.extraction_template,
            'isActive': self.is_active,
            'sortOrder': self.sort_order,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }


class ExtractedData(db.Model):
    """Extracted data from drawings using AI/OCR"""
    __tablename__ = 'extracted_data'
    
    id = Column(Integer, primary_key=True)
    drawing_id = Column(Integer, ForeignKey('drawings.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    division_id = Column(Integer, ForeignKey('construction_divisions.id'), nullable=False)
    
    # Extraction details
    type = Column(String(50), nullable=False)  # 'manual', 'smart_extraction', 'comprehensive_extraction'
    source_location = Column(String(255))  # Location on drawing
    
    # Data content
    data = Column(JSON, nullable=False)  # Extracted data as JSON
    confidence = Column(Numeric(5, 4))  # AI confidence score
    
    # Processing metadata
    extraction_method = Column(String(100))  # Method used for extraction
    ai_model_used = Column(String(100))  # AI model version
    processing_time = Column(Numeric(8, 3))  # Time in seconds
    
    # Validation and review
    is_validated = Column(Boolean, default=False)
    validated_by = Column(Integer, ForeignKey('users.id'))
    validation_notes = Column(Text)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    def to_dict(self):
        return {
            'id': self.id,
            'drawingId': self.drawing_id,
            'userId': self.user_id,
            'divisionId': self.division_id,
            'type': self.type,
            'sourceLocation': self.source_location,
            'data': self.data,
            'confidence': float(self.confidence) if self.confidence else None,
            'extractionMethod': self.extraction_method,
            'aiModelUsed': self.ai_model_used,
            'processingTime': float(self.processing_time) if self.processing_time else None,
            'isValidated': self.is_validated,
            'validatedBy': self.validated_by,
            'validationNotes': self.validation_notes,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }


class AICreditTransaction(db.Model):
    """AI Credit transactions for usage tracking and billing"""
    __tablename__ = 'ai_credit_transactions'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Transaction details
    type = Column(String(50), nullable=False)  # 'purchase', 'usage', 'adjustment', 'signup_bonus'
    amount = Column(Numeric(10, 5), nullable=False)  # Credit amount (positive for credits, negative for usage)
    balance = Column(Numeric(10, 5), nullable=False)  # Balance after transaction
    description = Column(String(500), nullable=False)
    
    # Payment and billing
    stripe_payment_intent_id = Column(String(255))
    related_usage_id = Column(Integer)  # Reference to usage record
    
    # Metadata
    metadata = Column(JSON)  # Additional transaction metadata
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'type': self.type,
            'amount': float(self.amount),
            'balance': float(self.balance),
            'description': self.description,
            'stripePaymentIntentId': self.stripe_payment_intent_id,
            'relatedUsageId': self.related_usage_id,
            'metadata': self.metadata,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }


class FeatureToggle(db.Model):
    """Feature toggles for enabling/disabling application features"""
    __tablename__ = 'feature_toggles'
    
    id = Column(Integer, primary_key=True)
    feature_name = Column(String(100), nullable=False, unique=True)
    is_enabled = Column(Boolean, default=True)
    description = Column(Text)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    def to_dict(self):
        return {
            'featureName': self.feature_name,
            'isEnabled': self.is_enabled,
            'description': self.description,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }