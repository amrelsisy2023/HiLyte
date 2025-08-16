export interface Point {
  x: number;
  y: number;
}

export interface CanvasAnnotation {
  id: string;
  type: 'highlight' | 'rectangle' | 'circle';
  points: Point[];
  color: string;
  strokeWidth: number;
  opacity: number;
  divisionId: number;
}

export class CanvasManager {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private annotations: CanvasAnnotation[] = [];
  private currentAnnotation: CanvasAnnotation | null = null;
  private isDrawing = false;
  private tool = 'highlight';
  private color = '#E53E3E';
  private divisionId = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.canvas) return;

    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
  }

  private handleMouseDown(e: MouseEvent) {
    if (this.tool === 'pan') return;

    const rect = this.canvas!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.isDrawing = true;
    this.currentAnnotation = {
      id: `annotation-${Date.now()}`,
      type: this.tool as 'highlight' | 'rectangle' | 'circle',
      points: [{ x, y }],
      color: this.color,
      strokeWidth: 3,
      opacity: 0.5,
      divisionId: this.divisionId,
    };
  }

  private handleMouseMove(e: MouseEvent) {
    if (!this.isDrawing || !this.currentAnnotation || this.tool === 'pan') return;

    const rect = this.canvas!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.tool === 'highlight') {
      this.currentAnnotation.points.push({ x, y });
    } else {
      // For rectangle and circle, only keep start and current point
      this.currentAnnotation.points = [this.currentAnnotation.points[0], { x, y }];
    }

    this.redraw();
  }

  private handleMouseUp() {
    if (!this.isDrawing || !this.currentAnnotation) return;

    this.isDrawing = false;
    this.annotations.push(this.currentAnnotation);
    this.currentAnnotation = null;
    this.redraw();
  }

  private redraw() {
    if (!this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw all completed annotations
    this.annotations.forEach(annotation => {
      this.drawAnnotation(annotation);
    });

    // Draw current annotation being created
    if (this.currentAnnotation) {
      this.drawAnnotation(this.currentAnnotation);
    }
  }

  private drawAnnotation(annotation: CanvasAnnotation) {
    if (!this.ctx || annotation.points.length === 0) return;

    this.ctx.save();
    this.ctx.globalAlpha = annotation.opacity;
    this.ctx.strokeStyle = annotation.color;
    this.ctx.lineWidth = annotation.strokeWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    switch (annotation.type) {
      case 'highlight':
        this.drawHighlight(annotation.points);
        break;
      case 'rectangle':
        this.drawRectangle(annotation.points);
        break;
      case 'circle':
        this.drawCircle(annotation.points);
        break;
    }

    this.ctx.restore();
  }

  private drawHighlight(points: Point[]) {
    if (!this.ctx || points.length < 2) return;

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    
    this.ctx.stroke();
  }

  private drawRectangle(points: Point[]) {
    if (!this.ctx || points.length < 2) return;

    const [start, end] = points;
    const width = end.x - start.x;
    const height = end.y - start.y;

    this.ctx.beginPath();
    this.ctx.rect(start.x, start.y, width, height);
    this.ctx.stroke();
  }

  private drawCircle(points: Point[]) {
    if (!this.ctx || points.length < 2) return;

    const [start, end] = points;
    const radius = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );

    this.ctx.beginPath();
    this.ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
    this.ctx.stroke();
  }

  public setTool(tool: string) {
    this.tool = tool;
  }

  public setColor(color: string) {
    this.color = color;
  }

  public setDivisionId(divisionId: number) {
    this.divisionId = divisionId;
  }

  public getAnnotations(): CanvasAnnotation[] {
    return [...this.annotations];
  }

  public clearAnnotations() {
    this.annotations = [];
    this.redraw();
  }

  public loadAnnotations(annotations: CanvasAnnotation[]) {
    this.annotations = [...annotations];
    this.redraw();
  }

  public undo() {
    if (this.annotations.length > 0) {
      this.annotations.pop();
      this.redraw();
    }
  }

  public canUndo(): boolean {
    return this.annotations.length > 0;
  }
}
