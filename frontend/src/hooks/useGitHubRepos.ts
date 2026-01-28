import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  clone_url: string;
  default_branch: string;
  private: boolean;
  fork: boolean;
  stars: number;
  language: string | null;
  size_kb: number;
  owner: string;
  owner_avatar: string;
}

export interface GitHubStatus {
  connected: boolean;
  username: string | null;
  avatar_url: string | null;
}

export function useGitHubRepos() {
  const { session } = useAuth();
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [status, setStatus] = useState<GitHubStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract access_token to stabilize dependencies
  const accessToken = session?.access_token;

  const headers = useMemo(() => {
    if (!accessToken) return null;
    return {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
  }, [accessToken]);

  const checkStatus = useCallback(async () => {
    if (!headers) {
      setStatus({ connected: false, username: null, avatar_url: null });
      return { connected: false, username: null, avatar_url: null };
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/v1/github/status`, { headers });
      
      if (!response.ok) {
        throw new Error('Failed to check GitHub status');
      }
      
      const data = await response.json();
      setStatus(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      const fallback = { connected: false, username: null, avatar_url: null };
      setStatus(fallback);
      return fallback;
    } finally {
      setLoading(false);
    }
  }, [headers]);

  const initiateConnect = useCallback(async () => {
    if (!headers) {
      setError('Not authenticated');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/v1/github/connect`, { headers });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to initiate GitHub connection');
      }
      
      const data = await response.json();
      sessionStorage.setItem('github_oauth_state', data.state);
      return data.auth_url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [headers]);

  const completeConnect = useCallback(async (code: string, state: string) => {
    if (!headers) {
      setError('Not authenticated');
      return false;
    }

    const storedState = sessionStorage.getItem('github_oauth_state');
    if (state !== storedState) {
      setError('Invalid OAuth state - possible CSRF attack');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/v1/github/callback`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ code, state }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to complete GitHub connection');
      }
      
      const data = await response.json();
      sessionStorage.removeItem('github_oauth_state');
      
      setStatus({
        connected: true,
        username: data.username,
        avatar_url: data.avatar_url,
      });
      
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [headers]);

  const disconnect = useCallback(async () => {
    if (!headers) return false;

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/v1/github/disconnect`, {
        method: 'DELETE',
        headers,
      });
      
      if (!response.ok) {
        throw new Error('Failed to disconnect GitHub');
      }
      
      setStatus({ connected: false, username: null, avatar_url: null });
      setRepos([]);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [headers]);

  const fetchRepos = useCallback(async (page = 1, includeForks = false) => {
    if (!headers) {
      setError('Not authenticated');
      return [];
    }

    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '50',
        include_forks: includeForks.toString(),
      });
      
      const response = await fetch(`${API_URL}/api/v1/github/repos?${params}`, { headers });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to fetch repositories');
      }
      
      const data = await response.json();
      setRepos(prev => page === 1 ? data : [...prev, ...data]);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [headers]);

  const clearError = useCallback(() => setError(null), []);

  return {
    repos,
    status,
    loading,
    error,
    checkStatus,
    initiateConnect,
    completeConnect,
    disconnect,
    fetchRepos,
    clearError,
  };
}
