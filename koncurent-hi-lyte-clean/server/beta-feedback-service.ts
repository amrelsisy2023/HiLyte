import { db } from "./db";
import { sql } from "drizzle-orm";
import { pgTable, serial, text, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";

// Beta feedback table schema
export const betaFeedback = pgTable("beta_feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  userEmail: text("user_email").notNull(),
  feedbackType: text("feedback_type").notNull(), // 'bug', 'feature_request', 'general', 'usability'
  category: text("category"), // 'upload', 'extraction', 'ui', 'performance', etc.
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity"), // 'low', 'medium', 'high', 'critical'
  status: text("status").default("open"), // 'open', 'in_progress', 'resolved', 'closed'
  browserInfo: jsonb("browser_info"), // User agent, screen size, etc.
  reproductionSteps: text("reproduction_steps"),
  expectedBehavior: text("expected_behavior"),
  actualBehavior: text("actual_behavior"),
  attachments: jsonb("attachments"), // URLs or file references
  adminNotes: text("admin_notes"),
  resolvedBy: integer("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type BetaFeedback = typeof betaFeedback.$inferSelect;
export type InsertBetaFeedback = typeof betaFeedback.$inferInsert;

interface BetaFeedbackStats {
  totalFeedback: number;
  openItems: number;
  resolvedItems: number;
  criticalBugs: number;
  feedbackByType: Record<string, number>;
  feedbackByCategory: Record<string, number>;
  recentFeedback: BetaFeedback[];
}

export class BetaFeedbackService {
  async createFeedback(feedback: Omit<InsertBetaFeedback, 'id' | 'createdAt' | 'updatedAt'>): Promise<BetaFeedback> {
    const [newFeedback] = await db
      .insert(betaFeedback)
      .values({
        ...feedback,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return newFeedback;
  }

  async getFeedback(limit: number = 50, offset: number = 0, filters?: {
    status?: string;
    feedbackType?: string;
    category?: string;
    severity?: string;
    userId?: number;
  }): Promise<BetaFeedback[]> {
    let conditions = [];

    // Apply filters if provided
    if (filters) {
      if (filters.status) {
        conditions.push(sql`${betaFeedback.status} = ${filters.status}`);
      }
      if (filters.feedbackType) {
        conditions.push(sql`${betaFeedback.feedbackType} = ${filters.feedbackType}`);
      }
      if (filters.category) {
        conditions.push(sql`${betaFeedback.category} = ${filters.category}`);
      }
      if (filters.severity) {
        conditions.push(sql`${betaFeedback.severity} = ${filters.severity}`);
      }
      if (filters.userId) {
        conditions.push(sql`${betaFeedback.userId} = ${filters.userId}`);
      }

    }

    let query = db.select().from(betaFeedback);
    
    if (conditions.length > 0) {
      // Build the WHERE clause with AND conditions
      const whereClause = conditions.reduce((acc, condition, index) => {
        if (index === 0) return condition;
        return sql`${acc} AND ${condition}`;
      });
      query = query.where(whereClause);
    }

    return await query
      .orderBy(sql`${betaFeedback.createdAt} DESC`)
      .limit(limit)
      .offset(offset);
  }

  async updateFeedbackStatus(
    id: number, 
    status: string, 
    adminNotes?: string, 
    resolvedBy?: number
  ): Promise<BetaFeedback | null> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    if (status === 'resolved' && resolvedBy) {
      updateData.resolvedBy = resolvedBy;
      updateData.resolvedAt = new Date();
    }

    const [updated] = await db
      .update(betaFeedback)
      .set(updateData)
      .where(sql`${betaFeedback.id} = ${id}`)
      .returning();

    return updated || null;
  }

  async getFeedbackStats(days: number = 30): Promise<BetaFeedbackStats> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get all feedback within the time period
    const allFeedback = await db
      .select()
      .from(betaFeedback)
      .where(sql`${betaFeedback.createdAt} >= ${cutoffDate}`);

    // Calculate statistics
    const stats: BetaFeedbackStats = {
      totalFeedback: allFeedback.length,
      openItems: allFeedback.filter(f => f.status === 'open').length,
      resolvedItems: allFeedback.filter(f => f.status === 'resolved').length,
      criticalBugs: allFeedback.filter(f => f.severity === 'critical').length,
      feedbackByType: {},
      feedbackByCategory: {},
      recentFeedback: allFeedback.slice(0, 10), // Most recent 10 items
    };

    // Group by type
    allFeedback.forEach(f => {
      if (f.feedbackType) {
        stats.feedbackByType[f.feedbackType] = (stats.feedbackByType[f.feedbackType] || 0) + 1;
      }
      if (f.category) {
        stats.feedbackByCategory[f.category] = (stats.feedbackByCategory[f.category] || 0) + 1;
      }
    });

    return stats;
  }

  async getBugReports(severity?: string): Promise<BetaFeedback[]> {
    if (severity) {
      return await db
        .select()
        .from(betaFeedback)
        .where(sql`${betaFeedback.feedbackType} = 'bug' AND ${betaFeedback.severity} = ${severity}`)
        .orderBy(sql`${betaFeedback.createdAt} DESC`);
    }

    return await db
      .select()
      .from(betaFeedback)
      .where(sql`${betaFeedback.feedbackType} = 'bug'`)
      .orderBy(sql`${betaFeedback.createdAt} DESC`);
  }

  async getFeatureRequests(): Promise<BetaFeedback[]> {
    return await db
      .select()
      .from(betaFeedback)
      .where(sql`${betaFeedback.feedbackType} = 'feature_request'`)
      .orderBy(sql`${betaFeedback.createdAt} DESC`);
  }

  async searchFeedback(searchTerm: string): Promise<BetaFeedback[]> {
    return await db
      .select()
      .from(betaFeedback)
      .where(
        sql`${betaFeedback.title} ILIKE ${`%${searchTerm}%`} OR 
            ${betaFeedback.description} ILIKE ${`%${searchTerm}%`} OR
            ${betaFeedback.userEmail} ILIKE ${`%${searchTerm}%`}`
      )
      .orderBy(sql`${betaFeedback.createdAt} DESC`);
  }

  // Initialize the feedback table
  async initializeFeedbackTable(): Promise<void> {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS beta_feedback (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          user_email TEXT NOT NULL,
          feedback_type TEXT NOT NULL,
          category TEXT,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          severity TEXT,
          status TEXT DEFAULT 'open',
          browser_info JSONB,
          reproduction_steps TEXT,
          expected_behavior TEXT,
          actual_behavior TEXT,
          attachments JSONB,
          admin_notes TEXT,
          resolved_by INTEGER,
          resolved_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
    } catch (error) {
      console.error('Error initializing feedback table:', error);
    }
  }
}

export const betaFeedbackService = new BetaFeedbackService();