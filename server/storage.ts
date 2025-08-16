import { 
  projects, 
  drawings, 
  constructionDivisions, 
  extractedData,
  drawingProfiles,
  type Project,
  type InsertProject,
  type Drawing,
  type InsertDrawing,
  type ConstructionDivision,
  type InsertConstructionDivision,
  type ExtractedData,
  type InsertExtractedData,
  type DrawingProfile,
  type InsertDrawingProfile
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

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

  // Drawing Profiles
  getDrawingProfile(drawingId: number): Promise<DrawingProfile | undefined>;
  createDrawingProfile(profile: InsertDrawingProfile): Promise<DrawingProfile>;
  updateDrawingProfile(drawingId: number, profile: Partial<InsertDrawingProfile>): Promise<DrawingProfile | undefined>;
}

export class MemStorage implements IStorage {
  private projects: Map<number, Project> = new Map();
  private drawings: Map<number, Drawing> = new Map();
  private constructionDivisions: Map<number, ConstructionDivision> = new Map();
  
  private projectIdCounter = 1;
  private drawingIdCounter = 1;
  private divisionIdCounter = 1;

  constructor() {
    // Initialize with default construction divisions
    this.initializeDefaultDivisions();
  }

  private initializeDefaultDivisions() {
    const defaultDivisions = [
      { name: "03 - Concrete", color: "#8B4513", code: "03" },
      { name: "06 - Wood, Plastics, and Composites", color: "#D2691E", code: "06" },
      { name: "07 - Thermal and Moisture Protection", color: "#4B0082", code: "07" },
      { name: "08 - Openings", color: "#FF6347", code: "08" },
      { name: "09 - Finishes", color: "#FF69B4", code: "09" },
      { name: "10 - Specialties", color: "#00CED1", code: "10" },
      { name: "11 - Equipment", color: "#32CD32", code: "11" },
      { name: "12 - Furnishings", color: "#9370DB", code: "12" },
      { name: "22 - Plumbing", color: "#1E90FF", code: "22" },
      { name: "23 - HVAC", color: "#228B22", code: "23" },
      { name: "26 - Electrical", color: "#DC143C", code: "26" },
      { name: "28 - Electronic Safety and Security", color: "#FF8C00", code: "28" },
    ];

    defaultDivisions.forEach(division => {
      const id = this.divisionIdCounter++;
      this.constructionDivisions.set(id, { id, ...division, sortOrder: 0 });
    });
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(project: InsertProject): Promise<Project> {
    const id = this.projectIdCounter++;
    const newProject: Project = {
      id,
      name: project.name,
      description: project.description || null,
      createdAt: new Date(),
    };
    this.projects.set(id, newProject);
    return newProject;
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined> {
    const existing = this.projects.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...project };
    this.projects.set(id, updated);
    return updated;
  }

  async deleteProject(id: number): Promise<boolean> {
    return this.projects.delete(id);
  }

  // Drawings
  async getDrawings(projectId?: number): Promise<Drawing[]> {
    const allDrawings = Array.from(this.drawings.values());
    return projectId 
      ? allDrawings.filter(d => d.projectId === projectId)
      : allDrawings;
  }

  async getDrawing(id: number): Promise<Drawing | undefined> {
    return this.drawings.get(id);
  }

  async createDrawing(drawing: InsertDrawing): Promise<Drawing> {
    const id = this.drawingIdCounter++;
    const newDrawing: Drawing = {
      id,
      name: drawing.name,
      projectId: drawing.projectId || null,
      fileName: drawing.fileName,
      filePath: drawing.filePath,
      fileSize: drawing.fileSize,
      fileType: drawing.fileType,
      width: drawing.width || null,
      height: drawing.height || null,
      pageNumber: drawing.pageNumber || 1,
      totalPages: drawing.totalPages || 1,
      thumbnailPath: drawing.thumbnailPath || null,
      originalDrawingId: drawing.originalDrawingId || null,
      sheetMetadata: drawing.sheetMetadata || null,
      uploadedAt: new Date(),
    };
    this.drawings.set(id, newDrawing);
    return newDrawing;
  }

  async updateDrawing(id: number, drawing: Partial<InsertDrawing>): Promise<Drawing | undefined> {
    const existing = this.drawings.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...drawing };
    this.drawings.set(id, updated);
    return updated;
  }

  async deleteDrawing(id: number): Promise<boolean> {
    return this.drawings.delete(id);
  }

  // Construction Divisions
  async getConstructionDivisions(): Promise<ConstructionDivision[]> {
    return Array.from(this.constructionDivisions.values());
  }

  async getConstructionDivision(id: number): Promise<ConstructionDivision | undefined> {
    return this.constructionDivisions.get(id);
  }

  async createConstructionDivision(division: InsertConstructionDivision): Promise<ConstructionDivision> {
    const id = this.divisionIdCounter++;
    const newDivision: ConstructionDivision = { id, ...division };
    this.constructionDivisions.set(id, newDivision);
    return newDivision;
  }

  async updateConstructionDivision(id: number, division: Partial<InsertConstructionDivision>): Promise<ConstructionDivision | undefined> {
    const existing = this.constructionDivisions.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...division };
    this.constructionDivisions.set(id, updated);
    return updated;
  }

  async deleteConstructionDivision(id: number): Promise<boolean> {
    return this.constructionDivisions.delete(id);
  }

  // Annotations
  async getAnnotations(drawingId?: number): Promise<Annotation[]> {
    const allAnnotations = Array.from(this.annotations.values());
    return drawingId 
      ? allAnnotations.filter(a => a.drawingId === drawingId)
      : allAnnotations;
  }

  async getAnnotation(id: number): Promise<Annotation | undefined> {
    return this.annotations.get(id);
  }

  async createAnnotation(annotation: InsertAnnotation): Promise<Annotation> {
    const id = this.annotationIdCounter++;
    const newAnnotation: Annotation = {
      id,
      type: annotation.type,
      drawingId: annotation.drawingId || null,
      divisionId: annotation.divisionId || null,
      coordinates: annotation.coordinates,
      strokeWidth: annotation.strokeWidth || null,
      opacity: annotation.opacity || null,
      notes: annotation.notes || null,
      priority: annotation.priority || null,
      createdAt: new Date(),
    };
    this.annotations.set(id, newAnnotation);
    return newAnnotation;
  }

  async updateAnnotation(id: number, annotation: Partial<InsertAnnotation>): Promise<Annotation | undefined> {
    const existing = this.annotations.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...annotation };
    this.annotations.set(id, updated);
    return updated;
  }

  async deleteAnnotation(id: number): Promise<boolean> {
    return this.annotations.delete(id);
  }
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeDefaultDivisions();
  }

  private async initializeDefaultDivisions() {
    // Check if divisions already exist
    const existingDivisions = await db.select().from(constructionDivisions);
    if (existingDivisions.length > 0) return;

    const defaultDivisions = [
      { name: "03 - Concrete", color: "#8B4513", code: "03" },
      { name: "06 - Wood, Plastics, and Composites", color: "#D2691E", code: "06" },
      { name: "07 - Thermal and Moisture Protection", color: "#4B0082", code: "07" },
      { name: "08 - Openings", color: "#FF6347", code: "08" },
      { name: "09 - Finishes", color: "#FF69B4", code: "09" },
      { name: "10 - Specialties", color: "#00CED1", code: "10" },
      { name: "11 - Equipment", color: "#32CD32", code: "11" },
      { name: "12 - Furnishings", color: "#9370DB", code: "12" },
      { name: "22 - Plumbing", color: "#1E90FF", code: "22" },
      { name: "23 - HVAC", color: "#228B22", code: "23" },
      { name: "26 - Electrical", color: "#DC143C", code: "26" },
      { name: "28 - Electronic Safety and Security", color: "#FF8C00", code: "28" },
    ];

    await db.insert(constructionDivisions).values(defaultDivisions);
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db
      .insert(projects)
      .values({
        name: project.name,
        description: project.description || null,
      })
      .returning();
    return newProject;
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined> {
    const [updated] = await db
      .update(projects)
      .set(project)
      .where(eq(projects.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Drawings
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
    const [newDrawing] = await db
      .insert(drawings)
      .values({
        name: drawing.name,
        projectId: drawing.projectId || null,
        fileName: drawing.fileName,
        filePath: drawing.filePath,
        fileSize: drawing.fileSize,
        fileType: drawing.fileType,
        width: drawing.width || null,
        height: drawing.height || null,
      })
      .returning();
    return newDrawing;
  }

  async updateDrawing(id: number, drawing: Partial<InsertDrawing>): Promise<Drawing | undefined> {
    const [updated] = await db
      .update(drawings)
      .set(drawing)
      .where(eq(drawings.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteDrawing(id: number): Promise<boolean> {
    const result = await db.delete(drawings).where(eq(drawings.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Construction Divisions
  async getConstructionDivisions(): Promise<ConstructionDivision[]> {
    return await db.select().from(constructionDivisions);
  }

  async getConstructionDivision(id: number): Promise<ConstructionDivision | undefined> {
    const [division] = await db.select().from(constructionDivisions).where(eq(constructionDivisions.id, id));
    return division || undefined;
  }

  async createConstructionDivision(division: InsertConstructionDivision): Promise<ConstructionDivision> {
    const [newDivision] = await db
      .insert(constructionDivisions)
      .values(division)
      .returning();
    return newDivision;
  }

  async updateConstructionDivision(id: number, division: Partial<InsertConstructionDivision>): Promise<ConstructionDivision | undefined> {
    const [updated] = await db
      .update(constructionDivisions)
      .set(division)
      .where(eq(constructionDivisions.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteConstructionDivision(id: number): Promise<boolean> {
    const result = await db.delete(constructionDivisions).where(eq(constructionDivisions.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Annotations
  async getAnnotations(drawingId?: number): Promise<Annotation[]> {
    if (drawingId) {
      return await db.select().from(annotations).where(eq(annotations.drawingId, drawingId));
    }
    return await db.select().from(annotations);
  }

  async getAnnotation(id: number): Promise<Annotation | undefined> {
    const [annotation] = await db.select().from(annotations).where(eq(annotations.id, id));
    return annotation || undefined;
  }

  async createAnnotation(annotation: InsertAnnotation): Promise<Annotation> {
    const [newAnnotation] = await db
      .insert(annotations)
      .values({
        type: annotation.type,
        drawingId: annotation.drawingId || null,
        divisionId: annotation.divisionId || null,
        coordinates: annotation.coordinates,
        strokeWidth: annotation.strokeWidth || null,
        opacity: annotation.opacity || null,
        notes: annotation.notes || null,
        priority: annotation.priority || null,
      })
      .returning();
    return newAnnotation;
  }

  async updateAnnotation(id: number, annotation: Partial<InsertAnnotation>): Promise<Annotation | undefined> {
    const [updated] = await db
      .update(annotations)
      .set(annotation)
      .where(eq(annotations.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteAnnotation(id: number): Promise<boolean> {
    const result = await db.delete(annotations).where(eq(annotations.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
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
}

export const storage = new DatabaseStorage();
