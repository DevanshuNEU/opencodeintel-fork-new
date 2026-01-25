import { useStyleAnalysis } from '../hooks/useCachedQuery'

interface StyleInsightsProps {
  repoId: string
  apiUrl: string
  apiKey: string
}

export function StyleInsights({ repoId, apiUrl, apiKey }: StyleInsightsProps) {
  const { data, isLoading: loading } = useStyleAnalysis({ repoId, apiKey })

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Analyzing code style patterns...</p>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-muted border border-border rounded-xl p-5">
          <div className="text-sm text-muted-foreground mb-1">Files Analyzed</div>
          <div className="text-3xl font-bold text-foreground">
            {data.summary?.total_files_analyzed || 0}
          </div>
        </div>

        <div className="bg-muted border border-border rounded-xl p-5">
          <div className="text-sm text-muted-foreground mb-1">Functions</div>
          <div className="text-3xl font-bold text-primary">
            {data.summary?.total_functions || 0}
          </div>
        </div>

        <div className="bg-muted border border-border rounded-xl p-5">
          <div className="text-sm text-muted-foreground mb-1">Async Adoption</div>
          <div className="text-3xl font-bold text-primary">
            {data.summary?.async_adoption || '0%'}
          </div>
        </div>

        <div className="bg-muted border border-border rounded-xl p-5">
          <div className="text-sm text-muted-foreground mb-1">Type Hints</div>
          <div className="text-3xl font-bold text-primary">
            {data.summary?.type_hints_usage || '0%'}
          </div>
        </div>
      </div>

      {/* Naming Conventions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-muted border border-border rounded-xl p-5">
          <h3 className="text-base font-semibold mb-4 text-foreground">Function Naming</h3>
          <div className="space-y-3">
            {data.naming_conventions?.functions && 
              Object.entries(data.naming_conventions.functions).map(([convention, info]: any) => (
                <div key={convention} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <code className="text-sm bg-background px-2 py-1 rounded text-foreground border border-border">
                      {convention}
                    </code>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{info.count}</span>
                    <span className="text-sm font-semibold text-primary min-w-[50px] text-right">
                      {info.percentage}
                    </span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        <div className="bg-muted border border-border rounded-xl p-5">
          <h3 className="text-base font-semibold mb-4 text-foreground">Class Naming</h3>
          <div className="space-y-3">
            {data.naming_conventions?.classes && 
              Object.entries(data.naming_conventions.classes).map(([convention, info]: any) => (
                <div key={convention} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <code className="text-sm bg-background px-2 py-1 rounded text-foreground border border-border">
                      {convention}
                    </code>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{info.count}</span>
                    <span className="text-sm font-semibold text-primary min-w-[50px] text-right">
                      {info.percentage}
                    </span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* Top Imports */}
      <div className="bg-muted border border-border rounded-xl p-5">
        <h3 className="text-base font-semibold mb-4 text-foreground">Most Common Imports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.top_imports?.slice(0, 10).map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <code className="text-foreground bg-background border border-border px-2 py-1 rounded truncate flex-1">
                {item.module}
              </code>
              <span className="ml-3 text-muted-foreground font-mono">{item.count}×</span>
            </div>
          ))}
        </div>
      </div>

      {/* Patterns */}
      <div className="bg-muted border border-border rounded-xl p-5">
        <h3 className="text-base font-semibold mb-4 text-foreground">Code Patterns</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
            <span className="text-foreground">Async/Await Usage</span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{data.patterns?.async_usage}</span>
              <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary border border-primary/20 rounded">
                {data.patterns?.async_percentage?.toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
            <span className="text-foreground">Type Annotations</span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{data.patterns?.type_annotations}</span>
              <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary border border-primary/20 rounded">
                {data.patterns?.typed_percentage?.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Language Distribution */}
      <div className="bg-muted border border-border rounded-xl p-5">
        <h3 className="text-base font-semibold mb-4 text-foreground">Language Distribution</h3>
        <div className="space-y-3">
          {data.language_distribution && 
            Object.entries(data.language_distribution).map(([lang, info]: any) => (
              <div key={lang} className="flex items-center gap-3">
                <span className="text-sm text-foreground w-24 capitalize">{lang}</span>
                <div className="flex-1 bg-background rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: info.percentage }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-16 text-right">{info.percentage}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}
