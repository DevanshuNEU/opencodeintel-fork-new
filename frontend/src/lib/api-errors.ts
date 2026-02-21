// API error handling utilities
// Safely extract messages from nested FastAPI error responses

export function safeStringify(obj: unknown, maxLen = 200): string {
  try {
    return JSON.stringify(obj).slice(0, maxLen)
  } catch {
    return String(obj).slice(0, maxLen)
  }
}

export function extractErrorMessage(err: any, fallback: string): string {
  const detail = err?.detail || err

  if (typeof detail === 'string') return detail
  if (typeof detail?.message === 'string') return detail.message
  if (typeof err?.message === 'string') return err.message

  if (detail && typeof detail === 'object') {
    const msg = detail.message || detail.error
    if (msg) return String(msg)
    return safeStringify(detail)
  }
  return fallback
}

// checks for repo limit or size errors from the backend
export function isUpgradeError(err: any): boolean {
  const detail = err?.detail || err
  const code = detail?.error || detail?.error_code
  return ['REPO_TOO_LARGE', 'REPO_LIMIT_REACHED'].includes(code)
}
