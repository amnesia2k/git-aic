import { useState } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { Check, Copy, Info, SquareTerminal } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  commands,
  environment,
  options,
  recipes,
  rules,
  type ReferenceItem,
} from '@/lib/cli-reference'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Command copied to clipboard', { description: text })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy. Select the command and copy it manually.')
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy ${text}`}
      className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
    >
      {copied ? (
        <Check className="size-3.5 text-primary" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </button>
  )
}

function ReferenceList({
  items,
  accent = 'text-primary',
}: {
  items: ReferenceItem[]
  accent?: string
}) {
  return (
    <div className="glass-panel divide-y divide-border/40 overflow-hidden">
      {items.map((item) => (
        <div
          key={item.usage}
          className="grid grid-cols-1 md:grid-cols-[minmax(0,18rem)_1fr] gap-2 md:gap-8 p-4 md:p-6"
        >
          <code
            className={`font-mono text-xs md:text-sm font-semibold break-all ${accent}`}
          >
            {item.usage}
          </code>
          <div className="space-y-1">
            <p className="text-sm text-foreground/85">{item.description}</p>
            {item.note && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {item.note}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export function Commands() {
  return (
    <section
      id="commands"
      className="py-16 md:py-24 relative overflow-hidden scroll-mt-24"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 md:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-sm font-mono text-primary mb-4 inline-flex items-center gap-2"
          >
            <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded inline-flex items-center gap-1.5">
              <SquareTerminal className="size-3.5" />
              REFERENCE
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="headline-md font-display"
          >
            Every command,{' '}
            <span className="text-primary italic">one place</span>
          </motion.h2>
          <p className="body-lg text-muted-foreground mt-4 max-w-2xl mx-auto text-sm md:text-base">
            Options combine freely.{' '}
            <code className="font-mono text-foreground/80">git aic</code> and{' '}
            <code className="font-mono text-foreground/80">git-aic</code> are
            the same program once the alias is set up.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Tabs defaultValue="options" className="gap-6">
            <div className="flex justify-center max-w-full overflow-x-auto no-scrollbar">
              <TabsList>
                <TabsTrigger value="options">Options</TabsTrigger>
                <TabsTrigger value="commands">Commands</TabsTrigger>
                <TabsTrigger value="recipes">Recipes</TabsTrigger>
                <TabsTrigger value="environment">Env vars</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="options"
              forceMount
              className="data-[state=inactive]:hidden"
            >
              <ReferenceList items={options} />
            </TabsContent>

            <TabsContent
              value="commands"
              forceMount
              className="data-[state=inactive]:hidden"
            >
              <ReferenceList items={commands} accent="text-secondary" />
            </TabsContent>

            <TabsContent
              value="recipes"
              forceMount
              className="data-[state=inactive]:hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recipes.map((recipe) => (
                  <div
                    key={recipe.usage}
                    className="glass-panel p-4 flex items-center gap-3 min-w-0"
                  >
                    <span className="text-primary/50 font-mono text-sm">$</span>
                    <div className="min-w-0 flex-1">
                      <code className="font-mono text-xs md:text-sm font-semibold text-primary break-all">
                        {recipe.usage}
                      </code>
                      <p className="text-xs text-muted-foreground mt-1">
                        {recipe.description}
                      </p>
                    </div>
                    <CopyButton text={recipe.usage} />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent
              value="environment"
              forceMount
              className="data-[state=inactive]:hidden"
            >
              <ReferenceList items={environment} accent="text-tertiary" />
            </TabsContent>
          </Tabs>

          <ul className="mt-8 space-y-2 max-w-3xl mx-auto">
            {rules.map((rule) => (
              <li
                key={rule}
                className="flex items-start gap-3 text-xs md:text-sm text-muted-foreground"
              >
                <Info className="size-4 text-primary/70 shrink-0 mt-0.5" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  )
}
