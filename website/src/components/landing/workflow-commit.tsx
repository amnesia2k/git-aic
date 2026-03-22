import { motion } from 'motion/react'
import { Terminal, Lightbulb, CheckCircle2 } from 'lucide-react'
import { useGitHubLatestRelease } from '@/hooks/use-github'

const steps = [
  'Interactive file selection with @clack/prompts',
  'Deep code analysis via Google Gemini Pro',
  'Strict Conventional Commits formatting',
  'Optional automatic push with --push',
]

export function WorkflowCommit() {
  const { data: release } = useGitHubLatestRelease()
  const version = release?.tag_name || 'v 1.2.3'
  return (
    <section
      id="workflows"
      className="py-16 md:py-24 relative overflow-hidden bg-background/50 scroll-mt-24"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-sm font-mono text-primary mb-4 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded">
                WORKFLOW 01
              </span>
            </div>
            <h2 className="headline-md mb-4 md:mb-8 font-display">
              The Intelligence <br />
              <span className="italic text-primary">Commit Flow</span>
            </h2>
            <p className="body-lg text-muted-foreground mb-10 leading-relaxed max-w-lg">
              Experience the future of development. Selective staging, deep
              analysis, and instant perfection.
            </p>

            <ul className="space-y-6">
              {steps.map((step, i) => (
                <motion.li
                  key={step}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className="p-1 rounded-full bg-primary/10 mt-1">
                    <CheckCircle2 className="size-4 text-primary" />
                  </div>
                  <span className="text-foreground/80 font-medium">{step}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute -inset-1 bg-linear-to-r from-primary/30 to-secondary/30 rounded-3xl blur-2xl opacity-50" />
            <div className="obsidian-terminal active scanning relative z-10 p-0 border border-white/10">
              <div className="bg-white/5 px-6 py-3 border-b border-white/5 flex items-center justify-between">
                <div className="flex gap-1.5">
                  <div className="size-2 rounded-full bg-red-400/50" />
                  <div className="size-2 rounded-full bg-yellow-400/50" />
                  <div className="size-2 rounded-full bg-green-400/50" />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground opacity-50 uppercase">
                  TERM {version}
                </span>
              </div>

              <div className="p-6 md:p-8 space-y-6 font-mono text-xs md:text-sm">
                <div className="flex gap-3">
                  <span className="text-secondary">➜</span>
                  <span className="text-foreground">git aic</span>
                </div>
                <div className="text-muted-foreground">
                  ? Select files to commit:
                </div>
                <div className="space-y-1 pl-6">
                  <div className="text-primary flex items-center gap-2">
                    <span>●</span> <span>src/engine.ts</span>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-2">
                    <span>○</span> <span>package.json</span>
                  </div>
                </div>
                <div className="p-4 bg-white/3 rounded-xl border border-white/5">
                  <div className="text-primary-foreground/50 mb-2">
                    Gemini Analysis:
                  </div>
                  <div className="text-secondary font-bold">
                    feat(engine): optimize prompt structure for Gemini Pro
                  </div>
                </div>
                <div className="flex gap-3 items-center text-xs text-muted-foreground">
                  <span className="text-secondary">➜</span>
                  <span>git aic --push</span>
                  <span className="px-2 py-0.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded ml-auto">
                    PUSHED
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
