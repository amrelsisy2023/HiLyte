import fs from 'fs';
import path from 'path';

// Simple implementation for text-based PDF extraction

export interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName?: string;
  fontSize?: number;
}

export interface TableCell {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  row: number;
  col: number;
}

export interface ExtractedTable {
  headers: string[];
  rows: string[][];
  position: { x: number; y: number; width: number; height: number };
  confidence: number;
}

export interface PDFTextExtractionResult {
  text: string;
  textItems: TextItem[];
  tables: ExtractedTable[];
  confidence: number;
  extractionMethod: 'text-based' | 'ocr-fallback';
}

export async function extractTextFromPDFRegion(
  pdfPath: string,
  page: number,
  region: { x: number; y: number; width: number; height: number }
): Promise<PDFTextExtractionResult> {
  try {
    console.log('PDF text extraction currently using OCR fallback...');
    
    // For now, return empty to trigger OCR fallback
    // This will be enhanced once we resolve the dependency issues
    return {
      text: '',
      textItems: [],
      tables: [],
      confidence: 0.0,
      extractionMethod: 'ocr-fallback'
    };
    
  } catch (error) {
    console.error('PDF text extraction failed:', error);
    
    return {
      text: '',
      textItems: [],
      tables: [],
      confidence: 0.0,
      extractionMethod: 'ocr-fallback'
    };
  }
}

async function analyzeTableStructure(textItems: TextItem[], region: { x: number; y: number; width: number; height: number }): Promise<ExtractedTable[]> {
  if (textItems.length < 3) {
    return [];
  }
  
  // Sort text items by position (top to bottom, left to right)
  const sortedItems = textItems.sort((a, b) => {
    const yDiff = a.y - b.y;
    if (Math.abs(yDiff) < 5) { // Same row
      return a.x - b.x;
    }
    return yDiff;
  });
  
  // Group items into rows based on Y position
  const rows: TextItem[][] = [];
  let currentRow: TextItem[] = [];
  let lastY = -1;
  
  for (const item of sortedItems) {
    if (lastY === -1 || Math.abs(item.y - lastY) < 5) {
      currentRow.push(item);
    } else {
      if (currentRow.length > 0) {
        rows.push([...currentRow]);
      }
      currentRow = [item];
    }
    lastY = item.y;
  }
  
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }
  
  console.log(`Detected ${rows.length} potential table rows`);
  
  // Check if this looks like a table
  if (rows.length < 2) {
    return [];
  }
  
  // Analyze column structure
  const columns = detectColumnBoundaries(rows);
  
  if (columns.length < 2) {
    return [];
  }
  
  // Build table structure
  const tableData = buildTableFromRows(rows, columns);
  
  if (tableData.rows.length === 0) {
    return [];
  }
  
  return [{
    headers: tableData.headers,
    rows: tableData.rows,
    position: region,
    confidence: calculateTableConfidence(tableData, rows.length)
  }];
}

function detectColumnBoundaries(rows: TextItem[][]): number[] {
  const allXPositions: number[] = [];
  
  // Collect all X positions
  for (const row of rows) {
    for (const item of row) {
      allXPositions.push(item.x);
    }
  }
  
  // Sort and find consistent column boundaries
  allXPositions.sort((a, b) => a - b);
  
  const columns: number[] = [0]; // Always start at 0
  let lastPos = 0;
  
  for (const pos of allXPositions) {
    if (pos - lastPos > 20) { // Minimum column width of 20 pixels
      columns.push(pos);
      lastPos = pos;
    }
  }
  
  return columns;
}

function buildTableFromRows(rows: TextItem[][], columns: number[]): { headers: string[], rows: string[][] } {
  const result: string[][] = [];
  
  for (const row of rows) {
    const rowData: string[] = new Array(columns.length).fill('');
    
    for (const item of row) {
      // Find which column this item belongs to
      let colIndex = 0;
      for (let i = columns.length - 1; i >= 0; i--) {
        if (item.x >= columns[i] - 10) { // 10px tolerance
          colIndex = i;
          break;
        }
      }
      
      // Combine text for same column
      if (rowData[colIndex]) {
        rowData[colIndex] += ' ' + item.text;
      } else {
        rowData[colIndex] = item.text;
      }
    }
    
    result.push(rowData.map(cell => cell.trim()));
  }
  
  // Extract headers (usually first row) and data rows
  const headers = result.length > 0 ? result[0] : [];
  const dataRows = result.slice(1);
  
  return { headers, rows: dataRows };
}

function calculateTableConfidence(tableData: { headers: string[], rows: string[][] }, totalRows: number): number {
  let confidence = 0.5; // Base confidence
  
  // Boost confidence based on:
  // 1. Number of columns
  if (tableData.headers.length >= 3) confidence += 0.15;
  if (tableData.headers.length >= 5) confidence += 0.1;
  
  // 2. Number of data rows
  if (tableData.rows.length >= 3) confidence += 0.15;
  if (tableData.rows.length >= 5) confidence += 0.1;
  
  // 3. Consistent column count across rows
  const expectedCols = tableData.headers.length;
  const consistentRows = tableData.rows.filter(row => row.length === expectedCols).length;
  confidence += (consistentRows / tableData.rows.length) * 0.2;
  
  return Math.min(confidence, 1.0);
}

export async function isPDFTextBased(pdfPath: string, page: number = 1): Promise<boolean> {
  try {
    // For now, assume all PDFs need OCR until we implement proper text extraction
    console.log('PDF text check: using OCR fallback for all PDFs currently');
    return false;
    
  } catch (error) {
    console.error('Error checking PDF type:', error);
    return false;
  }
}