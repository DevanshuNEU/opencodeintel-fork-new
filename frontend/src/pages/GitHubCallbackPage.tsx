import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useGitHubRepos } from '@/hooks/useGitHubRepos';

export function GitHubCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { completeConnect } = useGitHubRepos();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const callbackRanRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Prevent double-execution in React StrictMode
    if (callbackRanRef.current) return;
    callbackRanRef.current = true;
    
    let mounted = true;

    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Handle GitHub OAuth errors
      if (error) {
        if (mounted) {
          setStatus('error');
          setErrorMessage(errorDescription || error || 'GitHub authorization failed');
        }
        return;
      }

      if (!code || !state) {
        if (mounted) {
          setStatus('error');
          setErrorMessage('Missing authorization code or state');
        }
        return;
      }

      // Exchange code for token via backend
      try {
        const success = await completeConnect(code, state);
        
        if (!mounted) return;
        
        if (success) {
          setStatus('success');
          timeoutRef.current = setTimeout(() => {
            if (mounted) {
              navigate('/dashboard', { replace: true });
            }
          }, 1500);
        } else {
          setStatus('error');
          setErrorMessage('Failed to connect GitHub account');
        }
      } catch (err) {
        if (!mounted) return;
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred');
      }
    };

    handleCallback();
    
    return () => {
      mounted = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [searchParams, completeConnect, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {status === 'processing' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Connecting GitHub...</h2>
            <p className="text-muted-foreground">Please wait while we complete the connection</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">GitHub Connected!</h2>
            <p className="text-muted-foreground">Redirecting to dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Connection Failed</h2>
            <p className="text-muted-foreground">{errorMessage}</p>
            <button
              onClick={() => navigate('/dashboard', { replace: true })}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Back to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
