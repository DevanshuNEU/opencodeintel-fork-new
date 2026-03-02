/**
 * DirectoryPicker -- monorepo package selection before indexing.
 *
 * Shows a clean vertical list where each package is a row with
 * checkbox, name, file count, and function estimate. Users select
 * which packages to index instead of the entire repo.
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FolderGit2, X, Files, FunctionSquare, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { AnalyzeResult, DirectoryEntry } from '@/types'

type SortKey = 'name' | 'files' | 'functions'

interface DirectoryPickerProps {
  isOpen: boolean
  onClose: () => void
  repoInfo: AnalyzeResult
  onConfirm: (selectedPaths: string[]) => void
  loading: boolean
  functionLimit?: number
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
  const [sortBy, setSortBy] = useState<SortKey>('files')
  const [sortAsc, setSortAsc] = useState(false)

  const sortedDirs = useMemo(() => {
    const dirs = [...repoInfo.directories]
    dirs.sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortBy === 'files') cmp = a.file_count - b.file_count
      else cmp = a.estimated_functions - b.estimated_functions
      return sortAsc ? cmp : -cmp
    })
    return dirs
  }, [repoInfo.directories, sortBy, sortAsc])

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortAsc((prev) => !prev)
    else { setSortBy(key); setSortAsc(key === 'name') }
  }

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

            <div className="flex items-center justify-between px-6 py-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  id="select-all"
                />
                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                  {allSelected ? 'Deselect all' : 'Select all'}
                </label>
              </div>
              <span className="text-xs text-muted-foreground">
                {repoInfo.directories.length} packages
              </span>
            </div>

            <div className="flex items-center gap-3 px-6 py-1.5 border-b border-border text-xs text-muted-foreground bg-muted/30">
              <span className="w-4" />
              <SortButton label="Package" sortKey="name" current={sortBy} asc={sortAsc} onToggle={toggleSort} className="flex-1" />
              <SortButton label="Files" sortKey="files" current={sortBy} asc={sortAsc} onToggle={toggleSort} className="w-20 text-right" />
              <SortButton label="Functions" sortKey="functions" current={sortBy} asc={sortAsc} onToggle={toggleSort} className="w-24 text-right" />
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <motion.div
                className="divide-y divide-border"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.03 } },
                }}
              >
                {sortedDirs.map((dir) => (
                  <motion.div
                    key={dir.path}
                    variants={{
                      hidden: { opacity: 0 },
                      visible: { opacity: 1 },
                    }}
                  >
                    <PackageRow
                      dir={dir}
                      isSelected={selected.has(dir.path)}
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
    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
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
        aria-label="Close"
        className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}


function SortButton({
  label,
  sortKey,
  current,
  asc,
  onToggle,
  className,
}: {
  label: string
  sortKey: SortKey
  current: SortKey
  asc: boolean
  onToggle: (key: SortKey) => void
  className?: string
}) {
  const active = current === sortKey
  return (
    <button
      onClick={() => onToggle(sortKey)}
      className={cn(
        'flex items-center gap-1 hover:text-foreground transition-colors',
        active ? 'text-foreground font-medium' : 'text-muted-foreground',
        className,
      )}
    >
      {label}
      {active && (
        <ArrowUpDown className="w-3 h-3" />
      )}
    </button>
  )
}


function PackageRow({
  dir,
  isSelected,
  onToggle,
}: {
  dir: DirectoryEntry
  isSelected: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'flex items-center gap-3 w-full px-6 py-2.5 text-left transition-colors',
        isSelected
          ? 'bg-primary/5'
          : 'hover:bg-muted/50',
      )}
    >
      <Checkbox checked={isSelected} tabIndex={-1} className="pointer-events-none" />
      <span className={cn(
        'text-sm flex-1 truncate',
        isSelected ? 'text-foreground font-medium' : 'text-muted-foreground',
      )}>
        {dir.name}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums w-20 text-right">
        {dir.file_count} files
      </span>
      <span className="text-xs text-muted-foreground tabular-nums w-24 text-right">
        ~{dir.estimated_functions.toLocaleString()} fn
      </span>
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
