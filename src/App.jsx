import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import AIAnalysis from './pages/AIAnalysis';
import FeatureExtraction from './pages/FeatureExtraction';
import CrimeClassification from './pages/CrimeClassification';

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const { user, signOut } = useAuth();

  return (
    <nav className="bg-gray-900 fixed w-full z-50 shadow-lg">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold">
            CrimeAI
          </Link>

          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="hover:text-blue-400 transition-colors">
              Home
            </Link>
            {user ? (
              <>
                <Link to="/ai-analysis" className="hover:text-blue-400 transition-colors">
                  AI Analysis
                </Link>
                <Link to="/feature-extraction" className="hover:text-blue-400 transition-colors">
                  Feature Extraction
                </Link>
                <Link to="/crime-classification" className="hover:text-blue-400 transition-colors">
                  Crime Classification
                </Link>
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 bg-red-600 px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4">
            <div className="flex flex-col space-y-4">
              <Link
                to="/"
                className="hover:text-blue-400 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              {user ? (
                <>
                  <Link
                    to="/ai-analysis"
                    className="hover:text-blue-400 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    AI Analysis
                  </Link>
                  <Link
                    to="/feature-extraction"
                    className="hover:text-blue-400 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Feature Extraction
                  </Link>
                  <Link
                    to="/crime-classification"
                    className="hover:text-blue-400 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Crime Classification
                  </Link>
                  <button
                    onClick={() => {
                      signOut();
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center gap-2 bg-red-600 px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <LogOut size={18} />
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <Navbar />
      <div className="pt-16">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route
            path="/ai-analysis"
            element={
              <ProtectedRoute>
                <AIAnalysis />
              </ProtectedRoute>
            }
          />
          <Route
            path="/feature-extraction"
            element={
              <ProtectedRoute>
                <FeatureExtraction />
              </ProtectedRoute>
            }
          />
          <Route
            path="/crime-classification"
            element={
              <ProtectedRoute>
                <CrimeClassification />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;