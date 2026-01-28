import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { TrendingUp } from 'lucide-react';

export default function AuthCallback() {
  const { processOAuthCallback } = useAuth();
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Use ref to prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processCallback = async () => {
      try {
        // Get session_id from URL fragment
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(1));
        const sessionId = params.get('session_id');

        if (!sessionId) {
          toast.error('Invalid authentication callback');
          navigate('/login');
          return;
        }

        // Process the OAuth callback
        await processOAuthCallback(sessionId);
        toast.success('Welcome to ClearMarket!');
        
        // Clear hash and navigate
        window.history.replaceState(null, '', window.location.pathname);
        navigate('/dashboard', { replace: true });
      } catch (error) {
        console.error('OAuth callback error:', error);
        toast.error('Authentication failed. Please try again.');
        navigate('/login');
      }
    };

    processCallback();
  }, [processOAuthCallback, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background" data-testid="auth-callback">
      <div className="text-center">
        <div className="w-16 h-16 rounded-xl bg-emerald-600 flex items-center justify-center mx-auto mb-6">
          <TrendingUp className="w-10 h-10 text-white" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Signing you in...</h2>
        <p className="text-muted-foreground">Please wait while we complete your authentication.</p>
        <div className="mt-6">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent mx-auto"></div>
        </div>
      </div>
    </div>
  );
}
