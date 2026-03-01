/**
 * DirectoryPicker -- monorepo package selection before indexing.
 *
 * Shows an interactive card grid where each package is a clickable card
 * sized proportionally to its file count. Users select which packages
 * to index instead of the entire repo.
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FolderGit2, X, Files, FunctionSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { AnalyzeResult, DirectoryEntry } from '@/types'

interface DirectoryPickerProps {
  isOpen: boolean
  onClose: () => void
  repoInfo: AnalyzeResult
  onConfirm: (selectedPaths: string[]) => void
  loading: boolean
}

export function DirectoryPicker({
  isOpen,
  onClose,
  repoInfo,
  onConfirm,
  loading,
  functionLimit,
}: DirectoryPickerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const maxFiles = useMemo(
    () => Math.max(...repoInfo.directories.map((d) => d.file_count), 1),
    [repoInfo.directories],
  )

  const stats = useMemo(() => {
    const dirs = repoInfo.directories.filter((d) => selected.has(d.path))
    return {
      files: dirs.reduce((sum, d) => sum + d.file_count, 0),
      functions: dirs.reduce((sum, d) => sum + d.estimated_functions, 0),
      count: dirs.length,
    }
  }, [selected, repoInfo.directories])

  const allSelected = selected.size === repoInfo.directories.length

  function toggleDir(path: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(repoInfo.directories.map((d) => d.path)))
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center z-50"
          onClick={() => !loading && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[85vh]"
          >
            <PickerHeader
              repoInfo={repoInfo}
              onClose={onClose}
              loading={loading}
            />

            <div className="px-6 pb-3">
              <p className="text-sm text-muted-foreground">
                Select the packages you need for faster indexing and more focused results.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  id="select-all"
                />
                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                  {allSelected ? 'Deselect all' : 'Select all'}
                </label>
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0 px-6">
              <motion.div
                className="flex flex-wrap gap-2 pb-4"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.04 } },
                }}
              >
                {repoInfo.directories.map((dir) => (
                  <motion.div
                    key={dir.path}
                    variants={{
                      hidden: { opacity: 0, y: 8 },
                      visible: { opacity: 1, y: 0 },
                    }}
                  >
                    <PackageCard
                      dir={dir}
                      isSelected={selected.has(dir.path)}
                      maxFiles={maxFiles}
                      onToggle={() => toggleDir(dir.path)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </ScrollArea>

            {functionLimit && (
              <BudgetBar current={stats.functions} limit={functionLimit} />
            )}

            <PickerFooter
              stats={stats}
              loading={loading}
              overLimit={!!functionLimit && stats.functions > functionLimit}
              onCancel={onClose}
              onConfirm={() => onConfirm(Array.from(selected))}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}


function PickerHeader({
  repoInfo,
  onClose,
  loading,
}: {
  repoInfo: AnalyzeResult
  onClose: () => void
  loading: boolean
}) {
  return (
    <div className="flex items-center justify-between p-6 border-b border-border">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <FolderGit2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {repoInfo.owner}/{repoInfo.repo}
          </h3>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Files className="w-3.5 h-3.5" />
              {repoInfo.total_files.toLocaleString()} files
            </span>
            <span className="flex items-center gap-1">
              <FunctionSquare className="w-3.5 h-3.5" />
              ~{repoInfo.total_estimated_functions.toLocaleString()} functions
            </span>
          </div>
        </div>
      </div>
      <button
        onClick={onClose}
        disabled={loading}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}


function PackageCard({
  dir,
  isSelected,
  maxFiles,
  onToggle,
}: {
  dir: DirectoryEntry
  isSelected: boolean
  maxFiles: number
  onToggle: () => void
}) {
  // Scale card width: smallest = 120px, largest = 240px
  const scale = dir.file_count / maxFiles
  const minWidth = Math.round(120 + scale * 120)

  return (
    <button
      onClick={onToggle}
      style={{ minWidth }}
      className={cn(
        'flex flex-col gap-1 rounded-lg border p-3 text-left transition-all duration-200 cursor-pointer hover:scale-[1.02]',
        isSelected
          ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
          : 'border-border bg-card/50 opacity-60 hover:opacity-80 hover:border-muted-foreground/30 hover:shadow-sm',
      )}
    >
      <span className="text-sm font-medium truncate">{dir.name}</span>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{dir.file_count} files</span>
        <span>~{dir.estimated_functions.toLocaleString()} fn</span>
      </div>
    </button>
  )
}


function BudgetBar({ current, limit }: { current: number; limit: number }) {
  const pct = Math.min((current / limit) * 100, 100)
  const overPct = current > limit ? Math.min(((current - limit) / limit) * 100, 50) : 0

  // green < 70%, amber 70-100%, red > 100%
  const barColor =
    current > limit
      ? 'bg-destructive'
      : pct > 70
        ? 'bg-amber-500'
        : 'bg-emerald-500'

  return (
    <div className="px-6 py-3 border-t border-border">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
        <span>Estimated functions</span>
        <span className={cn(current > limit && 'text-destructive font-medium')}>
          {current.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300 ease-out', barColor)}
          style={{ width: `${pct + overPct}%` }}
        />
      </div>
      {current > limit && (
        <p className="text-xs text-destructive mt-1">
          Over your plan limit by {(current - limit).toLocaleString()} functions
        </p>
      )}
    </div>
  )
}


function PickerFooter({
  stats,
  loading,
  overLimit,
  onCancel,
  onConfirm,
}: {
  stats: { files: number; functions: number; count: number }
  loading: boolean
  overLimit: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const hasSelection = stats.count > 0
  const canConfirm = hasSelection && !overLimit && !loading

  function buttonLabel() {
    if (loading) return 'Starting...'
    if (!hasSelection) return 'Select packages to continue'
    if (overLimit) return 'Over plan limit -- deselect packages'
    return `Clone & Index ${stats.count} ${stats.count === 1 ? 'Package' : 'Packages'}`
  }

  return (
    <div className="p-6 border-t border-border space-y-3">
      <p className="text-sm text-muted-foreground">
        {hasSelection
          ? `Selected: ${stats.files.toLocaleString()} files (~${stats.functions.toLocaleString()} functions) from ${stats.count} ${stats.count === 1 ? 'package' : 'packages'}`
          : 'No packages selected'}
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} disabled={loading} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={!canConfirm}
          className={cn(
            'flex-1',
            overLimit
              ? 'bg-destructive/10 text-destructive border-destructive/20'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground',
          )}
        >
          {buttonLabel()}
        </Button>
      </div>
    </div>
  )
}
