import { motion } from 'motion/react'
import { ArrowUpRight, KeyRound, ShieldCheck, Sparkles } from 'lucide-react'

const steps = [
  {
    title: 'Open AI Studio',
    description:
      'Head to Google AI Studio to manage Gemini access and create API keys.',
    detail: 'ai.google.dev/aistudio',
  },
  {
    title: 'Sign In to Google',
    description:
      'Sign in, accept the current terms if prompted, then open the API key flow from AI Studio.',
    detail: 'Google account required',
  },
  {
    title: 'Create or Reuse a Key',
    description:
      'Generate a Gemini API key, or use the default project and key AI Studio may create for new users.',
    detail: 'Some users may need to select or import a Cloud project',
  },
  {
    title: 'Copy It Into Git AIC',
    description:
      'Paste the key into the Git AIC setup step right below this section and keep it private.',
    detail: 'git-aic set-key your_gemini_api_key',
  },
]

export function GeminiApiKey() {
  return (
    <section
      id="gemini-api-key"
      className="py-16 md:py-24 relative overflow-hidden scroll-mt-24"
    >
      <div className="absolute top-16 left-0 w-64 h-64 bg-primary/10 blur-[110px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-secondary/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="headline-md font-display"
          >
            Get Your <span className="text-primary italic">Gemini API Key</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="body-lg text-muted-foreground max-w-2xl mx-auto mt-4 leading-relaxed"
          >
            Git AIC uses Google Gemini for commit generation and diff
            explanations, so you will need a Gemini API key before setup.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-8 items-stretch">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-panel p-6 md:p-10 flex flex-col justify-between"
          >
            <div>
              <div className="glass-pill text-[10px] md:text-xs font-mono uppercase tracking-[0.35em] text-primary border border-primary/10 mb-6">
                <Sparkles className="size-3" />
                Prerequisite
              </div>

              <h3 className="font-display text-2xl md:text-3xl font-semibold tracking-tight mb-4">
                Grab the key once, then continue into installation.
              </h3>

              <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-8">
                The fastest path is Google AI Studio. Create the key there,
                copy it, and then use the install instructions below to save it
                in Git AIC.
              </p>

              <a
                href="https://aistudio.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-glass-primary inline-flex items-center gap-2 text-sm md:text-base"
              >
                <KeyRound className="size-4" />
                <span>Open Google AI Studio</span>
                <ArrowUpRight className="size-4 opacity-70" />
              </a>
            </div>

            <div className="mt-8 pt-6 border-t border-border/50 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 mt-0.5">
                  <ShieldCheck className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.18em] text-foreground/90">
                    Keep it private
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed mt-2">
                    Treat your Gemini API key like a password. Do not commit it
                    to Git or expose it in client-side code.
                  </p>
                </div>
              </div>

              <p className="text-[11px] md:text-xs uppercase tracking-[0.18em] text-muted-foreground/70 font-mono">
                Some users may need to create, import, or select a Google Cloud
                project in AI Studio before creating a key.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-panel p-4 md:p-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
              {steps.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.06 }}
                  className="rounded-2xl border border-border/40 bg-muted/30 dark:bg-black/30 p-5 md:p-6 flex flex-col"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="size-7 rounded-full bg-primary/10 border border-primary/20 text-primary font-mono text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground font-mono">
                      Step {index + 1}
                    </p>
                  </div>

                  <h3 className="font-display text-lg font-semibold mb-3">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                    {step.description}
                  </p>

                  <div className="mt-5 rounded-xl border border-border/40 bg-background/60 dark:bg-black/40 px-4 py-3 font-mono text-[11px] md:text-xs text-foreground/75 break-words">
                    {step.detail}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
