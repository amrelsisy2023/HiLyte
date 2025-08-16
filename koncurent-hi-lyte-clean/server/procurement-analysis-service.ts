import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

// <important_do_not_delete>
const DEFAULT_MODEL_STR = "claude-sonnet-4-20250514";
// </important_do_not_delete>

export interface ProcurementItem {
  id: string;
  name: string;
  description: string;
  csiDivision: {
    code: string;
    name: string;
    subdivision?: string;
  };
  location: {
    drawingSheet: string;
    sheetName?: string;
    detailReference?: string;
    gridCoordinates?: string;
    roomLocation?: string;
    coordinates: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  quantity: {
    value: number | string;
    unit?: string;
    notes?: string;
  };
  specifications: {
    modelNumber?: string;
    manufacturer?: string;
    material?: string;
    dimensions?: string;
    performance?: string;
    codes?: string[];
  };
  cost?: {
    estimate?: number;
    currency?: string;
    source?: string;
  };
  priority: 'high' | 'medium' | 'low';
  phase?: string;
  notes?: string;
  confidence: number;
}

export interface ProcurementAnalysisResult {
  items: ProcurementItem[];
  summary: {
    totalItems: number;
    divisionBreakdown: Array<{
      division: string;
      count: number;
      color: string;
    }>;
    estimatedValue?: number;
    completeness: number;
  };
  annotations: Array<{
    itemId: string;
    coordinates: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    color: string;
    label: string;
    divisionCode: string;
  }>;
  drawingMetadata: {
    sheetNumber: string;
    sheetName?: string;
    scale?: string;
    discipline?: string;
  };
  confidence: number;
}

export interface CSIDivision {
  code: string;
  name: string;
  color: string;
  subdivisions?: Array<{
    code: string;
    name: string;
  }>;
}

export class ProcurementAnalysisService {
  private anthropic: Anthropic | null = null;

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
  }

  isEnabled(): boolean {
    return !!this.anthropic;
  }

  /**
   * Analyze a construction drawing for procurement items with CSI classification
   */
  async analyzeProcurementItems(
    imagePath: string,
    drawingMetadata?: {
      sheetNumber: string;
      sheetName?: string;
      scale?: string;
      discipline?: string;
    },
    userId?: number
  ): Promise<ProcurementAnalysisResult> {
    if (!this.anthropic) {
      throw new Error('Procurement analysis service not available - missing API key');
    }

    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');

      const csiDivisions = this.getCSIDivisions();
      const systemPrompt = this.buildProcurementSystemPrompt(csiDivisions);
      const userPrompt = this.buildProcurementUserPrompt(drawingMetadata);

      const response = await this.anthropic.messages.create({
        model: DEFAULT_MODEL_STR,
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: userPrompt
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: base64Image
              }
            }
          ]
        }]
      });

      const analysisText = response.content[0].text;
      return this.parseProcurementResponse(analysisText, drawingMetadata);

    } catch (error) {
      console.error('Procurement analysis failed:', error);
      throw new Error(`Procurement analysis failed: ${error.message}`);
    }
  }

  /**
   * Analyze multiple sheets for comprehensive procurement analysis
   */
  async analyzeProcurementAcrossSheets(
    imagePaths: Array<{
      path: string;
      sheetNumber: string;
      sheetName?: string;
    }>,
    userId?: number
  ): Promise<{
    consolidatedItems: ProcurementItem[];
    sheetAnalyses: ProcurementAnalysisResult[];
    crossReferences: Array<{
      itemName: string;
      sheets: string[];
      variations: string[];
    }>;
    summary: {
      totalUniqueItems: number;
      duplicates: number;
      divisionBreakdown: Array<{
        division: string;
        count: number;
        sheets: string[];
      }>;
    };
  }> {
    if (!this.anthropic) {
      throw new Error('Procurement analysis service not available - missing API key');
    }

    const sheetAnalyses: ProcurementAnalysisResult[] = [];
    
    // Analyze each sheet individually
    for (const sheet of imagePaths) {
      try {
        const analysis = await this.analyzeProcurementItems(
          sheet.path,
          {
            sheetNumber: sheet.sheetNumber,
            sheetName: sheet.sheetName
          },
          userId
        );
        sheetAnalyses.push(analysis);
      } catch (error) {
        console.error(`Failed to analyze sheet ${sheet.sheetNumber}:`, error);
      }
    }

    // Consolidate and cross-reference items
    return this.consolidateMultiSheetAnalysis(sheetAnalyses);
  }

  private buildProcurementSystemPrompt(csiDivisions: CSIDivision[]): string {
    const divisionsText = csiDivisions.map(d => 
      `${d.code}: ${d.name}${d.subdivisions ? ` (includes: ${d.subdivisions.map(sub => sub.name).join(', ')})` : ''}`
    ).join('\n');

    return `You are an expert construction procurement analyst and CSI MasterFormat specialist. Your task is to identify and classify ALL procurement-related items in construction drawings.

PROCUREMENT ITEMS TO IDENTIFY:
- Materials (structural, architectural, finishes)
- Equipment (HVAC, electrical, plumbing, specialty)
- Fixtures (lighting, plumbing, architectural)
- Systems and assemblies
- Hardware and accessories
- Specialty items and custom work

CSI MASTERFORMAT DIVISIONS AVAILABLE:
${divisionsText}

LOCATION TRACKING REQUIREMENTS:
- Identify drawing sheet references
- Extract detail callouts (e.g., "Detail 3/A-101", "Section 2/A-200")
- Note grid coordinates when visible
- Identify room locations and spaces
- Record elevation or floor references

ANALYSIS REQUIREMENTS:
1. Scan the entire drawing systematically
2. Identify each distinct procurement item
3. Classify using appropriate CSI Division (be specific with subdivisions when possible)
4. Extract quantities, specifications, and model numbers
5. Determine location context (sheet, detail, room, grid)
6. Assess confidence level for each identification
7. Note any relationships between items

RESPONSE FORMAT:
Return a detailed JSON object with:
- Complete item inventory with CSI classifications
- Precise location coordinates for visual annotation
- Comprehensive specifications and quantities
- Color-coding scheme for visual overlay
- Confidence scoring for each item
- Cross-references between related items

Focus on accuracy, completeness, and practical construction industry use.`;
  }

  private buildProcurementUserPrompt(drawingMetadata?: any): string {
    const metadataText = drawingMetadata ? 
      `Drawing Context: Sheet ${drawingMetadata.sheetNumber}${drawingMetadata.sheetName ? ` - ${drawingMetadata.sheetName}` : ''}${drawingMetadata.discipline ? ` (${drawingMetadata.discipline})` : ''}` : 
      'Drawing Context: Not specified';

    return `${metadataText}

Analyze this construction drawing for ALL procurement items. Provide a comprehensive JSON response with this structure:

{
  "items": [
    {
      "id": "item_001",
      "name": "Item Name",
      "description": "Detailed description",
      "csiDivision": {
        "code": "09 51 00",
        "name": "Acoustical Ceilings",
        "subdivision": "Suspended Acoustical Ceiling Systems"
      },
      "location": {
        "drawingSheet": "A-101",
        "sheetName": "Floor Plan",
        "detailReference": "Detail 3/A-101",
        "gridCoordinates": "Grid B-3",
        "roomLocation": "Conference Room 201",
        "coordinates": { "x": 150, "y": 200, "width": 80, "height": 40 }
      },
      "quantity": {
        "value": 12,
        "unit": "SF",
        "notes": "Per room finish schedule"
      },
      "specifications": {
        "modelNumber": "Model ABC-123",
        "manufacturer": "XYZ Corp",
        "material": "Steel",
        "dimensions": "24\" x 48\" x 3/4\"",
        "performance": "Class A fire rating",
        "codes": ["IBC 2018", "ASTM C635"]
      },
      "priority": "high",
      "phase": "Phase 1",
      "confidence": 0.95
    }
  ],
  "summary": {
    "totalItems": 25,
    "divisionBreakdown": [
      { "division": "Division 09", "count": 8, "color": "#FF6B6B" }
    ],
    "completeness": 0.92
  },
  "annotations": [
    {
      "itemId": "item_001",
      "coordinates": { "x": 150, "y": 200, "width": 80, "height": 40 },
      "color": "#FF6B6B",
      "label": "09-1",
      "divisionCode": "09"
    }
  ],
  "confidence": 0.88
}

Be thorough and systematic in your analysis.`;
  }

  private parseProcurementResponse(responseText: string, drawingMetadata?: any): ProcurementAnalysisResult {
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);
      
      // Validate and enhance the response
      const items: ProcurementItem[] = parsedResponse.items?.map((item: any, index: number) => ({
        id: item.id || `item_${String(index + 1).padStart(3, '0')}`,
        name: item.name || 'Unnamed Item',
        description: item.description || '',
        csiDivision: item.csiDivision || { code: '00 00 00', name: 'Unclassified' },
        location: {
          ...item.location,
          drawingSheet: item.location?.drawingSheet || drawingMetadata?.sheetNumber || 'Unknown',
          coordinates: item.location?.coordinates || { x: 0, y: 0, width: 50, height: 50 }
        },
        quantity: item.quantity || { value: 'TBD' },
        specifications: item.specifications || {},
        priority: item.priority || 'medium',
        confidence: item.confidence || 0.5,
        notes: item.notes
      })) || [];

      // Generate color scheme for divisions
      const divisionColors = this.generateDivisionColorScheme();
      
      // Create annotations
      const annotations = items.map(item => ({
        itemId: item.id,
        coordinates: item.location.coordinates,
        color: this.getDivisionColor(item.csiDivision.code, divisionColors),
        label: this.generateItemLabel(item),
        divisionCode: item.csiDivision.code.split(' ')[0] || '00'
      }));

      // Generate summary
      const divisionBreakdown = this.calculateDivisionBreakdown(items, divisionColors);

      return {
        items,
        summary: {
          totalItems: items.length,
          divisionBreakdown,
          completeness: parsedResponse.summary?.completeness || 0.8
        },
        annotations,
        drawingMetadata: {
          sheetNumber: drawingMetadata?.sheetNumber || 'Unknown',
          sheetName: drawingMetadata?.sheetName,
          scale: drawingMetadata?.scale,
          discipline: drawingMetadata?.discipline
        },
        confidence: parsedResponse.confidence || 0.75
      };

    } catch (error) {
      console.error('Failed to parse procurement response:', error);
      throw new Error('Failed to parse AI response for procurement analysis');
    }
  }

  private consolidateMultiSheetAnalysis(sheetAnalyses: ProcurementAnalysisResult[]): any {
    const allItems: ProcurementItem[] = [];
    const crossReferences: Array<{
      itemName: string;
      sheets: string[];
      variations: string[];
    }> = [];

    // Collect all items
    sheetAnalyses.forEach(analysis => {
      allItems.push(...analysis.items);
    });

    // Find duplicates and variations
    const itemGroups = new Map<string, ProcurementItem[]>();
    
    allItems.forEach(item => {
      const normalizedName = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!itemGroups.has(normalizedName)) {
        itemGroups.set(normalizedName, []);
      }
      itemGroups.get(normalizedName)!.push(item);
    });

    // Generate cross-references
    itemGroups.forEach((items, normalizedName) => {
      if (items.length > 1) {
        const sheets = [...new Set(items.map(item => item.location.drawingSheet))];
        const variations = [...new Set(items.map(item => item.name))];
        
        if (sheets.length > 1) {
          crossReferences.push({
            itemName: variations[0],
            sheets,
            variations
          });
        }
      }
    });

    // Calculate unique items
    const uniqueItems = Array.from(itemGroups.values()).map(group => group[0]);

    // Generate division breakdown
    const divisionCounts = new Map<string, Set<string>>();
    allItems.forEach(item => {
      const division = item.csiDivision.code.split(' ')[0];
      if (!divisionCounts.has(division)) {
        divisionCounts.set(division, new Set());
      }
      divisionCounts.get(division)!.add(item.location.drawingSheet);
    });

    const divisionBreakdown = Array.from(divisionCounts.entries()).map(([division, sheetsSet]) => ({
      division: `Division ${division}`,
      count: Array.from(itemGroups.values()).filter(group => 
        group[0].csiDivision.code.startsWith(division)
      ).length,
      sheets: Array.from(sheetsSet)
    }));

    return {
      consolidatedItems: uniqueItems,
      sheetAnalyses,
      crossReferences,
      summary: {
        totalUniqueItems: uniqueItems.length,
        duplicates: allItems.length - uniqueItems.length,
        divisionBreakdown
      }
    };
  }

  private getCSIDivisions(): CSIDivision[] {
    return [
      { code: "00", name: "Procurement and Contracting", color: "#8B4513" },
      { code: "01", name: "General Requirements", color: "#2F4F4F" },
      { code: "02", name: "Existing Conditions", color: "#556B2F" },
      { code: "03", name: "Concrete", color: "#708090" },
      { code: "04", name: "Masonry", color: "#CD853F" },
      { code: "05", name: "Metals", color: "#4682B4" },
      { code: "06", name: "Wood, Plastics, and Composites", color: "#8B4513" },
      { code: "07", name: "Thermal and Moisture Protection", color: "#FF4500" },
      { code: "08", name: "Openings", color: "#32CD32" },
      { code: "09", name: "Finishes", color: "#FF69B4" },
      { code: "10", name: "Specialties", color: "#9932CC" },
      { code: "11", name: "Equipment", color: "#FF6347" },
      { code: "12", name: "Furnishings", color: "#20B2AA" },
      { code: "13", name: "Special Construction", color: "#F0E68C" },
      { code: "14", name: "Conveying Equipment", color: "#DDA0DD" },
      { code: "21", name: "Fire Suppression", color: "#DC143C" },
      { code: "22", name: "Plumbing", color: "#4169E1" },
      { code: "23", name: "Heating, Ventilating, and Air Conditioning", color: "#00CED1" },
      { code: "25", name: "Integrated Automation", color: "#FFD700" },
      { code: "26", name: "Electrical", color: "#FF8C00" },
      { code: "27", name: "Communications", color: "#9370DB" },
      { code: "28", name: "Electronic Safety and Security", color: "#FF1493" },
      { code: "31", name: "Earthwork", color: "#8B7355" },
      { code: "32", name: "Exterior Improvements", color: "#228B22" },
      { code: "33", name: "Utilities", color: "#4682B4" },
      { code: "34", name: "Transportation", color: "#696969" },
      { code: "35", name: "Waterway and Marine Construction", color: "#008B8B" }
    ];
  }

  private generateDivisionColorScheme(): Map<string, string> {
    const colors = new Map<string, string>();
    const csiDivisions = this.getCSIDivisions();
    
    csiDivisions.forEach(division => {
      colors.set(division.code, division.color);
    });

    return colors;
  }

  private getDivisionColor(csiCode: string, colorScheme: Map<string, string>): string {
    const divisionCode = csiCode.split(' ')[0];
    return colorScheme.get(divisionCode) || '#999999';
  }

  private generateItemLabel(item: ProcurementItem): string {
    const divisionCode = item.csiDivision.code.split(' ')[0];
    const itemIndex = item.id.replace(/\D/g, '');
    return `${divisionCode}-${itemIndex}`;
  }

  private calculateDivisionBreakdown(items: ProcurementItem[], colorScheme: Map<string, string>): Array<{
    division: string;
    count: number;
    color: string;
  }> {
    const breakdown = new Map<string, number>();
    
    items.forEach(item => {
      const divisionCode = item.csiDivision.code.split(' ')[0];
      const divisionName = `Division ${divisionCode}`;
      breakdown.set(divisionName, (breakdown.get(divisionName) || 0) + 1);
    });

    return Array.from(breakdown.entries()).map(([division, count]) => ({
      division,
      count,
      color: this.getDivisionColor(division.split(' ')[1], colorScheme)
    }));
  }
}

// Global instance
export const procurementAnalysisService = new ProcurementAnalysisService();