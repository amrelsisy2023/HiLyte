// Two-Factor Authentication types
export type TwoFactorMethod = 'totp' | 'sms' | 'email';

export interface TwoFactorSetupData {
  method: TwoFactorMethod;
  secret?: string; // For TOTP only
  qrCode?: string; // For TOTP only
  backupCodes: string[];
  manualEntryKey?: string; // For TOTP only
  phoneNumber?: string; // For SMS only
  email?: string; // For email only
}

export interface VerificationCodeData {
  code: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
}