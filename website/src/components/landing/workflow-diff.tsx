import { motion } from 'motion/react'
import { FileCode, Sparkles, BookOpen } from 'lucide-react'

export function WorkflowDiff() {
  return (
    <section className="py-16 md:py-24 relative overflow-hidden bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Visual Mockup */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-2 lg:order-1 relative"
          >
            <div className="absolute -inset-1 bg-linear-to-r from-secondary/30 to-primary/30 rounded-3xl blur-2xl opacity-50" />
            <div className="obsidian-terminal p-0 overflow-hidden border border-white/10 shadow-2xl relative z-10 dark">
              <div className="bg-white/5 px-6 py-4 flex items-center justify-between border-b border-white/5">
                <div className="flex gap-4 items-center">
                  <FileCode className="size-4 text-secondary" />
                  <span className="text-xs font-mono text-white/40">
                    feat-auth-flow.md
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <div className="size-2 rounded-full bg-red-400/50" />
                  <div className="size-2 rounded-full bg-yellow-400/50" />
                  <div className="size-2 rounded-full bg-green-400/50" />
                </div>
              </div>

              <div className="p-6 md:p-8 space-y-6 font-mono text-xs md:text-sm">
                <div className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-4 font-mono mb-6 text-white/90">
                  <div className="flex gap-3 text-xs">
                    <span className="text-secondary">➜</span>
                    <span>git aic --diff</span>
                  </div>
                  <div className="text-[10px] text-white/40">
                    Generated: git-diffs/feat-auth-flow.md
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-tertiary font-bold text-lg">
                    # AI Diff Report
                  </h4>
                  <div className="p-4 rounded-xl bg-white/2 border border-white/5 space-y-4">
                    <div className="flex items-start gap-3">
                      <Sparkles className="size-3 text-secondary mt-1 shrink-0" />
                      <p className="text-white/80 leading-relaxed text-xs">
                        Implemented a robust JWT-based authentication system
                        with secure token storage.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-white/40 pt-4 border-t border-white/5">
                  Metadata: branch[master] hash[a7f3d...] time[2026-03-22 12:45]
                </div>
              </div>
            </div>
          </motion.div>

          {/* Context */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-1 lg:order-2"
          >
            <div className="text-sm font-mono text-secondary mb-4 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-secondary/10 border border-secondary/20 rounded uppercase">
                Workflow 02
              </span>
            </div>
            <h2 className="headline-md mb-4 md:mb-8 font-display">
              Markdown <br />
              <span className="italic text-secondary">Diff Reports</span>
            </h2>
            <p className="body-lg text-muted-foreground mb-10 leading-relaxed max-w-lg">
              Capture your entire thought process in a structured document.
              Perfect for documentation, PR descriptions, and code reviews.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="p-2 rounded-lg bg-white/5 w-fit">
                  <BookOpen className="size-5 text-secondary" />
                </div>
                <h4 className="font-bold text-foreground font-display">
                  Non-Destructive
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Analyze your changes without affecting your git stage or
                  history.
                </p>
              </div>
              <div className="space-y-3">
                <div className="p-2 rounded-lg bg-white/5 w-fit">
                  <FileCode className="size-5 text-primary" />
                </div>
                <h4 className="font-bold text-foreground font-display">
                  AI Insight
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Get concise, human-readable summaries for every modified file.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
