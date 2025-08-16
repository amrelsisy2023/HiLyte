import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Shield, Users } from "lucide-react";
import kLogoPath from "@assets/Hubspot Scheduler Logo Image (1)_1751563530272.png";



export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img src={kLogoPath} alt="Koncurent" className="h-24 w-24 rounded-lg object-contain" />
            <h1 className="text-4xl font-bold text-gray-900">Koncurent Hi-LYTE</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Advanced PDF data extraction and document analysis for construction drawings
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center">
            <CardHeader>
              <Zap className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Smart OCR Technology</CardTitle>
              <CardDescription>
                Advanced OCR with intelligent table extraction and spatial analysis
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <CardTitle>Secure & Reliable</CardTitle>
              <CardDescription>
                Your documents are processed securely with enterprise-grade reliability
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Users className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>Easy Collaboration</CardTitle>
              <CardDescription>
                Share projects and extracted data with your team seamlessly
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Get Started Today</CardTitle>
              <CardDescription>
                Create your account and start extracting data from your construction drawings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/register">
                <Button size="lg" className="w-full mb-4">
                  Create Account
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="w-full">
                  Sign In
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}