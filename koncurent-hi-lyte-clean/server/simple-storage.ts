import { db } from "./db";
import { 
  projects, 
  drawings, 
  constructionDivisions, 
  extractedData,
  manualCorrections,
  users,
  aiCreditTransactions,
  drawingProfiles,
  subscriptionPlans,
  aiTrainingExamples,
  drawingFolders,
  revisionSets,
  contentMappings,
  revisionChanges,
  type Project,
  type InsertProject,
  type Drawing,
  type InsertDrawing,
  type ConstructionDivision,
  type InsertConstructionDivision,
  type ExtractedData,
  type InsertExtractedData,
  type ManualCorrection,
  type User,
  type InsertUser,
  type AiCreditTransaction,
  type DrawingProfile,
  type InsertDrawingProfile,
  type SubscriptionPlan,
  type InsertSubscriptionPlan,
  type SelectAiTrainingExample,
  type InsertAiTrainingExample,
  type DrawingFolder,
  type InsertDrawingFolder,
  type RevisionSet,
  type InsertRevisionSet,
  type ContentMapping,
  type InsertContentMapping,
  type RevisionChange,
  type InsertRevisionChange
} from "@shared/schema";
import { eq, or, and, isNull, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;

  // Drawings
  getDrawings(projectId?: number): Promise<Drawing[]>;
  getDrawing(id: number): Promise<Drawing | undefined>;
  createDrawing(drawing: InsertDrawing): Promise<Drawing>;
  updateDrawing(id: number, drawing: Partial<InsertDrawing>): Promise<Drawing | undefined>;
  deleteDrawing(id: number): Promise<boolean>;

  // Construction Divisions
  getConstructionDivisions(): Promise<ConstructionDivision[]>;
  getConstructionDivision(id: number): Promise<ConstructionDivision | undefined>;
  createConstructionDivision(division: InsertConstructionDivision): Promise<ConstructionDivision>;
  updateConstructionDivision(id: number, division: Partial<InsertConstructionDivision>): Promise<ConstructionDivision | undefined>;
  deleteConstructionDivision(id: number): Promise<boolean>;

  // Extracted Data
  getExtractedData(drawingId?: number): Promise<ExtractedData[]>;
  getExtractedDataItem(id: number): Promise<ExtractedData | undefined>;
  createExtractedData(extractedData: InsertExtractedData): Promise<ExtractedData>;
  updateExtractedData(id: number, extractedData: Partial<InsertExtractedData>): Promise<ExtractedData | undefined>;
  deleteExtractedData(id: number): Promise<boolean>;
  deleteExtractedDataByDivision(divisionId: number): Promise<number>;

  // User Authentication
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByUsernameOrEmail(usernameOrEmail: string): Promise<User | undefined>;
  createUser(userData: Omit<InsertUser, 'confirmPassword'>): Promise<User>;
  verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean>;
  
  // User Profile Management
  getUser(id: number): Promise<User | undefined>;
  updateUser(id: number, userData: Partial<Omit<InsertUser, 'confirmPassword'>>): Promise<User | undefined>;
  getUserByReferralCode(referralCode: string): Promise<User | undefined>;
  getReferredUsers(referralCode: string): Promise<Array<{ email: string, joinedAt: string }>>;
  deleteUser(id: number): Promise<boolean>;



  // Drawing Profiles
  getDrawingProfile(drawingId: number): Promise<DrawingProfile | undefined>;
  createDrawingProfile(profile: InsertDrawingProfile): Promise<DrawingProfile>;
  updateDrawingProfile(drawingId: number, profile: Partial<InsertDrawingProfile>): Promise<DrawingProfile | undefined>;

  // Feature toggles
  getFeatureToggles(): Promise<Record<string, boolean>>;
  setFeatureToggle(featureId: string, enabled: boolean): Promise<void>;

  // Subscription management
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(planId: string): Promise<SubscriptionPlan | undefined>;
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  updateUserSubscription(userId: number, subscriptionData: {
    subscriptionStatus?: string;
    subscriptionPlan?: string;
    subscriptionStartDate?: Date;
    subscriptionEndDate?: Date;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  }): Promise<User | undefined>;
  incrementTrialExtractions(userId: number): Promise<User | undefined>;
  incrementUserExtractions(userId: number): Promise<void>;
  checkUserLimits(userId: number): Promise<{
    canUpload: boolean;
    canExtract: boolean;
    drawingCount: number;
    extractionCount: number;
    maxDrawings: number | null;
    maxExtractions: number | null;
    subscriptionStatus: string;
    plan: string;
  }>;

  // Drawing Folders
  getDrawingFolders(projectId?: number): Promise<DrawingFolder[]>;
  getDrawingFolder(id: number): Promise<DrawingFolder | undefined>;
  createDrawingFolder(folder: InsertDrawingFolder): Promise<DrawingFolder>;
  updateDrawingFolder(id: number, folder: Partial<InsertDrawingFolder>): Promise<DrawingFolder | undefined>;
  deleteDrawingFolder(id: number): Promise<boolean>;

  // Revision Management
  getRevisionSets(projectId?: number): Promise<RevisionSet[]>;
  getRevisionSet(id: number): Promise<RevisionSet | undefined>;
  createRevisionSet(revisionSet: InsertRevisionSet): Promise<RevisionSet>;
  updateRevisionSet(id: number, revisionSet: Partial<InsertRevisionSet>): Promise<RevisionSet | undefined>;
  deleteRevisionSet(id: number): Promise<boolean>;

  // Content Mappings
  getContentMappings(revisionSetId: number): Promise<ContentMapping[]>;
  createContentMapping(mapping: InsertContentMapping): Promise<ContentMapping>;
  updateContentMapping(id: number, mapping: Partial<InsertContentMapping>): Promise<ContentMapping | undefined>;

  // Revision Changes
  getRevisionChanges(revisionSetId: number): Promise<RevisionChange[]>;
  createRevisionChange(change: InsertRevisionChange): Promise<RevisionChange>;
  updateRevisionChange(id: number, change: Partial<InsertRevisionChange>): Promise<RevisionChange | undefined>;
  markChangeAsReviewed(id: number, reviewedBy: number): Promise<RevisionChange | undefined>;
  
  // Extended extraction data access
  getExtractedDataItem(id: number): Promise<ExtractedData | undefined>;

  // AI Training Examples
  createTrainingExample(example: InsertAiTrainingExample): Promise<SelectAiTrainingExample>;
  getTrainingExamples(): Promise<SelectAiTrainingExample[]>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeDefaultDivisions();
    this.initializeDefaultUser();
  }

  private async initializeDefaultUser() {
    try {
      // Check if user with ID 1 exists
      const existingUser = await db.select().from(users).where(eq(users.id, 1)).limit(1);
      if (existingUser.length === 0) {
        // Create default user for system functionality
        const hashedPassword = await bcrypt.hash('default', 10);
        await db.insert(users).values({
          id: 1,
          username: 'system',
          email: 'system@koncurent.com',
          firstName: 'System',
          lastName: 'User',
          passwordHash: hashedPassword,
          subscriptionStatus: 'active',
          subscriptionPlan: 'pro',
          aiCreditsBalance: 1000,
        }).onConflictDoNothing();
      }
    } catch (error) {
      console.error('Error initializing default user:', error);
    }
  }

  private async initializeDefaultDivisions() {
    const existing = await db.select().from(constructionDivisions).limit(1);
    if (existing.length === 0) {
      const defaultDivisions = [
        // General Requirements
        { name: "00 - Procurement & Contracting Requirements", code: "00", color: "#2C3E50", isDefault: true },
        { name: "01 - General Requirements", code: "01", color: "#34495E", isDefault: true },
        
        // Existing Conditions
        { name: "02 - Existing Conditions", code: "02", color: "#7F8C8D", isDefault: true },
        
        // Concrete
        { name: "03 - Concrete", code: "03", color: "#8B4513", isDefault: true },
        
        // Masonry
        { name: "04 - Masonry", code: "04", color: "#CD853F", isDefault: true },
        
        // Metals
        { name: "05 - Metals", code: "05", color: "#708090", isDefault: true },
        
        // Wood, Plastics, and Composites
        { name: "06 - Wood, Plastics, and Composites", code: "06", color: "#D2691E", isDefault: true },
        
        // Thermal and Moisture Protection
        { name: "07 - Thermal and Moisture Protection", code: "07", color: "#4B0082", isDefault: true },
        
        // Openings
        { name: "08 - Openings", code: "08", color: "#FF6347", isDefault: true },
        
        // Finishes
        { name: "09 - Finishes", code: "09", color: "#FF69B4", isDefault: true },
        
        // Specialties
        { name: "10 - Specialties", code: "10", color: "#00CED1", isDefault: true },
        
        // Equipment
        { name: "11 - Equipment", code: "11", color: "#32CD32", isDefault: true },
        
        // Furnishings
        { name: "12 - Furnishings", code: "12", color: "#9370DB" },
        
        // Special Construction
        { name: "13 - Special Construction", code: "13", color: "#FF4500" },
        
        // Conveying Equipment
        { name: "14 - Conveying Equipment", code: "14", color: "#4169E1" },
        
        // Reserved
        { name: "15 - Reserved", code: "15", color: "#696969" },
        { name: "16 - Reserved", code: "16", color: "#696969" },
        { name: "17 - Reserved", code: "17", color: "#696969" },
        { name: "18 - Reserved", code: "18", color: "#696969" },
        { name: "19 - Reserved", code: "19", color: "#696969" },
        
        // Reserved
        { name: "20 - Reserved", code: "20", color: "#696969" },
        
        // Fire Suppression
        { name: "21 - Fire Suppression", code: "21", color: "#DC143C" },
        
        // Plumbing
        { name: "22 - Plumbing", code: "22", color: "#1E90FF" },
        
        // Heating, Ventilating, and Air Conditioning (HVAC)
        { name: "23 - Heating, Ventilating, and Air Conditioning (HVAC)", code: "23", color: "#228B22" },
        
        // Reserved
        { name: "24 - Reserved", code: "24", color: "#696969" },
        
        // Integrated Automation
        { name: "25 - Integrated Automation", code: "25", color: "#800080" },
        
        // Electrical
        { name: "26 - Electrical", code: "26", color: "#FFD700" },
        
        // Communications
        { name: "27 - Communications", code: "27", color: "#9932CC" },
        
        // Electronic Safety and Security
        { name: "28 - Electronic Safety and Security", code: "28", color: "#FF8C00" },
        
        // Reserved
        { name: "29 - Reserved", code: "29", color: "#696969" },
        { name: "30 - Reserved", code: "30", color: "#696969" },
        
        // Earthwork
        { name: "31 - Earthwork", code: "31", color: "#8B4513" },
        
        // Exterior Improvements
        { name: "32 - Exterior Improvements", code: "32", color: "#228B22" },
        
        // Utilities
        { name: "33 - Utilities", code: "33", color: "#4682B4" },
        
        // Transportation
        { name: "34 - Transportation", code: "34", color: "#2F4F4F" },
        
        // Waterway and Marine Construction
        { name: "35 - Waterway and Marine Construction", code: "35", color: "#008B8B" },
        
        // Reserved
        { name: "36 - Reserved", code: "36", color: "#696969" },
        { name: "37 - Reserved", code: "37", color: "#696969" },
        { name: "38 - Reserved", code: "38", color: "#696969" },
        { name: "39 - Reserved", code: "39", color: "#696969" },
        
        // Process Integration
        { name: "40 - Process Integration", code: "40", color: "#800000" },
        
        // Material Processing and Handling Equipment
        { name: "41 - Material Processing and Handling Equipment", code: "41", color: "#8B0000" },
        
        // Process Heating, Cooling, and Drying Equipment
        { name: "42 - Process Heating, Cooling, and Drying Equipment", code: "42", color: "#B22222" },
        
        // Process Gas and Liquid Handling, Purification, and Storage Equipment
        { name: "43 - Process Gas and Liquid Handling, Purification, and Storage Equipment", code: "43", color: "#DC143C" },
        
        // Pollution Control Equipment
        { name: "44 - Pollution Control Equipment", code: "44", color: "#FF6347" },
        
        // Industry-Specific Manufacturing Equipment
        { name: "45 - Industry-Specific Manufacturing Equipment", code: "45", color: "#FF4500" },
        
        // Water and Wastewater Equipment
        { name: "46 - Water and Wastewater Equipment", code: "46", color: "#1E90FF" },
        
        // Reserved
        { name: "47 - Reserved", code: "47", color: "#696969" },
        
        // Electrical Power Generation
        { name: "48 - Electrical Power Generation", code: "48", color: "#FFD700" },
        
        // Reserved
        { name: "49 - Reserved", code: "49", color: "#696969" }
      ];
      
      await db.insert(constructionDivisions).values(defaultDivisions);
    }
  }

  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined> {
    const [updatedProject] = await db.update(projects).set(project).where(eq(projects.id, id)).returning();
    return updatedProject || undefined;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getDrawings(projectId?: number): Promise<Drawing[]> {
    if (projectId) {
      return await db.select().from(drawings).where(eq(drawings.projectId, projectId));
    }
    return await db.select().from(drawings);
  }

  async getDrawing(id: number): Promise<Drawing | undefined> {
    const [drawing] = await db.select().from(drawings).where(eq(drawings.id, id));
    return drawing || undefined;
  }

  async createDrawing(drawing: InsertDrawing): Promise<Drawing> {
    const [newDrawing] = await db.insert(drawings).values(drawing).returning();
    return newDrawing;
  }

  async updateDrawing(id: number, drawing: Partial<InsertDrawing>): Promise<Drawing | undefined> {
    const [updatedDrawing] = await db.update(drawings).set(drawing).where(eq(drawings.id, id)).returning();
    return updatedDrawing || undefined;
  }

  async deleteDrawing(id: number): Promise<boolean> {
    try {
      // First check if drawing exists
      const existingDrawing = await this.getDrawing(id);
      if (!existingDrawing) {
        return false;
      }

      // Delete related extracted data first
      await db.delete(extractedData).where(eq(extractedData.drawingId, id));
      
      // Delete the drawing
      await db.delete(drawings).where(eq(drawings.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting drawing:', error);
      return false;
    }
  }

  async getConstructionDivisions(): Promise<ConstructionDivision[]> {
    const divisions = await db.select().from(constructionDivisions);
    
    // Always sort by division code order (industry standard)
    return divisions.sort((a, b) => {
      // Primary sort: division code
      if (a.code && b.code) {
        // Convert codes to numbers for proper decimal ordering (00 < 00.1 < 01)
        const aCodeNum = parseFloat(a.code);
        const bCodeNum = parseFloat(b.code);
        
        if (!isNaN(aCodeNum) && !isNaN(bCodeNum)) {
          return aCodeNum - bCodeNum;
        }
        
        // If not numbers, do string comparison
        return a.code.localeCompare(b.code);
      }
      
      // If only one has a code, code comes first
      if (a.code && !b.code) return -1;
      if (!a.code && b.code) return 1;
      
      // Final fallback: sort by name
      return a.name.localeCompare(b.name);
    });
  }

  private extractDivisionNumber(name: string): number | null {
    const match = name.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }



  async getConstructionDivision(id: number): Promise<ConstructionDivision | undefined> {
    const [division] = await db.select().from(constructionDivisions).where(eq(constructionDivisions.id, id));
    return division || undefined;
  }

  async createConstructionDivision(division: InsertConstructionDivision): Promise<ConstructionDivision> {
    // Custom divisions created by users should have isDefault: false
    const divisionData = { ...division, isDefault: false };
    const [newDivision] = await db.insert(constructionDivisions).values(divisionData).returning();
    return newDivision;
  }

  async updateConstructionDivision(id: number, division: Partial<InsertConstructionDivision>): Promise<ConstructionDivision | undefined> {
    const [updatedDivision] = await db.update(constructionDivisions).set(division).where(eq(constructionDivisions.id, id)).returning();
    return updatedDivision || undefined;
  }

  async deleteConstructionDivision(id: number): Promise<boolean> {
    const result = await db.delete(constructionDivisions).where(eq(constructionDivisions.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getExtractedData(drawingId?: number): Promise<ExtractedData[]> {
    if (drawingId) {
      return await db.select().from(extractedData).where(eq(extractedData.drawingId, drawingId));
    }
    return await db.select().from(extractedData);
  }

  async getExtractedDataItem(id: number): Promise<ExtractedData | undefined> {
    const [item] = await db.select().from(extractedData).where(eq(extractedData.id, id));
    return item || undefined;
  }

  async createExtractedData(data: InsertExtractedData): Promise<ExtractedData> {
    const [newData] = await db.insert(extractedData).values(data).returning();
    return newData;
  }

  async recordManualCorrection(data: {
    extractedDataId: number;
    originalExtraction: string;
    correctedData: string;
    extractionRegion?: string;
    userId?: number;
  }): Promise<ManualCorrection> {
    const [correction] = await db.insert(manualCorrections).values(data).returning();
    return correction;
  }

  async getManualCorrections(extractedDataId?: number): Promise<ManualCorrection[]> {
    if (extractedDataId) {
      return await db.select().from(manualCorrections).where(eq(manualCorrections.extractedDataId, extractedDataId));
    }
    return await db.select().from(manualCorrections);
  }

  async updateExtractedData(id: number, data: Partial<InsertExtractedData>): Promise<ExtractedData | undefined> {
    const [updatedData] = await db.update(extractedData).set(data).where(eq(extractedData.id, id)).returning();
    return updatedData || undefined;
  }

  async deleteExtractedData(id: number): Promise<boolean> {
    try {
      // First check if extracted data exists
      const existingData = await this.getExtractedDataItem(id);
      if (!existingData) {
        return false;
      }

      // Delete the extracted data
      await db.delete(extractedData).where(eq(extractedData.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting extracted data:', error);
      return false;
    }
  }

  async deleteExtractedDataByDivision(divisionId: number): Promise<number> {
    try {
      // Get all extracted data for this division to count deletions
      const dataToDelete = await db.select().from(extractedData).where(eq(extractedData.divisionId, divisionId));
      const deleteCount = dataToDelete.length;
      
      // Delete all extracted data for this division
      await db.delete(extractedData).where(eq(extractedData.divisionId, divisionId));
      
      return deleteCount;
    } catch (error) {
      console.error('Error deleting extracted data by division:', error);
      throw error;
    }
  }

  // User Authentication Methods
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByUsernameOrEmail(usernameOrEmail: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      or(eq(users.username, usernameOrEmail), eq(users.email, usernameOrEmail))
    );
    return user || undefined;
  }

  async createUser(userData: Omit<InsertUser, 'confirmPassword'>): Promise<User> {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash((userData as any).password, saltRounds);
    
    const [newUser] = await db.insert(users).values({
      email: userData.email,
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      passwordHash: hashedPassword,
      twoFactorSecret: (userData as any).twoFactorSecret,
      twoFactorEnabled: (userData as any).twoFactorEnabled || false,
      twoFactorBackupCodes: (userData as any).twoFactorBackupCodes,
    }).returning();

    // Add welcome bonus for new users
    try {
      const { AiCreditService } = await import('./ai-credit-service');
      await AiCreditService.addWelcomeBonus(newUser.id);
      console.log(`Welcome bonus added for new user ${newUser.id}: ${newUser.email}`);
      
      // Set a flag to show welcome bonus modal on next login
      // This will be checked by the frontend to show the welcome modal
      console.log(`User ${newUser.id} should see welcome bonus modal on next login`);
    } catch (error) {
      console.error('Failed to add welcome bonus:', error);
      // Don't throw - user creation should still succeed even if bonus fails
    }

    return newUser;
  }

  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // User Profile Management
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async updateUser(id: number, userData: Partial<Omit<InsertUser, 'confirmPassword'>>): Promise<User | undefined> {
    const updateData: any = {};
    
    if (userData.email) updateData.email = userData.email;
    if (userData.username) updateData.username = userData.username;
    if (userData.firstName) updateData.firstName = userData.firstName;
    if (userData.lastName) updateData.lastName = userData.lastName;
    
    // Handle referral-related fields
    if ('referralCode' in userData && (userData as any).referralCode !== undefined) {
      updateData.referralCode = (userData as any).referralCode;
    }
    if ('referredBy' in userData && (userData as any).referredBy !== undefined) {
      updateData.referredBy = (userData as any).referredBy;
    }
    if ('totalReferrals' in userData && (userData as any).totalReferrals !== undefined) {
      updateData.totalReferrals = (userData as any).totalReferrals;
    }
    if ('referralCreditsEarned' in userData && (userData as any).referralCreditsEarned !== undefined) {
      updateData.referralCreditsEarned = (userData as any).referralCreditsEarned;
    }
    
    // Handle password update
    if ('password' in userData && (userData as any).password) {
      const saltRounds = 10;
      updateData.passwordHash = await bcrypt.hash((userData as any).password, saltRounds);
    }
    
    // Handle 2FA updates
    if ('twoFactorEnabled' in userData) {
      updateData.twoFactorEnabled = (userData as any).twoFactorEnabled;
    }
    if ('twoFactorSecret' in userData) {
      updateData.twoFactorSecret = (userData as any).twoFactorSecret;
    }
    if ('twoFactorBackupCodes' in userData) {
      updateData.twoFactorBackupCodes = (userData as any).twoFactorBackupCodes;
    }
    
    // Only proceed if there's data to update
    if (Object.keys(updateData).length === 0) {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    }
    
    const [updatedUser] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser || undefined;
  }



  async getUserByReferralCode(referralCode: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.referralCode, referralCode))
      .limit(1);
    return user;
  }

  async getReferredUsers(referralCode: string): Promise<Array<{ email: string, joinedAt: string }>> {
    const referredUsers = await db
      .select({
        email: users.email,
        joinedAt: users.createdAt
      })
      .from(users)
      .where(eq(users.referredBy, referralCode))
      .orderBy(users.createdAt);
    
    return referredUsers.map(user => ({
      email: user.email,
      joinedAt: user.joinedAt?.toISOString() || ''
    }));
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      console.log(`Starting deletion process for user ID: ${id}`);
      
      // First check if user exists
      const existingUser = await this.getUser(id);
      if (!existingUser) {
        console.log(`User with ID ${id} not found`);
        return false;
      }

      console.log(`Found user: ${existingUser.username} (${existingUser.email})`);

      // In single-user mode, delete all user's projects and drawings
      console.log('Deleting all projects and associated data...');
      const allProjects = await db.select().from(projects);
      console.log(`Found ${allProjects.length} projects to delete`);
      
      for (const project of allProjects) {
        console.log(`Deleting project: ${project.name} (ID: ${project.id})`);
        
        // Delete project drawings and extracted data
        const projectDrawings = await db.select().from(drawings).where(eq(drawings.projectId, project.id));
        console.log(`Found ${projectDrawings.length} drawings in project`);
        
        for (const drawing of projectDrawings) {
          await db.delete(extractedData).where(eq(extractedData.drawingId, drawing.id));
        }
        await db.delete(drawings).where(eq(drawings.projectId, project.id));
        
        // Delete the project
        await db.delete(projects).where(eq(projects.id, project.id));
      }
      
      // Delete unassigned drawings
      console.log('Deleting unassigned drawings...');
      const unassignedDrawings = await db.select().from(drawings).where(isNull(drawings.projectId));
      console.log(`Found ${unassignedDrawings.length} unassigned drawings`);
      
      for (const drawing of unassignedDrawings) {
        await db.delete(extractedData).where(eq(extractedData.drawingId, drawing.id));
        await db.delete(drawings).where(eq(drawings.id, drawing.id));
      }
      
      // Finally delete the user
      console.log('Deleting user record...');
      await db.delete(users).where(eq(users.id, id));
      
      console.log(`Successfully deleted user ID: ${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error; // Re-throw the error so the API can handle it properly
    }
  }



  // Drawing Profiles
  async getDrawingProfile(drawingId: number): Promise<DrawingProfile | undefined> {
    const [profile] = await db.select().from(drawingProfiles).where(eq(drawingProfiles.drawingId, drawingId));
    return profile || undefined;
  }

  async createDrawingProfile(profile: InsertDrawingProfile): Promise<DrawingProfile> {
    const [newProfile] = await db
      .insert(drawingProfiles)
      .values(profile)
      .returning();
    return newProfile;
  }

  async updateDrawingProfile(drawingId: number, profile: Partial<InsertDrawingProfile>): Promise<DrawingProfile | undefined> {
    const [updated] = await db
      .update(drawingProfiles)
      .set(profile)
      .where(eq(drawingProfiles.drawingId, drawingId))
      .returning();
    return updated || undefined;
  }

  // Feature toggles - using in-memory storage for simplicity
  private featureToggles: Record<string, boolean> = {
    'ai-extraction': true, // Enable AI extraction by default when API key is available
  };

  async getFeatureToggles(): Promise<Record<string, boolean>> {
    return this.featureToggles;
  }

  async setFeatureToggle(featureId: string, enabled: boolean): Promise<void> {
    this.featureToggles[featureId] = enabled;
  }

  // Subscription management
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
  }

  async getSubscriptionPlan(planId: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.planId, planId));
    return plan || undefined;
  }

  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const [newPlan] = await db
      .insert(subscriptionPlans)
      .values(plan)
      .returning();
    return newPlan;
  }

  async updateUserSubscription(userId: number, subscriptionData: {
    subscriptionStatus?: string;
    subscriptionPlan?: string;
    subscriptionStartDate?: Date;
    subscriptionEndDate?: Date;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  }): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({
        subscriptionStatus: subscriptionData.subscriptionStatus,
        subscriptionPlan: subscriptionData.subscriptionPlan,
        subscriptionStartDate: subscriptionData.subscriptionStartDate,
        subscriptionEndDate: subscriptionData.subscriptionEndDate,
        stripeCustomerId: subscriptionData.stripeCustomerId,
        stripeSubscriptionId: subscriptionData.stripeSubscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updated || undefined;
  }

  async incrementTrialExtractions(userId: number): Promise<User | undefined> {
    // First get the current value
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    const [updated] = await db
      .update(users)
      .set({
        trialExtractionsUsed: (user.trialExtractionsUsed || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updated || undefined;
  }

  async incrementUserExtractions(userId: number): Promise<void> {
    // Only increment for users on free trial
    const user = await this.getUser(userId);
    if (!user) return;
    
    if (user.subscriptionStatus === 'free_trial' || !user.subscriptionStatus) {
      await this.incrementTrialExtractions(userId);
    }
    // Pro users don't have limits, so no need to track
  }

  async getUserDrawingCount(userId: number): Promise<number> {
    // In single-user mode, count all drawings since there's no multi-user restrictions
    const allDrawings = await db.select({ id: drawings.id }).from(drawings);
    return allDrawings.length;
  }

  async checkUserLimits(userId: number): Promise<{
    canUpload: boolean;
    canExtract: boolean;
    drawingCount: number;
    extractionCount: number;
    maxDrawings: number | null;
    maxExtractions: number | null;
    subscriptionStatus: string;
    plan: string;
  }> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const plan = await this.getSubscriptionPlan(user.subscriptionPlan || 'free');
    const drawingCount = await this.getUserDrawingCount(userId);
    const extractionCount = user.trialExtractionsUsed || 0;

    const isFreeTrial = user.subscriptionStatus === 'free_trial';
    const hasActiveSubscription = user.subscriptionStatus === 'active';
    
    let canUpload = true;
    let canExtract = true;

    if (isFreeTrial) {
      // Free trial: 1 upload, 100 extractions
      canUpload = drawingCount === 0;
      canExtract = extractionCount < (plan?.maxExtractions || 100);
    } else if (!hasActiveSubscription) {
      // No active subscription
      canUpload = false;
      canExtract = false;
    }
    // Active subscribers have unlimited access

    return {
      canUpload,
      canExtract,
      drawingCount,
      extractionCount,
      maxDrawings: plan?.maxDrawings || null,
      maxExtractions: plan?.maxExtractions || null,
      subscriptionStatus: user.subscriptionStatus || 'free_trial',
      plan: user.subscriptionPlan || 'free',
    };
  }

  // AI Training Examples
  async createTrainingExample(example: InsertAiTrainingExample): Promise<SelectAiTrainingExample> {
    const [created] = await db.insert(aiTrainingExamples).values(example).returning();
    return created;
  }

  async getTrainingExamples(): Promise<SelectAiTrainingExample[]> {
    return await db.select().from(aiTrainingExamples).orderBy(aiTrainingExamples.createdAt).limit(50);
  }

  // Admin functions
  async getAllUsers(): Promise<User[]> {
    // Exclude system user (ID 1) from admin user listings
    return await db.select().from(users).where(ne(users.id, 1)).orderBy(users.createdAt);
  }

  async getCreditTransactions(): Promise<any[]> {
    return await db.select({
      id: aiCreditTransactions.id,
      userId: aiCreditTransactions.userId,
      type: aiCreditTransactions.type,
      amount: aiCreditTransactions.amount,
      balance: aiCreditTransactions.balance,
      description: aiCreditTransactions.description,
      createdAt: aiCreditTransactions.createdAt,
      user: {
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName
      }
    })
    .from(aiCreditTransactions)
    .leftJoin(users, eq(aiCreditTransactions.userId, users.id))
    .orderBy(aiCreditTransactions.createdAt);
  }

  // Admin methods for monitoring
  async getProjectsByUser(userId: number): Promise<any[]> {
    try {
      // For now, return empty array since projects table may not have createdBy field
      return [];
    } catch (error) {
      console.error('Error getting projects for user:', error);
      return [];
    }
  }

  async getExtractedDataByUser(userId: number): Promise<any[]> {
    try {
      // For now, return empty array since extracted_data table doesn't have userId field
      // TODO: Add userId tracking to extracted_data when implementing user-specific extraction tracking
      return [];
    } catch (error) {
      console.error('Error getting extracted data for user:', error);
      return [];
    }
  }

  // Drawing Folders
  async getDrawingFolders(projectId?: number): Promise<DrawingFolder[]> {
    if (projectId) {
      return await db.select().from(drawingFolders)
        .where(eq(drawingFolders.projectId, projectId))
        .orderBy(drawingFolders.sortOrder, drawingFolders.name);
    }
    return await db.select().from(drawingFolders)
      .orderBy(drawingFolders.sortOrder, drawingFolders.name);
  }

  async getDrawingFolder(id: number): Promise<DrawingFolder | undefined> {
    const [folder] = await db.select().from(drawingFolders).where(eq(drawingFolders.id, id));
    return folder;
  }

  async createDrawingFolder(folder: InsertDrawingFolder): Promise<DrawingFolder> {
    const [created] = await db.insert(drawingFolders).values(folder).returning();
    return created;
  }

  async updateDrawingFolder(id: number, folder: Partial<InsertDrawingFolder>): Promise<DrawingFolder | undefined> {
    const [updated] = await db.update(drawingFolders)
      .set(folder)
      .where(eq(drawingFolders.id, id))
      .returning();
    return updated;
  }

  async deleteDrawingFolder(id: number): Promise<boolean> {
    const result = await db.delete(drawingFolders).where(eq(drawingFolders.id, id));
    return result.count > 0;
  }

  // Revision Management
  async getRevisionSets(projectId?: number): Promise<RevisionSet[]> {
    if (projectId) {
      return await db.select().from(revisionSets)
        .where(eq(revisionSets.projectId, projectId))
        .orderBy(revisionSets.revisionDate);
    }
    return await db.select().from(revisionSets)
      .orderBy(revisionSets.revisionDate);
  }

  async getRevisionSet(id: number): Promise<RevisionSet | undefined> {
    const [revisionSet] = await db.select().from(revisionSets).where(eq(revisionSets.id, id));
    return revisionSet;
  }

  async createRevisionSet(revisionSet: InsertRevisionSet): Promise<RevisionSet> {
    const [created] = await db.insert(revisionSets).values(revisionSet).returning();
    return created;
  }

  async updateRevisionSet(id: number, revisionSet: Partial<InsertRevisionSet>): Promise<RevisionSet | undefined> {
    const [updated] = await db.update(revisionSets)
      .set(revisionSet)
      .where(eq(revisionSets.id, id))
      .returning();
    return updated;
  }

  async deleteRevisionSet(id: number): Promise<boolean> {
    const result = await db.delete(revisionSets).where(eq(revisionSets.id, id));
    return result.count > 0;
  }

  // Content Mappings
  async getContentMappings(revisionSetId: number): Promise<ContentMapping[]> {
    return await db.select().from(contentMappings)
      .where(eq(contentMappings.revisionSetId, revisionSetId))
      .orderBy(contentMappings.createdAt);
  }

  async createContentMapping(mapping: InsertContentMapping): Promise<ContentMapping> {
    const [created] = await db.insert(contentMappings).values(mapping).returning();
    return created;
  }

  async updateContentMapping(id: number, mapping: Partial<InsertContentMapping>): Promise<ContentMapping | undefined> {
    const [updated] = await db.update(contentMappings)
      .set(mapping)
      .where(eq(contentMappings.id, id))
      .returning();
    return updated;
  }

  // Revision Changes
  async getRevisionChanges(revisionSetId: number): Promise<RevisionChange[]> {
    return await db.select().from(revisionChanges)
      .where(eq(revisionChanges.revisionSetId, revisionSetId))
      .orderBy(revisionChanges.createdAt);
  }

  async createRevisionChange(change: InsertRevisionChange): Promise<RevisionChange> {
    const [created] = await db.insert(revisionChanges).values(change).returning();
    return created;
  }

  async updateRevisionChange(id: number, change: Partial<InsertRevisionChange>): Promise<RevisionChange | undefined> {
    const [updated] = await db.update(revisionChanges)
      .set(change)
      .where(eq(revisionChanges.id, id))
      .returning();
    return updated;
  }

  async markChangeAsReviewed(id: number, reviewedBy: number): Promise<RevisionChange | undefined> {
    const [updated] = await db.update(revisionChanges)
      .set({
        reviewed: true,
        reviewedBy: reviewedBy,
        reviewedAt: new Date()
      })
      .where(eq(revisionChanges.id, id))
      .returning();
    return updated;
  }

  async getExtractedDataItem(id: number): Promise<ExtractedData | undefined> {
    const [item] = await db.select().from(extractedData).where(eq(extractedData.id, id));
    return item;
  }
}

export const storage = new DatabaseStorage();