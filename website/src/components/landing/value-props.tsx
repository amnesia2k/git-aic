import { motion } from 'motion/react'
import { Zap, Shield, FileText, MousePointer2 } from 'lucide-react'

const features = [
  {
    title: 'Eliminate Block',
    description:
      'Never struggle to describe your changes again. Let AI generate professional commit messages instantly.',
    icon: Zap,
    color: 'text-primary',
  },
  {
    title: 'Standardize',
    description:
      'Automatically enforced Conventional Commits format ensures a clean, readable project history.',
    icon: Shield,
    color: 'text-secondary',
  },
  {
    title: 'Code Reviews',
    description:
      'Generate "Diff Reports" that explain what changed and why it matters, before showing the raw code.',
    icon: FileText,
    color: 'text-tertiary',
  },
  {
    title: 'Low Friction',
    description:
      'Designed for speed with bun/node and a minimal terminal UX. Lightning fast execution.',
    icon: MousePointer2,
    color: 'text-primary',
  },
]

export function ValueProps() {
  return (
    <section
      id="features"
      className="py-16 md:py-24 relative overflow-hidden scroll-mt-24"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-20">
          <motion.h2
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="headline-md font-display font-medium text-foreground tracking-tight"
          >
            Engineered for <span className="text-primary italic">Velocity</span>
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass-panel p-8 group hover:border-primary/50 transition-all duration-500"
            >
              <div
                className={`p-3 rounded-2xl bg-white/5 w-fit mb-6 group-hover:bg-primary/10 transition-colors`}
              >
                <feature.icon className={`size-6 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-display font-bold mb-4 text-foreground">
                {feature.title}
              </h3>
              <p className="body-lg text-muted-foreground leading-relaxed text-sm">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
