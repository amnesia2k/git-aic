import { motion } from 'motion/react'
import { ArrowRight, Sparkles } from 'lucide-react'

export function CtaBanner() {
  return (
    <section className="py-20 md:py-32 relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-panel p-8 md:p-20 text-center relative overflow-hidden border-white/5"
        >
          {/* Animated Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-linear-to-r from-transparent via-primary/50 to-transparent" />
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/10 blur-[80px] rounded-full" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-secondary/10 blur-[80px] rounded-full" />

          <div className="relative z-10">
            <div className="flex justify-center mb-8">
              <div className="p-3 rounded-2xl bg-white/5">
                <Sparkles className="size-8 text-primary animate-pulse" />
              </div>
            </div>

            <h2 className="display-lg mb-6 leading-tight font-display">
              Ready to automate <br />
              <span className="italic text-primary">your workflow?</span>
            </h2>

            <p className="body-lg text-muted-foreground mb-12 max-w-xl mx-auto opacity-80 text-xs md:text-base">
              Join hundreds of developers who have optimized their muscle memory
              with AI-driven conventional commits.
            </p>

            <a
              href="#installation"
              className="btn-glass-primary inline-flex items-center gap-3 px-10 py-5 text-sm uppercase tracking-widest font-bold group"
            >
              Get Started Now
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
