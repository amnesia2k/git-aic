import { Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Menu, X, Star } from 'lucide-react'
import { ModeToggle } from '@/components/mode-toggle'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'motion/react'

import { useGitHubStats } from '@/hooks/use-github'

export function Navbar() {
  const { data: stats } = useGitHubStats()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'Workflows', href: '#workflows' },
    { name: 'Installation', href: '#installation' },
  ]

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-background/40 backdrop-blur-xl border-b border-white/5 py-4'
            : 'bg-transparent py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2 group cursor-pointer"
            >
              <span className="text-xl font-display font-bold tracking-tighter text-foreground group-hover:text-primary transition-colors">
                GIT AIC
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <ul className="flex items-center gap-8 text-sm font-medium">
                {navLinks.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-4">
                {/* GitHub Star Pill */}
                <a
                  href="https://github.com/amnesia2k/git-aic"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-pill text-xs font-mono group hover:border-primary/50 transition-colors"
                >
                  <Star className="size-3 text-tertiary fill-tertiary group-hover:scale-110 transition-transform" />
                  <span>
                    {stats?.stargazers_count !== undefined
                      ? `${stats.stargazers_count.toLocaleString()} Stars`
                      : 'Star on GitHub'}
                  </span>
                </a>

                <ModeToggle />
              </div>
            </div>

            {/* Mobile Menu Toggle */}
            <div className="md:hidden flex items-center gap-2">
              <ModeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(true)}
                className="text-foreground"
              >
                <Menu className="size-6" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-60 bg-background md:hidden p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-12">
              <span className="text-xl font-display font-bold tracking-tighter">
                GIT AIC
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="size-6" />
              </Button>
            </div>

            <ul className="flex flex-col gap-6 text-2xl font-display font-medium">
              {navLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="hover:text-primary transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-8 border-t border-border">
              <a
                href="https://github.com/amnesia2k/git-aic"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 glass-pill py-4 w-full text-sm font-mono"
              >
                <Star className="size-4 text-tertiary fill-tertiary" />
                <span>Star on GitHub</span>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
