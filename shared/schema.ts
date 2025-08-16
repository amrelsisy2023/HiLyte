import { pgTable, text, serial, integer, boolean, timestamp, real, varchar, json, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// User management
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  username: varchar("username", { length: 50 }).unique().notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  company: varchar("company", { length: 255 }),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  subscriptionStatus: varchar("subscription_status", { length: 20 }).default("free_trial"), // 'free_trial', 'active', 'cancelled', 'expired'
  subscriptionPlan: varchar("subscription_plan", { length: 20 }).default("free"), // 'free', 'pro', 'enterprise'
  trialUsed: boolean("trial_used").default(false),
  trialExtractionsUsed: integer("trial_extractions_used").default(0),
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  stripePaymentMethodId: varchar("stripe_payment_method_id", { length: 255 }),
  // AI Credits System
  aiCreditsBalance: real("ai_credits_balance").default(0), // Current credit balance in dollars
  totalAiSpent: real("total_ai_spent").default(0), // Total lifetime AI spending
  monthlyAiSpent: real("monthly_ai_spent").default(0), // Current month AI spending
  lastBillingDate: timestamp("last_billing_date"),
  creditAlertThreshold: real("credit_alert_threshold").default(5.0), // Alert when credits below $5
  autoPurchaseCredits: boolean("auto_purchase_credits").default(false),
  autoPurchaseAmount: real("auto_purchase_amount").default(20.0), // Auto-purchase $20 when low
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  
  // Referral system fields
  referralCode: varchar("referral_code", { length: 50 }).unique(),
  referredBy: varchar("referred_by", { length: 50 }),
  totalReferrals: integer("total_referrals").default(0),
  referralCreditsEarned: numeric("referral_credits_earned", { precision: 10, scale: 6 }).default("0"),
  
  // Beta access control
  betaStatus: varchar("beta_status", { length: 20 }).default("none"), // 'none', 'invited', 'active', 'waitlisted'
  betaInvitedAt: timestamp("beta_invited_at"),
  betaActivatedAt: timestamp("beta_activated_at"),
  invitedByAdmin: varchar("invited_by_admin", { length: 255 }),
  
  // Two-Factor Authentication
  twoFactorSecret: varchar("two_factor_secret", { length: 32 }), // Base32 encoded secret for TOTP
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorMethod: varchar("two_factor_method", { length: 20 }).default("totp"), // 'totp', 'sms', 'email'
  twoFactorBackupCodes: json("two_factor_backup_codes"), // Array of backup codes
  phoneNumber: varchar("phone_number", { length: 20 }), // For SMS 2FA
  phoneVerified: boolean("phone_verified").default(false),
  twoFactorEmail: varchar("two_factor_email", { length: 255 }) // Email for 2FA (can differ from main email)
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Drawing folder organization
export const drawingFolders = pgTable("drawing_folders", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  name: text("name").notNull(),
  description: text("description"),
  parentFolderId: integer("parent_folder_id").references(() => drawingFolders.id),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Revision management
export const revisionSets = pgTable("revision_sets", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  originalSetId: integer("original_set_id").references(() => revisionSets.id),
  revisionNumber: varchar("revision_number", { length: 10 }).notNull(), // A, B, C, etc.
  revisionDate: timestamp("revision_date").defaultNow(),
  description: text("description"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Content mapping between revisions
export const contentMappings = pgTable("content_mappings", {
  id: serial("id").primaryKey(),
  oldExtractionId: integer("old_extraction_id").references(() => extractedData.id),
  newExtractionId: integer("new_extraction_id").references(() => extractedData.id),
  revisionSetId: integer("revision_set_id").references(() => revisionSets.id),
  mappingConfidence: real("mapping_confidence").default(0.0), // 0-1 confidence score
  changeType: varchar("change_type", { length: 20 }).notNull(), // 'unchanged', 'moved', 'modified', 'new', 'deleted'
  oldCoordinates: json("old_coordinates"), // Original marquee coordinates
  newCoordinates: json("new_coordinates"), // New marquee coordinates
  changeDescription: text("change_description"),
  reviewed: boolean("reviewed").default(false),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Revision changes summary
export const revisionChanges = pgTable("revision_changes", {
  id: serial("id").primaryKey(),
  revisionSetId: integer("revision_set_id").references(() => revisionSets.id),
  drawingId: integer("drawing_id").references(() => drawings.id),
  changeType: varchar("change_type", { length: 20 }).notNull(), // 'content_added', 'content_removed', 'content_moved', 'content_modified'
  location: json("location"), // Coordinates of the change
  description: text("description"),
  severity: varchar("severity", { length: 10 }).default("medium"), // 'low', 'medium', 'high'
  reviewed: boolean("reviewed").default(false),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const drawings = pgTable("drawings", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  folderId: integer("folder_id").references(() => drawingFolders.id),
  name: text("name").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: text("file_type").notNull(),
  width: integer("width"),
  height: integer("height"),
  pageNumber: integer("page_number").default(1),
  totalPages: integer("total_pages").default(1),
  thumbnailPath: text("thumbnail_path"),
  originalDrawingId: integer("original_drawing_id"),
  revisionNumber: varchar("revision_number", { length: 10 }).default("0"), // A, B, C, etc.
  revisionSetId: integer("revision_set_id").references(() => revisionSets.id),
  sheetMetadata: json("sheet_metadata"), // Store page-specific sheet info as JSON
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const drawingProfiles = pgTable("drawing_profiles", {
  id: serial("id").primaryKey(),
  drawingId: integer("drawing_id").references(() => drawings.id, { onDelete: "cascade" }).notNull(),
  industry: text("industry").notNull(),
  projectType: text("project_type").notNull(),
  projectStartDate: timestamp("project_start_date"),
  projectEndDate: timestamp("project_end_date"),
  estimatedBudget: text("estimated_budget"),
  budgetRange: text("budget_range").notNull(),
  softwareUsed: text("software_used").array(), // Array of software names
  projectComplexity: text("project_complexity").notNull(),
  specialRequirements: text("special_requirements"),
  teamSize: text("team_size").notNull(),
  contractorType: text("contractor_type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const constructionDivisions = pgTable("construction_divisions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  code: text("code").notNull(),
  sortOrder: integer("sort_order").default(0), // Manual sort order
  isDefault: boolean("is_default").default(false), // Whether this is a default system division
  extractionTemplate: text("extraction_template"), // JSON string of column definitions for template-based extraction
});

export const extractedData = pgTable("extracted_data", {
  id: serial("id").primaryKey(),
  drawingId: integer("drawing_id").references(() => drawings.id, { onDelete: "cascade" }),
  divisionId: integer("division_id").references(() => constructionDivisions.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'text', 'table', 'schedule', 'specification', 'mixed'
  extractedAt: timestamp("extracted_at").defaultNow(),
  sourceLocation: text("source_location").notNull(), // JSON string of marquee coordinates
  data: text("data").notNull(), // JSON string of extracted data
  aiEnhanced: boolean("ai_enhanced").default(false),
  confidence: real("confidence").default(0.0),
  extractionMethod: text("extraction_method").default("ocr"),
  suggestions: text("suggestions"), // JSON string for AI suggestions
  manuallyCorreted: boolean("manually_corrected").default(false),
});

export const manualCorrections = pgTable("manual_corrections", {
  id: serial("id").primaryKey(),
  extractedDataId: integer("extracted_data_id").references(() => extractedData.id, { onDelete: "cascade" }).notNull(),
  originalExtraction: text("original_extraction").notNull(),
  correctedData: text("corrected_data").notNull(),
  extractionRegion: text("extraction_region"), // JSON string for region coordinates
  correctedAt: timestamp("corrected_at").defaultNow().notNull(),
  userId: integer("user_id"), // For future user tracking
});

// Subscription plans table
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(), // 'Free Trial', 'Koncurent Pro', 'Enterprise'
  planId: varchar("plan_id", { length: 50 }).unique().notNull(), // 'free', 'pro', 'enterprise'
  monthlyPrice: real("monthly_price").notNull(), // in dollars
  features: text("features").array().notNull(), // array of feature descriptions
  maxDrawings: integer("max_drawings"), // null for unlimited
  maxExtractions: integer("max_extractions"), // null for unlimited
  trialPeriodDays: integer("trial_period_days").default(0),
  stripePriceId: varchar("stripe_price_id", { length: 255 }), // Stripe price ID for billing
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// AI Usage Tracking
export const aiUsageLog = pgTable("ai_usage_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  extractedDataId: integer("extracted_data_id").references(() => extractedData.id, { onDelete: "cascade" }),
  operation: varchar("operation", { length: 50 }).notNull(), // 'extraction', 'analysis', 'enhancement'
  tokensUsed: integer("tokens_used").notNull(),
  cost: real("cost").notNull(), // Cost in dollars
  model: varchar("model", { length: 50 }).default("claude-sonnet-4-20250514"),
  status: varchar("status", { length: 20 }).default("completed"), // 'completed', 'failed', 'partial'
  metadata: text("metadata"), // JSON string with additional details
  createdAt: timestamp("created_at").defaultNow(),
});

// AI Credit Transactions
export const aiCreditTransactions = pgTable("ai_credit_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'purchase', 'usage', 'refund', 'adjustment', 'referral'
  amount: real("amount").notNull(), // Positive for credits added, negative for usage
  balance: real("balance").notNull(), // Account balance after transaction
  description: text("description").notNull(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }), // For purchases
  relatedUsageId: integer("related_usage_id").references(() => aiUsageLog.id), // Link to usage record
  metadata: text("metadata"), // JSON string with additional details
  createdAt: timestamp("created_at").defaultNow(),
});

// AI Billing Periods
export const aiBillingPeriods = pgTable("ai_billing_periods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  billingMonth: varchar("billing_month", { length: 7 }).notNull(), // YYYY-MM format
  totalUsage: real("total_usage").default(0), // Total AI spending this month
  totalTokens: integer("total_tokens").default(0), // Total tokens used this month
  operations: integer("operations").default(0), // Number of AI operations
  billingStatus: varchar("billing_status", { length: 20 }).default("pending"), // 'pending', 'billed', 'paid'
  billedAt: timestamp("billed_at"),
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Contact Sales Requests
export const contactSalesRequests = pgTable("contact_sales_requests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  company: text("company").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message"),
  status: text("status", { enum: ['pending', 'contacted', 'qualified', 'closed'] }).default('pending').notNull(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  notes: text("notes"),
});

// AI Training Examples - for machine learning from user interactions
export const aiTrainingExamples = pgTable("ai_training_examples", {
  id: serial("id").primaryKey(),
  drawingId: integer("drawing_id").references(() => drawings.id, { onDelete: "cascade" }).notNull(),
  page: integer("page").notNull(),
  region: text("region").notNull(), // JSON string of {x, y, width, height}
  extractedText: text("extracted_text").notNull(),
  divisionId: integer("division_id").references(() => constructionDivisions.id),
  divisionName: text("division_name").notNull(),
  isManualSelection: boolean("is_manual_selection").default(true), // true for user selections, false for AI detections
  wasApproved: boolean("was_approved"), // null for manual, true/false for AI detections
  confidence: real("confidence"), // AI confidence score if applicable
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

export const insertDrawingSchema = createInsertSchema(drawings).omit({
  id: true,
  uploadedAt: true,
});

export const insertConstructionDivisionSchema = createInsertSchema(constructionDivisions).omit({
  id: true,
});

export const insertExtractedDataSchema = createInsertSchema(extractedData).omit({
  id: true,
  extractedAt: true,
});



export const insertManualCorrectionSchema = createInsertSchema(manualCorrections).omit({
  id: true,
  correctedAt: true,
});

export const insertDrawingProfileSchema = createInsertSchema(drawingProfiles).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
});

export const insertDrawingFolderSchema = createInsertSchema(drawingFolders).omit({
  id: true,
  createdAt: true,
});

export const insertRevisionSetSchema = createInsertSchema(revisionSets).omit({
  id: true,
  revisionDate: true,
  uploadedAt: true,
});

export const insertContentMappingSchema = createInsertSchema(contentMappings).omit({
  id: true,
  createdAt: true,
});

export const insertRevisionChangeSchema = createInsertSchema(revisionChanges).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiUsageLogSchema = createInsertSchema(aiUsageLog).omit({
  id: true,
  createdAt: true,
});

export const insertAiCreditTransactionSchema = createInsertSchema(aiCreditTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertAiBillingPeriodSchema = createInsertSchema(aiBillingPeriods).omit({
  id: true,
  createdAt: true,
});

export const insertAiTrainingExampleSchema = createInsertSchema(aiTrainingExamples).omit({
  id: true,
  createdAt: true,
});

export const insertContactSalesRequestSchema = createInsertSchema(contactSalesRequests).omit({
  id: true,
  submittedAt: true,
});

// Beta access control tables
export const betaInvitations = pgTable("beta_invitations", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  invitationCode: varchar("invitation_code", { length: 100 }).unique().notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'accepted', 'expired'
  invitedBy: varchar("invited_by", { length: 255 }).notNull(), // Admin email who sent invite
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  company: varchar("company", { length: 255 }),
  industry: varchar("industry", { length: 100 }),
  projectType: varchar("project_type", { length: 100 }),
  referralSource: varchar("referral_source", { length: 100 }),
  reasonForInterest: text("reason_for_interest"),
  status: varchar("status", { length: 20 }).default("waiting"), // 'waiting', 'invited', 'converted'
  priority: integer("priority").default(0), // Higher number = higher priority
  notifiedAt: timestamp("notified_at"),
  convertedAt: timestamp("converted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Beta feedback table
export const betaFeedback = pgTable("beta_feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  userEmail: varchar("user_email", { length: 255 }).notNull(),
  feedbackType: varchar("feedback_type", { length: 50 }).notNull(), // 'bug', 'feature_request', 'improvement', 'usability'
  category: varchar("category", { length: 50 }).notNull(), // 'ui', 'performance', 'functionality', 'documentation'
  severity: varchar("severity", { length: 20 }).notNull(), // 'low', 'medium', 'high', 'critical'
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  stepsToReproduce: text("steps_to_reproduce"),
  expectedBehavior: text("expected_behavior"),
  actualBehavior: text("actual_behavior"),
  browserInfo: text("browser_info"),
  deviceInfo: text("device_info"),
  screenshotUrl: text("screenshot_url"),
  status: varchar("status", { length: 20 }).default("open"), // 'open', 'in_progress', 'resolved', 'closed'
  adminNotes: text("admin_notes"),
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBetaInvitationSchema = createInsertSchema(betaInvitations).omit({
  id: true,
  createdAt: true,
});

export const insertWaitlistSchema = createInsertSchema(waitlist).omit({
  id: true,
  createdAt: true,
});

export const insertBetaFeedbackSchema = createInsertSchema(betaFeedback).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Relations
export const projectsRelations = relations(projects, ({ many }) => ({
  drawings: many(drawings),
  folders: many(drawingFolders),
  revisionSets: many(revisionSets),
}));

export const drawingFoldersRelations = relations(drawingFolders, ({ one, many }) => ({
  project: one(projects, {
    fields: [drawingFolders.projectId],
    references: [projects.id],
  }),
  parentFolder: one(drawingFolders, {
    fields: [drawingFolders.parentFolderId],
    references: [drawingFolders.id],
  }),
  childFolders: many(drawingFolders),
  drawings: many(drawings),
}));

export const revisionSetsRelations = relations(revisionSets, ({ one, many }) => ({
  project: one(projects, {
    fields: [revisionSets.projectId],
    references: [projects.id],
  }),
  originalSet: one(revisionSets, {
    fields: [revisionSets.originalSetId],
    references: [revisionSets.id],
  }),
  revisions: many(revisionSets),
  drawings: many(drawings),
  contentMappings: many(contentMappings),
  changes: many(revisionChanges),
}));

export const drawingsRelations = relations(drawings, ({ one, many }) => ({
  project: one(projects, {
    fields: [drawings.projectId],
    references: [projects.id],
  }),
  folder: one(drawingFolders, {
    fields: [drawings.folderId],
    references: [drawingFolders.id],
  }),
  revisionSet: one(revisionSets, {
    fields: [drawings.revisionSetId],
    references: [revisionSets.id],
  }),
  originalDrawing: one(drawings, {
    fields: [drawings.originalDrawingId],
    references: [drawings.id],
  }),
  revisions: many(drawings),
  extractedData: many(extractedData),
}));

export const contentMappingsRelations = relations(contentMappings, ({ one }) => ({
  oldExtraction: one(extractedData, {
    fields: [contentMappings.oldExtractionId],
    references: [extractedData.id],
  }),
  newExtraction: one(extractedData, {
    fields: [contentMappings.newExtractionId],
    references: [extractedData.id],
  }),
  revisionSet: one(revisionSets, {
    fields: [contentMappings.revisionSetId],
    references: [revisionSets.id],
  }),
}));

export const revisionChangesRelations = relations(revisionChanges, ({ one }) => ({
  revisionSet: one(revisionSets, {
    fields: [revisionChanges.revisionSetId],
    references: [revisionSets.id],
  }),
  drawing: one(drawings, {
    fields: [revisionChanges.drawingId],
    references: [drawings.id],
  }),
  reviewedByUser: one(users, {
    fields: [revisionChanges.reviewedBy],
    references: [users.id],
  }),
}));

export const constructionDivisionsRelations = relations(constructionDivisions, ({ many }) => ({
  extractedData: many(extractedData),
}));

export const extractedDataRelations = relations(extractedData, ({ one, many }) => ({
  drawing: one(drawings, {
    fields: [extractedData.drawingId],
    references: [drawings.id],
  }),
  constructionDivision: one(constructionDivisions, {
    fields: [extractedData.divisionId],
    references: [constructionDivisions.id],
  }),
  oldMappings: many(contentMappings, {
    relationName: "oldExtraction"
  }),
  newMappings: many(contentMappings, {
    relationName: "newExtraction"
  }),
}));



export const usersRelations = relations(users, ({ many }) => ({
  aiUsageLog: many(aiUsageLog),
  aiCreditTransactions: many(aiCreditTransactions),
  aiBillingPeriods: many(aiBillingPeriods),
  reviewedChanges: many(revisionChanges),
}));

export const aiUsageLogRelations = relations(aiUsageLog, ({ one }) => ({
  user: one(users, {
    fields: [aiUsageLog.userId],
    references: [users.id],
  }),
  extractedData: one(extractedData, {
    fields: [aiUsageLog.extractedDataId],
    references: [extractedData.id],
  }),
}));

export const aiCreditTransactionsRelations = relations(aiCreditTransactions, ({ one }) => ({
  user: one(users, {
    fields: [aiCreditTransactions.userId],
    references: [users.id],
  }),
  relatedUsage: one(aiUsageLog, {
    fields: [aiCreditTransactions.relatedUsageId],
    references: [aiUsageLog.id],
  }),
}));

export const aiBillingPeriodsRelations = relations(aiBillingPeriods, ({ one }) => ({
  user: one(users, {
    fields: [aiBillingPeriods.userId],
    references: [users.id],
  }),
}));



// User schemas - Login/Registration version
export const insertUserRegistrationSchema = createInsertSchema(users).omit({
  id: true,
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  usernameOrEmail: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertUserRegistration = z.infer<typeof insertUserRegistrationSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Drawing = typeof drawings.$inferSelect;
export type InsertDrawing = z.infer<typeof insertDrawingSchema>;
export type ConstructionDivision = typeof constructionDivisions.$inferSelect;
export type InsertConstructionDivision = z.infer<typeof insertConstructionDivisionSchema>;
export type ExtractedData = typeof extractedData.$inferSelect;
export type InsertExtractedData = z.infer<typeof insertExtractedDataSchema>;

export type ManualCorrection = typeof manualCorrections.$inferSelect;

export type DrawingProfile = typeof drawingProfiles.$inferSelect;
export type InsertDrawingProfile = z.infer<typeof insertDrawingProfileSchema>;
export type AiUsageLog = typeof aiUsageLog.$inferSelect;
export type InsertAiUsageLog = z.infer<typeof insertAiUsageLogSchema>;
export type AiCreditTransaction = typeof aiCreditTransactions.$inferSelect;
export type InsertAiCreditTransaction = z.infer<typeof insertAiCreditTransactionSchema>;
export type AiBillingPeriod = typeof aiBillingPeriods.$inferSelect;
export type InsertAiBillingPeriod = z.infer<typeof insertAiBillingPeriodSchema>;
export type SelectContactSalesRequest = typeof contactSalesRequests.$inferSelect;
export type InsertContactSalesRequest = z.infer<typeof insertContactSalesRequestSchema>;
export type SelectAiTrainingExample = typeof aiTrainingExamples.$inferSelect;
export type InsertAiTrainingExample = z.infer<typeof insertAiTrainingExampleSchema>;
export type BetaInvitation = typeof betaInvitations.$inferSelect;
export type InsertBetaInvitation = z.infer<typeof insertBetaInvitationSchema>;
export type WaitlistEntry = typeof waitlist.$inferSelect;
export type DrawingFolder = typeof drawingFolders.$inferSelect;
export type InsertDrawingFolder = z.infer<typeof insertDrawingFolderSchema>;
export type RevisionSet = typeof revisionSets.$inferSelect;
export type InsertRevisionSet = z.infer<typeof insertRevisionSetSchema>;
export type ContentMapping = typeof contentMappings.$inferSelect;
export type InsertContentMapping = z.infer<typeof insertContentMappingSchema>;
export type RevisionChange = typeof revisionChanges.$inferSelect;
export type InsertRevisionChange = z.infer<typeof insertRevisionChangeSchema>;
export type InsertWaitlistEntry = z.infer<typeof insertWaitlistSchema>;
export type BetaFeedback = typeof betaFeedback.$inferSelect;
export type InsertBetaFeedback = z.infer<typeof insertBetaFeedbackSchema>;


