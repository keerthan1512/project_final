import React from 'react';
import { Brain, Network, Cpu, Database, BarChart as ChartBar, Lock } from 'lucide-react';
import AiAnalysisFileUpload from '../components/AiAnalysisFileUpload.jsx';

function AIAnalysis() {
  return (
    <div>
      {/* Hero Section */}
      <div
        className="relative min-h-[60vh] flex items-center"
        style={{
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url("https://images.unsplash.com/photo-1488229297570-58520851e868")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="container mx-auto px-6 py-24">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-bold mb-6">
              Advanced AI Crime Analysis
            </h1>
            <p className="text-xl text-gray-300">
              Harness the power of artificial intelligence to analyze crime patterns, predict trends, and enhance law enforcement effectiveness.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <section className="py-24 bg-gray-900">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-8">Upload Data for Analysis</h2>
            <p className="text-gray-400 text-center mb-12">
              Upload your crime data files for AI-powered analysis. Our system supports various file formats including images, documents, and structured data files.
            </p>
            <AiAnalysisFileUpload
              title="Upload Crime Data"
              description="Drag and drop your files here, or click to select files"
              acceptedTypes=".jpg,.jpeg,.png,.pdf,.doc,.docx,.csv,.xlsx"
              maxSize={20}
            />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-gray-900">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-gray-800 p-8 rounded-xl">
              <Brain className="w-12 h-12 text-blue-500 mb-6" />
              <h3 className="text-2xl font-bold mb-4">Pattern Recognition</h3>
              <p className="text-gray-400">
                Our advanced AI algorithms identify complex crime patterns and correlations that might be missed by traditional analysis methods.
              </p>
            </div>

            <div className="bg-gray-800 p-8 rounded-xl">
              <Network className="w-12 h-12 text-blue-500 mb-6" />
              <h3 className="text-2xl font-bold mb-4">Neural Networks</h3>
              <p className="text-gray-400">
                Deep learning neural networks process vast amounts of crime data to uncover hidden connections and trends.
              </p>
            </div>

            <div className="bg-gray-800 p-8 rounded-xl">
              <Cpu className="w-12 h-12 text-blue-500 mb-6" />
              <h3 className="text-2xl font-bold mb-4">Real-time Processing</h3>
              <p className="text-gray-400">
                Process and analyze crime data in real-time, enabling immediate response to emerging patterns.
              </p>
            </div>

            <div className="bg-gray-800 p-8 rounded-xl">
              <Database className="w-12 h-12 text-blue-500 mb-6" />
              <h3 className="text-2xl font-bold mb-4">Data Integration</h3>
              <p className="text-gray-400">
                Seamlessly integrate multiple data sources for comprehensive crime analysis and insights.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Specifications */}
      <section className="py-24 bg-gray-800">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-16">Technical Capabilities</h2>
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-gray-900 p-6 rounded-xl">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
                <ChartBar className="text-blue-500" />
                Advanced Analytics Engine
              </h3>
              <ul className="list-disc list-inside text-gray-400 space-y-2">
                <li>Machine Learning-based pattern recognition</li>
                <li>Predictive modeling with 95% accuracy</li>
                <li>Natural Language Processing for report analysis</li>
                <li>Automated trend detection and alerting</li>
              </ul>
            </div>

            <div className="bg-gray-900 p-6 rounded-xl">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
                <Lock className="text-blue-500" />
                Security Features
              </h3>
              <ul className="list-disc list-inside text-gray-400 space-y-2">
                <li>End-to-end encryption of sensitive data</li>
                <li>Role-based access control</li>
                <li>Audit logging and compliance reporting</li>
                <li>Secure API integrations</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-blue-600">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-8">Ready to Transform Your Crime Analysis?</h2>
          <p className="text-xl mb-12 max-w-2xl mx-auto">
            Join leading law enforcement agencies using our AI-powered crime analysis platform.
          </p>
          <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all">
            Schedule a Demo
          </button>
        </div>
      </section>
    </div>
  );
}

export default AIAnalysis;