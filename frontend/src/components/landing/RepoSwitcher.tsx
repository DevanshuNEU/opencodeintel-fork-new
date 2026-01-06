import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { DemoRepo } from '@/hooks/useDemoSearch'

interface RepoSwitcherProps {
  repos: DemoRepo[]
  selected: DemoRepo
  onSelect: (repo: DemoRepo) => void
  disabled?: boolean
}

export function RepoSwitcher({ repos, selected, onSelect, disabled }: RepoSwitcherProps) {
  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      <span className="text-sm text-zinc-500 mr-1">Try:</span>
      {repos.map((repo) => {
        const isSelected = repo.id === selected.id
        return (
          <motion.button
            key={repo.id}
            onClick={() => !disabled && onSelect(repo)}
            disabled={disabled}
            whileHover={disabled ? {} : { scale: 1.05 }}
            whileTap={disabled ? {} : { scale: 0.95 }}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
              isSelected
                ? 'bg-[var(--python-blue)] text-white border-[var(--python-blue)]'
                : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span className="mr-1.5">{repo.icon}</span>
            {repo.name}
          </motion.button>
        )
      })}
    </div>
  )
}
