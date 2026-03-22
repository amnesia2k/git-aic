import { createFileRoute } from '@tanstack/react-router'
import { Navbar } from '@/components/landing/navbar'
import { Hero } from '@/components/landing/hero'
import { ValueProps } from '@/components/landing/value-props'
import { WorkflowCommit } from '@/components/landing/workflow-commit'
import { WorkflowDiff } from '@/components/landing/workflow-diff'
import { TechStack } from '@/components/landing/tech-stack'
import { Installation } from '@/components/landing/installation'
import { Footer } from '@/components/landing/footer'
import { ScrollToTop } from '@/components/landing/scroll-to-top'

export const Route = createFileRoute('/')({
  component: IndexPage,

  head: () => ({
    meta: [
      {
        title: 'Git AIC - AI-Powered Conventional Commits & Diff Explanations',
      },
      {
        name: 'description',
        content:
          'A high-performance TypeScript CLI that turns your staged changes into perfectly formatted conventional commits and AI-explained markdown reports.',
      },
      {
        name: 'keywords',
        content:
          'Git AIC, AI, Commits, Conventional Commits, Gemini, Google Gemini, CLI, TypeScript, Git, Automation',
      },
      {
        property: 'og:title',
        content: 'Git AIC - AI-Powered Conventional Commits',
      },
      {
        property: 'og:description',
        content:
          'Smart AI-driven commit generation and diff reporting for modern developers.',
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:url',
        content: 'https://git-aic.com/',
      },
      {
        property: 'og:image',
        content: 'https://git-aic.com/og-image.png',
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: 'Git AIC - AI-Powered Conventional Commits',
      },
      {
        name: 'twitter:description',
        content: 'Smart AI-driven commit generation and diff reporting.',
      },
    ],
    links: [
      {
        rel: 'canonical',
        href: 'https://git-aic.com/',
      },
    ],
  }),
})

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Git AIC',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Any',
  url: 'https://git-aic.com',
  description: 'AI-Powered Conventional Commits & Diff Explanations CLI tool.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
}

function IndexPage() {
  return (
    <div className="bg-background min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main>
        <Hero />
        <ValueProps />
        <WorkflowCommit />
        <WorkflowDiff />
        <TechStack />
        <Installation />
        {/* <CtaBanner /> */}
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  )
}
