import crypto from 'crypto';
import { storage } from './storage';

// In-memory storage for verification codes (in production, use Redis or database)
const verificationCodes = new Map<string, {
  code: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  userId: number;
  method: 'sms' | 'email';
}>();

// Generate a 6-digit verification code
export function generateVerificationCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// Store verification code with expiration
export function storeVerificationCode(
  userId: number, 
  method: 'sms' | 'email', 
  code: string,
  expiresInMinutes: number = 10
): string {
  const key = `${userId}:${method}`;
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);
  
  verificationCodes.set(key, {
    code,
    expiresAt,
    attempts: 0,
    maxAttempts: 3,
    userId,
    method
  });
  
  return key;
}

// Verify a code
export function verifyCode(userId: number, method: 'sms' | 'email', inputCode: string): {
  success: boolean;
  error?: string;
  attemptsRemaining?: number;
} {
  const key = `${userId}:${method}`;
  const stored = verificationCodes.get(key);
  
  if (!stored) {
    return { success: false, error: 'No verification code found. Please request a new one.' };
  }
  
  if (new Date() > stored.expiresAt) {
    verificationCodes.delete(key);
    return { success: false, error: 'Verification code has expired. Please request a new one.' };
  }
  
  stored.attempts++;
  
  if (stored.attempts > stored.maxAttempts) {
    verificationCodes.delete(key);
    return { success: false, error: 'Too many failed attempts. Please request a new code.' };
  }
  
  if (stored.code !== inputCode) {
    return { 
      success: false, 
      error: 'Invalid verification code. Please try again.',
      attemptsRemaining: stored.maxAttempts - stored.attempts
    };
  }
  
  // Success - remove the code
  verificationCodes.delete(key);
  return { success: true };
}

// Send SMS verification code (mock implementation - integrate with Twilio, AWS SNS, etc.)
export async function sendSMSCode(phoneNumber: string, code: string): Promise<boolean> {
  console.log(`[SMS Mock] Sending code ${code} to ${phoneNumber}`);
  
  // In production, integrate with SMS service:
  // try {
  //   await twilioClient.messages.create({
  //     body: `Your Hi-LYTE verification code is: ${code}. This code expires in 10 minutes.`,
  //     from: process.env.TWILIO_PHONE_NUMBER,
  //     to: phoneNumber
  //   });
  //   return true;
  // } catch (error) {
  //   console.error('SMS send error:', error);
  //   return false;
  // }
  
  // For demo purposes, always return success
  return true;
}

// Send email verification code
export async function sendEmailCode(email: string, code: string): Promise<boolean> {
  console.log(`[Email Mock] Sending code ${code} to ${email}`);
  
  // In production, integrate with email service (SendGrid is already configured):
  // try {
  //   const emailService = require('./email-service');
  //   await emailService.sendEmail({
  //     to: email,
  //     subject: 'Your Hi-LYTE Verification Code',
  //     html: `
  //       <h2>Verification Code</h2>
  //       <p>Your verification code is: <strong>${code}</strong></p>
  //       <p>This code expires in 10 minutes.</p>
  //       <p>If you didn't request this code, please ignore this email.</p>
  //     `
  //   });
  //   return true;
  // } catch (error) {
  //   console.error('Email send error:', error);
  //   return false;
  // }
  
  // For demo purposes, always return success
  return true;
}

// Clean up expired codes (call periodically)
export function cleanupExpiredCodes(): void {
  const now = new Date();
  for (const [key, data] of verificationCodes.entries()) {
    if (now > data.expiresAt) {
      verificationCodes.delete(key);
    }
  }
}

// Send verification code via SMS or email
export async function sendVerificationCode(
  userId: number, 
  method: 'sms' | 'email', 
  contact: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const code = generateVerificationCode();
    storeVerificationCode(userId, method, code);
    
    let sent = false;
    if (method === 'sms') {
      sent = await sendSMSCode(contact, code);
    } else {
      sent = await sendEmailCode(contact, code);
    }
    
    if (sent) {
      return { 
        success: true, 
        message: `Verification code sent to your ${method === 'sms' ? 'phone' : 'email'}` 
      };
    } else {
      return { 
        success: false, 
        message: `Failed to send ${method === 'sms' ? 'SMS' : 'email'}. Please try again.` 
      };
    }
  } catch (error) {
    console.error('Send verification code error:', error);
    return { 
      success: false, 
      message: 'Failed to send verification code. Please try again.' 
    };
  }
}

// Verify code with userId only (for simple 2FA flow)
export function verifySimpleCode(userId: number, inputCode: string): {
  success: boolean;
  message?: string;
} {
  // Try both SMS and email methods since we don't know which one was used
  const smsResult = verifyCode(userId, 'sms', inputCode);
  if (smsResult.success) {
    return { success: true };
  }
  
  const emailResult = verifyCode(userId, 'email', inputCode);
  if (emailResult.success) {
    return { success: true };
  }
  
  // Return the most relevant error message
  return { 
    success: false, 
    message: smsResult.error || emailResult.error || 'Invalid verification code' 
  };
}

// Start cleanup interval
setInterval(cleanupExpiredCodes, 5 * 60 * 1000); // Clean up every 5 minutes