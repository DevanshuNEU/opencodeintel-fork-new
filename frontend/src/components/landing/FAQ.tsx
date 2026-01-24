import { motion } from 'framer-motion'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const FAQS = [
  {
    q: 'How is this different from GitHub search or grep?',
    a: 'Traditional search matches keywords. CodeIntel understands what code does. Search "retry logic with backoff" and find it even if it\'s named `make_request`. We use embeddings trained on code semantics.',
  },
  {
    q: 'What languages do you support?',
    a: 'Python with full Flask, FastAPI, and Django support. TypeScript/JavaScript coming soon, then Go and Rust. Our architecture is language-agnostic — just need parsers.',
  },
  {
    q: 'How does MCP integration work?',
    a: 'CodeIntel runs an MCP server that AI tools like Claude and Cursor can connect to. Your AI assistant gets semantic search over your codebase — finds relevant code automatically.',
  },
  {
    q: 'Is my code stored on your servers?',
    a: 'We store vector embeddings (not raw code) which you can delete anytime. For maximum privacy, self-host — your code never leaves your infrastructure.',
  },
  {
    q: 'How fast is indexing?',
    a: 'Most repos under 100k lines index in under 2 minutes. Incremental updates only process changed files. Search returns in under 100ms regardless of codebase size.',
  },
]

export function FAQ() {
  return (
    <section id="faq" className="py-24 px-6 relative">
      <div className="max-w-3xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Questions? Answers.
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {FAQS.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border border-white/[0.06] dark:border-white/[0.06] light:border-black/[0.06] rounded-xl px-6 bg-card/20"
              >
                <AccordionTrigger className="text-left text-foreground hover:no-underline py-5 text-[15px]">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed text-sm">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        <motion.p
          className="text-center text-sm text-muted-foreground mt-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          More questions?{' '}
          <a href="mailto:devanshurajesh@gmail.com" className="text-accent hover:underline">
            Get in touch
          </a>
        </motion.p>
      </div>
    </section>
  )
}
