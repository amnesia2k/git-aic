import { motion } from 'motion/react'
import { Globe, Code } from 'lucide-react'
import { useState, useEffect } from 'react'

export function Installation() {
  const [os, setOs] = useState<'mac' | 'windows' | 'linux'>('mac')

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase()
    if (ua.includes('win')) setOs('windows')
    else if (ua.includes('mac')) setOs('mac')
    else if (ua.includes('linux')) setOs('linux')
  }, [])

  return (
    <section
      id="installation"
      className="py-16 md:py-24 relative overflow-hidden scroll-mt-24"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="headline-md font-display"
          >
            Get Started <span className="text-primary italic">in seconds</span>
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Path A */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-panel p-6 md:p-12 relative group"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="p-2 rounded-lg bg-primary/10">
                <Globe className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-bold font-display uppercase tracking-wider">
                  Path A: Global Install
                </h3>
                <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] mt-1">
                  NPM PACKAGE
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="size-6 rounded-full bg-primary/5 dark:bg-white/5 flex items-center justify-center text-[10px] font-mono border border-primary/10 dark:border-white/5 text-primary">
                    1
                  </span>
                  <p className="text-xs md:text-sm font-medium">Install:</p>
                </div>
                <div className="p-4 bg-muted/30 dark:bg-black/50 rounded-xl font-mono text-xs md:text-sm border border-border/40 text-primary font-semibold overflow-x-auto no-scrollbar break-all">
                  npm install -g @amnesia2k/git-aic
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="size-6 rounded-full bg-primary/5 dark:bg-white/5 flex items-center justify-center text-[10px] font-mono border border-primary/10 dark:border-white/5">
                    2
                  </span>
                  <p className="text-xs md:text-sm font-medium">Config Key:</p>
                </div>
                <div className="p-4 bg-muted/30 dark:bg-black/50 rounded-xl font-mono text-xs md:text-sm border border-border/40 text-foreground/70 overflow-x-auto no-scrollbar break-all">
                  git-aic set-key your_gemini_api_key
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="size-6 rounded-full bg-primary/5 dark:bg-white/5 flex items-center justify-center text-[10px] font-mono border border-primary/10 dark:border-white/5">
                    3
                  </span>
                  <p className="text-xs md:text-sm font-medium">Set Alias:</p>
                </div>
                <div className="p-4 bg-muted/30 dark:bg-black/50 rounded-xl font-mono text-xs md:text-sm border border-border/40 text-foreground/70 overflow-x-auto no-scrollbar break-all">
                  git-aic alias
                </div>
              </div>

              <div className="space-y-4 mt-8 pt-6 border-t border-border/50">
                <div className="flex items-center gap-4">
                  <span className="size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-mono font-bold shadow-lg shadow-primary/20">
                    4
                  </span>
                  <p className="text-xs md:text-sm font-bold uppercase tracking-wider text-primary">Run Now:</p>
                </div>
                <div className="p-5 bg-primary/5 dark:bg-primary/10 rounded-xl font-mono text-xs md:text-sm border-2 border-primary/30 text-primary font-bold shadow-inner overflow-x-auto no-scrollbar break-all flex items-center gap-3">
                  <span className="text-primary/50">$</span> git aic
                </div>
              </div>
            </div>
          </motion.div>

          {/* Path B */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-panel p-6 md:p-12 relative group"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="p-2 rounded-lg bg-secondary/10">
                <Code className="size-5 text-secondary" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-bold font-display uppercase tracking-wider">
                  Path B: Local Clone
                </h3>
                <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] mt-1">
                  DEVELOPMENT
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <span className="size-6 rounded-full bg-secondary/5 dark:bg-white/5 flex items-center justify-center text-[10px] font-mono border border-secondary/10 dark:border-white/5 text-secondary">
                    1
                  </span>
                  <p className="text-xs md:text-sm font-medium">Clone & Install:</p>
                </div>
                <div className="p-4 bg-muted/30 dark:bg-black/50 rounded-xl font-mono text-xs md:text-sm border border-border/40 text-secondary font-semibold overflow-x-auto no-scrollbar break-all">
                  git clone https://github.com/amnesia2k/git-aic.git && bun install
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <span className="size-6 rounded-full bg-secondary/5 dark:bg-white/5 flex items-center justify-center text-[10px] font-mono border border-secondary/10 dark:border-white/5">
                    2
                  </span>
                  <p className="text-xs md:text-sm font-medium">Environment:</p>
                </div>
                <div className="p-4 bg-muted/30 dark:bg-black/50 rounded-xl font-mono text-xs md:text-sm border border-border/40 text-foreground/70 overflow-x-auto no-scrollbar break-all">
                  {os === 'windows'
                    ? 'setx GEMINI_COMMIT_MESSAGE_API_KEY "your_key"'
                    : 'export GEMINI_COMMIT_MESSAGE_API_KEY=your_key'}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <span className="size-6 rounded-full bg-secondary/5 dark:bg-white/5 flex items-center justify-center text-[10px] font-mono border border-secondary/10 dark:border-white/5">
                    3
                  </span>
                  <p className="text-xs md:text-sm font-medium">Manual Alias:</p>
                </div>
                <div className="p-4 bg-muted/30 dark:bg-black/50 rounded-xl font-mono text-xs md:text-sm border border-border/40 text-foreground/70 overflow-x-auto no-scrollbar break-all">
                  {os === 'windows'
                    ? "git config --global alias.aic '!npx tsx \"C:/path/to/cli.ts\"'"
                    : "git config --global alias.aic '!npx tsx \"/path/to/cli.ts\"'"}
                </div>
              </div>

              <div className="space-y-3 mt-8 pt-6 border-t border-border/50">
                <div className="flex items-center gap-4">
                  <span className="size-7 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-mono font-bold shadow-lg shadow-secondary/20">
                    4
                  </span>
                  <p className="text-xs md:text-sm font-bold uppercase tracking-wider text-secondary">Run Now:</p>
                </div>
                <div className="p-5 bg-secondary/5 dark:bg-secondary/10 rounded-xl font-mono text-xs md:text-sm border-2 border-secondary/30 text-secondary font-bold shadow-inner overflow-x-auto no-scrollbar break-all flex items-center gap-3">
                  <span className="text-secondary/50">$</span> git aic
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
