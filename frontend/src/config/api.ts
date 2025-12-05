/**
 * API Configuration
 * 
 * Centralizes API URL configuration for all frontend components.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// WebSocket URL - convert http(s) to ws(s)
const WS_URL = API_URL.replace(/^http/, 'ws')

export { API_URL, WS_URL }
