#!/usr/bin/env python3
"""
Database Initialization Script for Koncurent Hi-LYTE
Sets up MySQL database with default data including construction divisions
"""

import os
import sys
import json
from datetime import datetime, timezone

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from extensions import db
from models import (
    User, Project, Folder, Drawing, DrawingProfile, 
    ConstructionDivision, ExtractedData, AICreditTransaction, FeatureToggle
)

def create_construction_divisions():
    """Create default CSI construction divisions"""
    divisions_data = [
        {"code": "00 00 00", "name": "00 - Procurement and Contracting Requirements", "description": "General project requirements, procurement processes", "color": "#6B7280"},
        {"code": "01 00 00", "name": "01 - General Requirements", "description": "Project management, quality control, temporary facilities", "color": "#374151"},
        {"code": "02 00 00", "name": "02 - Existing Conditions", "description": "Surveys, existing structures, environmental assessment", "color": "#1F2937"},
        {"code": "03 00 00", "name": "03 - Concrete", "description": "Cast-in-place concrete, precast concrete, cementitious decks", "color": "#7C2D12"},
        {"code": "04 00 00", "name": "04 - Masonry", "description": "Unit masonry, stone, masonry restoration", "color": "#A16207"},
        {"code": "05 00 00", "name": "05 - Metals", "description": "Structural metal framing, metal fabrications", "color": "#4B5563"},
        {"code": "06 00 00", "name": "06 - Wood, Plastics, and Composites", "description": "Rough carpentry, finish carpentry, architectural woodwork", "color": "#92400E"},
        {"code": "07 00 00", "name": "07 - Thermal and Moisture Protection", "description": "Waterproofing, insulation, roofing, siding", "color": "#1E40AF"},
        {"code": "08 00 00", "name": "08 - Openings", "description": "Doors, windows, skylights, hardware", "color": "#7C3AED"},
        {"code": "09 00 00", "name": "09 - Finishes", "description": "Plaster, gypsum board, tile, carpet, paint", "color": "#BE185D"},
        {"code": "10 00 00", "name": "10 - Specialties", "description": "Visual display surfaces, compartments, louvers", "color": "#059669"},
        {"code": "11 00 00", "name": "11 - Equipment", "description": "Vehicle service equipment, mercantile equipment", "color": "#DC2626"},
        {"code": "12 00 00", "name": "12 - Furnishings", "description": "Artwork, furniture, rugs, window treatments", "color": "#7C2D12"},
        {"code": "13 00 00", "name": "13 - Special Construction", "description": "Special purpose rooms, integrated construction", "color": "#1565C0"},
        {"code": "14 00 00", "name": "14 - Conveying Equipment", "description": "Elevators, escalators, moving walkways", "color": "#5B21B6"},
        {"code": "21 00 00", "name": "21 - Fire Suppression", "description": "Fire suppression systems, fire pumps", "color": "#DC2626"},
        {"code": "22 00 00", "name": "22 - Plumbing", "description": "Plumbing fixtures, water supply, waste systems", "color": "#1976D2"},
        {"code": "23 00 00", "name": "23 - Heating Ventilating and Air Conditioning", "description": "HVAC systems, air distribution, controls", "color": "#388E3C"},
        {"code": "24 00 00", "name": "24 - Electrical", "description": "Electrical service, power distribution, lighting", "color": "#F57C00"},
        {"code": "25 00 00", "name": "25 - Integrated Automation", "description": "Building automation, integrated systems", "color": "#512DA8"},
        {"code": "26 00 00", "name": "26 - Electrical", "description": "Electrical service and distribution, lighting", "color": "#FFB300"},
        {"code": "27 00 00", "name": "27 - Communications", "description": "Communications systems, audio-visual", "color": "#00796B"},
        {"code": "28 00 00", "name": "28 - Electronic Safety and Security", "description": "Fire alarm, security, monitoring systems", "color": "#C62828"},
        {"code": "31 00 00", "name": "31 - Earthwork", "description": "Site clearing, excavation, earth moving", "color": "#8D6E63"},
        {"code": "32 00 00", "name": "32 - Exterior Improvements", "description": "Paving, landscaping, site furnishings", "color": "#689F38"},
        {"code": "33 00 00", "name": "33 - Utilities", "description": "Water utilities, sanitary sewer, electrical utilities", "color": "#0288D1"},
        {"code": "34 00 00", "name": "34 - Transportation", "description": "Railways, mass transit, transportation infrastructure", "color": "#455A64"},
        {"code": "35 00 00", "name": "35 - Waterway and Marine Construction", "description": "Waterway construction, dredging, marine facilities", "color": "#0097A7"},
        {"code": "40 00 00", "name": "40 - Process Integration", "description": "Process piping, instrumentation, process equipment", "color": "#5E35B1"},
        {"code": "41 00 00", "name": "41 - Material Processing and Handling Equipment", "description": "Bulk material processing, material handling", "color": "#8E24AA"},
        {"code": "42 00 00", "name": "42 - Process Heating, Cooling, and Drying Equipment", "description": "Industrial heating and cooling systems", "color": "#D81B60"},
        {"code": "43 00 00", "name": "43 - Process Gas and Liquid Handling, Purification Equipment", "description": "Gas handling, liquid processing", "color": "#00ACC1"},
        {"code": "44 00 00", "name": "44 - Pollution Control Equipment", "description": "Air pollution control, water treatment", "color": "#43A047"},
        {"code": "45 00 00", "name": "45 - Industry-Specific Manufacturing Equipment", "description": "Specialized manufacturing equipment", "color": "#FB8C00"},
        {"code": "46 00 00", "name": "46 - Water and Wastewater Equipment", "description": "Water treatment, wastewater processing", "color": "#3949AB"},
        {"code": "47 00 00", "name": "47 - Energy Generation", "description": "Solar energy, wind energy, power generation", "color": "#FFD54F"},
        {"code": "48 00 00", "name": "48 - Electrical Power Generation", "description": "Electrical power systems, generators", "color": "#FF7043"}
    ]
    
    existing_codes = set(div.code for div in ConstructionDivision.query.all())
    
    for i, div_data in enumerate(divisions_data):
        if div_data["code"] not in existing_codes:
            division = ConstructionDivision()
            division.code = div_data["code"]
            division.name = div_data["name"]
            division.description = div_data["description"]
            division.color = div_data["color"]
            division.sort_order = i
            division.is_active = True
            
            # Add basic extraction template
            division.extraction_template = {
                "columns": ["Item", "Quantity", "Unit", "Description", "Specification"],
                "example": f"Example items for {div_data['name'].split(' - ')[1] if ' - ' in div_data['name'] else 'construction'}"
            }
            
            db.session.add(division)
    
    print(f"Created {len([d for d in divisions_data if d['code'] not in existing_codes])} construction divisions")

def create_sample_folders():
    """Create sample project folders"""
    sample_folders = [
        {"name": "Architectural Drawings", "project_id": None},
        {"name": "Structural Plans", "project_id": None},
        {"name": "MEP Drawings", "project_id": None},
        {"name": "Civil Plans", "project_id": None},
        {"name": "Specifications", "project_id": None}
    ]
    
    existing_folders = set(folder.name for folder in Folder.query.all())
    
    for folder_data in sample_folders:
        if folder_data["name"] not in existing_folders:
            folder = Folder()
            folder.name = folder_data["name"]
            folder.project_id = folder_data["project_id"]
            db.session.add(folder)
    
    print(f"Created {len([f for f in sample_folders if f['name'] not in existing_folders])} sample folders")

def create_feature_toggles():
    """Create default feature toggles"""
    features = [
        {"feature_name": "ai_extraction", "is_enabled": True, "description": "AI-powered extraction capabilities"},
        {"feature_name": "enhanced_nlp", "is_enabled": True, "description": "Enhanced NLP analysis for requirements"},
        {"feature_name": "comprehensive_extraction", "is_enabled": True, "description": "Full extraction combining all methods"},
        {"feature_name": "bulk_processing", "is_enabled": True, "description": "Bulk processing for multiple pages"},
        {"feature_name": "procore_integration", "is_enabled": True, "description": "Procore API integration"},
        {"feature_name": "autodesk_integration", "is_enabled": True, "description": "Autodesk Construction Cloud integration"}
    ]
    
    existing_features = set(ft.feature_name for ft in FeatureToggle.query.all())
    
    for feature_data in features:
        if feature_data["feature_name"] not in existing_features:
            feature = FeatureToggle()
            feature.feature_name = feature_data["feature_name"]
            feature.is_enabled = feature_data["is_enabled"]
            feature.description = feature_data["description"]
            db.session.add(feature)
    
    print(f"Created {len([f for f in features if f['feature_name'] not in existing_features])} feature toggles")

def initialize_database():
    """Initialize database with all default data"""
    app = create_app()
    
    with app.app_context():
        print("Initializing Koncurent Hi-LYTE database...")
        
        try:
            # Create all tables
            db.create_all()
            print("✓ Database tables created")
            
            # Create construction divisions
            create_construction_divisions()
            
            # Create sample folders
            create_sample_folders()
            
            # Create feature toggles
            create_feature_toggles()
            
            # Commit all changes
            db.session.commit()
            print("✓ Database initialization completed successfully!")
            
        except Exception as e:
            db.session.rollback()
            print(f"✗ Database initialization failed: {str(e)}")
            sys.exit(1)

if __name__ == '__main__':
    initialize_database()