import { GraduationCap, Twitter, Linkedin, Mail } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand col */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 font-bold text-xl text-primary mb-4">
              <span className="font-display tracking-tighter">GIT AIC</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              AI-Powered Conventional Commits & Diff Explanations. A high-performance CLI tool for modern developers.
            </p>
            <div className="flex items-center gap-4 mt-6">
              <a
                href="https://x.com/olathedev_"
                className="p-2 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="size-5" />
              </a>
              <a
                href="https://linkedin.com/in/olatilewaolatoye"
                className="p-2 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="size-5" />
              </a>
              <a
                href="mailto:info@edumatrix.xyz"
                className="p-2 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                aria-label="Email"
              >
                <Mail className="size-5" />
              </a>
            </div>
          </div>

          {/* Links 1 */}
          {/* <div>
            <h3 className="font-semibold text-foreground mb-4">Product</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/features"
                  className="text-muted-foreground hover:text-primary text-sm transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  to="/solutions"
                  className="text-muted-foreground hover:text-primary text-sm transition-colors"
                >
                  Solutions
                </Link>
              </li>
            </ul>
          </div> */}

          {/* Links 2 */}
          {/* <div>
            <h3 className="font-semibold text-foreground mb-4">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/about"
                  className="text-muted-foreground hover:text-primary text-sm transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-muted-foreground hover:text-primary text-sm transition-colors"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  to="/faq"
                  className="text-muted-foreground hover:text-primary text-sm transition-colors"
                >
                  FAQ
                </Link>
              </li>
            </ul>
          </div> */}
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Git AIC. All rights reserved.
          </p>
          {/* <div className="flex gap-6 text-sm text-muted-foreground">
            <Link to="/legal" className="hover:text-foreground">
              Privacy Policy
            </Link>
            <Link to="/legal" className="hover:text-foreground">
              Terms of Service
            </Link>
          </div> */}
        </div>
      </div>
    </footer>
  )
}
