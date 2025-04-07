import React from 'react';
import { FileSearch, Filter, FileText, PieChart, Share2, Zap } from 'lucide-react';
import FileUpload from '../components/FileUpload';

function FeatureExtraction() {
  return (
    <div>
      {/* Hero Section */}
      <div 
        className="relative min-h-[60vh] flex items-center"
        style={{
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url("https://images.unsplash.com/photo-1454165804606-c3d57bc86b40")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="container mx-auto px-6 py-24">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-bold mb-6">
              Intelligent Feature Extraction
            </h1>
            <p className="text-xl text-gray-300">
              Transform raw crime data into actionable insights with our advanced feature extraction system.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <section className="py-24 bg-gray-900">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-8">Extract Features from Your Data</h2>
            <p className="text-gray-400 text-center mb-12">
              Upload your documents, images, or data files for advanced feature extraction. Our AI system will analyze and extract key information automatically.
            </p>
            <FileUpload
              title="Upload Documents for Analysis"
              description="Drag and drop your files here, or click to select files"
              acceptedTypes=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              maxSize={15}
            />
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-24 bg-gray-900">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-800 p-8 rounded-xl">
              <FileSearch className="w-12 h-12 text-blue-500 mb-6" />
              <h3 className="text-2xl font-bold mb-4">Smart Data Parsing</h3>
              <p className="text-gray-400">
                Automatically extract key information from various document formats including PDFs, images, and handwritten reports.
              </p>
            </div>

            <div className="bg-gray-800 p-8 rounded-xl">
              <Filter className="w-12 h-12 text-blue-500 mb-6" />
              <h3 className="text-2xl font-bold mb-4">Pattern Recognition</h3>
              <p className="text-gray-400">
                Identify recurring patterns and anomalies in crime reports using advanced machine learning algorithms.
              </p>
            </div>

            <div className="bg-gray-800 p-8 rounded-xl">
              <FileText className="w-12 h-12 text-blue-500 mb-6" />
              <h3 className="text-2xl font-bold mb-4">Report Generation</h3>
              <p className="text-gray-400">
                Generate comprehensive reports with extracted features, trends, and recommendations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Demonstration */}
      <section className="py-24 bg-gray-800">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>
          <div className="max-w-4xl mx-auto">
            <div className="space-y-12">
              <div className="flex items-start gap-8">
                <div className="bg-blue-600 p-4 rounded-full">
                  <PieChart className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-4">Data Analysis</h3>
                  <p className="text-gray-400">
                    Our system analyzes crime reports using natural language processing to identify key elements such as location, time, method of operation, and suspect descriptions.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-8">
                <div className="bg-blue-600 p-4 rounded-full">
                  <Share2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-4">Feature Correlation</h3>
                  <p className="text-gray-400">
                    Advanced algorithms identify relationships between different crime features, helping to establish patterns and connections.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-8">
                <div className="bg-blue-600 p-4 rounded-full">
                  <Zap className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-4">Instant Insights</h3>
                  <p className="text-gray-400">
                    Get real-time insights and alerts when significant patterns or anomalies are detected in the data.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-blue-600">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-8">Experience Advanced Feature Extraction</h2>
          <p className="text-xl mb-12 max-w-2xl mx-auto">
            Transform your crime analysis workflow with our intelligent feature extraction system.
          </p>
          <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all">
            Start Free Trial
          </button>
        </div>
      </section>
    </div>
  );
}

export default FeatureExtraction;