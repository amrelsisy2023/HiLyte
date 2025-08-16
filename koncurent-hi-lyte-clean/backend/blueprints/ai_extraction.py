"""
AI Extraction Blueprint
Handles comprehensive extraction endpoints with credit tracking
Provides the "Full Extraction" functionality combining OCR, Smart AI, and Enhanced NLP
"""

import os
import json
from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename

from extensions import db
from models import Drawing, ExtractedData, ConstructionDivision, AICreditTransaction, DrawingProfile
from services.ai_extraction_service import AIExtractionService
from services.credit_service import CreditService

ai_bp = Blueprint('ai_extraction', __name__)

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

@ai_bp.route('/comprehensive-extract/<int:drawing_id>', methods=['POST'])
@login_required
def comprehensive_extract_single_page(drawing_id):
    """
    Comprehensive extraction for single page
    Combines OCR + Smart Extraction + Enhanced NLP
    """
    try:
        # Get request parameters
        data = request.get_json() or {}
        page = data.get('page', 1)
        
        # Validate drawing access
        drawing = Drawing.query.filter_by(id=drawing_id, user_id=current_user.id).first()
        if not drawing:
            return jsonify({'error': 'Drawing not found or access denied'}), 404
        
        # Check if comprehensive extraction is enabled (could be a feature toggle)
        
        # Get available construction divisions
        divisions = ConstructionDivision.query.filter_by(is_active=True).all()
        divisions_data = [div.to_dict() for div in divisions]
        
        # Get drawing profile for metadata context
        profile = DrawingProfile.query.filter_by(drawing_id=drawing_id).first()
        
        # Prepare drawing metadata
        drawing_metadata = {
            'sheetNumber': f'Sheet {page}',
            'sheetName': drawing.name,
            'discipline': profile.discipline if profile else None,
            'scale': profile.scale if profile else None,
            'industry': profile.industry if profile else None
        }
        
        # Add sheet-specific metadata if available
        if drawing.sheet_metadata:
            try:
                sheet_meta = drawing.sheet_metadata if isinstance(drawing.sheet_metadata, list) else json.loads(drawing.sheet_metadata)
                page_meta = next((sheet for sheet in sheet_meta if sheet.get('pageNumber') == page), None)
                if page_meta:
                    drawing_metadata.update({
                        'sheetNumber': page_meta.get('sheetNumber', f'Sheet {page}'),
                        'sheetName': page_meta.get('sheetTitle', drawing.name),
                        'scale': page_meta.get('scale'),
                        'discipline': page_meta.get('discipline')
                    })
            except (json.JSONDecodeError, AttributeError):
                pass
        
        # Construct path to page image
        page_image_path = os.path.join(
            current_app.config['UPLOAD_FOLDER'], 
            'pages', 
            f'page.{page}.png'
        )
        
        if not os.path.exists(page_image_path):
            return jsonify({'error': 'Drawing image not found'}), 404
        
        # Initialize AI extraction service
        extraction_service = AIExtractionService()
        
        # Check user credits before processing
        credit_service = CreditService()
        if not credit_service.has_sufficient_credits(current_user.id, estimated_cost=0.25):
            return jsonify({
                'error': 'Insufficient AI credits',
                'creditsRequired': True,
                'estimatedCost': 0.25
            }), 402
        
        # Perform comprehensive extraction
        current_app.logger.info(f"Starting comprehensive extraction for drawing {drawing_id}, page {page}")
        
        extraction_result = extraction_service.comprehensive_extraction(
            page_image_path,
            divisions_data,
            drawing_metadata
        )
        
        if not extraction_result.get('smartExtraction', {}).get('success', False):
            return jsonify({
                'error': 'Extraction failed',
                'details': extraction_result.get('error')
            }), 500
        
        # Calculate and deduct credits
        processing_time = extraction_result.get('processing', {}).get('totalTime', 1.0)
        tokens_used = max(500, int(processing_time * 200))  # Estimate based on processing time
        credit_cost = tokens_used * 0.0001  # $0.0001 per token
        
        # Deduct credits
        transaction = credit_service.deduct_credits(
            user_id=current_user.id,
            amount=credit_cost,
            description=f'Comprehensive extraction (OCR+AI+NLP) - {tokens_used} tokens',
            operation='comprehensive_extraction',
            tokens_used=tokens_used
        )
        
        if not transaction:
            return jsonify({'error': 'Credit deduction failed'}), 500
        
        # Save extracted items to database
        smart_extraction = extraction_result.get('smartExtraction', {})
        enhanced_nlp = extraction_result.get('enhancedNLP', {})
        saved_items = []
        
        if smart_extraction.get('extractedItems'):
            for item in smart_extraction['extractedItems']:
                try:
                    # Prepare extraction data with NLP context
                    extraction_data = {
                        'itemName': item.get('itemName'),
                        'category': item.get('category'),
                        'location': item.get('location'),
                        'procurementData': item.get('procurementData'),
                        'confidence': item.get('confidence'),
                        'extractionMethod': 'comprehensive',
                        'aiModel': 'claude-sonnet-4-20250514'
                    }
                    
                    # Add NLP context if available
                    if enhanced_nlp.get('success'):
                        nlp_data = enhanced_nlp.get('data', {})
                        extraction_data['nlpContext'] = {
                            'requirements': [req for req in nlp_data.get('requirements', []) 
                                           if item['itemName'].lower() in req.get('content', '').lower()],
                            'compliance': [comp for comp in nlp_data.get('compliance', []) 
                                         if item['category'] in comp.get('requirement', '').lower()]
                        }
                    
                    extracted_data = ExtractedData(
                        drawing_id=drawing_id,
                        user_id=current_user.id,
                        division_id=item['csiDivision']['id'],
                        type='comprehensive_extraction',
                        source_location=f"Page {page} ({item['location'].get('coordinates', {}).get('x', 0)},{item['location'].get('coordinates', {}).get('y', 0)})",
                        data=extraction_data,
                        confidence=item.get('confidence'),
                        extraction_method='comprehensive',
                        ai_model_used='claude-sonnet-4-20250514',
                        processing_time=processing_time
                    )
                    
                    db.session.add(extracted_data)
                    saved_items.append(extracted_data)
                    
                except Exception as e:
                    current_app.logger.error(f"Failed to save extracted item: {str(e)}")
        
        db.session.commit()
        
        # Prepare response
        response_data = {
            'success': True,
            'result': {
                # Smart extraction results (for backward compatibility)
                'extractedItems': smart_extraction.get('extractedItems', []),
                'summary': smart_extraction.get('summary', {}),
                'savedItemsCount': len(saved_items),
                
                # Enhanced NLP results
                'enhancedNLP': enhanced_nlp,
                'combinedInsights': extraction_result.get('combinedInsights'),
                
                # Processing info
                'processing': extraction_result.get('processing'),
                'analysisType': 'comprehensive',
                'capabilities': ['Smart Extraction', 'Enhanced NLP', 'OCR', 'AI Analysis']
            },
            'cost': credit_cost,
            'tokensUsed': tokens_used,
            'creditBalance': current_user.get_credit_balance()
        }
        
        current_app.logger.info(f"Comprehensive extraction completed: {len(saved_items)} items saved, cost: ${credit_cost:.4f}")
        return jsonify(response_data), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Comprehensive extraction error: {str(e)}")
        return jsonify({'error': 'Comprehensive extraction failed'}), 500

@ai_bp.route('/bulk-comprehensive-extract/<int:drawing_id>', methods=['POST'])
@login_required
def comprehensive_extract_all_pages(drawing_id):
    """
    Comprehensive extraction for all pages
    Processes entire drawing set with full extraction suite
    """
    try:
        # Validate drawing access
        drawing = Drawing.query.filter_by(id=drawing_id, user_id=current_user.id).first()
        if not drawing:
            return jsonify({'error': 'Drawing not found or access denied'}), 404
        
        total_pages = drawing.total_pages or 1
        
        # Get available construction divisions
        divisions = ConstructionDivision.query.filter_by(is_active=True).all()
        divisions_data = [div.to_dict() for div in divisions]
        
        # Check credits for bulk processing
        credit_service = CreditService()
        estimated_cost = total_pages * 0.25  # Estimate per page
        
        if not credit_service.has_sufficient_credits(current_user.id, estimated_cost):
            return jsonify({
                'error': 'Insufficient AI credits for bulk processing',
                'creditsRequired': True,
                'estimatedCost': estimated_cost,
                'totalPages': total_pages
            }), 402
        
        # Initialize services
        extraction_service = AIExtractionService()
        
        # Process all pages
        all_results = []
        total_saved_items = 0
        total_cost = 0.0
        total_tokens = 0
        
        current_app.logger.info(f"Starting bulk comprehensive extraction for {total_pages} pages")
        
        for page in range(1, total_pages + 1):
            try:
                # Construct page image path
                page_image_path = os.path.join(
                    current_app.config['UPLOAD_FOLDER'],
                    'pages',
                    f'page.{page}.png'
                )
                
                if not os.path.exists(page_image_path):
                    current_app.logger.warning(f"Page {page} image not found, skipping")
                    continue
                
                # Prepare page metadata
                drawing_metadata = {
                    'sheetNumber': f'Sheet {page}',
                    'sheetName': f'{drawing.name} - Page {page}'
                }
                
                # Process page
                page_result = extraction_service.comprehensive_extraction(
                    page_image_path,
                    divisions_data,
                    drawing_metadata
                )
                
                if page_result.get('smartExtraction', {}).get('success', False):
                    # Save results for this page
                    page_saved_items = self._save_extraction_results(
                        page_result, drawing_id, page
                    )
                    
                    # Calculate costs
                    processing_time = page_result.get('processing', {}).get('totalTime', 1.0)
                    tokens_used = max(500, int(processing_time * 200))
                    cost = tokens_used * 0.0001
                    
                    # Deduct credits for this page
                    transaction = credit_service.deduct_credits(
                        user_id=current_user.id,
                        amount=cost,
                        description=f'Bulk comprehensive extraction - Page {page} - {tokens_used} tokens',
                        operation='bulk_comprehensive_extraction'
                    )
                    
                    all_results.append({
                        'page': page,
                        'extractedItems': len(page_result.get('smartExtraction', {}).get('extractedItems', [])),
                        'requirements': len(page_result.get('enhancedNLP', {}).get('data', {}).get('requirements', [])),
                        'cost': cost,
                        'tokensUsed': tokens_used
                    })
                    
                    total_saved_items += len(page_saved_items)
                    total_cost += cost
                    total_tokens += tokens_used
                
            except Exception as e:
                current_app.logger.error(f"Error processing page {page}: {str(e)}")
                continue
        
        db.session.commit()
        
        # Return comprehensive bulk results
        response_data = {
            'success': True,
            'result': {
                'totalPages': total_pages,
                'processedPages': len(all_results),
                'totalItemsExtracted': total_saved_items,
                'pageResults': all_results,
                'analysisType': 'bulk_comprehensive',
                'capabilities': ['Smart Extraction', 'Enhanced NLP', 'OCR', 'AI Analysis']
            },
            'totalCost': total_cost,
            'totalTokensUsed': total_tokens,
            'creditBalance': current_user.get_credit_balance()
        }
        
        current_app.logger.info(f"Bulk comprehensive extraction completed: {total_saved_items} items across {len(all_results)} pages")
        return jsonify(response_data), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Bulk comprehensive extraction error: {str(e)}")
        return jsonify({'error': 'Bulk comprehensive extraction failed'}), 500

    def _save_extraction_results(self, extraction_result, drawing_id, page):
        """Helper method to save extraction results to database"""
        saved_items = []
        smart_extraction = extraction_result.get('smartExtraction', {})
        enhanced_nlp = extraction_result.get('enhancedNLP', {})
        processing_time = extraction_result.get('processing', {}).get('totalTime', 1.0)
        
        for item in smart_extraction.get('extractedItems', []):
            try:
                # Prepare extraction data
                extraction_data = {
                    'itemName': item.get('itemName'),
                    'category': item.get('category'),
                    'location': item.get('location'),
                    'procurementData': item.get('procurementData'),
                    'confidence': item.get('confidence'),
                    'extractionMethod': 'comprehensive',
                    'aiModel': 'claude-sonnet-4-20250514'
                }
                
                # Add NLP context
                if enhanced_nlp.get('success'):
                    nlp_data = enhanced_nlp.get('data', {})
                    extraction_data['nlpContext'] = {
                        'requirements': [req for req in nlp_data.get('requirements', []) 
                                       if item['itemName'].lower() in req.get('content', '').lower()],
                        'compliance': [comp for comp in nlp_data.get('compliance', []) 
                                     if item['category'] in comp.get('requirement', '').lower()]
                    }
                
                extracted_data = ExtractedData(
                    drawing_id=drawing_id,
                    user_id=current_user.id,
                    division_id=item['csiDivision']['id'],
                    type='comprehensive_extraction',
                    source_location=f"Page {page}",
                    data=extraction_data,
                    confidence=item.get('confidence'),
                    extraction_method='comprehensive',
                    ai_model_used='claude-sonnet-4-20250514',
                    processing_time=processing_time
                )
                
                db.session.add(extracted_data)
                saved_items.append(extracted_data)
                
            except Exception as e:
                current_app.logger.error(f"Failed to save extracted item: {str(e)}")
        
        return saved_items

@ai_bp.route('/extraction-status')
@login_required
def extraction_status():
    """Get status of background extraction processes"""
    # For now, return a simple status
    # In production, you'd integrate with Celery task status
    return jsonify({
        'isProcessing': False,
        'drawingId': None,
        'progress': 0,
        'message': 'No active processing'
    })

@ai_bp.route('/feature-toggles')
def get_feature_toggles():
    """Get AI feature toggle status"""
    return jsonify({
        'ai-extraction': bool(os.environ.get('ANTHROPIC_API_KEY')),
        'enhanced-nlp': True,
        'comprehensive-extraction': True,
        'bulk-processing': True
    })