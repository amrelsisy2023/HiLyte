import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const DEFAULT_MODEL_STR = "claude-3-5-sonnet-20241022";

interface ExtractedDivisionData {
  divisionId: number;
  items: Array<{
    name: string;
    description: string;
    quantity?: string;
    specifications?: string;
    location?: {
      coordinates: { x: number; y: number; width: number; height: number };
      description: string;
    };
    confidence: number;
  }>;
}

interface DivisionExtractionResult {
  extractedData: ExtractedDivisionData[];
  summary: {
    totalItems: number;
    divisionsFound: number;
    confidence: number;
  };
  drawingMetadata: {
    sheetNumber: string;
    sheetName?: string;
    scale?: string;
    discipline?: string;
  };
}

export class DivisionExtractionService {
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
   * Extract data from construction drawings directly into construction divisions
   */
  async extractToConstructionDivisions(
    imagePath: string,
    availableDivisions: Array<{ id: number; name: string; code: string; color: string }>,
    drawingMetadata?: {
      sheetNumber: string;
      sheetName?: string;
      scale?: string;
      discipline?: string;
    },
    userId?: number
  ): Promise<DivisionExtractionResult> {
    if (!this.anthropic) {
      throw new Error('Division extraction service not available - missing API key');
    }

    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');

      const systemPrompt = this.buildExtractionSystemPrompt(availableDivisions);
      const userPrompt = this.buildExtractionUserPrompt(drawingMetadata);

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

      const analysisText = response.content[0].type === 'text' ? response.content[0].text : '';
      return this.parseExtractionResponse(analysisText, availableDivisions, drawingMetadata);

    } catch (error) {
      console.error('Division extraction failed:', error);
      throw new Error(`Division extraction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private buildExtractionSystemPrompt(availableDivisions: Array<{ id: number; name: string; code: string; color: string }>): string {
    const divisionsText = availableDivisions.map(d => 
      `ID: ${d.id}, Code: ${d.code}, Name: ${d.name}`
    ).join('\n');

    return `You are an expert construction document analyst. Your task is to extract relevant data from construction drawings and categorize it into the available construction divisions.

AVAILABLE CONSTRUCTION DIVISIONS:
${divisionsText}

EXTRACTION REQUIREMENTS:
1. Scan the entire drawing systematically
2. Identify materials, equipment, systems, and specifications
3. Extract quantities, measurements, and technical details
4. Categorize each item into the most appropriate construction division
5. Provide precise location coordinates for each extracted item
6. Assess confidence level for each identification

RESPONSE FORMAT:
Return a JSON object with this structure:
{
  "extractedData": [
    {
      "divisionId": number,
      "items": [
        {
          "name": "string",
          "description": "string", 
          "quantity": "string (optional)",
          "specifications": "string (optional)",
          "location": {
            "coordinates": {"x": number, "y": number, "width": number, "height": number},
            "description": "string"
          },
          "confidence": number (0-1)
        }
      ]
    }
  ],
  "summary": {
    "totalItems": number,
    "divisionsFound": number,
    "confidence": number
  }
}

Focus on accuracy and practical construction industry use. Only extract items that clearly belong to the available divisions.`;
  }

  private buildExtractionUserPrompt(drawingMetadata?: any): string {
    const metadata = drawingMetadata ? `
Drawing Information:
- Sheet: ${drawingMetadata.sheetNumber || 'Unknown'}
- Title: ${drawingMetadata.sheetName || 'Unknown'}
- Scale: ${drawingMetadata.scale || 'Unknown'}
- Discipline: ${drawingMetadata.discipline || 'Unknown'}
` : '';

    return `${metadata}

Please analyze this construction drawing and extract all relevant data items, categorizing them into the appropriate construction divisions. Focus on:

1. Materials and their specifications
2. Equipment and systems
3. Dimensions and quantities
4. Technical details and notes
5. Any schedules or tables present

Provide precise location coordinates for visual annotation and ensure each item is categorized into the most appropriate division.`;
  }

  private parseExtractionResponse(
    responseText: string, 
    availableDivisions: Array<{ id: number; name: string; code: string; color: string }>,
    drawingMetadata?: any
  ): DivisionExtractionResult {
    try {
      // Clean the response text and extract JSON
      let cleanedText = responseText.trim();
      
      // Find JSON object by looking for opening and closing braces
      const startIndex = cleanedText.indexOf('{');
      const lastIndex = cleanedText.lastIndexOf('}');
      
      if (startIndex === -1 || lastIndex === -1) {
        throw new Error('No valid JSON found in response');
      }
      
      const jsonString = cleanedText.substring(startIndex, lastIndex + 1);
      console.log('Attempting to parse JSON:', jsonString.substring(0, 200) + '...');
      
      const parsedResponse = JSON.parse(jsonString);
      
      // Validate and enhance the response
      const extractedData: ExtractedDivisionData[] = parsedResponse.extractedData?.map((divData: any) => {
        // Ensure divisionId is valid
        const division = availableDivisions.find(d => d.id === divData.divisionId);
        if (!division) {
          console.warn(`Invalid division ID: ${divData.divisionId}`);
          return null;
        }

        return {
          divisionId: divData.divisionId,
          items: divData.items?.map((item: any) => ({
            name: item.name || 'Unnamed Item',
            description: item.description || '',
            quantity: item.quantity,
            specifications: item.specifications,
            location: {
              coordinates: item.location?.coordinates || { x: 0, y: 0, width: 50, height: 50 },
              description: item.location?.description || 'Unknown location'
            },
            confidence: Math.max(0, Math.min(1, item.confidence || 0.5))
          })) || []
        };
      }).filter(Boolean) || [];

      const totalItems = extractedData.reduce((sum, div) => sum + div.items.length, 0);
      const divisionsFound = extractedData.length;

      return {
        extractedData,
        summary: {
          totalItems,
          divisionsFound,
          confidence: parsedResponse.summary?.confidence || 0.75
        },
        drawingMetadata: {
          sheetNumber: drawingMetadata?.sheetNumber || 'Unknown',
          sheetName: drawingMetadata?.sheetName,
          scale: drawingMetadata?.scale,
          discipline: drawingMetadata?.discipline
        }
      };

    } catch (error) {
      console.error('Failed to parse extraction response:', error);
      throw new Error('Failed to parse AI response for division extraction');
    }
  }
}

export const divisionExtractionService = new DivisionExtractionService();