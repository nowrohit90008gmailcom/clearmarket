import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { Check, Crown, Zap, Star } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Pricing() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await axios.get(`${API}/plans`);
        setPlans(response.data);
      } catch (e) {
        console.error('Error fetching plans:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const getPlanIcon = (planId) => {
    switch (planId) {
      case 'basic': return <Star className="w-6 h-6" />;
      case 'pro': return <Zap className="w-6 h-6" />;
      case 'premium': return <Crown className="w-6 h-6" />;
      default: return null;
    }
  };

  const getPlanHighlight = (planId) => {
    return planId === 'pro';
  };

  const handleSelectPlan = (planId) => {
    if (!isAuthenticated) {
      navigate('/signup');
      return;
    }
    if (planId === 'free') {
      toast.info('You are already on the free plan');
      return;
    }
    // Razorpay integration placeholder
    toast.info('Payment integration coming soon! For now, enjoy the free plan.');
  };

  return (
    <div className="min-h-screen bg-background" data-testid="pricing-page">
      <Navbar />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your investment journey. All plans include AI-powered 
            stock analysis with clear Buy/Hold/Sell signals.
          </p>
        </div>

        {/* Plans Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const isHighlighted = getPlanHighlight(plan.id);
              const isCurrentPlan = user?.plan === plan.id;
              
              return (
                <Card 
                  key={plan.id}
                  className={`relative ${isHighlighted ? 'ring-2 ring-emerald-600 shadow-lg' : ''}`}
                  data-testid={`plan-${plan.id}`}
                >
                  {isHighlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-600 text-white text-sm font-medium rounded-full">
                      Most Popular
                    </div>
                  )}
                  <CardHeader className="text-center pb-4">
                    {getPlanIcon(plan.id) && (
                      <div className={`w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center ${
                        isHighlighted ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-slate-100 text-slate-600 dark:bg-slate-800'
                      }`}>
                        {getPlanIcon(plan.id)}
                      </div>
                    )}
                    <CardTitle className="font-heading text-xl">{plan.name}</CardTitle>
                    <div className="mt-4">
                      {plan.price === 0 ? (
                        <span className="text-4xl font-bold text-foreground">Free</span>
                      ) : (
                        <>
                          <span className="text-4xl font-bold text-foreground">₹{plan.price}</span>
                          <span className="text-muted-foreground">/month</span>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className={`w-full ${
                        isHighlighted 
                          ? 'bg-emerald-600 hover:bg-emerald-700' 
                          : isCurrentPlan 
                            ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300' 
                            : ''
                      }`}
                      variant={isHighlighted ? 'default' : 'outline'}
                      disabled={isCurrentPlan}
                      onClick={() => handleSelectPlan(plan.id)}
                      data-testid={`select-${plan.id}`}
                    >
                      {isCurrentPlan ? 'Current Plan' : plan.price === 0 ? 'Get Started' : 'Upgrade'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="font-heading text-2xl font-bold text-foreground text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">What counts as one analysis?</h3>
                <p className="text-sm text-muted-foreground">
                  Each time you search and analyze a stock, it counts as one analysis. 
                  Viewing the same analysis again doesn't count.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">Can I cancel anytime?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes! You can cancel your subscription at any time. Your access continues 
                  until the end of your billing period.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">Do analyses reset monthly?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes, your analysis count resets at the beginning of each month based 
                  on your subscription start date.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">Is this financial advice?</h3>
                <p className="text-sm text-muted-foreground">
                  No. ClearAI provides educational insights and analysis tools. 
                  Always consult a qualified financial advisor for investment decisions.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
