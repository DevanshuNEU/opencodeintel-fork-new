import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ImpactAnalyzerProps {
  repoId: string
  apiUrl: string
  apiKey: string
}

interface ImpactResult {
  file: string
  direct_dependents: string[]
  all_dependents: string[]
  dependent_count: number
  direct_dependencies: string[]
  dependency_count: number
  risk_level: string
  test_files: string[]
  impact_summary: string
}

export function ImpactAnalyzer({ repoId, apiUrl, apiKey }: ImpactAnalyzerProps) {
  const [filePath, setFilePath] = useState('')
  const [result, setResult] = useState<ImpactResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const analyzeImpact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!filePath.trim()) return

    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`${apiUrl}/repos/${repoId}/impact`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repo_id: repoId,
          file_path: filePath
        })
      })

      if (!response.ok) {
        throw new Error('Failed to analyze impact')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError('Failed to analyze impact. Check if the file path is correct.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-destructive bg-destructive/10 border-destructive/20'
      case 'medium': return 'text-yellow-500 dark:text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      case 'low': return 'text-green-500 dark:text-green-400 bg-green-500/10 border-green-500/20'
      default: return 'text-muted-foreground bg-muted border-border'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Input Form */}
      <div className="bg-muted border border-border rounded-xl p-5">
        <h3 className="text-base font-semibold mb-4 text-foreground">Analyze Change Impact</h3>
        <form onSubmit={analyzeImpact} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="filePath">File Path (relative to repository root)</Label>
            <Input
              id="filePath"
              type="text"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="e.g., src/auth/middleware.py or components/Button.tsx"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Enter the path of the file you want to modify to see its impact
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {loading ? 'Analyzing...' : 'Analyze Impact'}
          </Button>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Risk Assessment */}
          <div className={`bg-muted rounded-xl p-5 border-2 ${getRiskColor(result.risk_level)}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-foreground">Risk Assessment</h3>
              <span className={`px-4 py-1.5 rounded-lg font-semibold uppercase text-sm border ${getRiskColor(result.risk_level)}`}>
                {result.risk_level} Risk
              </span>
            </div>
            <p className="text-sm font-mono text-foreground mb-4">
              {result.file}
            </p>
            <p className="text-sm text-muted-foreground">
              {result.impact_summary}
            </p>
          </div>

          {/* Impact Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted border border-border rounded-xl p-5">
              <div className="text-sm text-muted-foreground mb-1">Direct Dependencies</div>
              <div className="text-3xl font-bold text-primary">
                {result.dependency_count}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Files this imports
              </div>
            </div>

            <div className="bg-muted border border-border rounded-xl p-5">
              <div className="text-sm text-muted-foreground mb-1">Total Impact</div>
              <div className="text-3xl font-bold text-primary">
                {result.dependent_count}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Files affected by changes
              </div>
            </div>

            <div className="bg-muted border border-border rounded-xl p-5">
              <div className="text-sm text-muted-foreground mb-1">Test Files</div>
              <div className="text-3xl font-bold text-primary">
                {result.test_files?.length || 0}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Related test coverage
              </div>
            </div>
          </div>

          {/* Dependencies */}
          {result.direct_dependencies && result.direct_dependencies.length > 0 && (
            <div className="bg-muted border border-border rounded-xl p-5">
              <h3 className="text-base font-semibold mb-4 text-foreground">
                Dependencies ({result.direct_dependencies.length})
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Files this file imports (upstream)
              </p>
              <div className="space-y-1.5">
                {result.direct_dependencies.map((dep, idx) => (
                  <div key={idx} className="text-sm font-mono text-foreground bg-primary/10 border border-primary/20 px-3 py-2 rounded-lg">
                    {dep}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dependents */}
          {result.all_dependents && result.all_dependents.length > 0 && (
            <div className="bg-muted border border-border rounded-xl p-5">
              <h3 className="text-base font-semibold mb-4 text-foreground">
                Affected Files ({result.all_dependents.length})
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Files that would be impacted by changes to this file (downstream)
              </p>
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {result.all_dependents.map((dep, idx) => (
                  <div key={idx} className="text-sm font-mono text-foreground bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 rounded-lg">
                    {dep}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Test Files */}
          {result.test_files && result.test_files.length > 0 && (
            <div className="bg-muted border border-border rounded-xl p-5">
              <h3 className="text-base font-semibold mb-4 text-foreground">
                Related Tests ({result.test_files.length})
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Test files that may need updates
              </p>
              <div className="space-y-1.5">
                {result.test_files.map((test, idx) => (
                  <div key={idx} className="text-sm font-mono text-foreground bg-green-500/10 border border-green-500/20 px-3 py-2 rounded-lg">
                    {test}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
