import { motion } from 'framer-motion'
import { Search, Zap, GitBranch, Brain, Lock, Terminal } from 'lucide-react'

const FEATURES = [
  {
    icon: Search,
    title: 'Semantic Search',
    description: 'Find code by what it does, not what it\'s named. Ask "retry logic with exponential backoff" and get exactly that.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Brain,
    title: 'Understands Context',
    description: 'Knows the difference between a Flask route handler and a FastAPI dependency. Context-aware results every time.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
  },
  {
    icon: Zap,
    title: 'Instant Results',
    description: 'Sub-100ms search across your entire codebase. No waiting, no spinning, just answers.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    icon: GitBranch,
    title: 'Dependency Graph',
    description: 'See how code connects. Trace imports, find usages, understand impact before you change anything.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: Terminal,
    title: 'MCP Integration',
    description: 'Works with Claude, Cursor, and any MCP-compatible AI. Your AI assistant finally understands your code.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
  {
    icon: Lock,
    title: 'Self-Host Option',
    description: 'Keep your code private. Run CodeIntel on your own infrastructure with full control.',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

export function Features() {
  return (
    <section id="features" className="py-24 px-6 relative">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.02] to-transparent pointer-events-none" />
      
      <div className="max-w-6xl mx-auto relative">
        {/* Section header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Built for how developers actually work
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Not another code search tool. CodeIntel understands your codebase the way you do.
          </p>
        </motion.div>

        {/* Features grid */}
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {FEATURES.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="group relative p-6 rounded-xl border border-white/[0.06] dark:border-white/[0.06] light:border-black/[0.06] bg-card/30 hover:bg-card/50 transition-all duration-300"
            >
              {/* Hover glow */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative">
                <div className={`w-10 h-10 rounded-lg ${feature.bg} flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
