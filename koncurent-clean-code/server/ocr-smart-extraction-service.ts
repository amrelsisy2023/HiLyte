import Tesseract from 'tesseract.js';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

interface OCRExtractionResult {
  items: Array<{
    itemName: string;
    category: 'material' | 'equipment' | 'fixture' | 'component';
    quantity?: string;
    specification?: string;
    location: string;
    confidence: number;
    needsAIVerification: boolean;
  }>;
  textConfidence: number;
  fullText: string;
}

export class OCRSmartExtractionService {
  private worker: Tesseract.Worker | null = null;

  async initialize() {
    if (!this.worker) {
      console.log('Initializing OCR worker for smart extraction...');
      this.worker = await Tesseract.createWorker('eng');
      await this.worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,;:!?-_()[]{}|/\\@#$%^&*+=<>~`"\'-×÷',
        tessedit_pageseg_mode: '3', // PSM.AUTO - good for mixed content
      });
    }
  }

  async extractFromPage(imagePath: string, sheetMetadata: any): Promise<OCRExtractionResult> {
    await this.initialize();
    
    console.log('Starting OCR-based smart extraction for:', sheetMetadata?.displayLabel || 'Unknown sheet');
    
    // Perform OCR on full page
    const { data } = await this.worker!.recognize(imagePath);
    const fullText = data.text;
    const textConfidence = data.confidence / 100;
    
    console.log(`OCR completed with ${textConfidence.toFixed(2)} confidence, extracted ${fullText.length} characters`);
    
    // Extract construction items using pattern recognition
    const items = this.extractConstructionItems(fullText, sheetMetadata, textConfidence);
    
    return {
      items,
      textConfidence,
      fullText
    };
  }

  private extractConstructionItems(text: string, sheetMetadata: any, ocrConfidence: number) {
    const items: any[] = [];
    const lines = text.split('\n').filter(line => line.trim().length > 3);
    
    // Construction item patterns (optimized for common construction documents)
    const patterns = {
      // Equipment patterns
      equipment: [
        /(?:panel|unit|system|pump|fan|motor|transformer|generator|boiler|chiller|ahu|rtu|vav|fcu)[\s\-]*([a-z0-9\-]+)/gi,
        /([a-z]+[\-\s]*\d+)[\s]*(?:hp|kw|amp|volt|ton|cfm|gpm|btu)/gi,
      ],
      
      // Material patterns  
      materials: [
        /(\d+['"]?\s*x\s*\d+['"]?\s*x\s*\d+['"]?)[\s]*(?:steel|concrete|lumber|wood|pipe|duct|conduit|cable|wire)/gi,
        /(?:steel|concrete|lumber|wood|pipe|duct|conduit|cable|wire)[\s]*(\d+['"]?\s*x\s*\d+['"]?)/gi,
        /(#?\d+[\s]*(?:rebar|bar|beam|column|joist|stud|plate))/gi,
      ],
      
      // Fixture patterns
      fixtures: [
        /(?:light|fixture|outlet|switch|receptacle|device)[\s]*([a-z0-9\-]+)/gi,
        /([a-z0-9\-]+)[\s]*(?:light|fixture|outlet|switch|receptacle)/gi,
      ],
      
      // Door/Window schedule patterns
      schedules: [
        /([a-z]\d+)[\s]+(.+?)[\s]+(\d+['"]?\s*x\s*\d+['"]?)/gi, // Door/Window marks
        /(\d+)[\s]*(?:ea|each|qty)[\s]*(.+?)[\s]+(.+)/gi, // Quantity-based items
      ]
    };

    // Extract items using patterns
    Object.entries(patterns).forEach(([category, categoryPatterns]) => {
      categoryPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          const itemName = this.cleanItemName(match[1] || match[0]);
          if (itemName.length > 2 && itemName.length < 100) {
            items.push({
              itemName,
              category: this.mapCategory(category as keyof typeof patterns),
              specification: match[2] || '',
              location: sheetMetadata?.displayLabel || `Page ${sheetMetadata?.pageNumber}`,
              confidence: ocrConfidence * 0.8, // Reduce confidence for pattern matching
              needsAIVerification: ocrConfidence < 0.7 || this.isComplexItem(itemName)
            });
          }
        }
      });
    });

    // Look for table-like structures
    const tableItems = this.extractFromTables(lines, sheetMetadata, ocrConfidence);
    items.push(...tableItems);

    // Remove duplicates and filter
    const uniqueItems = this.deduplicateItems(items);
    
    console.log(`OCR extraction found ${uniqueItems.length} potential items, ${uniqueItems.filter(i => i.needsAIVerification).length} need AI verification`);
    
    return uniqueItems;
  }

  private extractFromTables(lines: string[], sheetMetadata: any, ocrConfidence: number) {
    const items: any[] = [];
    
    // Look for table-like patterns
    const tableLines = lines.filter(line => {
      // Lines with multiple columns (detected by multiple spaces or pipes)
      return line.match(/\s{3,}/) || line.includes('|') || line.split(/\s+/).length > 4;
    });

    if (tableLines.length < 2) return items;

    // Try to detect header row
    const potentialHeaders = tableLines[0].toLowerCase();
    const isLikelySchedule = potentialHeaders.includes('qty') || 
                           potentialHeaders.includes('size') || 
                           potentialHeaders.includes('type') ||
                           potentialHeaders.includes('mark');

    if (isLikelySchedule) {
      tableLines.slice(1).forEach(line => {
        const cells = this.parseTableRow(line);
        if (cells.length >= 2) {
          const itemName = cells[0] || cells[1]; // Try first or second column
          if (itemName && itemName.length > 2 && itemName.length < 50) {
            items.push({
              itemName: this.cleanItemName(itemName),
              category: 'component',
              quantity: cells.find(cell => cell.match(/^\d+/)) || '',
              specification: cells.slice(1).join(' '),
              location: sheetMetadata?.displayLabel || `Page ${sheetMetadata?.pageNumber}`,
              confidence: ocrConfidence * 0.9, // Higher confidence for table data
              needsAIVerification: false
            });
          }
        }
      });
    }

    return items;
  }

  private parseTableRow(line: string): string[] {
    if (line.includes('|')) {
      return line.split('|').map(cell => cell.trim());
    }
    
    // Split by multiple spaces
    return line.split(/\s{3,}/).map(cell => cell.trim());
  }

  private cleanItemName(name: string): string {
    return name
      .replace(/[^\w\s\-\.\/]/g, '') // Remove special chars except word chars, spaces, hyphens, dots, slashes
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()
      .replace(/^\d+[\.\)]\s*/, ''); // Remove leading numbers like "1. " or "1) "
  }

  private mapCategory(patternCategory: 'equipment' | 'materials' | 'fixtures' | 'schedules'): 'material' | 'equipment' | 'fixture' | 'component' {
    const mapping = {
      equipment: 'equipment' as const,
      materials: 'material' as const,
      fixtures: 'fixture' as const,
      schedules: 'component' as const
    };
    return mapping[patternCategory];
  }

  private isComplexItem(itemName: string): boolean {
    // Items that likely need AI interpretation
    const complexPatterns = [
      /assembly|system|detail|typical|see\s+note/i,
      /[a-z]+\s*\([^)]+\)/i, // Items with parenthetical descriptions
      /\b(var|varies|multiple|misc|miscellaneous)\b/i
    ];
    
    return complexPatterns.some(pattern => pattern.test(itemName));
  }

  private deduplicateItems(items: any[]): any[] {
    const seen = new Set();
    return items.filter(item => {
      const key = item.itemName.toLowerCase().replace(/\s+/g, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async cleanup() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

export const ocrSmartExtractionService = new OCRSmartExtractionService();