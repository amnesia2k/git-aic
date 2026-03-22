import { Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { Image } from '@unpic/react'
import { ModeToggle } from '@/components/mode-toggle'
import { Button } from '@/components/ui/button'
import { NAV_LINKS } from '@/lib/nav-links'

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Handle scroll effect for navbar background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Lock body scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  // const scrollTo = (id: string) => {
  //   const element = document.getElementById(id)
  //   if (element) {
  //     const offset = 80 // Height of navbar + padding
  //     const bodyRect = document.body.getBoundingClientRect().top
  //     const elementRect = element.getBoundingClientRect().top
  //     const elementPosition = elementRect - bodyRect
  //     const offsetPosition = elementPosition - offset

  //     window.scrollTo({
  //       top: offsetPosition,
  //       behavior: 'smooth',
  //     })
  //   }
  //   setMobileMenuOpen(false)
  // }

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-background/20 backdrop-blur-xl shadow-sm py-2 border-b border-border/20'
            : 'bg-transparent py-4'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center cursor-pointer">
              {/* hover:opacity-80 transition-opacity text-primary */}
              <Image
                src="/schola_logo.png"
                alt="Schola"
                layout="fixed"
                width={40}
                height={40}
                className="block md:hidden"
              />
              <Image
                src="/schola_logo_full.png"
                alt="Schola"
                layout="fixed"
                width={150}
                height={40}
                className="hidden md:block"
              />
            </Link>

            {/* Desktop Navigation */}
            <ul className="hidden md:flex items-center gap-8 text-sm font-medium text-foreground">
              {NAV_LINKS.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="hover:text-primary transition-colors cursor-pointer relative group py-2"
                    activeProps={{ className: 'text-primary font-semibold' }}
                  >
                    {link.name}
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-center" />
                  </Link>
                </li>
              ))}
            </ul>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              <ModeToggle />
              <Button
                size="default"
                className="shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all rounded-full"
                asChild
              >
                <Link to="/waitlist" className="cursor-pointer">
                  Join Waitlist
                </Link>
              </Button>
            </div>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden text-muted-foreground cursor-pointer hover:bg-transparent!"
              aria-label="Open menu"
            >
              <Menu className="size-6" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Side Sheet Overlay */}
      <div
        className={`fixed inset-0 z-60 bg-background/80 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          mobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Side Sheet Panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-61 w-[300px] bg-background border-l border-border shadow-2xl transition-transform duration-300 ease-out transform md:hidden flex flex-col ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center"
          >
            <Image
              src="/schola_logo.png"
              alt="Schola"
              layout="fixed"
              width={32}
              height={32}
            />
          </Link>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-full text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Links */}
        <div className="flex-1 overflow-y-auto py-6 px-6">
          <ul className="space-y-4">
            {NAV_LINKS.map((link) => (
              <li key={link.name}>
                <Link
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-left py-3 text-lg font-medium text-muted-foreground hover:text-primary transition-colors border-b border-border flex items-center justify-between group"
                  activeProps={{ className: 'text-primary font-semibold' }}
                >
                  {link.name}
                  <span className="text-muted-foreground/50 group-hover:text-primary transition-colors">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Mobile Footer */}
        <div className="p-6 border-t border-border bg-muted/50">
          <Button
            size="xl"
            className="shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all w-full"
            asChild
          >
            <Link to="/waitlist" onClick={() => setMobileMenuOpen(false)}>
              Join the Waitlist
            </Link>
          </Button>
          <p className="mt-4 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} Schola
          </p>
        </div>
      </div>
    </>
  )
}
