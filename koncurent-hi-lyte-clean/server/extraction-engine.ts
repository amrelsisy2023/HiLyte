import Tesseract, { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { aiExtractionService, AIExtractionResult } from './ai-extraction-service';

export interface ExtractionResult {
  text: string;
  confidence: number;
  type: 'table' | 'text' | 'schedule' | 'specification' | 'mixed';
  structured?: {
    headers: string[];
    rows: string[][];
    metadata?: {
      drawingType?: string;
      scheduleType?: string;
      constructionDivision?: string;
    };
  };
  suggestions?: {
    divisionRecommendation?: string;
    dataType?: string;
    extractionImprovement?: string;
  };
  aiEnhanced?: boolean;
}

export interface ExtractionRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class ExtractionEngine {
  private worker: Tesseract.Worker | null = null;

  async initialize() {
    if (!this.worker) {
      console.log('Initializing Tesseract worker...');
      this.worker = await createWorker('eng');
      await this.worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,;:!?-_()[]{}|/\\@#$%^&*+=<>~`"\'-',
        tessedit_pageseg_mode: '6', // PSM.UNIFORM_BLOCK
      });
      console.log('Tesseract worker initialized successfully');
    }
  }

  async extractFromRegion(imagePath: string, region: ExtractionRegion): Promise<ExtractionResult> {
    console.log('Starting extraction from region:', region);
    
    try {
      // Try AI extraction first if available
      if (aiExtractionService.isEnabled()) {
        console.log('Attempting AI extraction...');
        try {
          const processedImagePath = await this.preprocessImage(imagePath, region);
          const aiResult = await aiExtractionService.analyzeConstructionDrawing(processedImagePath, region);
          
          // Clean up temporary file
          if (fs.existsSync(processedImagePath)) {
            fs.unlinkSync(processedImagePath);
          }
          
          console.log('AI extraction successful, confidence:', aiResult.confidence);
          return {
            ...aiResult,
            aiEnhanced: true
          };
        } catch (aiError) {
          console.log('AI extraction failed, falling back to OCR:', aiError.message);
        }
      }
      
      // Fallback to traditional OCR
      await this.initialize();
      
      // Crop and enhance the image
      const processedImagePath = await this.preprocessImage(imagePath, region);
      console.log('Image preprocessed:', processedImagePath);
      
      // Perform OCR
      console.log('Running OCR on processed image...');
      const { data } = await this.worker!.recognize(processedImagePath);
      console.log('OCR completed, confidence:', data.confidence);
      
      const extractedText = data.text.trim();
      const ocrConfidence = data.confidence / 100;
      
      console.log('Extracted text length:', extractedText.length);
      console.log('Text preview:', extractedText.substring(0, 100));
      
      if (!extractedText) {
        // Clean up temporary file
        if (fs.existsSync(processedImagePath)) {
          fs.unlinkSync(processedImagePath);
        }
        return {
          text: 'No text detected in selected region',
          confidence: 0,
          type: 'text'
        };
      }
      
      // Try to enhance OCR results with AI
      let finalResult: ExtractionResult;
      if (aiExtractionService.isEnabled()) {
        try {
          console.log('Enhancing OCR results with AI...');
          const aiEnhanced = await aiExtractionService.enhanceExistingExtraction(extractedText, processedImagePath);
          finalResult = {
            ...aiEnhanced,
            aiEnhanced: true
          };
        } catch (enhanceError) {
          console.log('AI enhancement failed, using OCR results:', enhanceError.message);
          const analysisResult = this.analyzeExtractedContent(extractedText);
          finalResult = {
            ...analysisResult,
            text: extractedText,
            confidence: ocrConfidence,
            aiEnhanced: false
          };
        }
      } else {
        // Pure OCR analysis
        const analysisResult = this.analyzeExtractedContent(extractedText);
        finalResult = {
          ...analysisResult,
          text: extractedText,
          confidence: ocrConfidence,
          aiEnhanced: false
        };
      }
      
      // Clean up temporary file
      if (fs.existsSync(processedImagePath)) {
        fs.unlinkSync(processedImagePath);
      }
      
      console.log('Final extraction result type:', finalResult.type, 'AI enhanced:', finalResult.aiEnhanced);
      
      return {
        success: true,
        text: finalResult.text,
        confidence: finalResult.confidence,
        type: finalResult.type,
        structured: finalResult.structured,
        aiEnhanced: finalResult.aiEnhanced
      };
      
    } catch (error) {
      console.error('Extraction failed:', error);
      return {
        success: false,
        text: `Extraction failed: ${error.message}`,
        confidence: 0,
        type: 'text',
        structured: null,
        aiEnhanced: false
      };
    }
  }

  private async preprocessImage(imagePath: string, region: ExtractionRegion): Promise<string> {
    const tempPath = path.join(process.cwd(), 'uploads', 'temp', `extraction_${Date.now()}_${Math.random().toString(36).substring(2)}.png`);
    
    // Ensure temp directory exists
    const tempDir = path.dirname(tempPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    console.log('Preprocessing image:', imagePath);
    console.log('Region to extract:', region);
    
    try {
      // Get image info first
      const imageInfo = await sharp(imagePath).metadata();
      console.log('Image dimensions:', imageInfo.width, 'x', imageInfo.height);
      
      // Clamp region to image bounds
      const clampedRegion = {
        left: Math.max(0, Math.min(region.x, imageInfo.width! - 1)),
        top: Math.max(0, Math.min(region.y, imageInfo.height! - 1)),
        width: Math.min(region.width, imageInfo.width! - Math.max(0, region.x)),
        height: Math.min(region.height, imageInfo.height! - Math.max(0, region.y))
      };
      
      console.log('Clamped region:', clampedRegion);
      
      // Crop and enhance the image
      await sharp(imagePath)
        .extract(clampedRegion)
        .resize(null, null, { 
          kernel: sharp.kernel.lanczos3,
          fit: 'inside',
          withoutEnlargement: true
        })
        .sharpen({ sigma: 1, m1: 1, m2: 2 })
        .normalize()
        .png({ quality: 100, compressionLevel: 0 })
        .toFile(tempPath);
      
      console.log('Image preprocessed successfully to:', tempPath);
      return tempPath;
      
    } catch (error) {
      console.error('Image preprocessing failed:', error);
      throw error;
    }
  }

  private analyzeExtractedContent(text: string): { type: 'table' | 'text' | 'mixed'; structured?: { headers: string[]; rows: string[][] } } {
    const lines = text.split('\n').filter(line => line.trim());
    
    // Simple table detection
    const hasColumns = lines.some(line => 
      line.includes('|') || 
      line.match(/\s{3,}/g) || 
      line.split(/\s+/).length > 3
    );
    
    if (hasColumns && lines.length > 2) {
      const structured = this.parseSimpleTable(lines);
      return {
        type: 'table',
        structured
      };
    }
    
    return {
      type: 'text'
    };
  }

  private parseSimpleTable(lines: string[]): { headers: string[]; rows: string[][] } {
    if (lines.length < 2) {
      return { headers: [], rows: [] };
    }
    
    // Use first line as headers
    const headerLine = lines[0];
    const headers = this.splitTableLine(headerLine);
    
    // Parse remaining lines as data rows
    const rows = lines.slice(1).map(line => this.splitTableLine(line));
    
    return { headers, rows };
  }

  private splitTableLine(line: string): string[] {
    // Handle pipe-separated values
    if (line.includes('|')) {
      return line.split('|').map(cell => cell.trim());
    }
    
    // Handle space-separated values (3+ spaces as delimiter)
    const parts = line.split(/\s{3,}/);
    if (parts.length > 1) {
      return parts.map(part => part.trim());
    }
    
    // Fallback to regular word splitting
    return line.split(/\s+/).filter(word => word.trim());
  }

  async cleanup() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

// Global instance
export const extractionEngine = new ExtractionEngine();