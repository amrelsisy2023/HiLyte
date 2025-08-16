import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Building, 
  Users, 
  FileText, 
  Zap,
  Crown,
  ChevronRight
} from 'lucide-react';

interface WizardQuestion {
  id: string;
  question: string;
  options: {
    value: string;
    label: string;
    description?: string;
  }[];
}

interface PlanRecommendation {
  planId: 'free' | 'pro' | 'enterprise';
  planName: string;
  confidence: number;
  reasons: string[];
  pricing: string;
  icon: any;
}

const wizardQuestions: WizardQuestion[] = [
  {
    id: 'company_size',
    question: 'What size is your organization?',
    options: [
      { value: 'individual', label: 'Individual/Freelancer', description: 'Just me working on projects' },
      { value: 'small_team', label: 'Small Team (2-10 people)', description: 'Small construction team or firm' },
      { value: 'medium_company', label: 'Medium Company (11-50 people)', description: 'Growing construction company' },
      { value: 'large_enterprise', label: 'Large Enterprise (50+ people)', description: 'Major construction firm or GC' }
    ]
  },
  {
    id: 'monthly_drawings',
    question: 'How many drawings do you process monthly?',
    options: [
      { value: 'few', label: '1-5 drawings', description: 'Occasional project documentation' },
      { value: 'moderate', label: '6-25 drawings', description: 'Regular project work' },
      { value: 'high', label: '26-100 drawings', description: 'High-volume processing' },
      { value: 'enterprise', label: '100+ drawings', description: 'Enterprise-level volume' }
    ]
  },
  {
    id: 'collaboration_needs',
    question: 'Do you need team collaboration features?',
    options: [
      { value: 'none', label: 'No collaboration needed', description: 'Working independently' },
      { value: 'basic', label: 'Basic sharing', description: 'Share results with a few people' },
      { value: 'team', label: 'Team collaboration', description: 'Multiple people working together' },
      { value: 'enterprise', label: 'Enterprise collaboration', description: 'Large team coordination' }
    ]
  },
  {
    id: 'budget_priority',
    question: 'What\'s your budget priority?',
    options: [
      { value: 'free', label: 'Free/Trial first', description: 'Want to test before committing' },
      { value: 'value', label: 'Best value for money', description: 'Good features at reasonable price' },
      { value: 'premium', label: 'Premium features', description: 'Need advanced capabilities' },
      { value: 'enterprise', label: 'Custom enterprise solution', description: 'Tailored to organization needs' }
    ]
  },
  {
    id: 'use_case',
    question: 'What\'s your primary use case?',
    options: [
      { value: 'testing', label: 'Testing the platform', description: 'Evaluating Hi-LYTE capabilities' },
      { value: 'project_work', label: 'Active project work', description: 'Regular construction document processing' },
      { value: 'business_ops', label: 'Core business operations', description: 'Essential to daily operations' },
      { value: 'procurement', label: 'Procurement management', description: 'Need procurement tracking features' }
    ]
  }
];

export default function PricingWizard({ onClose, onRecommendation }: {
  onClose: () => void;
  onRecommendation: (plan: PlanRecommendation) => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showRecommendation, setShowRecommendation] = useState(false);

  const progress = ((currentStep + 1) / wizardQuestions.length) * 100;

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const [recommendation, setRecommendation] = useState<PlanRecommendation | null>(null);

  const nextStep = () => {
    if (currentStep < wizardQuestions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      const result = generateRecommendation();
      setRecommendation(result);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const generateRecommendation = (): PlanRecommendation => {
    const {
      company_size,
      monthly_drawings,
      collaboration_needs,
      budget_priority,
      use_case
    } = answers;

    let recommendation: PlanRecommendation;

    // Scoring system for plan recommendation
    let freeScore = 0;
    let proScore = 0;
    let enterpriseScore = 0;

    // Company size scoring
    if (company_size === 'individual') {
      freeScore += 3; proScore += 1;
    } else if (company_size === 'small_team') {
      freeScore += 1; proScore += 3; enterpriseScore += 1;
    } else if (company_size === 'medium_company') {
      proScore += 2; enterpriseScore += 3;
    } else if (company_size === 'large_enterprise') {
      enterpriseScore += 4;
    }

    // Monthly drawings scoring
    if (monthly_drawings === 'few') {
      freeScore += 3; proScore += 1;
    } else if (monthly_drawings === 'moderate') {
      proScore += 3; enterpriseScore += 1;
    } else if (monthly_drawings === 'high') {
      proScore += 2; enterpriseScore += 3;
    } else if (monthly_drawings === 'enterprise') {
      enterpriseScore += 4;
    }

    // Collaboration needs scoring
    if (collaboration_needs === 'none') {
      freeScore += 2; proScore += 1;
    } else if (collaboration_needs === 'basic') {
      proScore += 3;
    } else if (collaboration_needs === 'team') {
      proScore += 2; enterpriseScore += 2;
    } else if (collaboration_needs === 'enterprise') {
      enterpriseScore += 4;
    }

    // Budget priority scoring
    if (budget_priority === 'free') {
      freeScore += 4;
    } else if (budget_priority === 'value') {
      proScore += 3;
    } else if (budget_priority === 'premium') {
      proScore += 1; enterpriseScore += 2;
    } else if (budget_priority === 'enterprise') {
      enterpriseScore += 4;
    }

    // Use case scoring
    if (use_case === 'testing') {
      freeScore += 4;
    } else if (use_case === 'project_work') {
      proScore += 3;
    } else if (use_case === 'business_ops') {
      proScore += 2; enterpriseScore += 2;
    } else if (use_case === 'procurement') {
      enterpriseScore += 4;
    }

    // Determine recommendation based on highest score
    const maxScore = Math.max(freeScore, proScore, enterpriseScore);
    let confidence = Math.min(95, Math.max(60, (maxScore / 20) * 100));

    if (maxScore === freeScore) {
      recommendation = {
        planId: 'free',
        planName: 'Free Trial',
        confidence,
        reasons: [
          'Perfect for testing Hi-LYTE capabilities',
          'No financial commitment required',
          'Great for individual use or small projects',
          'Includes basic OCR and PDF viewing'
        ],
        pricing: 'Free',
        icon: Zap
      };
    } else if (maxScore === proScore) {
      recommendation = {
        planId: 'pro',
        planName: 'Hi-LYTE Pro',
        confidence,
        reasons: [
          'Unlimited drawing uploads and extractions',
          'Advanced OCR processing capabilities',
          'Real-time collaboration features',
          'Best value for active construction work'
        ],
        pricing: '$19.99/month',
        icon: Crown
      };
    } else {
      recommendation = {
        planId: 'enterprise',
        planName: 'Koncurent Pro',
        confidence,
        reasons: [
          'Includes procurement management platform',
          'Supports large team collaboration',
          'Custom integrations and branding',
          'Dedicated support and account management'
        ],
        pricing: 'Contact Us /project /year',
        icon: Building
      };
    }

    setShowRecommendation(true);
    onRecommendation(recommendation);
    return recommendation;
  };

  const currentQuestion = wizardQuestions[currentStep];
  const canProceed = answers[currentQuestion?.id];

  if (showRecommendation && recommendation) {
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Perfect Match Found!</CardTitle>
            <CardDescription>
              Based on your answers, we recommend the following plan
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Card className="border-2 border-blue-500 bg-blue-50/50 dark:bg-blue-900/20">
              <CardHeader className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <recommendation.icon className="w-6 h-6 text-blue-600" />
                  <CardTitle className="text-xl">{recommendation.planName}</CardTitle>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  {recommendation.confidence}% Match
                </Badge>
                <div className="text-2xl font-bold text-blue-600 mt-2">
                  {recommendation.pricing}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <h4 className="font-semibold">Why this plan is perfect for you:</h4>
                  {recommendation.reasons.map((reason, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{reason}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button 
                onClick={() => {
                  onClose();
                  // Navigate to appropriate action based on plan
                  if (recommendation.planId === 'free') {
                    // Start free trial
                  } else if (recommendation.planId === 'pro') {
                    // Go to subscription page
                    window.location.href = '/subscription';
                  } else {
                    // Contact sales
                  }
                }}
                className="flex-1"
              >
                Get Started with {recommendation.planName}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Find Your Perfect Plan</CardTitle>
              <CardDescription>
                Answer a few questions to get a personalized recommendation
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Step {currentStep + 1} of {wizardQuestions.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">
              {currentQuestion.question}
            </h3>

            <RadioGroup
              value={answers[currentQuestion.id] || ''}
              onValueChange={(value) => handleAnswer(currentQuestion.id, value)}
              className="space-y-3"
            >
              {currentQuestion.options.map((option) => (
                <div key={option.value} className="flex items-start space-x-3">
                  <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={option.value} className="font-medium cursor-pointer">
                      {option.label}
                    </Label>
                    {option.description && (
                      <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            
            <Button
              onClick={nextStep}
              disabled={!canProceed}
            >
              {currentStep === wizardQuestions.length - 1 ? 'Get Recommendation' : 'Next'}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}