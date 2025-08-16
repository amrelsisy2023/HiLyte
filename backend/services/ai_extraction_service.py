"""
AI Extraction Service - Python/Flask Version
Comprehensive extraction combining OCR, Smart AI Analysis, and Enhanced NLP

Converted from the original TypeScript implementation
Provides all comprehensive extraction capabilities requested
"""

import os
import logging
import base64
from typing import List, Dict, Any, Optional, Tuple
from PIL import Image
import pytesseract
from anthropic import Anthropic
import json
import time
from datetime import datetime

# Configure logging
logger = logging.getLogger(__name__)

class AIExtractionService:
    """
    Comprehensive AI-powered extraction service
    Combines OCR, Smart Extraction, and Enhanced NLP analysis
    """
    
    def __init__(self, api_key: str = None):
        """Initialize the service with Anthropic API"""
        self.api_key = api_key or os.environ.get('ANTHROPIC_API_KEY')
        if not self.api_key:
            raise ValueError("Anthropic API key is required")
        
        self.client = Anthropic(api_key=self.api_key)
        self.default_model = 'claude-sonnet-4-20250514'
        
        # Construction division mappings for intelligent classification
        self.division_keywords = {
            'concrete': ['03'],
            'masonry': ['04'],
            'metals': ['05'],
            'wood': ['06'],
            'thermal': ['07'],
            'openings': ['08'],
            'finishes': ['09'],
            'specialties': ['10'],
            'equipment': ['11'],
            'furnishings': ['12'],
            'conveying': ['14'],
            'fire': ['21'],
            'plumbing': ['22'],
            'hvac': ['23'],
            'electrical': ['26'],
            'communications': ['27'],
            'security': ['28'],
            'earthwork': ['31'],
            'exterior': ['32'],
            'utilities': ['33']
        }
    
    def perform_ocr(self, image_path: str) -> str:
        """
        Perform OCR text extraction from image
        """
        try:
            logger.info(f"Performing OCR on {image_path}")
            
            # Configure Tesseract for construction drawings
            custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,;:()[]{}\'"-_/\\ '
            
            # Open and process image
            image = Image.open(image_path)
            
            # Convert to grayscale for better OCR
            if image.mode != 'L':
                image = image.convert('L')
            
            # Perform OCR
            text = pytesseract.image_to_string(image, config=custom_config)
            
            logger.info(f"OCR extracted {len(text)} characters")
            return text.strip()
            
        except Exception as e:
            logger.error(f"OCR failed: {str(e)}")
            return ""
    
    def smart_extraction_analysis(
        self, 
        ocr_text: str, 
        image_base64: str, 
        available_divisions: List[Dict], 
        drawing_metadata: Dict = None
    ) -> Dict[str, Any]:
        """
        Perform Smart AI Analysis for construction item extraction
        """
        try:
            logger.info("Starting Smart Extraction Analysis")
            
            # Build system prompt with division context
            system_prompt = self._build_smart_extraction_prompt(available_divisions)
            
            # Build user prompt with drawing context
            user_prompt = self._build_user_extraction_prompt(drawing_metadata)
            
            # Prepare content with OCR text and image
            content = [
                {
                    "type": "text",
                    "text": f"{user_prompt}\n\nOCR Text: {ocr_text}"
                },
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": image_base64
                    }
                }
            ]
            
            # Send request to Claude
            response = self.client.messages.create(
                model=self.default_model,
                max_tokens=4000,
                system=system_prompt,
                messages=[{"role": "user", "content": content}]
            )
            
            # Parse response
            response_text = response.content[0].text
            extraction_result = self._parse_smart_extraction_response(response_text, available_divisions)
            
            logger.info(f"Smart extraction found {len(extraction_result.get('extractedItems', []))} items")
            return extraction_result
            
        except Exception as e:
            logger.error(f"Smart extraction failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'extractedItems': [],
                'summary': {'totalItemsFound': 0, 'divisionsFound': 0}
            }
    
    def enhanced_nlp_analysis(self, ocr_text: str, image_base64: str = None) -> Dict[str, Any]:
        """
        Perform Enhanced NLP Analysis for requirements detection and compliance
        """
        try:
            logger.info("Starting Enhanced NLP Analysis")
            
            # NLP analysis prompt for construction documents
            nlp_prompt = """
            You are an advanced NLP system specialized in construction document analysis. 
            Perform multi-stage analysis to identify:

            1. **Requirements Detection**: Find all technical requirements, specifications, and standards
            2. **Compliance Analysis**: Identify building codes, safety requirements, and regulatory compliance items  
            3. **Document Understanding**: Extract key relationships and context from the text

            Analyze the provided construction document text and return detailed insights in JSON format:

            {
              "requirements": [
                {
                  "id": "unique_id",
                  "content": "requirement text",
                  "category": "structural|electrical|mechanical|safety|material|performance",
                  "priority": "critical|high|medium|low",
                  "source": "building_code|specification|standard|drawing_note",
                  "compliance_standard": "applicable standard if identified"
                }
              ],
              "compliance": [
                {
                  "requirement": "compliance requirement",
                  "standard": "building code or standard",
                  "category": "safety|structural|electrical|fire|accessibility",
                  "criticality": "mandatory|recommended|optional"
                }
              ],
              "document_context": {
                "discipline": "architectural|structural|mechanical|electrical|civil",
                "project_phase": "design|construction|as_built",
                "document_type": "drawing|specification|schedule|detail"
              },
              "summary": {
                "totalRequirements": 0,
                "criticalRequirements": 0,
                "complianceItemsIdentified": 0,
                "recommendedActions": []
              }
            }

            Focus on construction-specific terminology and industry standards.
            """
            
            # Send NLP analysis request
            response = self.client.messages.create(
                model=self.default_model,
                max_tokens=3000,
                system=nlp_prompt,
                messages=[{
                    "role": "user",
                    "content": f"Analyze this construction document text for requirements and compliance:\n\n{ocr_text}"
                }]
            )
            
            # Parse NLP response
            response_text = response.content[0].text
            nlp_result = self._parse_nlp_response(response_text)
            
            logger.info(f"NLP analysis found {nlp_result.get('summary', {}).get('totalRequirements', 0)} requirements")
            return {
                'success': True,
                'data': nlp_result,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Enhanced NLP analysis failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    def comprehensive_extraction(
        self,
        image_path: str,
        available_divisions: List[Dict],
        drawing_metadata: Dict = None
    ) -> Dict[str, Any]:
        """
        Perform comprehensive extraction combining all capabilities:
        - OCR text extraction
        - Smart AI analysis for construction items
        - Enhanced NLP for requirements and compliance
        """
        start_time = time.time()
        
        try:
            logger.info(f"Starting comprehensive extraction for {image_path}")
            
            # Step 1: Perform OCR
            ocr_text = self.perform_ocr(image_path)
            
            # Step 2: Convert image to base64 for AI analysis
            with open(image_path, 'rb') as img_file:
                image_base64 = base64.b64encode(img_file.read()).decode('utf-8')
            
            # Step 3: Run Smart Extraction and Enhanced NLP in parallel
            # Note: In production, you could use asyncio or threading for true parallelism
            smart_extraction_result = self.smart_extraction_analysis(
                ocr_text, image_base64, available_divisions, drawing_metadata
            )
            
            enhanced_nlp_result = self.enhanced_nlp_analysis(ocr_text, image_base64)
            
            # Step 4: Generate combined insights
            combined_insights = self._generate_combined_insights(
                smart_extraction_result, enhanced_nlp_result
            )
            
            processing_time = time.time() - start_time
            
            comprehensive_result = {
                'smartExtraction': smart_extraction_result,
                'enhancedNLP': enhanced_nlp_result,
                'combinedInsights': combined_insights,
                'processing': {
                    'totalTime': round(processing_time, 2),
                    'ocrCharacters': len(ocr_text),
                    'analysisType': 'comprehensive',
                    'capabilities': ['OCR', 'Smart Extraction', 'Enhanced NLP', 'AI Analysis']
                },
                'timestamp': datetime.utcnow().isoformat()
            }
            
            logger.info(f"Comprehensive extraction completed in {processing_time:.2f}s")
            return comprehensive_result
            
        except Exception as e:
            logger.error(f"Comprehensive extraction failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'processing': {'totalTime': time.time() - start_time},
                'timestamp': datetime.utcnow().isoformat()
            }
    
    def _build_smart_extraction_prompt(self, available_divisions: List[Dict]) -> str:
        """Build system prompt for smart extraction"""
        divisions_text = "\n".join([
            f"- {div['code']}: {div['name']}" 
            for div in available_divisions[:20]  # Limit for prompt length
        ])
        
        return f"""You are an expert construction document analyzer specializing in extracting procurement data from architectural and engineering drawings.

AVAILABLE CSI DIVISIONS:
{divisions_text}

Your task is to identify and extract REAL construction items that contractors would actually purchase and install. 

EXTRACTION PRIORITIES:
1. **SCHEDULES FIRST**: Door/window/equipment schedules contain the richest data
2. **SPECIFICATIONS**: Look for material specs, equipment models, performance ratings  
3. **QUANTITIES**: Extract actual quantities, not just "1 EA"
4. **TECHNICAL DATA**: Sizes, capacities, ratings, materials, finishes
5. **PROCUREMENT INFO**: Model numbers, manufacturers, part numbers when available

RESPONSE FORMAT (JSON only):
{{
  "extractedItems": [
    {{
      "itemName": "Clear, specific item name",
      "category": "material|equipment|fixture|component|system", 
      "csiDivision": {{
        "code": "XX XX XX",
        "name": "Division Name", 
        "id": number
      }},
      "procurementData": {{
        "quantity": "actual amount found", 
        "unit": "SF|LF|EA|CY|TON|LB|etc",
        "specification": "grade/type/model/material details", 
        "size": "dimensions or capacity",
        "manufacturer": "brand/company if specified",
        "model": "model number if available"
      }},
      "location": {{
        "coordinates": {{"x": 0, "y": 0, "width": 100, "height": 50}},
        "confidence": 0.8
      }}
    }}
  ],
  "summary": {{
    "totalItemsFound": 0,
    "divisionsFound": 0, 
    "extractionApproach": "Brief description of what type of data was found"
  }}
}}

Extract REAL construction items with actual procurement value."""
    
    def _build_user_extraction_prompt(self, drawing_metadata: Dict = None) -> str:
        """Build user prompt for extraction with drawing context"""
        metadata_text = ""
        if drawing_metadata:
            metadata_text = f"""
Drawing Context:
- Sheet: {drawing_metadata.get('sheetNumber', 'Unknown')}
- Title: {drawing_metadata.get('sheetName', 'Unknown')}
- Scale: {drawing_metadata.get('scale', 'Unknown')}
- Discipline: {drawing_metadata.get('discipline', 'Unknown')}
"""
        
        return f"""{metadata_text}

🔍 **COMPREHENSIVE EXTRACTION MISSION:**
Find ALL construction items that contractors would actually PURCHASE and INSTALL. Look for:

**SCHEDULES & TABLES**: Door schedules, window schedules, equipment lists, material lists
**SPECIFICATIONS**: Text blocks with material specifications, equipment models, finish requirements  
**SYMBOLS & CALLOUTS**: Door marks (A1, B2), equipment tags (AHU-1, P-1), detail callouts
**MATERIAL LISTS**: Any lists of construction components with quantities or specifications

**EXAMPLES OF WHAT TO EXTRACT:**
✅ "Steel W18x35 Beam" → Division 05 (Metals)  
✅ "AHU-1: 5 Ton RTU" → Division 23 (HVAC)
✅ "Door Type A: 3'-0" x 7'-0" Wood" → Division 08 (Openings)
✅ "6" CMU Block, 8' High" → Division 04 (Masonry)  
✅ "LED Light Fixture Type L1" → Division 26 (Electrical)

Extract REAL construction items with actual procurement value - not abstract concepts or sheet information."""
    
    def _parse_smart_extraction_response(self, response_text: str, available_divisions: List[Dict]) -> Dict[str, Any]:
        """Parse and validate smart extraction response"""
        try:
            # Extract JSON from response
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}')
            
            if start_idx == -1 or end_idx == -1:
                raise ValueError("No valid JSON found in response")
            
            json_str = response_text[start_idx:end_idx + 1]
            parsed_response = json.loads(json_str)
            
            # Validate and process extracted items
            processed_items = []
            for item in parsed_response.get('extractedItems', []):
                # Find matching division
                division = self._find_matching_division(item.get('csiDivision', {}), available_divisions)
                
                processed_item = {
                    'itemName': item.get('itemName', 'Unnamed Item'),
                    'category': item.get('category', 'material'),
                    'csiDivision': {
                        'code': division['code'],
                        'name': division['name'],
                        'id': division['id']
                    },
                    'procurementData': item.get('procurementData', {}),
                    'location': item.get('location', {}),
                    'confidence': item.get('location', {}).get('confidence', 0.8)
                }
                processed_items.append(processed_item)
            
            return {
                'success': True,
                'extractedItems': processed_items,
                'summary': parsed_response.get('summary', {})
            }
            
        except Exception as e:
            logger.error(f"Failed to parse smart extraction response: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'extractedItems': [],
                'summary': {'totalItemsFound': 0, 'divisionsFound': 0}
            }
    
    def _parse_nlp_response(self, response_text: str) -> Dict[str, Any]:
        """Parse Enhanced NLP analysis response"""
        try:
            # Extract JSON from response
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}')
            
            if start_idx == -1 or end_idx == -1:
                raise ValueError("No valid JSON found in NLP response")
            
            json_str = response_text[start_idx:end_idx + 1]
            return json.loads(json_str)
            
        except Exception as e:
            logger.error(f"Failed to parse NLP response: {str(e)}")
            return {
                'requirements': [],
                'compliance': [],
                'document_context': {},
                'summary': {
                    'totalRequirements': 0,
                    'criticalRequirements': 0,
                    'complianceItemsIdentified': 0,
                    'recommendedActions': []
                }
            }
    
    def _find_matching_division(self, csi_division: Dict, available_divisions: List[Dict]) -> Dict:
        """Find matching division with fallback logic"""
        # Try exact match by ID or code
        for div in available_divisions:
            if (div['id'] == csi_division.get('id') or 
                div['code'] == csi_division.get('code')):
                return div
        
        # Try fuzzy matching by name
        division_name = csi_division.get('name', '').lower()
        for div in available_divisions:
            if division_name in div['name'].lower() or div['name'].lower() in division_name:
                return div
        
        # Fallback to first division
        return available_divisions[0] if available_divisions else {
            'id': 1, 'name': 'General', 'code': '01 00 00'
        }
    
    def _generate_combined_insights(self, smart_result: Dict, nlp_result: Dict) -> Dict[str, Any]:
        """Generate insights from combined analysis"""
        try:
            extracted_items_count = len(smart_result.get('extractedItems', []))
            requirements_count = 0
            
            if nlp_result.get('success') and nlp_result.get('data'):
                requirements_count = nlp_result['data'].get('summary', {}).get('totalRequirements', 0)
            
            total_data_points = extracted_items_count + requirements_count
            
            # Calculate requirements coverage
            requirements_coverage = 0
            if requirements_count > 0 and extracted_items_count > 0:
                # Simple coverage calculation - could be enhanced
                requirements_coverage = min(100, int((extracted_items_count / requirements_count) * 100))
            
            # Determine extraction quality
            if total_data_points >= 15 and requirements_coverage >= 70:
                quality = 'excellent'
            elif total_data_points >= 10 and requirements_coverage >= 50:
                quality = 'good'
            elif total_data_points >= 5 and requirements_coverage >= 30:
                quality = 'fair'
            else:
                quality = 'poor'
            
            # Generate recommended actions
            recommended_actions = []
            if extracted_items_count < 5:
                recommended_actions.append('Consider manual extraction for items not detected automatically')
            if requirements_coverage < 50:
                recommended_actions.append('Review document for additional specifications and requirements')
            if quality == 'excellent':
                recommended_actions.append('Document analysis is comprehensive - consider this a template for similar drawings')
            
            return {
                'totalDataPoints': total_data_points,
                'requirementsCoverage': requirements_coverage,
                'recommendedActions': recommended_actions,
                'extractionQuality': quality
            }
            
        except Exception as e:
            logger.error(f"Failed to generate combined insights: {str(e)}")
            return {
                'totalDataPoints': 0,
                'requirementsCoverage': 0,
                'recommendedActions': ['Analysis incomplete - review extraction results'],
                'extractionQuality': 'poor'
            }