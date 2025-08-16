# Koncurent Hi-LYTE

A sophisticated web application for intelligent PDF data extraction and document analysis, specifically designed for construction drawing management.

## 🚀 Quick Start

1. **Fork this project** on Replit
2. **Install dependencies**: `npm install`
3. **Initialize database**: `npm run db:push`
4. **Start application**: `npm run dev`
5. **Upload a PDF** and start extracting data!

## ✨ Key Features

- **Advanced OCR**: Tesseract.js with spatial table reconstruction
- **Interactive PDF Viewer**: Zoom, pan, and navigate with thumbnails
- **Smart Data Extraction**: Click-to-select marquee tool with real-time preview
- **Construction-Focused**: Pre-configured divisions for industry workflows
- **CSV Export**: Maintains original table structure and formatting
- **Real-time Processing**: Live feedback during OCR extraction

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **OCR**: Tesseract.js with advanced preprocessing
- **Build**: Vite with hot module replacement

## 📋 How to Use

1. **Upload PDF**: Drag and drop construction drawings
2. **Navigate**: Use thumbnails to browse pages
3. **Select Division**: Choose construction category (electrical, plumbing, etc.)
4. **Extract Data**: Click to start marquee selection, click again to finish
5. **Review Results**: View extracted data in structured tables
6. **Export**: Download CSV files with original formatting preserved

## 🔧 Configuration

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection (auto-configured in Replit)

### File Limits
- Maximum PDF size: 10MB
- Supported formats: PDF only
- Output formats: CSV, structured text

## 📖 Documentation

See `replit.md` for complete technical documentation, troubleshooting guide, and development information.

## 🎯 Use Cases

- Door and window schedule extraction
- Room finish schedules
- Equipment specifications
- Construction detail analysis
- Architectural drawing digitization

---

**Need help?** Check the troubleshooting section in `replit.md` or review the console logs for detailed error information.