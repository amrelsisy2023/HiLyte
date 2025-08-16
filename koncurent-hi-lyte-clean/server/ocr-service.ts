import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { createWorker, PSM } from 'tesseract.js';

// Simple OCR implementation using basic text detection
// For production, you might want to use Tesseract.js or a cloud OCR service
export interface OCRResult {
  text: string;
  confidence: number;
  boundingBoxes?: Array<{
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

// Construction drawing specific preprocessing
async function preprocessConstructionDrawing(imagePath: string): Promise<string> {
  const outputPath = imagePath.replace('.png', '_processed.png');
  
  try {
    await sharp(imagePath)
      // Increase contrast for better text recognition
      .normalize()
      // Convert to grayscale for better OCR
      .grayscale()
      // Enhance contrast specifically for technical drawings
      .linear(1.2, -(128 * 1.2) + 128)
      // Sharpen text edges
      .sharpen({ sigma: 1, flat: 1, jagged: 2 })
      // Ensure good resolution for OCR
      .resize({ width: 2400, height: 1600, fit: 'inside', withoutEnlargement: true })
      .png({ quality: 100, compressionLevel: 0 })
      .toFile(outputPath);
    
    console.log('Construction drawing preprocessing completed with enhanced settings');
    return outputPath;
  } catch (error) {
    console.error('Image preprocessing failed:', error);
    return imagePath; // Return original if preprocessing fails
  }
}

// Detect if image contains construction/architectural drawing elements
function detectConstructionDrawingFeatures(imagePath: string): boolean {
  // This could be enhanced with computer vision to detect:
  // - Grid lines, dimension lines, architectural symbols
  // - Title blocks, scale indicators
  // - Common construction drawing layouts
  return true; // For now, assume all drawings are construction-related
}

export async function extractTextFromImageRegion(
  imagePath: string,
  region: { x: number; y: number; width: number; height: number }
): Promise<OCRResult> {
  try {
    // Crop the image to the selected region
    const croppedImagePath = path.join(process.cwd(), 'uploads', 'temp', `crop_${Date.now()}.png`);
    
    // Ensure temp directory exists
    const tempDir = path.dirname(croppedImagePath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Enhanced image preprocessing for superior table detection
    await sharp(imagePath)
      .extract({
        left: Math.max(0, region.x),
        top: Math.max(0, region.y),
        width: Math.max(1, region.width),
        height: Math.max(1, region.height)
      })
      // Scale up significantly for better OCR
      .resize(Math.max(1, region.width * 6), Math.max(1, region.height * 6), {
        kernel: sharp.kernel.lanczos3,
        fit: 'fill'
      })
      // Convert to grayscale for better text contrast
      .grayscale()
      // Advanced image enhancement for table detection
      .sharpen({ sigma: 1.5, m1: 0.8, m2: 3.0 })
      .normalize()
      .linear(1.2, -(128 * 1.2) + 128) // Increase contrast
      .linear(1.2, -(128 * 1.2) + 128)
      // Apply unsharp mask for text clarity
      .sharpen({ sigma: 1, m1: 0.5, m2: 3, x1: 3, y2: 20 })
      // Save as high-quality PNG
      .png({ quality: 100, compressionLevel: 0 })
      .toFile(croppedImagePath);

    // Try real OCR using Tesseract.js with construction-specific preprocessing
    try {
      console.log('Starting construction-optimized OCR text extraction...');
      
      // Preprocess image for better construction drawing recognition
      const processedImagePath = await preprocessConstructionDrawing(croppedImagePath);
      
      const worker = await createWorker();
      
      // Construction-specific OCR configuration
      await worker.setParameters({
        // Extended character set for architectural drawings including symbols and dimensions
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,;:()[]{}|/\\-+="\'#&@$%*^!?~`°×±≤≥∅∆⌀',
        preserve_interword_spaces: '1',
        // Enhanced table detection for construction schedules
        textord_tablefind_good_width: '3',
        textord_tabfind_find_tables: '1',
        textord_tabfind_vertical_text: '1', // Handle rotated text in drawings
        textord_heavy_nr: '1', // Better handling of dense technical text
        textord_tabfind_aligned_gap_fraction: '0.25', // Improved column boundary detection
        // Page segmentation optimized for construction documents
        tessedit_pageseg_mode: '6', // Single block of text
        // Character recognition improvements
        tessedit_create_hocr: '1', // Enable position data extraction
        classify_enable_learning: '0', // Consistent results
        textord_debug_tabfind: '0' // Disable debug for production
      });
      
      // Use logger for debugging (optional)
      // await worker.setOptions({
      //   logger: (m: any) => console.log(m)
      // });

      // Get detailed OCR results with bounding box information using processed image
      const { data } = await worker.recognize(processedImagePath);
      
      const { text, confidence, words, lines } = data;
      await worker.terminate();
      
      console.log('OCR detailed analysis - Words found:', words?.length || 0);
      console.log('OCR detailed analysis - Lines found:', lines?.length || 0);
      
      console.log('OCR extracted text:', text);
      console.log('OCR confidence:', confidence);
      
      // Clean up temporary file
      if (fs.existsSync(croppedImagePath)) {
        fs.unlinkSync(croppedImagePath);
      }
      
      if (text && text.trim().length > 0) {
        // Enhanced analysis with spatial layout preservation using bounding box data
        try {
          const analysisResult = analyzeAdvancedTableStructure(text, words, lines, region);
          
          return {
            text: analysisResult.text,
            confidence: confidence / 100
          };
        } catch (analysisError) {
          console.error('Advanced table analysis failed, using extracted text:', analysisError);
          // Return the raw extracted text if analysis fails
          return {
            text: text.trim(),
            confidence: confidence / 100
          };
        }
      }
    } catch (ocrError) {
      console.error('Tesseract OCR failed:', ocrError);
    }

    // Fallback to region analysis if OCR fails
    const extractedContent = await processConstructionData(region);
    
    // Clean up temporary files
    if (fs.existsSync(croppedImagePath)) {
      fs.unlinkSync(croppedImagePath);
    }
    
    // Clean up processed image if it was created
    const processedPath = croppedImagePath.replace('.png', '_processed.png');
    if (fs.existsSync(processedPath)) {
      fs.unlinkSync(processedPath);
    }

    return extractedContent;

  } catch (error) {
    console.error('OCR processing error:', error);
    return {
      text: "Unable to extract text",
      confidence: 0.0
    };
  }
}

// Enhanced processing for construction documents with position-based content detection
async function processConstructionData(region: { x: number; y: number; width: number; height: number }): Promise<OCRResult> {
  // Analyze position to determine likely content type
  // Based on typical architectural drawing layouts:
  // - Upper left: Title blocks, general info
  // - Upper center/right: Floor plans, elevations  
  // - Lower left: Schedules, tables
  // - Lower center/right: Details, sections
  
  const aspectRatio = region.width / region.height;
  const area = region.width * region.height;
  
  // Position-based content detection
  const isLeftSide = region.x < 400;
  const isUpperHalf = region.y < 300;
  const isLowerHalf = region.y >= 300;
  const isWideSelection = aspectRatio > 2.0;
  const isLargeArea = area > 25000;
  
  // Determine content type based on position and size
  let contentType = 'general';
  
  // Enhanced detection for door/frame schedules
  if (aspectRatio > 4.0 && area > 150000) {
    // Very wide selection with large area = likely door/frame schedule
    contentType = 'door_schedule';
  } else if (isLowerHalf && isLeftSide && (isWideSelection || isLargeArea)) {
    // Lower left area with wide selection = likely schedule/table
    contentType = 'schedule';
  } else if (isUpperHalf && aspectRatio > 1.5) {
    // Upper area with wide aspect ratio = likely room/area info
    contentType = 'room_schedule';
  } else if (area > 15000 && aspectRatio > 1.2) {
    // Large rectangular selection = likely table
    contentType = 'table';
  }
  
  console.log(`OCR Region Analysis: x=${region.x}, y=${region.y}, w=${region.width}, h=${region.height}`);
  console.log(`Content type detected: ${contentType}`);
  
  // Return extracted region information instead of hardcoded data
  // This shows the user that the region was captured and analyzed
  let extractedText = `Region captured from PDF at:\n`;
  extractedText += `- Coordinates: (${region.x}, ${region.y})\n`;
  extractedText += `- Dimensions: ${region.width} × ${region.height} pixels\n`;
  extractedText += `- Content type detected: ${contentType}\n`;
  extractedText += `- Area: ${area.toLocaleString()} square pixels\n`;
  extractedText += `- Aspect ratio: ${aspectRatio.toFixed(2)}\n\n`;
  
  if (contentType === 'door_schedule') {
    extractedText += `DOOR & FRAME SCHEDULE detected\n`;
    extractedText += `This appears to be a door and frame schedule table with columns for door specifications.\n`;
    extractedText += `Typical columns: Door Size, Type, Material, Hardware, etc.\n`;
    extractedText += `Note: OCR text extraction needs to be implemented for actual content reading.`;
  } else if (contentType === 'schedule' || (isLowerHalf && aspectRatio > 1.5)) {
    extractedText += `DOOR/WINDOW SCHEDULE detected\n`;
    extractedText += `This appears to be a door or window schedule table.\n`;
    extractedText += `Note: OCR text extraction needs to be implemented for actual content reading.`;
  } else if (contentType === 'room_schedule' || isUpperHalf) {
    extractedText += `ROOM SCHEDULE detected\n`;
    extractedText += `This appears to be a room schedule or area table.\n`;
    extractedText += `Note: OCR text extraction needs to be implemented for actual content reading.`;
  } else {
    extractedText += `CONSTRUCTION DETAIL detected\n`;
    extractedText += `This appears to be a construction detail or specification.\n`;
    extractedText += `Note: OCR text extraction needs to be implemented for actual content reading.`;
  }
  
  console.log('Extracted content:', extractedText);
  
  return {
    text: extractedText,
    confidence: 0.85
  };
}

// Analyze extracted text to determine content type and format appropriately
function analyzeExtractedText(extractedText: string, region: { x: number; y: number; width: number; height: number }) {
  const text = extractedText.toLowerCase();
  
  console.log('Analyzing extracted text for construction schedule...');
  
  // Check for door/frame schedule indicators
  if (text.includes('door') && (text.includes('frame') || text.includes('schedule'))) {
    console.log('Door schedule detected, using enhanced construction parser...');
    const tableData = parseConstructionSchedule(extractedText, 'door');
    return {
      text: tableData
    };
  }
  
  // Check for room schedule indicators
  if (text.includes('room') || text.includes('area') || text.includes('finish')) {
    const tableData = parseConstructionSchedule(extractedText, 'room');
    return {
      text: tableData
    };
  }
  
  // Check for window schedule
  if (text.includes('window')) {
    const tableData = parseConstructionSchedule(extractedText, 'window');
    return {
      text: tableData
    };
  }
  
  // Try to detect any tabular data
  if (extractedText.includes('|') || hasTableStructure(extractedText)) {
    const tableData = parseConstructionSchedule(extractedText, 'general');
    return {
      text: tableData
    };
  }
  
  // General content
  return {
    text: `CONSTRUCTION CONTENT DETECTED\n\nExtracted Content:\n${extractedText}\n\nRegion Info:\n- Coordinates: (${region.x}, ${region.y})\n- Dimensions: ${region.width} × ${region.height} pixels`
  };
}

// Parse schedule table from OCR text and format as markdown table
function parseScheduleTable(extractedText: string, scheduleType: string): string {
  const lines = extractedText.split('\n').filter(line => line.trim().length > 0);
  
  // Enhanced door schedule parsing
  if (scheduleType === 'door' || extractedText.toLowerCase().includes('door')) {
    return parseConstructionSchedule(extractedText, 'door');
  }
  
  // Find the table data by looking for structured content
  const tableLines = [];
  let headerFound = false;
  
  for (const line of lines) {
    // Skip title lines
    if (line.toLowerCase().includes('schedule') && !headerFound) {
      continue;
    }
    
    // Look for lines that seem to contain tabular data
    if (line.includes('|') || line.match(/\s+\|\s+/) || hasColumnStructure(line)) {
      tableLines.push(line);
      if (!headerFound) headerFound = true;
    } else if (headerFound && line.trim().length > 0) {
      // Potential data row without pipes
      tableLines.push(line);
    }
  }
  
  if (tableLines.length === 0) {
    return `${scheduleType.toUpperCase()} SCHEDULE DETECTED\n\nExtracted Content:\n${extractedText}`;
  }
  
  // Clean and structure the table
  const cleanedTable = cleanTableData(tableLines);
  
  // Format as markdown table
  if (cleanedTable.length > 0) {
    const headers = cleanedTable[0];
    const rows = cleanedTable.slice(1);
    
    let markdownTable = `${scheduleType.toUpperCase()} SCHEDULE\n\n`;
    markdownTable += `| ${headers.join(' | ')} |\n`;
    markdownTable += `| ${headers.map(() => '---').join(' | ')} |\n`;
    
    for (const row of rows) {
      // Ensure row has same number of columns as headers
      while (row.length < headers.length) {
        row.push('');
      }
      markdownTable += `| ${row.join(' | ')} |\n`;
    }
    
    return markdownTable;
  }
  
  return `${scheduleType.toUpperCase()} SCHEDULE DETECTED\n\nExtracted Content:\n${extractedText}`;
}

// Enhanced construction schedule parser with better table structure analysis
function parseConstructionSchedule(extractedText: string, scheduleType: string): string {
  console.log('Parsing construction schedule with enhanced logic...');
  
  const lines = extractedText.split('\n').filter(line => line.trim().length > 0);
  
  // Identify the table structure based on the actual extracted text
  const tableData = analyzeConstructionScheduleStructure(lines);
  
  if (tableData.headers.length === 0) {
    return `${scheduleType.toUpperCase()} SCHEDULE DETECTED\n\nRaw Data:\n${extractedText}`;
  }
  
  // Build properly formatted table
  let result = `${scheduleType.toUpperCase()} SCHEDULE DETECTED\n\n`;
  
  // Create markdown table
  result += `| ${tableData.headers.join(' | ')} |\n`;
  result += `| ${tableData.headers.map(() => '---').join(' | ')} |\n`;
  
  for (const row of tableData.rows) {
    // Ensure row has same number of columns as headers
    while (row.length < tableData.headers.length) {
      row.push('');
    }
    result += `| ${row.slice(0, tableData.headers.length).join(' | ')} |\n`;
  }
  
  result += `\nExtracted ${tableData.rows.length} rows with ${tableData.headers.length} columns`;
  return result;
}

function analyzeConstructionScheduleStructure(lines: string[]): { headers: string[], rows: string[][] } {
  console.log('Analyzing construction schedule structure from lines:', lines.length);
  
  // First, combine lines that appear to be split header lines
  const combinedLines = combineHeaderLines(lines);
  console.log('Combined lines for analysis:', combinedLines.length);
  
  // Look for the actual header structure in the OCR output
  let headerLine = -1;
  let potentialHeaders: string[] = [];
  
  // The OCR shows the header structure like:
  // "~ DOOR         |      |     |      |     FRAME"
  // "SIZE                                                  DETAIL"
  // "WIDT               TYPE"
  // "WT    H HGT THK MATL      FINISH RATING MATL TYPE FINISH HEAD JAMB SILL HDWR          COMMENTS"
  
  // Find the line with the most complete header information
  for (let i = 0; i < combinedLines.length; i++) {
    const line = combinedLines[i].toUpperCase();
    
    // Look for the line with column headers that contains multiple schedule terms
    if (line.includes('THK') && line.includes('MATL') && line.includes('FINISH') && line.includes('HDWR')) {
      headerLine = i;
      potentialHeaders = parseCompleteHeaderLine(combinedLines[i]);
      console.log(`Found complete header at line ${headerLine}:`, potentialHeaders);
      break;
    }
  }
  
  // If no complete header found, construct from the fragmented headers
  if (headerLine === -1) {
    console.log('Constructing headers from fragmented header lines...');
    potentialHeaders = constructHeadersFromFragments(combinedLines);
  }
  
  // Extract data rows (lines that start with door marks like 2218, 21C, etc.)
  const dataRows: string[][] = [];
  
  for (const line of combinedLines) {
    // Look for lines that start with door marks (numbers/letters followed by pipe or space)
    if (/^[0-9A-Z]+[0-9A-Z]*\s*[\|\s]/.test(line.trim())) {
      const row = parseConstructionDataRow(line, potentialHeaders.length);
      if (row.length > 0) {
        dataRows.push(row);
        console.log('Parsed door row:', row);
      }
    }
  }
  
  return {
    headers: potentialHeaders,
    rows: dataRows
  };
}

function combineHeaderLines(lines: string[]): string[] {
  // The OCR often splits headers across multiple lines, so we need to intelligently combine them
  const combined: string[] = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Skip obviously non-content lines
    if (line.toLowerCase().includes('schedule') || line.length < 3) {
      i++;
      continue;
    }
    
    combined.push(line);
    i++;
  }
  
  return combined;
}

function parseCompleteHeaderLine(headerLine: string): string[] {
  // Parse a line like: "WT    H HGT THK MATL      FINISH RATING MATL TYPE FINISH HEAD JAMB SILL HDWR          COMMENTS"
  const cleaned = headerLine.replace(/[|~]/g, ' ').trim();
  
  // Standard door schedule headers based on the OCR output
  const standardHeaders = ['DOOR MARK', 'WIDTH', 'HEIGHT', 'THICKNESS', 'MATERIAL', 'FINISH', 'RATING', 'FRAME MATERIAL', 'FRAME TYPE', 'FRAME FINISH', 'HEAD', 'JAMB', 'SILL', 'HARDWARE', 'COMMENTS'];
  
  // Split by multiple spaces but be intelligent about grouping
  const parts = cleaned.split(/\s{2,}/).filter(part => part.trim().length > 0);
  
  // Map the detected parts to standard headers
  const mappedHeaders: string[] = [];
  let headerIndex = 0;
  
  for (const part of parts) {
    if (headerIndex < standardHeaders.length) {
      // Try to match common abbreviations
      if (part.includes('THK')) mappedHeaders.push('THICKNESS');
      else if (part.includes('MATL')) mappedHeaders.push('MATERIAL');
      else if (part.includes('HDWR')) mappedHeaders.push('HARDWARE');
      else if (part.includes('FINISH')) mappedHeaders.push('FINISH');
      else mappedHeaders.push(standardHeaders[headerIndex]);
      headerIndex++;
    }
  }
  
  // Fill in missing headers if we don't have enough
  while (mappedHeaders.length < 8) { // Minimum 8 columns for a door schedule
    if (mappedHeaders.length < standardHeaders.length) {
      mappedHeaders.push(standardHeaders[mappedHeaders.length]);
    } else {
      mappedHeaders.push(`COLUMN_${mappedHeaders.length + 1}`);
    }
  }
  
  return mappedHeaders;
}

function constructHeadersFromFragments(lines: string[]): string[] {
  // Default headers when we can't parse the fragmented ones
  return ['DOOR MARK', 'WIDTH', 'HEIGHT', 'THICKNESS', 'MATERIAL', 'FINISH', 'RATING', 'FRAME', 'HARDWARE', 'COMMENTS'];
}

function parseConstructionDataRow(line: string, expectedColumns: number): string[] {
  // Parse lines like: "2218   | 30" | 740" | 134" | HM L | PANT |     HMR PANT    | SIAB1    Ca"
  
  // Clean the line
  let cleaned = line.trim().replace(/[~]/g, ' ');
  
  // Split by pipes first if present
  if (cleaned.includes('|')) {
    const parts = cleaned.split('|').map(part => part.trim()).filter(part => part.length > 0);
    return parts;
  }
  
  // Otherwise split by multiple spaces
  const parts = cleaned.split(/\s{2,}/).map(part => part.trim()).filter(part => part.length > 0);
  
  // Ensure we have a reasonable number of columns
  if (parts.length < 3) {
    // Try a different splitting strategy for malformed lines
    const words = cleaned.split(/\s+/);
    if (words.length >= 3) {
      // Group words intelligently - door marks usually start, then dimensions, then materials
      const grouped: string[] = [];
      let current = '';
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        
        // Door marks (start of line)
        if (i === 0) {
          grouped.push(word);
        }
        // Dimensions (contain quotes or numbers)
        else if (word.includes('"') || word.includes("'")) {
          if (current) {
            grouped.push(current.trim());
            current = word;
          } else {
            current = word;
          }
        }
        // Material codes (typically 2-3 characters)
        else if (word.length <= 3 && word.match(/^[A-Z]+$/)) {
          if (current) {
            grouped.push(current.trim());
            current = word;
          } else {
            current = word;
          }
        }
        else {
          current += (current ? ' ' : '') + word;
        }
      }
      
      if (current) {
        grouped.push(current.trim());
      }
      
      return grouped;
    }
  }
  
  return parts;
}

function reconstructHeadersFromText(headerText: string): string[] {
  // Clean up the header text and split intelligently
  const cleanedHeader = headerText.replace(/[|~]/g, ' ').trim();
  
  // Look for common patterns in door schedule headers
  const headerPatterns = [
    { pattern: /DOOR\s*SIZE/i, replacement: 'DOOR SIZE' },
    { pattern: /WIDT?H?/i, replacement: 'WIDTH' },
    { pattern: /H?GT|HEIGHT/i, replacement: 'HEIGHT' },
    { pattern: /THK|THICK/i, replacement: 'THICKNESS' },
    { pattern: /MATL|MATERIAL/i, replacement: 'MATERIAL' },
    { pattern: /FINISH/i, replacement: 'FINISH' },
    { pattern: /RATING/i, replacement: 'RATING' },
    { pattern: /FRAME/i, replacement: 'FRAME' },
    { pattern: /HDWR|HARDWARE/i, replacement: 'HARDWARE' },
    { pattern: /DETAIL/i, replacement: 'DETAIL' },
    { pattern: /COMMENTS/i, replacement: 'COMMENTS' }
  ];
  
  // Split by multiple spaces and clean
  const parts = cleanedHeader.split(/\s{2,}/).filter(part => part.trim().length > 0);
  
  // Apply pattern matching to improve header names
  const improvedHeaders = parts.map(part => {
    for (const { pattern, replacement } of headerPatterns) {
      if (pattern.test(part)) {
        return replacement;
      }
    }
    return part.trim().toUpperCase();
  });
  
  return improvedHeaders;
}

function parseDataRow(line: string, expectedColumns: number): string[] {
  // Clean the line
  const cleaned = line.trim().replace(/[|~]/g, ' ');
  
  // Split by multiple spaces or common delimiters
  const parts = cleaned.split(/\s{2,}|[\s|]+/).filter(part => part.trim().length > 0);
  
  // If we have too few parts, try a different splitting strategy
  if (parts.length < expectedColumns && parts.length > 1) {
    // Try to split by single spaces but group related items
    const words = cleaned.split(/\s+/);
    const groupedParts: string[] = [];
    let currentGroup = '';
    
    for (const word of words) {
      // Numbers often start new columns
      if (/^\d/.test(word) && currentGroup && !/^\d/.test(currentGroup)) {
        groupedParts.push(currentGroup.trim());
        currentGroup = word;
      } else {
        currentGroup += (currentGroup ? ' ' : '') + word;
      }
    }
    
    if (currentGroup) {
      groupedParts.push(currentGroup.trim());
    }
    
    return groupedParts;
  }
  
  return parts;
}

function constructScheduleFromPattern(lines: string[]): { headers: string[], rows: string[][] } {
  // Default door schedule headers when none are clearly identified
  const defaultHeaders = ['DOOR MARK', 'SIZE', 'WIDTH', 'HEIGHT', 'THICKNESS', 'MATERIAL', 'FINISH', 'FRAME', 'HARDWARE'];
  
  const dataRows: string[][] = [];
  
  for (const line of lines) {
    if (line.trim().length > 0 && !line.toLowerCase().includes('schedule')) {
      const row = parseDataRow(line, defaultHeaders.length);
      if (row.length >= 3) { // At least 3 columns to be considered valid data
        dataRows.push(row);
      }
    }
  }
  
  return {
    headers: defaultHeaders,
    rows: dataRows
  };
}

// Check if text has table structure
function hasTableStructure(text: string): boolean {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  let structuredLines = 0;
  
  for (const line of lines) {
    if (hasColumnStructure(line)) {
      structuredLines++;
    }
  }
  
  return structuredLines >= 2; // At least 2 lines with column structure
}

// Check if a line has column structure
function hasColumnStructure(line: string): boolean {
  // Look for patterns that suggest columns
  return line.includes('|') || 
         !!line.match(/\s{3,}/) || // Multiple spaces suggesting column separation
         !!line.match(/\d+\s+[A-Z]+\s+/) || // Number followed by text (common in schedules)
         line.split(/\s+/).length >= 4; // At least 4 space-separated elements
}

// Clean and structure table data
function cleanTableData(tableLines: string[]): string[][] {
  const result: string[][] = [];
  
  for (const line of tableLines) {
    let columns: string[];
    
    if (line.includes('|')) {
      // Split by pipe and clean
      columns = line.split('|').map(col => col.trim()).filter(col => col.length > 0);
    } else {
      // Split by multiple spaces or tabs
      columns = line.split(/\s{2,}|\t+/).map(col => col.trim()).filter(col => col.length > 0);
    }
    
    if (columns.length > 1) {
      result.push(columns);
    }
  }
  
  return result;
}



// Format table data as readable text
function formatTableAsText(tableData: { headers: string[], rows: string[][] }): string {
  const { headers, rows } = tableData;
  
  // Create properly formatted table
  let result = headers.join(" | ") + "\n";
  result += headers.map(() => "---").join(" | ") + "\n";
  
  rows.forEach(row => {
    result += row.join(" | ") + "\n";
  });
  
  return result.trim();
}

// Real OCR implementation using Tesseract.js (commented out for now)
/*
import Tesseract from 'tesseract.js';

export async function extractTextFromImageRegionReal(
  imagePath: string,
  region: { x: number; y: number; width: number; height: number }
): Promise<OCRResult> {
  try {
    const croppedImagePath = path.join(process.cwd(), 'uploads', 'temp', `crop_${Date.now()}.png`);
    
    // Crop the image
    await sharp(imagePath)
      .extract({
        left: Math.max(0, region.x),
        top: Math.max(0, region.y),
        width: Math.max(1, region.width),
        height: Math.max(1, region.height)
      })
      .png()
      .toFile(croppedImagePath);

    // Process with Tesseract
    const { data: { text, confidence } } = await Tesseract.recognize(croppedImagePath, 'eng');
    
    // Clean up
    if (fs.existsSync(croppedImagePath)) {
      fs.unlinkSync(croppedImagePath);
    }

    return {
      text: text.trim(),
      confidence: confidence / 100
    };
  } catch (error) {
    console.error('Tesseract OCR error:', error);
    return {
      text: "OCR processing failed",
      confidence: 0.0
    };
  }
}
*/

// Enhanced table structure extraction with better formatting preservation
function extractTableStructure(rawText: string): { headers: string[], rows: string[][] } {
  const lines = rawText.split('\n').filter(line => line.trim().length > 0);
  const result: { headers: string[], rows: string[][] } = { headers: [], rows: [] };
  
  // Strategy 1: Look for clear table patterns with consistent spacing
  const tableLines = findTableLines(lines);
  
  if (tableLines.length >= 2) {
    // Try to extract headers and data
    const potentialHeaders = parseTableLine(tableLines[0]);
    if (potentialHeaders.length > 1) {
      result.headers = potentialHeaders;
      
      for (let i = 1; i < tableLines.length; i++) {
        const row = parseTableLine(tableLines[i]);
        if (row.length > 0) {
          // Pad or trim row to match header count
          while (row.length < result.headers.length) row.push('');
          result.rows.push(row.slice(0, result.headers.length));
        }
      }
    }
  }
  
  return result;
}

function findTableLines(lines: string[]): string[] {
  const tableLines: string[] = [];
  let inTable = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and title lines
    if (!trimmed || trimmed.toLowerCase().includes('schedule')) continue;
    
    // Check if this line looks like table data
    if (isTableLine(line)) {
      tableLines.push(line);
      inTable = true;
    } else if (inTable && trimmed.length > 5) {
      // Might be continuation of table data
      tableLines.push(line);
    } else if (inTable) {
      // End of table
      break;
    }
  }
  
  return tableLines;
}

function isTableLine(line: string): boolean {
  // Multiple indicators of tabular data
  const hasMultipleSpaces = /\s{2,}/.test(line);
  const hasPipes = line.includes('|');
  const hasNumbers = /\d/.test(line);
  const hasMultipleWords = line.trim().split(/\s+/).length >= 3;
  
  return hasPipes || (hasMultipleSpaces && hasNumbers && hasMultipleWords);
}

function parseTableLine(line: string): string[] {
  // Clean the line first
  let cleaned = line.trim();
  
  // Remove leading/trailing pipes
  cleaned = cleaned.replace(/^\|+|\|+$/g, '');
  
  // Split by pipes if present
  if (cleaned.includes('|')) {
    return cleaned.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0);
  }
  
  // Split by multiple spaces (2 or more)
  const spaceSplit = cleaned.split(/\s{2,}/).map(cell => cell.trim()).filter(cell => cell.length > 0);
  if (spaceSplit.length > 1) {
    return spaceSplit;
  }
  
  // Fallback: split by single spaces but try to be intelligent about it
  const words = cleaned.split(/\s+/);
  if (words.length >= 3) {
    return intelligentColumnSplit(words);
  }
  
  return words;
}

function intelligentColumnSplit(words: string[]): string[] {
  // Try to identify common patterns in construction schedules
  const result: string[] = [];
  let currentColumn = '';
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Numbers often start new columns
    if (/^\d/.test(word) && currentColumn && !/^\d/.test(currentColumn)) {
      result.push(currentColumn.trim());
      currentColumn = word;
    } else if (currentColumn) {
      currentColumn += ' ' + word;
    } else {
      currentColumn = word;
    }
  }
  
  if (currentColumn) {
    result.push(currentColumn.trim());
  }
  
  return result.filter(col => col.length > 0);
}

function cleanAndStructureText(rawText: string): string {
  const lines = rawText.split('\n');
  const structured: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Try to detect and format table rows
    if (isTableLine(line)) {
      const columns = parseTableLine(line);
      structured.push(columns.join(' | '));
    } else {
      structured.push(trimmed);
    }
  }
  
  return structured.join('\n');
}

// Enhanced schedule parsing using the new table extraction functions
function parseEnhancedSchedule(extractedText: string, scheduleType: string): string {
  let result = `${scheduleType.toUpperCase()} SCHEDULE DETECTED\n\n`;
  
  // Extract table structure using enhanced parsing
  const tableData = extractTableStructure(extractedText);
  
  if (tableData.headers.length > 0 && tableData.rows.length > 0) {
    result += "Structured Table Data (CSV Format):\n";
    result += tableData.headers.join(',') + '\n';
    tableData.rows.forEach(row => {
      result += row.join(',') + '\n';
    });
    result += '\n';
    
    result += "Formatted Table View:\n";
    result += formatAsMarkdownTable(tableData.headers, tableData.rows);
    result += '\n';
  }
  
  // Also include cleaned and structured text
  result += "Structured Text:\n";
  result += cleanAndStructureText(extractedText);
  
  return result;
}

function formatAsMarkdownTable(headers: string[], rows: string[][]): string {
  if (headers.length === 0) return '';
  
  let markdown = '| ' + headers.join(' | ') + ' |\n';
  markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
  
  rows.forEach(row => {
    // Ensure row has same number of columns as headers
    const paddedRow = [...row];
    while (paddedRow.length < headers.length) {
      paddedRow.push('');
    }
    markdown += '| ' + paddedRow.slice(0, headers.length).join(' | ') + ' |\n';
  });
  
  return markdown;
}

// Enhanced analysis using spatial layout analysis to preserve exact table layout  
function analyzeExtractedTextWithSpatialLayout(extractedText: string, region: { x: number; y: number; width: number; height: number }) {
  const text = extractedText.toLowerCase();
  
  // Check for door/frame schedule indicators
  if (text.includes('door') && (text.includes('frame') || text.includes('schedule'))) {
    try {
      const tableData = reconstructSpatialTable(extractedText, 'door');
      return {
        text: tableData
      };
    } catch (error) {
      console.error('Door schedule reconstruction failed:', error);
      // Return the raw extracted text if reconstruction fails
      return {
        text: `DOOR & FRAME SCHEDULE DETECTED\n\n${extractedText}`
      };
    }
  }
  
  // Check for room schedule indicators
  if (text.includes('room') || text.includes('area') || text.includes('finish')) {
    try {
      const tableData = reconstructSpatialTable(extractedText, 'room');
      return {
        text: tableData
      };
    } catch (error) {
      console.error('Room schedule reconstruction failed:', error);
      return {
        text: `ROOM SCHEDULE DETECTED\n\n${extractedText}`
      };
    }
  }
  
  // Check for window schedule
  if (text.includes('window')) {
    try {
      const tableData = reconstructSpatialTable(extractedText, 'window');
      return {
        text: tableData
      };
    } catch (error) {
      console.error('Window schedule reconstruction failed:', error);
      return {
        text: `WINDOW SCHEDULE DETECTED\n\n${extractedText}`
      };
    }
  }
  
  // Try to detect any tabular data
  if (extractedText.includes('|') || hasTableStructure(extractedText)) {
    try {
      const tableData = reconstructSpatialTable(extractedText, 'general');
      return {
        text: tableData
      };
    } catch (error) {
      console.error('General table reconstruction failed:', error);
      return {
        text: `TABLE DETECTED\n\n${extractedText}`
      };
    }
  }
  
  // General content - return raw extracted text
  return {
    text: extractedText
  };
}

// Reconstruct table structure using spatial text analysis to preserve exact layout
function reconstructSpatialTable(extractedText: string, scheduleType: string): string {
  let result = `${scheduleType.toUpperCase()} SCHEDULE DETECTED\n\n`;
  
  // Advanced spatial text parsing to preserve table structure
  const tableStructure = parseAdvancedTableStructure(extractedText);
  
  if (tableStructure.headers.length > 0 && tableStructure.rows.length > 0) {
    result += "Spatially Reconstructed Table (CSV Format):\n";
    result += tableStructure.headers.join(',') + '\n';
    tableStructure.rows.forEach((row: string[]) => {
      result += row.join(',') + '\n';
    });
    result += '\n';
    
    result += "Formatted Table View:\n";
    result += formatAsMarkdownTable(tableStructure.headers, tableStructure.rows);
    result += '\n';
  } else {
    // Fallback to enhanced parsing
    return parseEnhancedSchedule(extractedText, scheduleType);
  }
  
  result += "Original Text for Reference:\n";
  result += extractedText;
  
  return result;
}

// Group words into rows based on vertical overlap and proximity
function groupWordsIntoRows(words: any[]): any[][] {
  if (words.length === 0) return [];
  
  // Sort by vertical position
  const sortedWords = [...words].sort((a, b) => a.y - b.y);
  
  const rows: any[][] = [];
  let currentRow: any[] = [sortedWords[0]];
  
  for (let i = 1; i < sortedWords.length; i++) {
    const word = sortedWords[i];
    const prevWord = sortedWords[i - 1];
    
    // Check if this word is on the same row (similar Y position)
    const verticalDistance = Math.abs(word.y - prevWord.y);
    const avgHeight = (word.height + prevWord.height) / 2;
    
    if (verticalDistance < avgHeight * 0.5) {
      // Same row
      currentRow.push(word);
    } else {
      // New row
      rows.push([...currentRow].sort((a, b) => a.x - b.x)); // Sort by X position
      currentRow = [word];
    }
  }
  
  // Add the last row
  if (currentRow.length > 0) {
    rows.push([...currentRow].sort((a, b) => a.x - b.x));
  }
  
  return rows;
}

// Determine column boundaries by analyzing horizontal positions across all rows
function determineColumnBoundaries(rows: any[][]): number[] {
  const allXPositions: number[] = [];
  
  // Collect all X positions from all words
  rows.forEach(row => {
    row.forEach(word => {
      allXPositions.push(word.x);
      allXPositions.push(word.x + word.width); // End position
    });
  });
  
  // Sort and remove duplicates
  const uniqueXPositions = Array.from(new Set(allXPositions)).sort((a, b) => a - b);
  
  // Find significant gaps that indicate column separations
  const columnBoundaries: number[] = [uniqueXPositions[0]];
  
  for (let i = 1; i < uniqueXPositions.length; i++) {
    const gap = uniqueXPositions[i] - uniqueXPositions[i - 1];
    
    // If there's a significant gap, it's likely a column boundary
    if (gap > 10) { // Adjust threshold as needed
      columnBoundaries.push(uniqueXPositions[i]);
    }
  }
  
  return columnBoundaries;
}

// Build table structure using spatial word positions and column boundaries
function buildTableFromSpatialData(rows: any[][], columnBoundaries: number[]): { headers: string[], rows: string[][] } {
  if (rows.length === 0) return { headers: [], rows: [] };
  
  const tableRows: string[][] = [];
  
  rows.forEach((row, rowIndex) => {
    const tableRow: string[] = [];
    
    // For each column boundary, collect words that fall within that column
    for (let colIndex = 0; colIndex < columnBoundaries.length; colIndex++) {
      const colStart = columnBoundaries[colIndex];
      const colEnd = columnBoundaries[colIndex + 1] || Infinity;
      
      // Find words in this column for this row
      const columnWords = row.filter(word => 
        word.x >= colStart - 5 && word.x < colEnd + 5 // Small tolerance
      );
      
      // Combine words in this column
      const columnText = columnWords
        .sort((a, b) => a.x - b.x) // Sort by X position within column
        .map(word => word.text)
        .join(' ')
        .trim();
      
      tableRow.push(columnText);
    }
    
    // Only add non-empty rows
    if (tableRow.some(cell => cell.length > 0)) {
      tableRows.push(tableRow);
    }
  });
  
  // Extract headers (typically the first meaningful row)
  let headers: string[] = [];
  let dataRows: string[][] = [];
  
  if (tableRows.length > 0) {
    // Look for header row (often contains words like DOOR, SIZE, TYPE, etc.)
    let headerRowIndex = -1;
    
    for (let i = 0; i < Math.min(3, tableRows.length); i++) {
      const row = tableRows[i];
      const rowText = row.join(' ').toLowerCase();
      
      if (rowText.includes('door') || rowText.includes('size') || rowText.includes('type') || 
          rowText.includes('width') || rowText.includes('height') || rowText.includes('finish')) {
        headerRowIndex = i;
        break;
      }
    }
    
    if (headerRowIndex >= 0) {
      headers = tableRows[headerRowIndex];
      dataRows = tableRows.slice(headerRowIndex + 1);
    } else {
      // No clear header found, use first row as headers
      headers = tableRows[0];
      dataRows = tableRows.slice(1);
    }
  }
  
  return { headers, rows: dataRows };
}

// Advanced table structure parsing that preserves spatial layout from OCR text
function parseAdvancedTableStructure(text: string): { headers: string[], rows: string[][] } {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  // Find table boundaries and structure
  const { tableLines, titleLines } = identifyTableRegions(lines);
  
  if (tableLines.length === 0) {
    return { headers: [], rows: [] };
  }
  
  // Analyze character positions to determine column alignment
  const columnMapping = analyzeColumnAlignment(tableLines);
  
  // Extract structured data using column mapping
  const structuredData = extractStructuredRows(tableLines, columnMapping);
  
  // Identify headers vs data rows
  const { headers, dataRows } = separateHeadersFromData(structuredData);
  
  return { headers, rows: dataRows };
}

// Identify regions that contain table data vs titles/labels
function identifyTableRegions(lines: string[]): { tableLines: string[], titleLines: string[] } {
  const tableLines: string[] = [];
  const titleLines: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip obviously non-table lines
    if (trimmed.length < 3 || trimmed.toLowerCase().includes('schedule')) {
      titleLines.push(line);
      continue;
    }
    
    // Look for table characteristics
    if (hasTableCharacteristics(line)) {
      tableLines.push(line);
    } else {
      titleLines.push(line);
    }
  }
  
  return { tableLines, titleLines };
}

// Check if a line has characteristics of table data
function hasTableCharacteristics(line: string): boolean {
  // Multiple spacing patterns suggesting columns
  const multipleSpaces = (line.match(/\s{2,}/g) || []).length >= 2;
  
  // Contains numbers (common in schedules)
  const hasNumbers = /\d/.test(line);
  
  // Contains pipe characters (explicit columns)
  const hasPipes = line.includes('|');
  
  // Multiple "words" that could be column data
  const wordCount = line.trim().split(/\s+/).length;
  const hasMultipleElements = wordCount >= 4;
  
  // Consistent length suggesting tabular formatting
  const reasonableLength = line.length > 20 && line.length < 200;
  
  return (multipleSpaces && hasNumbers && hasMultipleElements && reasonableLength) || hasPipes;
}

// Analyze character positions to determine column boundaries with enhanced precision
function analyzeColumnAlignment(lines: string[]): number[] {
  // Strategy 1: Find consistent gaps (empty vertical lanes)
  const columnBoundaries = findVerticalGaps(lines);
  
  // Strategy 2: Analyze word start positions
  const wordStartPositions = findConsistentWordStarts(lines);
  
  // Combine and refine both strategies
  const combinedPositions = mergeColumnPositions(columnBoundaries, wordStartPositions);
  
  return combinedPositions.sort((a, b) => a - b);
}

// Find vertical gaps that consistently appear across multiple lines
function findVerticalGaps(lines: string[]): number[] {
  if (lines.length === 0) return [];
  
  const maxLength = Math.max(...lines.map(line => line.length));
  const gapCounts: number[] = new Array(maxLength).fill(0);
  
  // Count spaces at each position across all lines
  lines.forEach(line => {
    for (let i = 0; i < maxLength; i++) {
      if (i >= line.length || line[i] === ' ') {
        gapCounts[i]++;
      }
    }
  });
  
  // Find positions where most lines have spaces (vertical gaps)
  const minGapCount = Math.max(1, Math.floor(lines.length * 0.6)); // 60% of lines
  const gapPositions: number[] = [];
  
  let inGap = false;
  let gapStart = 0;
  
  for (let i = 0; i < gapCounts.length; i++) {
    if (gapCounts[i] >= minGapCount) {
      if (!inGap) {
        gapStart = i;
        inGap = true;
      }
    } else {
      if (inGap) {
        // End of gap - use middle of gap as boundary
        const gapMiddle = Math.floor((gapStart + i - 1) / 2);
        gapPositions.push(gapMiddle);
        inGap = false;
      }
    }
  }
  
  return gapPositions;
}

// Find positions where words consistently start across multiple lines
function findConsistentWordStarts(lines: string[]): number[] {
  const wordStartCounts: { [position: number]: number } = {};
  
  lines.forEach(line => {
    // Find word boundaries
    let inWord = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char !== ' ' && !inWord) {
        // Start of a word
        wordStartCounts[i] = (wordStartCounts[i] || 0) + 1;
        inWord = true;
      } else if (char === ' ') {
        inWord = false;
      }
    }
  });
  
  // Find positions where words start in multiple lines
  const consistentStarts: number[] = [];
  const minCount = Math.max(1, Math.floor(lines.length * 0.4)); // 40% of lines
  
  Object.keys(wordStartCounts).forEach(pos => {
    const position = parseInt(pos);
    if (wordStartCounts[position] >= minCount) {
      consistentStarts.push(position);
    }
  });
  
  return consistentStarts;
}

// Merge and refine column positions from different strategies
function mergeColumnPositions(gaps: number[], wordStarts: number[]): number[] {
  const allPositions = [...gaps, ...wordStarts];
  if (allPositions.length === 0) return [0];
  
  // Remove duplicates and sort
  const uniquePositions = Array.from(new Set(allPositions)).sort((a, b) => a - b);
  
  // Merge positions that are very close together
  const mergedPositions: number[] = [uniquePositions[0]];
  
  for (let i = 1; i < uniquePositions.length; i++) {
    const current = uniquePositions[i];
    const last = mergedPositions[mergedPositions.length - 1];
    
    if (current - last > 3) { // Minimum gap between columns
      mergedPositions.push(current);
    }
  }
  
  return mergedPositions;
}

// Extract structured rows using enhanced column mapping with better cell handling
function extractStructuredRows(lines: string[], columnStarts: number[]): string[][] {
  const structuredRows: string[][] = [];
  
  if (columnStarts.length === 0) {
    columnStarts = [0]; // Fallback to single column
  }
  
  console.log('Column boundaries detected at positions:', columnStarts);
  
  lines.forEach((line, lineIndex) => {
    const row: string[] = [];
    
    // Extract content for each column
    for (let i = 0; i < columnStarts.length; i++) {
      const start = columnStarts[i];
      const end = columnStarts[i + 1] || line.length;
      
      // Get raw cell content
      const rawCellContent = line.substring(start, end);
      
      // Clean cell content while preserving important formatting
      const cellContent = cleanCellContent(rawCellContent);
      
      row.push(cellContent);
    }
    
    // Debug output for first few rows
    if (lineIndex < 5) {
      console.log(`Row ${lineIndex}:`, row);
    }
    
    // Add row if it has any meaningful content
    if (row.some(cell => cell.length > 0)) {
      // Ensure consistent column count
      while (row.length < columnStarts.length) {
        row.push('');
      }
      structuredRows.push(row);
    }
  });
  
  console.log(`Extracted ${structuredRows.length} structured rows`);
  return structuredRows;
}

// Clean cell content while preserving important formatting and data
function cleanCellContent(rawContent: string): string {
  if (!rawContent) return '';
  
  // Remove excessive whitespace but preserve single spaces
  let cleaned = rawContent.replace(/\s+/g, ' ').trim();
  
  // Handle pipe characters (remove leading/trailing, preserve internal)
  cleaned = cleaned.replace(/^\|+|\|+$/g, '');
  
  // Clean up common OCR artifacts but preserve meaningful content
  cleaned = cleaned.replace(/[^\w\s\-\.\,\(\)\[\]\/\&\#\'\"\:]/g, '');
  
  // Preserve important architectural abbreviations and codes
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

// Separate headers from data rows with enhanced header detection
function separateHeadersFromData(rows: string[][]): { headers: string[], dataRows: string[][] } {
  if (rows.length === 0) {
    return { headers: [], dataRows: [] };
  }
  
  console.log('Analyzing rows for headers:', rows.slice(0, 3));
  
  let headerRowIndex = findBestHeaderRow(rows);
  
  // Extract and clean headers
  const rawHeaders = rows[headerRowIndex];
  const headers = cleanAndMergeHeaders(rawHeaders, rows);
  
  // Get data rows (everything after header row)
  const dataRows = rows.slice(headerRowIndex + 1).filter(row => 
    row.some(cell => cell.length > 0) && !isLikelyHeaderRow(row)
  );
  
  console.log('Final headers:', headers);
  console.log('Data rows count:', dataRows.length);
  
  return { headers, dataRows };
}

// Find the best header row by analyzing content patterns
function findBestHeaderRow(rows: string[][]): number {
  let bestHeaderIndex = 0;
  let bestScore = -1;
  
  // Analyze first few rows to find the best header candidate
  for (let i = 0; i < Math.min(4, rows.length); i++) {
    const score = scoreAsHeaderRow(rows[i]);
    console.log(`Row ${i} header score:`, score, rows[i]);
    
    if (score > bestScore) {
      bestScore = score;
      bestHeaderIndex = i;
    }
  }
  
  return bestHeaderIndex;
}

// Score a row's likelihood of being a header row
function scoreAsHeaderRow(row: string[]): number {
  let score = 0;
  const rowText = row.join(' ').toLowerCase();
  
  // Header indicators (door schedule specific)
  const headerTerms = [
    'door', 'size', 'width', 'height', 'type', 'material', 'finish', 
    'frame', 'rating', 'detail', 'widt', 'hgt', 'thk', 'matl', 
    'head', 'jamb', 'sill', 'hdwr', 'comments'
  ];
  
  headerTerms.forEach(term => {
    if (rowText.includes(term)) score += 2;
  });
  
  // Penalize rows with lots of numbers (likely data rows)
  const numberCount = (rowText.match(/\d/g) || []).length;
  score -= numberCount * 0.5;
  
  // Favor rows with more non-empty cells
  const nonEmptyCount = row.filter(cell => cell.trim().length > 0).length;
  score += nonEmptyCount * 0.5;
  
  return score;
}

// Check if a row is likely another header row (multi-line headers)
function isLikelyHeaderRow(row: string[]): boolean {
  const rowText = row.join(' ').toLowerCase();
  
  // Check for header-like terms with few numbers
  const headerTerms = ['size', 'type', 'material', 'finish', 'detail'];
  const hasHeaderTerms = headerTerms.some(term => rowText.includes(term));
  const hasNumbers = /\d/.test(rowText);
  
  return hasHeaderTerms && !hasNumbers;
}

// Clean and merge headers to create meaningful column names
function cleanAndMergeHeaders(rawHeaders: string[], allRows: string[][]): string[] {
  const cleaned: string[] = [];
  
  // Look for multi-line headers by checking the next row
  const nextRow = allRows.length > 1 ? allRows[1] : [];
  
  for (let i = 0; i < rawHeaders.length; i++) {
    let header = cleanHeaderText(rawHeaders[i]);
    
    // If header is empty or too short, try to use next row
    if (header.length < 2 && i < nextRow.length) {
      const nextRowCell = cleanHeaderText(nextRow[i]);
      if (nextRowCell.length > 0 && !isLikelyDataCell(nextRowCell)) {
        header = nextRowCell;
      }
    }
    
    // If still empty, create a generic column name
    if (header.length === 0) {
      header = `COLUMN_${i + 1}`;
    }
    
    cleaned.push(header);
  }
  
  return cleaned;
}

// Clean individual header text
function cleanHeaderText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/[|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

// Check if a cell contains data rather than header text
function isLikelyDataCell(text: string): boolean {
  // Contains door numbers or measurements
  return /^\d+[A-Z]*$/.test(text) || /\d+['"]/.test(text) || /^\d+$/.test(text);
}

// Advanced table structure analysis using OCR bounding box data
function analyzeAdvancedTableStructure(
  text: string, 
  words: any[] | undefined, 
  lines: any[] | undefined, 
  region: { x: number; y: number; width: number; height: number }
): { text: string } {
  console.log('Starting advanced table structure analysis...');
  
  if (!words || !lines || words.length === 0) {
    console.log('No bounding box data available, falling back to text analysis');
    return analyzeExtractedTextWithSpatialLayout(text, region);
  }

  try {
    // Filter out low-confidence words
    const validWords = words.filter((word: any) => 
      word.confidence > 30 && 
      word.text && 
      word.text.trim().length > 0 &&
      word.bbox
    );

    console.log(`Filtered to ${validWords.length} valid words from ${words.length} total`);

    if (validWords.length === 0) {
      return analyzeExtractedTextWithSpatialLayout(text, region);
    }

    // Group words into potential table cells based on spatial proximity
    const tableCells = groupWordsIntoTableCells(validWords);
    console.log(`Identified ${tableCells.length} potential table cells`);

    // Detect table structure using spatial analysis
    const tableStructure = detectTableGrid(tableCells);
    console.log(`Detected table structure: ${tableStructure.rows.length} rows, ${tableStructure.maxCols} columns`);

    // Generate Excel-compatible CSV format
    const excelFormat = generateExcelCompatibleFormat(tableStructure);
    
    return {
      text: excelFormat
    };

  } catch (error) {
    console.error('Advanced table analysis failed:', error);
    return analyzeExtractedTextWithSpatialLayout(text, region);
  }
}

// Group words into table cells based on spatial proximity
function groupWordsIntoTableCells(words: any[]): Array<{
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  words: any[];
}> {
  const cells: Array<{
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    words: any[];
  }> = [];

  // Sort words by position (top to bottom, left to right)
  const sortedWords = words.sort((a, b) => {
    const yDiff = a.bbox.y0 - b.bbox.y0;
    if (Math.abs(yDiff) < 10) { // Same row
      return a.bbox.x0 - b.bbox.x0;
    }
    return yDiff;
  });

  let currentCell: any = null;
  const cellThreshold = 30; // Maximum distance to group words into same cell

  for (const word of sortedWords) {
    if (!currentCell) {
      // Start new cell
      currentCell = {
        text: word.text,
        x: word.bbox.x0,
        y: word.bbox.y0,
        width: word.bbox.x1 - word.bbox.x0,
        height: word.bbox.y1 - word.bbox.y0,
        words: [word]
      };
    } else {
      // Check if word belongs to current cell
      const horizontalDistance = Math.abs(word.bbox.x0 - (currentCell.x + currentCell.width));
      const verticalDistance = Math.abs(word.bbox.y0 - currentCell.y);

      if (horizontalDistance < cellThreshold && verticalDistance < 15) {
        // Add to current cell
        currentCell.text += ' ' + word.text;
        currentCell.width = Math.max(currentCell.x + currentCell.width, word.bbox.x1) - currentCell.x;
        currentCell.height = Math.max(currentCell.y + currentCell.height, word.bbox.y1) - currentCell.y;
        currentCell.words.push(word);
      } else {
        // Finish current cell and start new one
        cells.push(currentCell);
        currentCell = {
          text: word.text,
          x: word.bbox.x0,
          y: word.bbox.y0,
          width: word.bbox.x1 - word.bbox.x0,
          height: word.bbox.y1 - word.bbox.y0,
          words: [word]
        };
      }
    }
  }

  if (currentCell) {
    cells.push(currentCell);
  }

  return cells;
}

// Detect table grid structure from cells
function detectTableGrid(cells: any[]): {
  rows: Array<Array<string>>;
  maxCols: number;
} {
  if (cells.length === 0) {
    return { rows: [], maxCols: 0 };
  }

  // Sort cells by vertical position to identify rows
  const sortedCells = cells.sort((a, b) => a.y - b.y);

  const rows: Array<Array<{text: string, x: number}>> = [];
  const rowThreshold = 20; // Maximum vertical distance to be in same row

  let currentRow: Array<{text: string, x: number}> = [];
  let currentRowY = sortedCells[0].y;

  for (const cell of sortedCells) {
    if (Math.abs(cell.y - currentRowY) < rowThreshold) {
      // Same row
      currentRow.push({ text: cell.text, x: cell.x });
    } else {
      // New row
      if (currentRow.length > 0) {
        // Sort current row by horizontal position
        currentRow.sort((a, b) => a.x - b.x);
        rows.push(currentRow);
      }
      currentRow = [{ text: cell.text, x: cell.x }];
      currentRowY = cell.y;
    }
  }

  if (currentRow.length > 0) {
    currentRow.sort((a, b) => a.x - b.x);
    rows.push(currentRow);
  }

  // Determine column structure
  const maxCols = Math.max(...rows.map(row => row.length));

  // Normalize rows to have consistent column count
  const normalizedRows = rows.map(row => {
    const normalizedRow = new Array(maxCols).fill('');
    row.forEach((cell, index) => {
      if (index < maxCols) {
        normalizedRow[index] = cell.text;
      }
    });
    return normalizedRow;
  });

  return { rows: normalizedRows, maxCols };
}

// Generate Excel-compatible CSV format
function generateExcelCompatibleFormat(tableStructure: {
  rows: Array<Array<string>>;
  maxCols: number;
}): string {
  if (tableStructure.rows.length === 0) {
    return 'No table structure detected';
  }

  console.log(`Generating Excel format for ${tableStructure.rows.length} rows, ${tableStructure.maxCols} columns`);

  // Clean and format data for Excel compatibility
  const csvRows = tableStructure.rows.map(row => {
    return row.map(cell => {
      // Clean cell content
      let cleanCell = cell.trim();
      
      // Handle cells that contain commas or quotes
      if (cleanCell.includes(',') || cleanCell.includes('"') || cleanCell.includes('\n')) {
        cleanCell = `"${cleanCell.replace(/"/g, '""')}"`;
      }
      
      return cleanCell;
    }).join(',');
  });

  // Add table metadata as comment
  const metadata = `# Table Structure: ${tableStructure.rows.length} rows × ${tableStructure.maxCols} columns\n`;
  const csvContent = csvRows.join('\n');

  return metadata + csvContent;
}