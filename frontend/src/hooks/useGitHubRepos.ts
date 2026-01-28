import { useState, useCallback } from 'react';
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

  const getHeaders = useCallback(() => {
    if (!session?.access_token) return null;
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  }, [session]);

  const checkStatus = useCallback(async () => {
    const headers = getHeaders();
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
  }, [getHeaders]);

  const initiateConnect = useCallback(async () => {
    const headers = getHeaders();
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
      // Store state in sessionStorage for callback verification
      sessionStorage.setItem('github_oauth_state', data.state);
      return data.auth_url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  const completeConnect = useCallback(async (code: string, state: string) => {
    const headers = getHeaders();
    if (!headers) {
      setError('Not authenticated');
      return false;
    }

    // Verify state matches what we stored
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
      
      // Update status
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
  }, [getHeaders]);

  const disconnect = useCallback(async () => {
    const headers = getHeaders();
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
  }, [getHeaders]);

  const fetchRepos = useCallback(async (page = 1, includeForks = false) => {
    const headers = getHeaders();
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
      setRepos(page === 1 ? data : [...repos, ...data]);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [getHeaders, repos]);

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
