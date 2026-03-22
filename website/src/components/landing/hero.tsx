import { useState } from 'react'
import { toast } from 'sonner'
import { useGitHubStats, useGitHubLatestRelease } from '@/hooks/use-github'
import { motion } from 'motion/react'
import { Github, Terminal as TerminalIcon, Copy, Check } from 'lucide-react'
import { Button } from '../ui/button'

export function Hero() {
  const { data: stats } = useGitHubStats()
  const { data: release } = useGitHubLatestRelease()
  const [copied, setCopied] = useState(false)
  const installCommand = 'npm install -g @amnesia2k/git-aic'

  const handleCopy = () => {
    navigator.clipboard.writeText(installCommand)
    setCopied(true)
    toast.success('Command copied to clipboard', {
      description: installCommand,
      duration: 2000,
    })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center pt-24 pb-12 md:pt-32 md:pb-20 overflow-hidden grain-texture">
      {/* Liquid Background Element */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-secondary/10 blur-[100px] rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-3 py-1 mb-4 md:mb-6 text-[10px] md:text-xs font-mono font-medium tracking-widest text-primary bg-primary/10 border border-primary/20 rounded-full">
            {release?.tag_name
              ? `${release.tag_name} IS OUT NOW`
              : 'v 1.2.3 IS OUT NOW'}
          </span>
          <h1 className="display-lg mb-4 md:mb-6 max-w-4xl mx-auto">
            AI-Powered <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-primary via-primary-dim to-secondary whitespace-normal sm:whitespace-nowrap">
              Conventional Commits
            </span>
          </h1>
          <p className="body-lg text-muted-foreground max-w-2xl mx-auto mb-8 md:mb-10 text-balance sm:text-pretty opacity-80 leading-relaxed">
            Stop wasting brain power on commit messages. Generate semantic,
            high-quality conventional commits and markdown diff reports directly
            from your terminal.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-12 md:mb-20">
            <button
              onClick={handleCopy}
              className="btn-glass-primary flex items-center justify-between gap-3 w-full sm:w-auto"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <TerminalIcon className="size-3 md:size-4 shrink-0" />
                <span className="font-mono text-[10px] md:text-sm truncate">
                  {installCommand}
                </span>
              </div>
              {copied ? (
                <Check className="size-3 md:size-4 shrink-0" />
              ) : (
                <Copy className="size-3 md:size-4 shrink-0 opacity-50" />
              )}
            </button>
            <Button
              variant="outline"
              size="lg"
              className="btn-glass-secondary w-full sm:w-auto flex items-center gap-2"
              asChild
            >
              <a
                href="https://github.com/amnesia2k/git-aic"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="size-4" />
                View on GitHub
              </a>
            </Button>
          </div>
        </motion.div>

        {/* Hero Terminal Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mx-auto max-w-4xl"
        >
          <div className="obsidian-terminal active scanning text-left border border-white/5">
            <div className="flex items-center gap-1.5 mb-6 border-b border-white/5 pb-4">
              <div className="size-2.5 rounded-full bg-red-500/50" />
              <div className="size-2.5 rounded-full bg-yellow-500/50" />
              <div className="size-2.5 rounded-full bg-green-500/50" />
              <span className="ml-4 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                git-aic — commit flow
              </span>
            </div>

            <div className="space-y-4 text-sm md:text-base font-mono">
              <div className="flex gap-3">
                <span className="text-secondary">➜</span>
                <span className="text-foreground">git aic</span>
              </div>
              <div className="text-muted-foreground">
                ? Select files to include in commit:
              </div>
              <div className="space-y-1 pl-6">
                <div className="text-primary flex items-center gap-2">
                  <span>●</span> <span>src/index.ts</span>
                </div>
                <div className="text-muted-foreground flex items-center gap-2">
                  <span>○</span> <span>package.json</span>
                </div>
                <div className="text-muted-foreground flex items-center gap-2">
                  <span>○</span> <span>README.md</span>
                </div>
              </div>
              <div className="pt-2 text-muted-foreground italic">
                Analyzing diff with Gemini Pro...
              </div>
              <div className="text-secondary font-bold">
                feat: integrate @clack/prompts for interactive file selection
              </div>
              <div className="text-muted-foreground pl-4">
                - Updated src/index.ts <br />- Added file selector logic
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
