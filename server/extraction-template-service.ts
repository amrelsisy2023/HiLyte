import Anthropic from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('Missing required environment variable: ANTHROPIC_API_KEY');
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// "claude-sonnet-4-20250514"
const DEFAULT_MODEL_STR = "claude-sonnet-4-20250514";

export interface TemplateColumn {
  name: string;
  type: 'text' | 'number' | 'date' | 'dimension' | 'boolean';
  description?: string;
  required?: boolean;
  example?: string;
}

export interface ExtractionTemplate {
  id: string;
  name: string;
  description: string;
  columns: TemplateColumn[];
  divisionId: number;
}

export class ExtractionTemplateService {
  /**
   * Extract data from marqueed area using a template structure
   */
  static async extractWithTemplate(
    extractedText: string,
    template: ExtractionTemplate,
    context: string = ''
  ): Promise<{ data: Record<string, any>[]; confidence: number }> {
    try {
      const prompt = this.buildTemplateExtractionPrompt(extractedText, template, context);
      
      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL_STR,
        max_tokens: 2000,
        system: `You are an expert construction document data extraction AI. Your job is to extract data from construction drawings, schedules, and specifications into structured table format.

IMPORTANT RULES:
1. Extract data strictly according to the provided template columns
2. If a column value cannot be determined, use null
3. Create one row per distinct item/entry found in the text
4. Maintain data accuracy - don't guess or make up information
5. For dimensions, preserve the exact format found (e.g., "6'-8\"", "3'-0\"")
6. For quantities/counts, extract the actual numbers found
7. Return valid JSON only`,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const result = JSON.parse(response.content[0].type === 'text' ? response.content[0].text : '');
      
      return {
        data: result.rows || [],
        confidence: result.confidence || 0.8
      };
    } catch (error) {
      console.error('Template extraction failed:', error);
      throw new Error(`Template extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build the AI prompt for template-based extraction
   */
  private static buildTemplateExtractionPrompt(
    extractedText: string,
    template: ExtractionTemplate,
    context: string
  ): string {
    const columnDescriptions = template.columns.map(col => {
      let desc = `- ${col.name} (${col.type})`;
      if (col.description) desc += `: ${col.description}`;
      if (col.example) desc += ` Example: "${col.example}"`;
      if (col.required) desc += ' [REQUIRED]';
      return desc;
    }).join('\n');

    return `Extract data from the following construction document text and format it according to the specified template.

TEMPLATE: ${template.name}
${template.description}

EXPECTED COLUMNS:
${columnDescriptions}

CONTEXT: ${context || 'Construction drawing/specification data'}

EXTRACTED TEXT:
${extractedText}

Return the data in this exact JSON format:
{
  "rows": [
    {
      ${template.columns.map(col => `"${col.name}": <value_or_null>`).join(',\n      ')}
    }
  ],
  "confidence": <number_between_0_and_1>
}

Extract each distinct item/row found in the text. If you cannot determine a column value, use null.`;
  }

  /**
   * Generate intelligent default template for any construction division
   */
  static generateDefaultTemplateForDivision(divisionId: number, divisionName: string): ExtractionTemplate {
    // Return empty template to prevent predefined columns and example data
    return {
      id: `division-${divisionId}`,
      name: `${divisionName} Template`,
      description: `Template for ${divisionName} - columns will be generated dynamically from Smart Extraction data`,
      columns: [],
      divisionId
    };
  }
}
