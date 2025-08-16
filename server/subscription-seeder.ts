import { storage } from './simple-storage';

export async function seedSubscriptionPlans() {
  try {
    // Check if plans already exist
    const existingPlans = await storage.getSubscriptionPlans();
    if (existingPlans.length > 0) {
      console.log('Subscription plans already exist, skipping seeding');
      return;
    }

    // Create Free Trial plan
    await storage.createSubscriptionPlan({
      name: 'Free Trial',
      planId: 'free',
      monthlyPrice: 0,
      features: [
        '1 free drawing upload',
        '100 free AI extractions',
        'Basic OCR processing',
        'PDF viewing and navigation'
      ],
      maxDrawings: 1,
      maxExtractions: 100,
      trialPeriodDays: 0,
      isActive: true
    });

    // Create Hi-LYTE Pro plan
    await storage.createSubscriptionPlan({
      name: 'Hi-LYTE Pro',
      planId: 'pro',
      monthlyPrice: 49.99,
      features: [
        'Unlimited drawing uploads',
        'Unlimited AI extractions (requires your Anthropic API key)',
        'Advanced OCR processing',
        'Real-time collaboration',
        'Premium PDF processing',
        'Export to CSV/Excel',
        'Priority support'
      ],
      maxDrawings: null, // unlimited
      maxExtractions: null, // unlimited
      trialPeriodDays: 0,
      stripePriceId: 'price_koncurent_pro_monthly', // To be set when Stripe is configured
      isActive: true
    });

    // Create Koncurent Pro plan (future expansion)
    await storage.createSubscriptionPlan({
      name: 'Koncurent Pro',
      planId: 'enterprise',
      monthlyPrice: 0, // Contact Us pricing
      features: [
        'Everything in Pro',
        'Team collaboration (up to 50 users)',
        'Advanced API access',
        'Custom integrations',
        'Dedicated support',
        'Custom branding',
        'SSO integration'
      ],
      maxDrawings: null,
      maxExtractions: null,
      trialPeriodDays: 14,
      stripePriceId: 'price_koncurent_enterprise_monthly',
      isActive: true
    });

    console.log('Subscription plans seeded successfully');
  } catch (error) {
    console.error('Error seeding subscription plans:', error);
  }
}