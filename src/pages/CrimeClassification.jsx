import React from 'react';
import { BarChart3, PieChart, Target, Fingerprint, Shield, AlertTriangle } from 'lucide-react';
import CrimeClassificationFileUpload from '../components/CrimeClassificationFileUpload.jsx';

function CrimeClassification() {
  return (
    <div>
      {/* Hero Section */}
      <div
        className="relative min-h-[60vh] flex items-center"
        style={{
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url("https://images.unsplash.com/photo-1569396116180-210c182bedb8")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="container mx-auto px-6 py-24">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-bold mb-6">
              AI-Powered Crime Classification
            </h1>
            <p className="text-xl text-gray-300">
              Automatically categorize and analyze crime patterns with advanced machine learning algorithms.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <section className="py-24 bg-gray-900">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-8">Classify Your Crime Data</h2>
            <p className="text-gray-400 text-center mb-12">
              Upload your crime reports and evidence for automatic classification and pattern analysis.
            </p>
           <CrimeClassificationFileUpload
              title="Upload Crime Reports"
              description="Drag and drop your files here, or click to select files"
              acceptedTypes=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.csv"
              maxSize={25}
            />
          </div>
        </div>
      </section>

      {/* Classification Types */}
      <section className="py-24 bg-gray-900">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-16">Classification Categories</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-800 p-8 rounded-xl">
              <Target className="w-12 h-12 text-blue-500 mb-6" />
              <h3 className="text-2xl font-bold mb-4">Behavioral Analysis</h3>
              <p className="text-gray-400">
                Classify crimes based on behavioral patterns and modus operandi to identify serial incidents.
              </p>
            </div>

            <div className="bg-gray-800 p-8 rounded-xl">
              <Fingerprint className="w-12 h-12 text-blue-500 mb-6" />
              <h3 className="text-2xl font-bold mb-4">Forensic Classification</h3>
              <p className="text-gray-400">
                Categorize crimes using forensic evidence and scientific analysis methods.
              </p>
            </div>

            <div className="bg-gray-800 p-8 rounded-xl">
              <Shield className="w-12 h-12 text-blue-500 mb-6" />
              <h3 className="text-2xl font-bold mb-4">Risk Assessment</h3>
              <p className="text-gray-400">
                Evaluate and classify potential risks and threats based on historical data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-24 bg-gray-800">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-16">Classification Accuracy</h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-gray-900 p-8 rounded-xl">
              <div className="flex items-center gap-4 mb-6">
                <BarChart3 className="w-8 h-8 text-blue-500" />
                <h3 className="text-2xl font-bold">Pattern Recognition</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Behavioral Analysis</span>
                    <span>95%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Location-based Classification</span>
                    <span>92%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Temporal Pattern Analysis</span>
                    <span>88%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '88%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 p-8 rounded-xl">
              <div className="flex items-center gap-4 mb-6">
                <PieChart className="w-8 h-8 text-blue-500" />
                <h3 className="text-2xl font-bold">Classification Types</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Property Crimes</span>
                    <span>96%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '96%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Cyber Crimes</span>
                    <span>94%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '94%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Financial Crimes</span>
                    <span>91%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '91%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Alert System */}
      <section className="py-24 bg-gray-900">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-16">Real-time Alert System</h2>
          <div className="max-w-4xl mx-auto bg-gray-800 p-8 rounded-xl">
            <div className="flex items-start gap-6">
              <AlertTriangle className="w-12 h-12 text-blue-500 flex-shrink-0" />
              <div>
                <h3 className="text-2xl font-bold mb-4">Intelligent Monitoring</h3>
                <p className="text-gray-400 mb-6">
                  Our system continuously monitors crime patterns and automatically alerts law enforcement when similar patterns are detected, enabling proactive response to potential threats.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <h4 className="font-bold mb-2">Pattern Matching</h4>
                    <p className="text-gray-400">Instant alerts when matching crime patterns are detected</p>
                  </div>
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <h4 className="font-bold mb-2">Predictive Alerts</h4>
                    <p className="text-gray-400">Advanced warning system based on historical data analysis</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-blue-600">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-8">Enhance Your Crime Classification</h2>
          <p className="text-xl mb-12 max-w-2xl mx-auto">
            Join law enforcement agencies worldwide using our AI-powered classification system.
          </p>
          <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all">
            Get Started Today
          </button>
        </div>
      </section>
    </div>
  );
}

export default CrimeClassification;