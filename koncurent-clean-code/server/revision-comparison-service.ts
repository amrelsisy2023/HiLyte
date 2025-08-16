import { aiExtractionService } from "./ai-extraction-service";
import { AiCreditService } from "./ai-credit-service";
import fs from "fs";
import path from "path";
import { storage } from "./simple-storage";
import type { ExtractedData, RevisionSet, ContentMapping, RevisionChange } from "@shared/schema";

export interface DrawingComparison {
  changedPages: Array<{
    pageNumber: number;
    changeType: 'modified' | 'new' | 'removed';
    changeDescription: string;
    severity: 'low' | 'medium' | 'high';
    confidence: number;
    affectedRegions: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      description: string;
    }>;
  }>;
  preservedExtractions: Array<{
    extractionId: number;
    confidence: number;
    newCoordinates?: { x: number; y: number; width: number; height: number };
  }>;
  summary: {
    totalChanges: number;
    majorChanges: number;
    minorChanges: number;
    recommendedAction: string;
  };
}

export class RevisionComparisonService {
  /**
   * Compare two drawing sets and identify changes, preserve unchanged data
   */
  async compareDrawingSets(
    originalDrawingId: number,
    newDrawingId: number,
    userId: number
  ): Promise<DrawingComparison> {
    try {
      const [originalDrawing, newDrawing] = await Promise.all([
        storage.getDrawing(originalDrawingId),
        storage.getDrawing(newDrawingId)
      ]);

      if (!originalDrawing || !newDrawing) {
        throw new Error('Drawing not found');
      }

      console.log(`Comparing drawings: ${originalDrawing.filename} vs ${newDrawing.filename}`);

      // Get existing extracted data from original drawing
      const originalExtractions = await storage.getExtractedData(originalDrawingId);
      
      // Compare page by page
      const totalPages = Math.max(originalDrawing.totalPages || 1, newDrawing.totalPages || 1);
      const changedPages = [];
      const preservedExtractions = [];

      // Process pages in batches to optimize AI usage
      for (let page = 1; page <= totalPages; page++) {
        const originalPagePath = `uploads/pages/original_${originalDrawingId}_page.${page}.png`;
        const newPagePath = `uploads/pages/page.${page}.png`;

        const originalExists = fs.existsSync(originalPagePath);
        const newExists = fs.existsSync(newPagePath);

        if (!originalExists && newExists) {
          // New page added
          changedPages.push({
            pageNumber: page,
            changeType: 'new' as const,
            changeDescription: 'New page added to drawing set',
            severity: 'medium' as const,
            confidence: 1.0,
            affectedRegions: [{
              x: 0, y: 0, width: 100, height: 100,
              description: 'Entire page is new'
            }]
          });
        } else if (originalExists && !newExists) {
          // Page removed
          changedPages.push({
            pageNumber: page,
            changeType: 'removed' as const,
            changeDescription: 'Page removed from drawing set',
            severity: 'high' as const,
            confidence: 1.0,
            affectedRegions: [{
              x: 0, y: 0, width: 100, height: 100,
              description: 'Entire page was removed'
            }]
          });
        } else if (originalExists && newExists) {
          // Compare existing pages using AI
          const comparison = await this.comparePages(
            originalPagePath,
            newPagePath,
            page,
            userId
          );

          if (comparison.hasChanges) {
            changedPages.push({
              pageNumber: page,
              changeType: 'modified' as const,
              changeDescription: comparison.changeDescription,
              severity: comparison.severity,
              confidence: comparison.confidence,
              affectedRegions: comparison.affectedRegions
            });
          }

          // Check which extractions can be preserved
          const pageExtractions = originalExtractions.filter(e => e.pageNumber === page);
          for (const extraction of pageExtractions) {
            const preservationResult = await this.analyzeExtractionPreservation(
              extraction,
              originalPagePath,
              newPagePath,
              userId
            );

            if (preservationResult.canPreserve) {
              preservedExtractions.push({
                extractionId: extraction.id,
                confidence: preservationResult.confidence,
                newCoordinates: preservationResult.newCoordinates
              });
            }
          }
        }
      }

      // Generate summary
      const majorChanges = changedPages.filter(c => c.severity === 'high').length;
      const minorChanges = changedPages.filter(c => c.severity === 'low').length;
      const totalChanges = changedPages.length;

      const summary = {
        totalChanges,
        majorChanges,
        minorChanges,
        recommendedAction: this.getRecommendedAction(totalChanges, majorChanges)
      };

      return {
        changedPages,
        preservedExtractions,
        summary
      };

    } catch (error) {
      console.error('Error comparing drawing sets:', error);
      throw error;
    }
  }

  /**
   * Compare two specific pages using AI vision
   */
  private async comparePages(
    originalPagePath: string,
    newPagePath: string,
    pageNumber: number,
    userId: number
  ): Promise<{
    hasChanges: boolean;
    changeDescription: string;
    severity: 'low' | 'medium' | 'high';
    confidence: number;
    affectedRegions: Array<{
      x: number; y: number; width: number; height: number;
      description: string;
    }>;
  }> {
    try {
      console.log(`AI comparing page ${pageNumber}: ${originalPagePath} vs ${newPagePath}`);

      // Use Claude's vision capabilities to compare the pages
      const prompt = `You are an expert construction drawing analyst. Compare these two drawing pages and identify any changes.

Please analyze:
1. Structural changes (walls, doors, windows, dimensions)
2. Text/label changes (room names, dimensions, notes)
3. Symbol/fixture changes (electrical, plumbing, HVAC)
4. Layout modifications
5. New or removed elements

For each change found, provide:
- Location coordinates (as percentages: x, y, width, height)
- Description of the change
- Severity level (low/medium/high)
- Confidence level (0.0-1.0)

Respond in JSON format:
{
  "hasChanges": boolean,
  "changeDescription": "Overall summary of changes",
  "severity": "low|medium|high",
  "confidence": 0.0-1.0,
  "affectedRegions": [
    {
      "x": 0-100,
      "y": 0-100, 
      "width": 0-100,
      "height": 0-100,
      "description": "What changed in this region"
    }
  ]
}

If no significant changes are detected, return hasChanges: false with empty affectedRegions.`;

      // Credit tracking for AI comparison
      const aiResult = await aiExtractionService.analyzeImagesWithCredits(
        [originalPagePath, newPagePath],
        prompt,
        userId,
        'Drawing Comparison',
        0.25 // Lower cost for comparison vs extraction
      );

      let parsedResult;
      try {
        parsedResult = JSON.parse(aiResult);
      } catch (parseError) {
        console.error('Failed to parse AI comparison result:', parseError);
        // Fallback result
        return {
          hasChanges: false,
          changeDescription: 'Unable to analyze changes',
          severity: 'medium',
          confidence: 0.0,
          affectedRegions: []
        };
      }

      return {
        hasChanges: parsedResult.hasChanges || false,
        changeDescription: parsedResult.changeDescription || 'No changes detected',
        severity: parsedResult.severity || 'medium',
        confidence: parsedResult.confidence || 0.5,
        affectedRegions: parsedResult.affectedRegions || []
      };

    } catch (error) {
      console.error(`Error comparing page ${pageNumber}:`, error);
      return {
        hasChanges: false,
        changeDescription: 'Comparison failed',
        severity: 'medium',
        confidence: 0.0,
        affectedRegions: []
      };
    }
  }

  /**
   * Analyze if an existing extraction can be preserved in the new drawing
   */
  private async analyzeExtractionPreservation(
    extraction: ExtractedData,
    originalPagePath: string,
    newPagePath: string,
    userId: number
  ): Promise<{
    canPreserve: boolean;
    confidence: number;
    newCoordinates?: { x: number; y: number; width: number; height: number };
  }> {
    try {
      const coordinates = extraction.coordinates as any;
      
      const prompt = `You are analyzing whether extracted data can be preserved between drawing revisions.

Original extraction data:
- Type: ${extraction.tableData}
- Location: x:${coordinates?.x}, y:${coordinates?.y}, width:${coordinates?.width}, height:${coordinates?.height}
- Data: ${JSON.stringify(extraction.tableData).substring(0, 500)}

Compare the region in both images and determine:
1. Is the content essentially unchanged? (minor formatting changes are OK)
2. Has the content moved to a new location?
3. What's the confidence level for preservation?

Respond in JSON format:
{
  "canPreserve": boolean,
  "confidence": 0.0-1.0,
  "newCoordinates": {
    "x": 0-100,
    "y": 0-100,
    "width": 0-100,
    "height": 0-100
  },
  "reason": "Why this data can or cannot be preserved"
}`;

      const aiResult = await aiExtractionService.analyzeImagesWithCredits(
        [originalPagePath, newPagePath],
        prompt,
        userId,
        'Extraction Preservation Analysis',
        0.15 // Lower cost for preservation analysis
      );

      const parsedResult = JSON.parse(aiResult);
      
      return {
        canPreserve: parsedResult.canPreserve || false,
        confidence: parsedResult.confidence || 0.0,
        newCoordinates: parsedResult.newCoordinates
      };

    } catch (error) {
      console.error('Error analyzing extraction preservation:', error);
      return {
        canPreserve: false,
        confidence: 0.0
      };
    }
  }

  /**
   * Create content mappings and revision changes in the database
   */
  async createRevisionMappings(
    comparison: DrawingComparison,
    revisionSetId: number,
    originalDrawingId: number
  ): Promise<void> {
    try {
      // Create content mappings for preserved extractions
      for (const preserved of comparison.preservedExtractions) {
        await storage.createContentMapping({
          oldExtractionId: preserved.extractionId,
          newExtractionId: null, // Will be updated when new extraction is created
          revisionSetId,
          mappingConfidence: preserved.confidence,
          changeType: 'preserved',
          oldCoordinates: await this.getExtractionCoordinates(preserved.extractionId),
          newCoordinates: preserved.newCoordinates,
          changeDescription: 'Data preserved from previous revision',
          reviewed: false
        });
      }

      // Create revision changes for each detected change
      for (const change of comparison.changedPages) {
        await storage.createRevisionChange({
          revisionSetId,
          drawingId: originalDrawingId,
          changeType: change.changeType,
          location: {
            pageNumber: change.pageNumber,
            regions: change.affectedRegions
          },
          description: change.changeDescription,
          severity: change.severity,
          reviewed: false
        });
      }

      console.log(`Created ${comparison.preservedExtractions.length} content mappings and ${comparison.changedPages.length} revision changes`);

    } catch (error) {
      console.error('Error creating revision mappings:', error);
      throw error;
    }
  }

  private async getExtractionCoordinates(extractionId: number): Promise<any> {
    const extraction = await storage.getExtractedDataItem(extractionId);
    return extraction?.coordinates || null;
  }

  private getRecommendedAction(totalChanges: number, majorChanges: number): string {
    if (totalChanges === 0) {
      return 'No action required - drawings are identical';
    } else if (majorChanges === 0 && totalChanges <= 3) {
      return 'Minor updates detected - review and approve automatically';
    } else if (majorChanges <= 2) {
      return 'Moderate changes detected - manual review recommended';
    } else {
      return 'Significant changes detected - thorough review required';
    }
  }
}

export const revisionComparisonService = new RevisionComparisonService();