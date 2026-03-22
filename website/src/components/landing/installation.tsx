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
            Get Started <span className="text-primary italic">in Seconds</span>
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
                  <span className="size-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-mono border border-white/5">
                    1
                  </span>
                  <p className="text-xs md:text-sm font-medium">Install:</p>
                </div>
                <div className="p-4 bg-black/40 rounded-xl font-mono text-xs md:text-sm border border-white/5 text-primary overflow-x-auto no-scrollbar break-all">
                  npm install -g @amnesia2k/git-aic
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="size-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-mono border border-white/5">
                    2
                  </span>
                  <p className="text-xs md:text-sm font-medium">Config Key:</p>
                </div>
                <div className="p-4 bg-black/40 rounded-xl font-mono text-xs md:text-sm border border-white/5 text-muted-foreground overflow-x-auto no-scrollbar break-all">
                  git-aic set-key your_gemini_api_key
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="size-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-mono border border-white/5">
                    3
                  </span>
                  <p className="text-xs md:text-sm font-medium">Set Alias:</p>
                </div>
                <div className="p-4 bg-black/40 rounded-xl font-mono text-xs md:text-sm border border-white/5 text-muted-foreground overflow-x-auto no-scrollbar break-all">
                  git-aic alias
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="size-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-mono border border-white/5 font-bold">
                    4
                  </span>
                  <p className="text-xs md:text-sm font-medium">Run Now:</p>
                </div>
                <div className="p-4 bg-primary/10 rounded-xl font-mono text-xs md:text-sm border border-primary/20 text-primary overflow-x-auto no-scrollbar break-all">
                  git aic
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
                  <span className="size-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-mono border border-white/5">
                    1
                  </span>
                  <p className="text-xs md:text-sm font-medium">Clone & Install:</p>
                </div>
                <div className="p-4 bg-black/40 rounded-xl font-mono text-xs md:text-sm border border-white/5 text-secondary overflow-x-auto no-scrollbar break-all">
                  git clone https://github.com/amnesia2k/git-aic.git && bun
                  install
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <span className="size-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-mono border border-white/5">
                    2
                  </span>
                  <p className="text-xs md:text-sm font-medium">Environment:</p>
                </div>
                <div className="p-4 bg-black/40 rounded-xl font-mono text-xs md:text-sm border border-white/5 text-muted-foreground overflow-x-auto no-scrollbar break-all">
                  {os === 'windows'
                    ? 'setx GEMINI_COMMIT_MESSAGE_API_KEY "your_key"'
                    : 'export GEMINI_COMMIT_MESSAGE_API_KEY=your_key'}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <span className="size-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-mono border border-white/5">
                    3
                  </span>
                  <p className="text-xs md:text-sm font-medium">Manual Alias:</p>
                </div>
                <div className="p-4 bg-black/40 rounded-xl font-mono text-xs md:text-sm border border-white/5 text-muted-foreground overflow-x-auto no-scrollbar break-all">
                  {os === 'windows'
                    ? "git config --global alias.aic '!npx tsx \"C:/path/to/cli.ts\"'"
                    : "git config --global alias.aic '!npx tsx \"/path/to/cli.ts\"'"}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <span className="size-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-mono border border-white/5 font-bold">
                    4
                  </span>
                  <p className="text-xs md:text-sm font-medium">Run Now:</p>
                </div>
                <div className="p-4 bg-secondary/10 rounded-xl font-mono text-xs md:text-sm border border-secondary/20 text-secondary overflow-x-auto no-scrollbar break-all">
                  git aic
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
