import { motion } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'For open source and small projects',
    features: [
      'Up to 3 repositories',
      'Semantic code search',
      'Dependency graph',
      'Community support',
      'Public repos only',
    ],
    cta: 'Get Started',
    ctaLink: '/signup',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    description: 'For professional developers',
    features: [
      'Unlimited repositories',
      'Private repo support',
      'API access',
      'MCP integration',
      'Priority support',
      'Advanced analytics',
    ],
    cta: 'Join Waitlist',
    ctaLink: '/waitlist',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For teams with advanced needs',
    features: [
      'Self-hosted deployment',
      'SSO / SAML',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
      'Onboarding assistance',
    ],
    cta: 'Contact Sales',
    ctaLink: 'mailto:devanshurajesh@gmail.com?subject=CodeIntel Enterprise',
    highlighted: false,
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

export function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6 relative">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free, upgrade when you need more. No hidden fees, no surprises.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <motion.div
          className="grid md:grid-cols-3 gap-6 lg:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {TIERS.map((tier) => (
            <motion.div
              key={tier.name}
              variants={itemVariants}
              className={`
                relative p-6 rounded-2xl border transition-all duration-300
                ${tier.highlighted 
                  ? 'border-accent/50 bg-accent/[0.03] scale-[1.02] shadow-xl shadow-accent/10' 
                  : 'border-white/[0.08] dark:border-white/[0.08] light:border-black/[0.08] bg-card/30 hover:border-white/[0.12] dark:hover:border-white/[0.12]'
                }
              `}
            >
              {/* Badge */}
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-white text-xs font-medium">
                    <Sparkles className="w-3 h-3" />
                    {tier.badge}
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-1">{tier.name}</h3>
                <p className="text-sm text-muted-foreground">{tier.description}</p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">{tier.price}</span>
                <span className="text-muted-foreground">{tier.period}</span>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${tier.highlighted ? 'text-accent' : 'text-emerald-400'}`} />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a
                href={tier.ctaLink}
                className={`
                  block w-full py-3 px-4 rounded-lg text-center text-sm font-medium transition-all
                  ${tier.highlighted
                    ? 'bg-accent hover:bg-accent/90 text-white shadow-lg shadow-accent/20'
                    : 'border border-white/[0.1] dark:border-white/[0.1] light:border-black/[0.1] text-foreground hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-black/5'
                  }
                `}
              >
                {tier.cta}
              </a>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer note */}
        <motion.p
          className="text-center text-sm text-muted-foreground/60 mt-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          All plans include 14-day money-back guarantee. Prices in USD.
        </motion.p>
      </div>
    </section>
  )
}
