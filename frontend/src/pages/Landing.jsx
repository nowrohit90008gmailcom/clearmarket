import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { 
  TrendingUp, 
  TrendingDown,
  Search, 
  LineChart, 
  Shield, 
  Zap, 
  CheckCircle2,
  ArrowRight 
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const features = [
    {
      icon: Search,
      title: 'Search Any Stock',
      description: 'Instantly search NSE & BSE listed stocks and get detailed analysis.'
    },
    {
      icon: Zap,
      title: 'AI-Powered Analysis',
      description: 'Get Buy/Hold/Sell signals with clear reasoning, no jargon.'
    },
    {
      icon: LineChart,
      title: 'Complete Fundamentals',
      description: 'PE ratio, market cap, EPS, ROE and more in simple terms.'
    }
  ];

  const marketSnapshot = [
    { symbol: 'RELIANCE', price: '₹2,945', move: '+1.8%', positive: true, note: 'Energy + Retail momentum' },
    { symbol: 'TCS', price: '₹4,126', move: '+0.9%', positive: true, note: 'Stable cash flow profile' },
    { symbol: 'HDFCBANK', price: '₹1,679', move: '-0.6%', positive: false, note: 'Valuation reset in progress' },
    { symbol: 'INFY', price: '₹1,588', move: '+2.1%', positive: true, note: 'Margin outlook improving' }
  ];

  const reportHighlights = [
    'AI verdict with confidence score',
    'Technical + fundamental signal summary',
    'Risk checklist and scenario notes',
    'Simple language built for retail investors'
  ];

  const steps = [
    { number: '1', title: 'Search', description: 'Enter any stock symbol like RELIANCE or TCS' },
    { number: '2', title: 'Analyze', description: 'Get AI-powered insights with Buy/Hold/Sell verdict' },
    { number: '3', title: 'Decide', description: 'Make informed decisions with clear reasoning' }
  ];

  return (
    <div className="min-h-screen bg-background" data-testid="landing-page">
      <Navbar />
      
      {/* Hero Section */}
      <section className="gradient-hero py-16 md:py-24" data-testid="hero-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium mb-6">
                <Shield className="w-4 h-4" />
                Trusted by 10,000+ investors
              </div>
              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
                Clarity-first investing for{' '}
                <span className="text-emerald-600">long-term investors</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-lg">
                No jargon. No noise. Just clear Buy/Hold/Sell signals with simple reasoning 
                to help you invest smarter in Indian stocks.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-8 shadow-lg shadow-emerald-600/20"
                  onClick={() => navigate('/signup')}
                  data-testid="hero-cta-analyze"
                >
                  Analyze a Stock
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="rounded-full px-8"
                  onClick={() => navigate('/login')}
                  data-testid="hero-cta-login"
                >
                  Login
                </Button>
              </div>
            </div>
            <div className="hidden lg:block animate-fade-in animate-delay-200">
              <div className="relative">
                <img 
                  src="https://images.unsplash.com/photo-1633104502126-ef02b623e6be?w=600&h=400&fit=crop"
                  alt="Indian investor analyzing stocks"
                  className="rounded-2xl shadow-2xl"
                />
                {/* Floating Card */}
                <div className="absolute -bottom-6 -left-6 bg-card p-4 rounded-xl shadow-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-mono font-bold text-foreground">RELIANCE</p>
                      <p className="text-sm text-emerald-600 font-semibold">BUY - 78% confidence</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 bg-background" data-testid="how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Get stock analysis in 3 simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div 
                key={step.number} 
                className="relative animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-emerald-600">{step.number}</span>
                  </div>
                  <h3 className="font-heading text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-emerald-200 to-transparent dark:from-emerald-800"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24 bg-slate-50 dark:bg-slate-900/50" data-testid="features-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Powerful features to help you make informed investment decisions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={feature.title} 
                className="card-hover bg-card animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="font-heading text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Market Snapshot */}
      <section className="py-16 md:py-24 bg-background" data-testid="market-snapshot-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
                Live-style market snapshot
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl">
                Explore a quick view of high-interest Indian stocks and open a full analysis report in one click.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {marketSnapshot.map((stock) => (
                  <Card key={stock.symbol} className="card-hover">
                    <CardContent className="p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-mono font-semibold text-foreground">{stock.symbol}</p>
                        <p className={`text-sm font-semibold flex items-center gap-1 ${stock.positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {stock.positive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {stock.move}
                        </p>
                      </div>
                      <p className="text-2xl font-bold text-foreground">{stock.price}</p>
                      <p className="text-sm text-muted-foreground">{stock.note}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-900/10">
              <CardContent className="p-8">
                <h3 className="font-heading text-2xl font-semibold text-foreground mb-3">Inside every stock report</h3>
                <p className="text-muted-foreground mb-6">
                  Built to help you move from “what is happening?” to “what should I do next?” in minutes.
                </p>
                <ul className="space-y-3 mb-8">
                  {reportHighlights.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-foreground">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700 rounded-full px-8"
                  onClick={() => navigate('/signup')}
                  data-testid="snapshot-cta"
                >
                  Build My First Analysis
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-emerald-600" data-testid="cta-section">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to invest with clarity?
          </h2>
          <p className="text-emerald-100 text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of Indian retail investors who are making smarter decisions with ClearAI.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-emerald-600 hover:bg-emerald-50 rounded-full px-8"
              onClick={() => navigate('/signup')}
              data-testid="cta-signup"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
          <div className="mt-8 flex items-center justify-center gap-6 text-emerald-100 text-sm">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> 5 free analyses/month
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> No credit card required
            </span>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
