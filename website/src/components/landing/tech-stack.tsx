import * as React from 'react'
import { Image } from '@unpic/react'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel'
import Autoplay from 'embla-carousel-autoplay'

const techs = [
  { name: 'BUN', logo: 'https://bun.sh/logo.svg' },
  { name: 'NODE.JS', logo: 'https://nodejs.org/static/images/logo.svg' },
  {
    name: 'TYPESCRIPT',
    logo: 'https://www.typescriptlang.org/favicon-32x32.png',
  },
  {
    name: 'GEMINI PRO',
    logo: 'https://www.gstatic.com/lamda/images/gemini_sparkle_4g_512_lt_f94943af3be039176192d.png',
  },
  // {
  //   name: 'COMMANDER.JS',
  //   logo: 'https://raw.githubusercontent.com/tj/commander.js/master/commander.png',
  // },
]

export function TechStack() {
  const plugin = React.useRef(
    Autoplay({ delay: 2000, stopOnInteraction: false }),
  )

  return (
    <section className="py-16 md:py-20 border-y border-white/5 bg-background/30 backdrop-blur-sm overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.4em]">
            Built with high-performance tools
          </p>
        </div>

        <Carousel
          plugins={[plugin.current]}
          className="w-full"
          onMouseEnter={plugin.current.stop}
          onMouseLeave={plugin.current.reset}
          opts={{
            align: 'start',
            loop: true,
          }}
        >
          <CarouselContent className="-ml-8 md:-ml-16 items-center">
            {techs.map((tech) => (
              <CarouselItem
                key={tech.name}
                className="pl-8 md:pl-16 basis-1/2 md:basis-1/3 lg:basis-1/4"
              >
                <div className="flex items-center gap-3 group px-4 py-2 rounded-xl transition-all duration-500 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 hover:bg-white/5 cursor-default w-fit mx-auto">
                  <Image
                    src={tech.logo}
                    alt={tech.name}
                    width={32}
                    height={32}
                    layout="constrained"
                    className="size-6 md:size-8 object-contain group-hover:scale-110 transition-transform"
                  />
                  <span className="text-xs font-mono font-bold tracking-widest text-foreground whitespace-nowrap">
                    {tech.name}
                  </span>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </section>
  )
}
