import React from 'react';
import {
  Brain,
  FileSearch,
  BarChart3,
  Upload,
  Search,
  FileText,
  ArrowRight,
  Shield,
  Timer,
  LineChart,
  ExternalLink
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import FeatureCard from '../components/FeatureCard.jsx';
import StepCard from '../components/StepCard.jsx';
import BenefitCard from '../components/BenefitCard.jsx';

import { useAuth } from '../contexts/AuthContext';

function Home() {
  const { user } = useAuth();

  return (
    <div>
      {/* Hero Section */}
      <div
        className="relative min-h-screen flex items-center"
        style={{
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url("https://images.unsplash.com/photo-1550751827-4bd374c3f58b")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="container mx-auto px-6 py-24">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Revolutionizing Crime Analysis with AI
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-300">
              Leverage AI-powered insights to detect patterns, classify crimes, and generate comprehensive reports with precision.
            </p>
            {/* <div className="flex gap-4">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all">
                Get Started <ArrowRight size={20} />
              </button>
              <button className="border border-white hover:bg-white/10 text-white px-8 py-3 rounded-lg font-semibold transition-all">
                Request Demo
              </button>
            </div> */}
          </div>
        </div>
      </div>

      {/* Key Features Section */}
      <section className="py-24 bg-gray-900">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-16">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-12">
            <Link to="/ai-analysis">
              <FeatureCard
                icon=<Brain className="w-12 h-12 text-blue-500" />
                title="AI Crime Analysis"
                description="Advanced machine learning models analyze crime data to detect trends and patterns in real-time."
              />
            </Link>
            <Link to="/feature-extraction">
              <FeatureCard
                icon=<FileSearch className="w-12 h-12 text-blue-500" />
                title="Feature Extraction"
                description="Extract crucial insights from crime data and generate detailed, actionable reports."
              />
            </Link>
            <Link to="/crime-classification">
              <FeatureCard
                icon=<BarChart3 className="w-12 h-12 text-blue-500" />
                title="Crime Classification"
                description="AI categorizes crime types automatically for better law enforcement strategies."
              />
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-gray-800">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              icon=<Upload className="w-8 h-8" />
              title="Upload Crime Data"
              description="Easily upload or input crime data through our secure platform."
            />
            <StepCard
              number="2"
              icon=<Search className="w-8 h-8" />
              title="AI Analysis"
              description="Our AI analyzes and extracts key insights from your data."
            />
            <StepCard
              number="3"
              icon=<FileText className="w-8 h-8" />
              title="Generate Reports"
              description="Receive comprehensive reports and predictive insights."
            />
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-24 bg-gray-900">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-16">Impact & Benefits</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <BenefitCard
              icon=<Timer className="w-10 h-10 text-blue-500" />
              title="Faster Response"
              description="Reduce response times with real-time crime detection and analysis."
            />
            <BenefitCard
              icon=<Shield className="w-10 h-10 text-blue-500" />
              title="Enhanced Security"
              description="Improve law enforcement decision-making with data-driven insights."
            />
            <BenefitCard
              icon=<LineChart className="w-10 h-10 text-blue-500" />
              title="Predictive Analysis"
              description="Prevent crimes before they happen with predictive modeling."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="py-24 bg-blue-600">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-4xl font-bold mb-8">Try Our AI Crime Analysis System Today</h2>
            <p className="text-xl mb-12 max-w-2xl mx-auto">
              Join law enforcement agencies worldwide in revolutionizing crime prevention and analysis.
            </p>
            <Link to="/register" className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-200 transition-all flex items-center gap-2 mx-auto text-lg">
                          Sign Up for Free Trial <ExternalLink size={20} />
                        </Link>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">Contact Us</h3>
              <p className="text-gray-400">Email: info@aicrime.analysis</p>
              <p className="text-gray-400">Phone: +1 (555) 123-4567</p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Resources</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Documentation</a></li>
                <li><a href="#" className="hover:text-white">API Reference</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Follow Us</h3>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white">Twitter</a>
                <a href="#" className="text-gray-400 hover:text-white">LinkedIn</a>
                <a href="https://github.com/keerthan1512/project_final.git" className="text-gray-400 hover:text-white">GitHub</a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2025 AI Crime Analysis. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;