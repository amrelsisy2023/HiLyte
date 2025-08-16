import twilio from 'twilio';
import sgMail from '@sendgrid/mail';
import crypto from 'crypto';

// Initialize Twilio client with error checking
if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
  console.error('[SMS] Missing Twilio configuration:', {
    hasSID: !!process.env.TWILIO_ACCOUNT_SID,
    hasToken: !!process.env.TWILIO_AUTH_TOKEN,
    hasPhone: !!process.env.TWILIO_PHONE_NUMBER
  });
}

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

// Initialize SendGrid with error checking
if (!process.env.SENDGRID_API_KEY) {
  console.error('[Email] Missing SendGrid API key');
} else {
  console.log('[Email] SendGrid API key configured');
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

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

// Format phone number to E.164 format
function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // If it starts with 1 and has 11 digits, it's likely US/Canada format
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // If it has 10 digits, assume US/Canada and add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // If it doesn't start with +, add it
  if (!phoneNumber.startsWith('+')) {
    return `+${digits}`;
  }
  
  return phoneNumber;
}

// Send SMS verification code via Twilio
export async function sendSMSVerificationCode(phoneNumber: string, code: string): Promise<boolean> {
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    console.log(`[SMS] Attempting to send verification code ${code} to ${phoneNumber} (formatted: ${formattedPhone})`);
    
    const message = await twilioClient.messages.create({
      body: `Your Koncurent Hi-LYTE code is: ${code}`,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: formattedPhone
    });
    
    console.log(`[SMS] Successfully sent verification code ${code} to ${formattedPhone} (SID: ${message.sid})`);
    return true;
  } catch (error) {
    console.error('[SMS] Failed to send verification code:', error);
    console.error('[SMS] Error details:', JSON.stringify(error, null, 2));
    return false;
  }
}

// Send email verification code via SendGrid
export async function sendEmailVerificationCode(email: string, code: string): Promise<boolean> {
  try {
    console.log(`[Email] Attempting to send verification code ${code} to ${email}`);
    
    const msg = {
      to: email,
      from: 'verification@replit.dev', // Use a verified sender email that works
      subject: 'Koncurent Hi-LYTE Verification Code',
      text: `Your Koncurent Hi-LYTE code is: ${code}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Koncurent Hi-LYTE Verification Code</h2>
          <p>Your verification code is:</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0;">
            ${code}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          <hr style="margin: 30px 0;">
          <p style="color: #6b7280; font-size: 12px;">This is an automated message from Koncurent Hi-LYTE.</p>
        </div>
      `
    };

    const result = await sgMail.send(msg);
    console.log(`[Email] Successfully sent verification code ${code} to ${email}`, result[0].statusCode);
    return true;
  } catch (error: any) {
    console.error('[Email] Failed to send verification code:', error);
    console.error('[Email] Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.body
    });
    return false;
  }
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

// Clean up expired codes (run periodically)
export function cleanupExpiredCodes(): void {
  const now = new Date();
  const entries = Array.from(verificationCodes.entries());
  for (const [key, data] of entries) {
    if (now > data.expiresAt) {
      verificationCodes.delete(key);
    }
  }
}

// Setup periodic cleanup (every 5 minutes)
setInterval(cleanupExpiredCodes, 5 * 60 * 1000);