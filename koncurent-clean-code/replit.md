# Koncurent Hi-LYTE

## Overview
Koncurent Hi-LYTE is a web application designed for intelligent PDF data extraction and document analysis within the construction industry. Its core purpose is to enable users to upload PDF drawing sets, extract data using marquee selection into organized tables, and export this data. The system utilizes OCR and AI for precise information retrieval, offering real-time table extraction, dynamic CSV/spreadsheet export, and machine learning-powered data extraction. The long-term vision is to automate revision management and data extraction, providing a competitive advantage through advanced revision tracking and AI-driven change identification between drawing sets, while preserving existing data.

### Strategic Enhancement Roadmap (August 2025)
**Advanced NLP Integration**: Multi-stage NLP models for automatic requirement detection and classification within construction documents, enabling automated compliance checking and traceability workflows similar to engineering RVTM systems.
**Enhanced Text Reconstruction**: Advanced paragraph reconstruction using AI clustering and NLP-driven analysis to better understand document context and relationships.
**Compliance Workflows**: Automated generation of structured compliance matrices and traceability reports for construction standards and building codes.
**Intelligent Classification**: Automatic categorization of extracted data by construction discipline, trade, and compliance requirements.

## User Preferences
Preferred communication style: Simple, everyday language.
Drag UX requirement: Table height dragging must be completely frictionless with zero startup delay and ultra-smooth tracking that follows mouse movement exactly with no lag or stuttering.
Upload progress requirement: Must show "Processing page X of Y" format instead of just "Processing page X" to provide clear progress indication.
Upload progress persistence requirement: Progress bar must remain visible throughout the entire upload process including PDF conversion, folder selection, and AI processing - never disappearing prematurely (August 2025: RESOLVED).
Import/Export panel preference: Keep import/export area open during drawing imports to allow multiple file imports without manual reopening. Auto-expand section when extract button is needed to ensure visibility.
Smart Extraction progress requirement: Smart Extraction must show progress popup with loading indicators similar to AI analyze feature, providing clear visual feedback during processing with purple-themed design.
Template management preference: Templates should be aligned with construction divisions rather than generic schedules, accessible through top-right user dropdown navigation.
Template system: Complete set of 50 construction division-specific templates created (divisions 00-49) with industry-standard column definitions and realistic examples for each construction work type.
Bidirectional deletion requirement: When extracted data is deleted from tables, corresponding marquee highlights must be removed from drawings automatically to maintain perfect synchronization.
AI Dashboard preference: Renamed AI Training section to AI Dashboard with visually appealing insights interface showing data extraction performance analytics, top active divisions, and recent activity metrics.
Access control requirement: AI Dashboard restricted to @koncurent.com email addresses only, with admin privileges for mohamed@koncurent.com, ryan@koncurent.com, and kevin@koncurent.com.
2FA User Experience: Comprehensive redesign with step-by-step guided setup flow, visual progress indicators, clear instructions with emojis for better comprehension, enhanced error messaging, and improved login flow with better visual feedback. Runtime errors in registration flow resolved with proper null-checking for undefined properties.
Drawing Profile Modal UX: Enhanced with comprehensive micro-interaction feedback including hover states for all clickable elements, smooth transitions, and improved date input functionality allowing direct typing with auto-formatting and better calendar integration.

## System Architecture
### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state, React hooks for local state
- **Routing**: Wouter for client-side routing
- **Canvas Management**: Custom HTML5 Canvas implementation for drawing annotations
- **Build Tool**: Vite
- **UI/UX Decisions**: Focus on clear navigation, visual consistency with color-matched elements, intuitive drawing annotation, and streamlined workflows. Includes intelligent section navigation dropdowns, optimized default zoom levels, and adaptive UI based on subscription status. Always-scrollable table behavior with forced minimum dimensions and proper container overflow containment. Data table full-width display (August 2025): Fixed width constraint issue by removing container borders, eliminating all padding/margin constraints, and ensuring proper styling cascade through nested components.

### Backend Architecture (Python Flask - August 2025)
- **Framework**: Python Flask with SQLAlchemy ORM (migrated from Node.js/Express)
- **Database**: MySQL with SQLAlchemy (migrated from PostgreSQL/Drizzle)
- **File Storage**: Local file system with Werkzeug file handling
- **API Design**: RESTful endpoints with Flask blueprints for modular organization
- **AI Integration**: Anthropic Claude 4.0 Sonnet with Python SDK for comprehensive document analysis
- **Document Processing**: Python libraries (Pillow, pytesseract, pdf2image) for advanced OCR and image processing
- **Data Flow**: File uploads processed through Flask routes, AI extraction via Python services, comprehensive analysis combining OCR + Smart AI + Enhanced NLP
- **Authentication**: Flask-Login with session management and credit tracking system

### Technical Implementations
- High-quality 300 DPI PDF rendering.
- Hybrid OCR + AI system for data extraction, with manual correction learning to improve AI accuracy.
- Intelligent table analysis and reconstruction for Excel-compatible exports.
- AI-powered sheet metadata extraction for intelligent thumbnail labeling.
- Single-user application design.
- Bidirectional deletion system: Complete synchronization between data tables and drawing highlights with automatic marquee cleanup.
- **Comprehensive Extraction System (Python)**: Full-stack Python implementation providing three integrated extraction methods: OCR text recognition, Smart AI Analysis for construction item detection, and Enhanced NLP for requirements and compliance analysis. All methods work together in comprehensive extraction mode for maximum data capture.
- **Multi-Stage NLP Analysis**: Advanced natural language processing for automatic requirement detection, compliance checking, and document context understanding using Anthropic's latest models.
- **Python AI/ML Stack**: Leverages Python's superior AI/ML ecosystem with libraries like pytesseract, Pillow, pdf2image, and anthropic for enhanced document processing capabilities.
- **Template System**: Templates are stored as JSON within each construction division's `extractionTemplate` field, allowing division-specific extraction rules. The system provides 50 pre-built templates for all construction divisions with smart defaults and allows for custom overrides. Inline division creation with color picker.
- **AI Credit System**: Tracks all AI usage per user with real-time credit deduction, supports automatic credit purchasing, and integrates with Stripe for payment processing.
- **Referral System**: Allows users to generate unique referral codes, share links, and earn credits for successful signups, with a dedicated tracking dashboard.
- **Access Control System**: Restricts AI Dashboard access to specific email addresses and defines admin users, enforced via centralized utilities and provisional UI rendering. Includes comprehensive admin user deletion functionality.
- **Multi-method Two-factor authentication (2FA)**: Comprehensive 2FA system supporting three authentication methods: TOTP authenticator apps (Google Authenticator, Authy), SMS text message codes, and email-based verification codes. Features user-friendly guided setup flow with method selection interface, step-by-step progress tracking, clear visual instructions, QR code and manual entry options for TOTP, mandatory backup code download with safety messaging, enhanced error handling with helpful tips, and improved login experience with better visual feedback and dynamic button states. Users can choose their preferred verification method during registration for maximum convenience and accessibility.
- **Intelligent Revision Management**: AI-powered drawing comparison (using Claude's vision capabilities), folder organization, and data preservation, including revision tracking, change categorization, and integration with existing workflows.
- Beta feedback collection system and production-ready error logging with detailed monitoring capabilities.
- Custom email-based beta system with SendGrid integration for controlled access via invitations and unique codes.
- Trial limit enforcement with upgrade modal triggering across all upload methods.


## External Dependencies
- **@anthropic-ai/sdk**: AI integration (Anthropic Claude).
- **@neondatabase/serverless**: PostgreSQL driver.
- **drizzle-orm**: Type-safe database ORM.
- **@tanstack/react-query**: Server state management.
- **@radix-ui/react-***: Accessible UI primitives.
- **express**: Node.js web application framework.
- **multer**: File upload middleware for Express.
- **sharp**: High-performance image processing.
- **tesseract.js**: OCR text recognition engine.
- **pdf2pic**: PDF to image conversion.
- **react**: Frontend UI framework.
- **tailwindcss**: Utility-first CSS framework.
- **wouter**: Lightweight client-side routing.
- **Stripe**: Payment processing for AI credit purchases.
- **SendGrid**: Email delivery for beta invitation system.