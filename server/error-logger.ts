import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

interface ErrorLogEntry {
  timestamp: string;
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  message: string;
  stack?: string;
  userId?: string;
  userEmail?: string;
  route?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  requestBody?: any;
  metadata?: Record<string, any>;
}

class ErrorLogger {
  private logFilePath: string;
  private maxLogSize: number = 10 * 1024 * 1024; // 10MB
  private maxLogFiles: number = 5;

  constructor() {
    this.logFilePath = path.join(process.cwd(), 'logs', 'app.log');
    this.ensureLogDirectory();
  }

  private ensureLogDirectory() {
    const logDir = path.dirname(this.logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  private async rotateLogsIfNeeded() {
    try {
      if (!fs.existsSync(this.logFilePath)) {
        return;
      }

      const stats = fs.statSync(this.logFilePath);
      if (stats.size > this.maxLogSize) {
        // Rotate logs
        for (let i = this.maxLogFiles - 1; i > 0; i--) {
          const oldFile = `${this.logFilePath}.${i}`;
          const newFile = `${this.logFilePath}.${i + 1}`;
          
          if (fs.existsSync(oldFile)) {
            if (i === this.maxLogFiles - 1) {
              fs.unlinkSync(oldFile); // Delete oldest log
            } else {
              fs.renameSync(oldFile, newFile);
            }
          }
        }
        
        fs.renameSync(this.logFilePath, `${this.logFilePath}.1`);
      }
    } catch (error) {
      console.error('Error rotating logs:', error);
    }
  }

  private async writeLog(entry: ErrorLogEntry) {
    try {
      await this.rotateLogsIfNeeded();
      const logLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.logFilePath, logLine);
    } catch (error) {
      console.error('Error writing to log file:', error);
    }
  }

  async logError(error: Error, context?: {
    userId?: string;
    userEmail?: string;
    route?: string;
    method?: string;
    userAgent?: string;
    ip?: string;
    requestBody?: any;
    metadata?: Record<string, any>;
  }) {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message: error.message,
      stack: error.stack,
      ...context
    };

    await this.writeLog(entry);
    
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', entry);
    }
  }

  async logWarning(message: string, context?: {
    userId?: string;
    userEmail?: string;
    route?: string;
    metadata?: Record<string, any>;
  }) {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message,
      ...context
    };

    await this.writeLog(entry);
  }

  async logInfo(message: string, context?: {
    userId?: string;
    userEmail?: string;
    route?: string;
    metadata?: Record<string, any>;
  }) {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      ...context
    };

    await this.writeLog(entry);
  }

  async logUserAction(action: string, userId: string, userEmail: string, metadata?: Record<string, any>) {
    await this.logInfo(`User action: ${action}`, {
      userId,
      userEmail,
      metadata: {
        action,
        ...metadata
      }
    });
  }

  // Get recent logs for admin dashboard
  async getRecentLogs(limit: number = 100): Promise<ErrorLogEntry[]> {
    try {
      if (!fs.existsSync(this.logFilePath)) {
        return [];
      }

      const content = fs.readFileSync(this.logFilePath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line);
      
      // Get last N lines and parse them
      const recentLines = lines.slice(-limit);
      const logs: ErrorLogEntry[] = [];

      for (const line of recentLines) {
        try {
          const entry = JSON.parse(line);
          logs.push(entry);
        } catch (parseError) {
          // Skip malformed log entries
        }
      }

      return logs.reverse(); // Most recent first
    } catch (error) {
      console.error('Error reading logs:', error);
      return [];
    }
  }

  // Get error statistics for dashboard
  async getErrorStats(hours: number = 24): Promise<{
    totalErrors: number;
    totalWarnings: number;
    errorsByRoute: Record<string, number>;
    errorsByUser: Record<string, number>;
  }> {
    try {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      const logs = await this.getRecentLogs(1000); // Get more logs for analysis
      
      const recentLogs = logs.filter(log => 
        new Date(log.timestamp) > cutoffTime
      );

      const stats = {
        totalErrors: 0,
        totalWarnings: 0,
        errorsByRoute: {} as Record<string, number>,
        errorsByUser: {} as Record<string, number>
      };

      for (const log of recentLogs) {
        if (log.level === 'ERROR') {
          stats.totalErrors++;
          
          if (log.route) {
            stats.errorsByRoute[log.route] = (stats.errorsByRoute[log.route] || 0) + 1;
          }
          
          if (log.userEmail) {
            stats.errorsByUser[log.userEmail] = (stats.errorsByUser[log.userEmail] || 0) + 1;
          }
        } else if (log.level === 'WARN') {
          stats.totalWarnings++;
        }
      }

      return stats;
    } catch (error) {
      console.error('Error generating stats:', error);
      return {
        totalErrors: 0,
        totalWarnings: 0,
        errorsByRoute: {},
        errorsByUser: {}
      };
    }
  }
}

// Singleton instance
export const errorLogger = new ErrorLogger();

// Express middleware for automatic error logging
export function errorLoggingMiddleware(error: Error, req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  
  errorLogger.logError(error, {
    userId: user?.id?.toString(),
    userEmail: user?.email,
    route: req.path,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    requestBody: req.method !== 'GET' ? req.body : undefined
  });

  // Continue with default error handling
  next(error);
}

// Middleware to log successful requests (for analytics)
export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // Override res.end to capture response info
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    const user = (req as any).user;
    
    // Log significant user actions
    if (user && (req.method !== 'GET' || req.path.includes('/api/drawings'))) {
      errorLogger.logUserAction(`${req.method} ${req.path}`, user.id?.toString(), user.email, {
        statusCode: res.statusCode,
        duration,
        userAgent: req.get('User-Agent')
      });
    }
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
}