import { Link } from '@tanstack/react-router'
import { Github, Twitter, Mail } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  // const links = [
  //   { name: 'GitHub', href: 'https://github.com/amnesia2k/git-aic' },
  //   { name: 'Documentation', href: '#' },
  //   { name: 'Changelog', href: '#' },
  //   { name: 'Privacy', href: '#' },
  // ]

  return (
    <footer className="py-12 border-t border-white/5 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col items-center md:items-start gap-4">
            <Link
              to="/"
              className="text-xl font-display font-bold tracking-tighter"
            >
              GIT AIC
            </Link>
            <p className="text-xs text-muted-foreground opacity-60">
              © {currentYear} Git AIC. Synthesized by Amnesia2k.
            </p>
          </div>

          {/* <ul className="flex flex-wrap items-center justify-center gap-8">
            {links.map((link) => (
              <li key={link.name}>
                <a
                  href={link.href}
                  className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                >
                  {link.name}
                </a>
              </li>
            ))}
          </ul> */}

          <div className="flex items-center gap-4">
            <a
              href="https://x.com/olathedev_"
              className="p-2 rounded-lg bg-white/5 hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary"
            >
              <Twitter className="size-4" />
            </a>
            <a
              href="https://github.com/amnesia2k/git-aic"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-white/5 hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary"
            >
              <Github className="size-4" />
            </a>
            <a
              href="mailto:tilewaolatoye17@gmail.com"
              className="p-2 rounded-lg bg-white/5 hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary"
            >
              <Mail className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
