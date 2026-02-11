import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { toast } from 'sonner';
import { TrendingUp, Mail, Lock, Eye, EyeOff, User, Sun, Moon, CheckCircle2 } from 'lucide-react';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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
      toast.error(error.message || error.response?.data?.detail || 'Signup failed');
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


  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    try {
      await googleLogin();
      toast.success('Signed in with Google successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

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
            <span className="font-heading font-bold text-2xl text-foreground">ClearAI</span>
          </Link>

          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="px-0">
              <CardTitle className="font-heading text-2xl">Create your account</CardTitle>
              <CardDescription>Start making informed investment decisions today</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
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

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12"
                onClick={handleGoogleAuth}
                disabled={googleLoading}
                data-testid="google-auth-btn"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.73 1.22 9.24 3.61l6.9-6.9C35.95 2.33 30.35 0 24 0 14.64 0 6.55 5.39 2.56 13.22l8.04 6.24C12.53 13.27 17.8 9.5 24 9.5Z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.14-3.08-.4-4.55H24v9.02h12.9c-.56 2.98-2.24 5.5-4.77 7.19l7.33 5.69C43.74 37.95 46.98 31.75 46.98 24.55Z"/>
                  <path fill="#FBBC05" d="M10.6 28.54a14.49 14.49 0 0 1 0-9.08l-8.04-6.24a24.02 24.02 0 0 0 0 21.56l8.04-6.24Z"/>
                  <path fill="#34A853" d="M24 48c6.35 0 11.68-2.09 15.57-5.68l-7.33-5.69c-2.04 1.37-4.66 2.17-8.24 2.17-6.2 0-11.47-3.77-13.4-9.96l-8.04 6.24C6.55 42.61 14.64 48 24 48Z"/>
                </svg>
                {googleLoading ? 'Connecting Google...' : 'Continue with Google'}
              </Button>

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
            Join thousands of Indian retail investors who make smarter decisions with ClearAI.
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
              "Finally, stock analysis I can actually understand! ClearAI made me confident 
              about my first equity investments."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
