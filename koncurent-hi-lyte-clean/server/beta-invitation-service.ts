import { db } from "./db";
import { betaInvitations, waitlist, users, type BetaInvitation, type InsertBetaInvitation, type WaitlistEntry, type InsertWaitlistEntry } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { sendEmail } from "./email-service";
import crypto from "crypto";

export class BetaInvitationService {
  // Generate unique invitation code
  private generateInvitationCode(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Check if email is on beta invitation list
  async checkBetaAccess(email: string): Promise<{ 
    hasAccess: boolean; 
    status: 'invited' | 'none' | 'waitlisted' | 'expired'; 
    invitation?: BetaInvitation;
  }> {
    const [invitation] = await db
      .select()
      .from(betaInvitations)
      .where(eq(betaInvitations.email, email));

    if (!invitation) {
      // Check if user is on waitlist
      const [waitlistEntry] = await db
        .select()
        .from(waitlist)
        .where(eq(waitlist.email, email));

      return {
        hasAccess: false,
        status: waitlistEntry ? 'waitlisted' : 'none'
      };
    }

    // Check if invitation is expired
    if (invitation.expiresAt < new Date()) {
      return {
        hasAccess: false,
        status: 'expired',
        invitation
      };
    }

    return {
      hasAccess: invitation.status === 'pending' || invitation.status === 'accepted',
      status: 'invited',
      invitation
    };
  }

  // Send beta invitation
  async sendBetaInvitation(
    email: string, 
    invitedBy: string,
    personalMessage?: string
  ): Promise<BetaInvitation> {
    const invitationCode = this.generateInvitationCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Expires in 30 days

    const [invitation] = await db
      .insert(betaInvitations)
      .values({
        email,
        invitationCode,
        invitedBy,
        expiresAt,
      })
      .returning();

    // Send invitation email
    const invitationUrl = `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:3000'}/beta-invite/${invitationCode}`;
    
    const emailContent = `
      <h2>You're Invited to the Koncurent Hi-LYTE Beta!</h2>
      
      <p>Hello,</p>
      
      <p>You've been invited by ${invitedBy} to participate in the exclusive beta testing of Koncurent Hi-LYTE, our revolutionary AI-powered construction document analysis platform.</p>
      
      ${personalMessage ? `<p><strong>Personal message:</strong> ${personalMessage}</p>` : ''}
      
      <p><strong>What is Koncurent Hi-LYTE?</strong><br>
      Our platform transforms complex PDF drawing analysis into an intuitive, automated process. Extract critical construction data, manage revision tracking, and streamline project workflows with cutting-edge AI technology.</p>
      
      <p><strong>Your beta access includes:</strong></p>
      <ul>
        <li>Full access to all AI-powered extraction features</li>
        <li>$10 in free AI credits to get started</li>
        <li>Priority support and feedback channels</li>
        <li>Early access to new features</li>
      </ul>
      
      <p><a href="${invitationUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accept Your Beta Invitation</a></p>
      
      <p>This invitation expires in 30 days. If you have any questions, please don't hesitate to reach out.</p>
      
      <p>Welcome to the future of construction document intelligence!</p>
      
      <p>Best regards,<br>
      The Koncurent Hi-LYTE Team</p>
      
      <hr>
      <p><small>If the button doesn't work, copy and paste this link: ${invitationUrl}</small></p>
    `;

    await sendEmail({
      to: email,
      from: 'noreply@hilyte.koncurent.com',
      subject: 'Your Exclusive Beta Invitation to Koncurent Hi-LYTE',
      html: emailContent,
    });

    return invitation;
  }

  // Accept beta invitation
  async acceptInvitation(invitationCode: string): Promise<{ success: boolean; message: string; invitation?: BetaInvitation; }> {
    const [invitation] = await db
      .select()
      .from(betaInvitations)
      .where(eq(betaInvitations.invitationCode, invitationCode));

    if (!invitation) {
      return { success: false, message: 'Invalid invitation code' };
    }

    if (invitation.expiresAt < new Date()) {
      return { success: false, message: 'This invitation has expired' };
    }

    if (invitation.status === 'accepted') {
      return { success: false, message: 'This invitation has already been accepted' };
    }

    // Mark invitation as accepted
    const [updatedInvitation] = await db
      .update(betaInvitations)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
      })
      .where(eq(betaInvitations.id, invitation.id))
      .returning();

    // Update user beta status if they already have an account
    await db
      .update(users)
      .set({
        betaStatus: 'invited',
        betaInvitedAt: new Date(),
        invitedByAdmin: invitation.invitedBy,
      })
      .where(eq(users.email, invitation.email));

    return { 
      success: true, 
      message: 'Beta invitation accepted successfully!', 
      invitation: updatedInvitation 
    };
  }

  // Add to waitlist
  async addToWaitlist(data: InsertWaitlistEntry): Promise<WaitlistEntry> {
    const [waitlistEntry] = await db
      .insert(waitlist)
      .values(data)
      .returning();

    // Send waitlist confirmation email
    const emailContent = `
      <h2>Thank You for Your Interest in Koncurent Hi-LYTE!</h2>
      
      <p>Hello ${data.firstName || ''},</p>
      
      <p>Thank you for signing up for the Koncurent Hi-LYTE beta! You've been added to our exclusive waitlist.</p>
      
      <p><strong>What happens next?</strong></p>
      <ul>
        <li>We'll review your application and prioritize based on your project needs</li>
        <li>You'll receive an email invitation when a beta spot becomes available</li>
        <li>Priority is given to active construction professionals with immediate project needs</li>
      </ul>
      
      <p><strong>In the meantime:</strong></p>
      <ul>
        <li>Follow us for updates on our progress</li>
        <li>Share with colleagues who might benefit from automated drawing analysis</li>
        <li>Prepare your construction drawings for when you get access</li>
      </ul>
      
      <p>We're working hard to bring you the most advanced construction document intelligence platform available. Thank you for your patience!</p>
      
      <p>Best regards,<br>
      The Koncurent Hi-LYTE Team</p>
    `;

    await sendEmail({
      to: data.email,
      from: 'noreply@hilyte.koncurent.com',
      subject: 'Welcome to the Koncurent Hi-LYTE Beta Waitlist!',
      html: emailContent,
    });

    return waitlistEntry;
  }

  // Get invitation by code
  async getInvitationByCode(code: string): Promise<BetaInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(betaInvitations)
      .where(eq(betaInvitations.invitationCode, code));

    return invitation;
  }

  // Admin functions
  async getAllInvitations(limit: number = 50, offset: number = 0): Promise<BetaInvitation[]> {
    return await db
      .select()
      .from(betaInvitations)
      .orderBy(sql`${betaInvitations.createdAt} DESC`)
      .limit(limit)
      .offset(offset);
  }

  async getWaitlist(limit: number = 50, offset: number = 0): Promise<WaitlistEntry[]> {
    return await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.status, 'waiting'))
      .orderBy(sql`${waitlist.priority} DESC, ${waitlist.createdAt} ASC`)
      .limit(limit)
      .offset(offset);
  }

  async getWaitlistStats(): Promise<{
    totalWaiting: number;
    totalInvited: number;
    totalConverted: number;
    recentSignups: number;
  }> {
    const allWaitlist = await db.select().from(waitlist);
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7);
    
    const recentSignups = allWaitlist.filter(entry => 
      entry.createdAt && entry.createdAt >= recentDate
    ).length;

    return {
      totalWaiting: allWaitlist.filter(e => e.status === 'waiting').length,
      totalInvited: allWaitlist.filter(e => e.status === 'invited').length,
      totalConverted: allWaitlist.filter(e => e.status === 'converted').length,
      recentSignups,
    };
  }

  // Promote waitlist entry to invitation
  async promoteFromWaitlist(waitlistId: number, invitedBy: string): Promise<{ success: boolean; message: string; }> {
    const [waitlistEntry] = await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.id, waitlistId));

    if (!waitlistEntry) {
      return { success: false, message: 'Waitlist entry not found' };
    }

    // Check if already invited
    const [existingInvitation] = await db
      .select()
      .from(betaInvitations)
      .where(eq(betaInvitations.email, waitlistEntry.email));

    if (existingInvitation) {
      return { success: false, message: 'User already has an invitation' };
    }

    // Send invitation
    await this.sendBetaInvitation(waitlistEntry.email, invitedBy);

    // Update waitlist status
    await db
      .update(waitlist)
      .set({
        status: 'invited',
        notifiedAt: new Date(),
      })
      .where(eq(waitlist.id, waitlistId));

    return { success: true, message: 'Beta invitation sent successfully!' };
  }
}

export const betaInvitationService = new BetaInvitationService();