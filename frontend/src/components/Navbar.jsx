import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { 
  Sun, 
  Moon, 
  Menu, 
  X, 
  LayoutDashboard, 
  Briefcase, 
  LineChart,
  LogOut,
  User,
  TrendingUp,
  ChevronDown
} from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2" data-testid="navbar-logo">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="font-heading font-bold text-xl text-foreground">ClearMarket</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {isAuthenticated ? (
              <>
                <Link 
                  to="/dashboard" 
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                  data-testid="nav-dashboard"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link 
                  to="/portfolio" 
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                  data-testid="nav-portfolio"
                >
                  <Briefcase className="w-4 h-4" />
                  Portfolio
                </Link>
                <Link 
                  to="/mutual-funds" 
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                  data-testid="nav-mutual-funds"
                >
                  <LineChart className="w-4 h-4" />
                  Mutual Funds
                </Link>
              </>
            ) : (
              <>
                <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-pricing">
                  Pricing
                </Link>
              </>
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleTheme}
              className="rounded-full"
              data-testid="theme-toggle"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </Button>

            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2" data-testid="user-menu-trigger">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                      {user?.picture ? (
                        <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                      ) : (
                        <User className="w-4 h-4 text-emerald-600" />
                      )}
                    </div>
                    <span className="hidden sm:inline text-sm font-medium">{user?.name?.split(' ')[0]}</span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400 capitalize">
                        {user?.plan || 'Free'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {user?.analyses_used || 0}/{user?.analyses_limit || 5} analyses
                      </span>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  {user?.role === 'admin' && (
                    <DropdownMenuItem onClick={() => navigate('/admin')} data-testid="admin-link">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate('/pricing')} data-testid="upgrade-link">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Upgrade Plan
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive" data-testid="logout-btn">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden md:flex items-center gap-3">
                <Button variant="ghost" onClick={() => navigate('/login')} data-testid="login-btn">
                  Login
                </Button>
                <Button onClick={() => navigate('/signup')} className="bg-emerald-600 hover:bg-emerald-700 rounded-full" data-testid="signup-btn">
                  Get Started
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-toggle"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background" data-testid="mobile-menu">
          <div className="px-4 py-4 space-y-3">
            {isAuthenticated ? (
              <>
                <Link 
                  to="/dashboard" 
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LayoutDashboard className="w-5 h-5" />
                  Dashboard
                </Link>
                <Link 
                  to="/portfolio" 
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Briefcase className="w-5 h-5" />
                  Portfolio
                </Link>
                <Link 
                  to="/mutual-funds" 
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LineChart className="w-5 h-5" />
                  Mutual Funds
                </Link>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link 
                  to="/pricing" 
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Pricing
                </Link>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
                >
                  Login
                </Button>
                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => { navigate('/signup'); setMobileMenuOpen(false); }}
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
