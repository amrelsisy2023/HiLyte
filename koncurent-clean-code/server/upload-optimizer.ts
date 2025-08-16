import fs from 'fs';
import path from 'path';

/**
 * Clean up old upload files to prevent storage bloat
 */
export function cleanupOldFiles() {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const pagesDir = path.join(uploadsDir, 'pages');
  
  try {
    if (fs.existsSync(pagesDir)) {
      const files = fs.readdirSync(pagesDir);
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000); // 1 hour ago
      
      let cleanedCount = 0;
      files.forEach(file => {
        const filePath = path.join(pagesDir, file);
        const stats = fs.statSync(filePath);
        
        // Delete files older than 1 hour
        if (stats.mtime.getTime() < oneHourAgo) {
          fs.unlinkSync(filePath);
          cleanedCount++;
        }
      });
      
      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} old page files`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old files:', error);
  }
}

/**
 * Check if we need to limit concurrent AI requests
 */
export function shouldDelayAIRequest(): boolean {
  // Simple check for too many concurrent requests
  const uploadsDir = path.join(process.cwd(), 'uploads', 'pages');
  
  try {
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      return files.length > 50; // Delay if too many files are being processed
    }
  } catch (error) {
    console.error('Error checking AI request delay:', error);
  }
  
  return false;
}