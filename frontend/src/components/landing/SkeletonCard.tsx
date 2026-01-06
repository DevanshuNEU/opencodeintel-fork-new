import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'

interface Props {
  index: number
}

export function SkeletonCard({ index }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Card className="bg-[#111113] border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="h-5 w-48 bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-32 bg-zinc-800/60 rounded animate-pulse" />
            </div>
            <div className="text-right space-y-1">
              <div className="h-8 w-16 bg-zinc-800 rounded animate-pulse" />
              <div className="h-3 w-12 bg-zinc-800/60 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="p-4 space-y-2 bg-[#0d0d0f]">
          <div className="h-4 w-full bg-zinc-800/40 rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-zinc-800/40 rounded animate-pulse" />
          <div className="h-4 w-4/6 bg-zinc-800/40 rounded animate-pulse" />
          <div className="h-4 w-full bg-zinc-800/40 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-zinc-800/40 rounded animate-pulse" />
        </div>
      </Card>
    </motion.div>
  )
}
