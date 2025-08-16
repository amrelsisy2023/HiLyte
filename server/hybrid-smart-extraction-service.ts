import { ocrSmartExtractionService } from './ocr-smart-extraction-service';
import { smartExtractionService } from './smart-extraction-service';

interface HybridExtractionResult {
  items: any[];
  method: 'ocr' | 'ai' | 'hybrid';
  ocrItemCount: number;
  aiItemCount: number;
  costSavings: number; // Percentage of AI cost saved
  confidence: number;
}

export class HybridSmartExtractionService {
  
  /**
   * Perform smart extraction using OCR first, then AI enhancement as needed
   */
  async extractFromPage(
    pageNumber: number,
    drawingId: number,
    availableDivisions: Array<{ id: number; name: string; code: string; color: string }>,
    sheetMetadata: any
  ): Promise<HybridExtractionResult> {
    const imagePath = `/home/runner/workspace/uploads/pages/page.${pageNumber}.png`;
    
    console.log(`\n=== HYBRID EXTRACTION - Page ${pageNumber} ===`);
    console.log(`Sheet: ${sheetMetadata?.displayLabel || 'Unknown'}`);
    
    // STEP 1: OCR First Pass (cheap)
    const ocrResult = await ocrSmartExtractionService.extractFromPage(imagePath, sheetMetadata);
    console.log(`OCR found ${ocrResult.items.length} items (confidence: ${ocrResult.textConfidence.toFixed(2)})`);
    
    // STEP 2: Analyze OCR results to decide if AI is needed
    const needsAI = this.shouldUseAI(ocrResult, sheetMetadata);
    
    if (!needsAI.required) {
      console.log(`✅ OCR sufficient - AI not needed (${needsAI.reason})`);
      return {
        items: this.formatOCRItems(ocrResult.items, availableDivisions, sheetMetadata),
        method: 'ocr',
        ocrItemCount: ocrResult.items.length,
        aiItemCount: 0,
        costSavings: 100, // 100% cost savings
        confidence: ocrResult.textConfidence
      };
    }
    
    console.log(`🤖 AI needed: ${needsAI.reason}`);
    
    // STEP 3: AI Enhancement/Verification (expensive but targeted)
    if (needsAI.itemsToVerify.length > 0) {
      // Hybrid: OCR + AI verification for specific items
      const verifiedItems = await this.enhanceOCRWithAI(
        ocrResult.items,
        needsAI.itemsToVerify,
        imagePath,
        availableDivisions,
        sheetMetadata
      );
      
      return {
        items: verifiedItems,
        method: 'hybrid',
        ocrItemCount: ocrResult.items.length - needsAI.itemsToVerify.length,
        aiItemCount: needsAI.itemsToVerify.length,
        costSavings: Math.round(((ocrResult.items.length - needsAI.itemsToVerify.length) / ocrResult.items.length) * 100),
        confidence: (ocrResult.textConfidence + 0.9) / 2 // Average OCR and AI confidence
      };
    } else {
      // Full AI analysis (fallback)
      console.log(`🔄 Full AI analysis required`);
      const aiResult = await smartExtractionService.extractFromDrawing(imagePath, availableDivisions, sheetMetadata);
      
      return {
        items: aiResult.extractedItems,
        method: 'ai',
        ocrItemCount: 0,
        aiItemCount: aiResult.extractedItems.length,
        costSavings: 0, // No cost savings
        confidence: aiResult.summary.averageConfidence
      };
    }
  }

  private shouldUseAI(ocrResult: any, sheetMetadata: any): { required: boolean; reason: string; itemsToVerify: any[] } {
    // Decision logic for when to use expensive AI
    
    // Rule 1: Low OCR confidence
    if (ocrResult.textConfidence < 0.6) {
      return { 
        required: true, 
        reason: `Low OCR confidence (${ocrResult.textConfidence.toFixed(2)})`,
        itemsToVerify: [] // Full AI needed
      };
    }
    
    // Rule 2: No items found (but there should be content)
    if (ocrResult.items.length === 0 && ocrResult.fullText.length > 100) {
      return { 
        required: true, 
        reason: 'OCR found text but no construction items',
        itemsToVerify: [] // Full AI needed
      };
    }
    
    // Rule 3: Items need verification
    const itemsNeedingVerification = ocrResult.items.filter((item: any) => item.needsAIVerification);
    if (itemsNeedingVerification.length > 0) {
      return {
        required: true,
        reason: `${itemsNeedingVerification.length} items need AI verification`,
        itemsToVerify: itemsNeedingVerification
      };
    }
    
    // Rule 4: Sheet type likely has complex content
    const complexSheetTypes = ['detail', 'section', 'elevation', 'schedule', 'legend'];
    const sheetName = sheetMetadata?.displayLabel?.toLowerCase() || '';
    const isComplexSheet = complexSheetTypes.some(type => sheetName.includes(type));
    
    if (isComplexSheet && ocrResult.items.length < 3) {
      return {
        required: true,
        reason: `Complex sheet type (${sheetName}) with few OCR items`,
        itemsToVerify: [] // Full AI needed
      };
    }
    
    // Rule 5: OCR is sufficient
    return { 
      required: false, 
      reason: `OCR sufficient: ${ocrResult.items.length} items with ${ocrResult.textConfidence.toFixed(2)} confidence`,
      itemsToVerify: []
    };
  }

  private async enhanceOCRWithAI(
    allItems: any[],
    itemsToVerify: any[],
    imagePath: string,
    availableDivisions: any[],
    sheetMetadata: any
  ): Promise<any[]> {
    // Keep OCR items that don't need verification
    const ocrItems = allItems.filter(item => !item.needsAIVerification);
    
    // Use AI to verify/enhance specific items
    console.log(`🔍 AI verifying ${itemsToVerify.length} items...`);
    
    try {
      // Use targeted AI analysis for just the problematic items
      const aiResult = await smartExtractionService.extractFromDrawing(imagePath, availableDivisions, sheetMetadata);
      
      // Merge OCR items with AI-verified items
      const combinedItems = [
        ...this.formatOCRItems(ocrItems, availableDivisions, sheetMetadata),
        ...aiResult.extractedItems
      ];
      
      // Deduplicate
      return this.deduplicateItems(combinedItems);
      
    } catch (error) {
      console.log(`AI verification failed, using OCR items only:`, error.message);
      return this.formatOCRItems(allItems, availableDivisions, sheetMetadata);
    }
  }

  private formatOCRItems(ocrItems: any[], availableDivisions: any[], sheetMetadata: any) {
    return ocrItems.map((item, index) => ({
      itemName: item.itemName,
      category: item.category,
      csiDivision: this.matchDivision(item.itemName, item.category, availableDivisions),
      location: {
        coordinates: { x: 100, y: 100 + (index * 30), width: 200, height: 25 },
        sheetNumber: sheetMetadata?.sheetNumber || `Page ${sheetMetadata?.pageNumber}`,
        sheetName: sheetMetadata?.displayLabel || sheetMetadata?.sheetTitle || `Page ${sheetMetadata?.pageNumber}`
      },
      data: {
        quantity: item.quantity || '',
        specification: item.specification || '',
        notes: `Extracted via OCR (confidence: ${item.confidence.toFixed(2)})`
      },
      confidence: item.confidence,
      calloutId: `ocr-${index}`
    }));
  }

  private matchDivision(itemName: string, category: string, availableDivisions: any[]) {
    // Smart division matching based on item name and category
    const itemLower = itemName.toLowerCase();
    
    // Common construction division mappings
    const divisionMappings = [
      { keywords: ['concrete', 'cement', 'rebar', 'masonry'], division: '03' },
      { keywords: ['steel', 'metal', 'beam', 'column', 'joist'], division: '05' },
      { keywords: ['wood', 'lumber', 'framing', 'trim'], division: '06' },
      { keywords: ['door', 'window', 'frame', 'hardware'], division: '08' },
      { keywords: ['plaster', 'drywall', 'ceiling', 'flooring', 'paint'], division: '09' },
      { keywords: ['toilet', 'sink', 'faucet', 'plumbing', 'pipe', 'water'], division: '22' },
      { keywords: ['hvac', 'air', 'duct', 'mechanical', 'fan', 'unit'], division: '23' },
      { keywords: ['electrical', 'wire', 'conduit', 'panel', 'outlet', 'switch', 'light'], division: '26' },
    ];
    
    for (const mapping of divisionMappings) {
      if (mapping.keywords.some(keyword => itemLower.includes(keyword))) {
        const division = availableDivisions.find(d => d.code.startsWith(mapping.division));
        if (division) {
          return {
            code: division.code,
            name: division.name,
            id: division.id,
            color: division.color
          };
        }
      }
    }
    
    // Default fallback
    const defaultDivision = availableDivisions[0];
    return {
      code: defaultDivision?.code || '00',
      name: defaultDivision?.name || 'General',
      id: defaultDivision?.id || 1,
      color: defaultDivision?.color || '#666666'
    };
  }

  private deduplicateItems(items: any[]): any[] {
    const seen = new Map();
    return items.filter(item => {
      const key = item.itemName.toLowerCase().replace(/\s+/g, '');
      if (seen.has(key)) return false;
      seen.set(key, true);
      return true;
    });
  }
}

export const hybridSmartExtractionService = new HybridSmartExtractionService();