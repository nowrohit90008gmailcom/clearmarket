import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';
import { TrendingUp, Mail, Lock, Eye, EyeOff, User, Sun, Moon, CheckCircle2 } from 'lucide-react';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signup, googleLogin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await signup(name, email, password);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    '5 free stock analyses every month',
    'AI-powered Buy/Hold/Sell signals',
    'Complete fundamental analysis',
    'Portfolio tracking'
  ];

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2" data-testid="signup-page">
      {/* Left - Form */}
      <div className="flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8 bg-background">
        <div className="mx-auto w-full max-w-md">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-8" data-testid="signup-logo">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="font-heading font-bold text-2xl text-foreground">ClearMarket</span>
          </Link>

          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="px-0">
              <CardTitle className="font-heading text-2xl">Create your account</CardTitle>
              <CardDescription>Start making informed investment decisions today</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {/* Google Signup */}
              <Button 
                variant="outline" 
                className="w-full h-12 mb-6"
                onClick={googleLogin}
                data-testid="google-signup-btn"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>

              <div className="relative mb-6">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                  or sign up with email
                </span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 h-12"
                      data-testid="name-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12"
                      data-testid="email-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-12"
                      data-testid="password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700"
                  disabled={loading}
                  data-testid="signup-submit"
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-emerald-600 hover:underline font-medium" data-testid="login-link">
                  Sign in
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Theme Toggle */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme}
          className="absolute top-4 right-4 rounded-full"
          data-testid="signup-theme-toggle"
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </Button>
      </div>

      {/* Right - Benefits */}
      <div className="hidden lg:flex flex-col justify-center relative bg-slate-900 text-white p-12">
        <div className="max-w-md">
          <h2 className="font-heading text-3xl font-bold mb-6">
            Start investing with clarity
          </h2>
          <p className="text-slate-300 mb-8">
            Join thousands of Indian retail investors who make smarter decisions with ClearMarket.
          </p>
          
          <div className="space-y-4">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-slate-200">{benefit}</span>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold">
                PM
              </div>
              <div>
                <p className="font-semibold">Priya Mehta</p>
                <p className="text-slate-400 text-sm">Software Engineer, Bangalore</p>
              </div>
            </div>
            <p className="text-slate-300 text-sm italic">
              "Finally, stock analysis I can actually understand! ClearMarket made me confident 
              about my first equity investments."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
