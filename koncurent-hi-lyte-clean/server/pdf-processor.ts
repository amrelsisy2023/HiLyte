import { fromPath } from "pdf2pic";
import fs from "fs";
import path from "path";

export interface ProcessedPage {
  pageNumber: number;
  imagePath: string;
  thumbnailPath: string;
}

export interface PDFProcessResult {
  totalPages: number;
  pages: ProcessedPage[];
}

export async function processPDF(
  filePath: string, 
  fileName: string, 
  cancellationToken: { cancelled: boolean },
  progressCallback?: (processed: number, total: number) => void
): Promise<PDFProcessResult> {
  try {
    console.log(`Starting PDF processing: ${fileName} at ${filePath}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`PDF file not found: ${filePath}`);
    }
    
    // Create output directory and clear any existing pages
    const pagesDir = path.join(process.cwd(), 'uploads', 'pages');
    if (!fs.existsSync(pagesDir)) {
      fs.mkdirSync(pagesDir, { recursive: true });
      console.log('Created pages directory:', pagesDir);
    } else {
      // Clear existing page files to prevent confusion
      const existingPages = fs.readdirSync(pagesDir).filter(f => f.startsWith('page.') && f.endsWith('.png'));
      for (const page of existingPages) {
        fs.unlinkSync(path.join(pagesDir, page));
      }
      console.log('Cleared existing page files');
    }
    
    // We'll determine the total page count during processing to avoid upfront overhead
    let totalPages = 0; // Will be updated as we discover the actual count
    
    console.log('Starting complete PDF conversion...');
    
    // High-quality conversion settings for better OCR and visual quality
    const convert = fromPath(filePath, {
      density: 300,           // Increased from 100 to 300 DPI for much better quality
      saveFilename: "page",
      savePath: pagesDir,
      format: "png",
      width: 2400,           // Increased from 1200 to 2400 pixels
      height: 1600,          // Increased from 800 to 1600 pixels
      quality: 100           // Maximum quality for PNG
    });

    const pages: ProcessedPage[] = [];
    let actualPageCount = 0;
    
    // Process all pages with more robust logic
    let pageNum = 1;
    const maxPageAttempts = 200; // Higher safety limit for large documents
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 2; // Stop after 2 consecutive failures
    
    while (pageNum <= maxPageAttempts && consecutiveFailures < maxConsecutiveFailures) {
      try {
        // Check for cancellation before processing each page
        if (cancellationToken.cancelled) {
          console.log(`PDF processing cancelled at page ${pageNum}`);
          throw new Error('PDF processing cancelled by user');
        }
        
        console.log(`Attempting to convert page ${pageNum}...`);
        
        // Call progress callback if provided
        if (progressCallback) {
          // Dynamic total page estimation that updates as we discover more pages
          // This ensures the progress shows the most accurate count available
          let estimatedTotal = Math.max(pageNum + 5, 20); // Conservative estimate
          
          // As we process more pages, make better estimates
          if (actualPageCount >= 10) {
            // After 10 pages, use a more generous estimate
            estimatedTotal = Math.max(actualPageCount + 15, actualPageCount * 1.5);
          } else if (actualPageCount >= 5) {
            // After 5 pages, use a moderate estimate
            estimatedTotal = Math.max(actualPageCount + 10, actualPageCount * 1.8);
          }
          
          progressCallback(pageNum - 1, Math.ceil(estimatedTotal));
        }
        
        const result = await convert(pageNum, { responseType: "image" });
        
        // Double-check that the file was actually created
        const expectedPath = path.join(pagesDir, `page.${pageNum}.png`);
        
        // Give the file system a moment to write the file
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!fs.existsSync(expectedPath)) {
          console.log(`Page ${pageNum} file not created after conversion, treating as failure`);
          consecutiveFailures++;
          pageNum++;
          continue;
        }
        
        // Verify the file has content (not empty)
        const stats = fs.statSync(expectedPath);
        if (stats.size < 1000) { // Less than 1KB is likely empty/corrupt
          console.log(`Page ${pageNum} file too small (${stats.size} bytes), treating as failure`);
          fs.unlinkSync(expectedPath); // Remove the bad file
          consecutiveFailures++;
          pageNum++;
          continue;
        }
        
        console.log(`Page ${pageNum} converted successfully:`, result);
        actualPageCount = pageNum;
        consecutiveFailures = 0; // Reset on success
        
        pages.push({
          pageNumber: pageNum,
          imagePath: `uploads/pages/page.${pageNum}.png`,
          thumbnailPath: `uploads/pages/page.${pageNum}.png`
        });
        
        pageNum++;
      } catch (error) {
        console.log(`Page ${pageNum} conversion failed:`, error instanceof Error ? error.message : 'Unknown error');
        consecutiveFailures++;
        pageNum++;
        
        if (consecutiveFailures >= maxConsecutiveFailures) {
          console.log(`Stopping conversion after ${maxConsecutiveFailures} consecutive failures at page ${pageNum - 1}`);
          break;
        }
      }
    }

    console.log(`PDF processing completed. Total pages: ${actualPageCount}`);
    
    return {
      totalPages: actualPageCount,
      pages
    };
  } catch (error) {
    console.error('Error in processPDF:', error);
    throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function getImageDimensions(imagePath: string): { width: number; height: number } {
  // For now, return default dimensions. In a real implementation,
  // you'd use a library like 'image-size' to get actual dimensions
  return { width: 1200, height: 800 };
}