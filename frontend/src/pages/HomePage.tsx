import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Trophy, TrendingUp, Users, Zap, ArrowRight, Search, KeyRound } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';

const features = [
  {
    icon: TrendingUp,
    title: 'AI-Powered Predictions',
    description: 'Get accurate match predictions powered by advanced machine learning algorithms.',
  },
  {
    icon: Users,
    title: 'Community Insights',
    description: 'See how other users are predicting and compare your accuracy with the community.',
  },
  {
    icon: Zap,
    title: 'Real-Time Updates',
    description: 'Stay updated with live scores and instant prediction adjustments.',
  },
];

export function HomePage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeValue, setCodeValue] = useState('');

  const handleJoinByCode = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = codeValue.trim();
    if (!trimmed) return;
    navigate(`/leagues/join/${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-8">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span className="text-sm font-medium">Predict matches like a pro</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Predict Match Outcomes
              <br />
              <span className="text-indigo-200">with Confidence</span>
            </h1>
            <p className="text-lg md:text-xl text-indigo-100 max-w-2xl mx-auto mb-10">
              Join thousands of sports enthusiasts who use Match Predictor to make smarter predictions.
              Our AI-powered platform analyzes data to give you the edge.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <>
                  <Link to="/leagues/new">
                    <Button size="lg" className="bg-white text-indigo-600 hover:bg-gray-100 w-full sm:w-auto">
                      Create your own league
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <Link to="/leagues/browse">
                    <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 w-full sm:w-auto">
                      <Search className="w-5 h-5 mr-2" />
                      Browse public leagues
                    </Button>
                  </Link>
                  <Link to="/dashboard">
                    <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 w-full sm:w-auto">
                      Go to Dashboard
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" className="bg-white text-indigo-600 hover:bg-gray-100 w-full sm:w-auto">
                      Get Started Free
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 w-full sm:w-auto">
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>
            {isAuthenticated && (
              <div className="mt-8 flex flex-col items-center gap-3">
                {showCodeInput ? (
                  <form
                    onSubmit={handleJoinByCode}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full max-w-md"
                  >
                    <input
                      type="text"
                      autoFocus
                      value={codeValue}
                      onChange={(e) => setCodeValue(e.target.value)}
                      placeholder="Paste your join code"
                      className="flex-1 rounded-lg px-4 py-2.5 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/70"
                    />
                    <Button
                      type="submit"
                      size="md"
                      className="bg-white text-indigo-600 hover:bg-gray-100"
                      disabled={codeValue.trim() === ''}
                    >
                      Join
                    </Button>
                    <Button
                      type="button"
                      size="md"
                      variant="ghost"
                      className="text-white hover:bg-white/10"
                      onClick={() => {
                        setShowCodeInput(false);
                        setCodeValue('');
                      }}
                    >
                      Cancel
                    </Button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCodeInput(true)}
                    className="inline-flex items-center gap-2 text-sm text-indigo-100 hover:text-white underline underline-offset-4"
                  >
                    <KeyRound className="w-4 h-4" />
                    Have an invite code? Join by code
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-50 to-transparent"></div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Match Predictor?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to make better match predictions, all in one place.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <Card key={feature.title} hover className="text-center">
                <CardContent className="py-8">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-100 rounded-xl mb-6">
                    <feature.icon className="w-7 h-7 text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ready to Start Predicting?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join our community today and start making accurate match predictions.
          </p>
          {!isAuthenticated && (
            <Link to="/register">
              <Button size="lg">
                Create Free Account
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-indigo-400" />
              <span className="font-bold text-white">Match Predictor</span>
            </div>
            <p className="text-sm">
              &copy; {new Date().getFullYear()} Match Predictor. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
