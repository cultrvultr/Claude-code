import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Button } from '../ui/button.tsx'
import { PlatformIcon } from '../ui/platform-icon.tsx'

export function Hero() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center hero-gradient grid-bg overflow-hidden">
      {/* Decorative glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-xp-indigo/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-xp-green/5 rounded-full blur-[128px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 relative z-10">
        <div className="max-w-3xl">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-xp-border bg-xp-card/50 text-xs text-xp-muted mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-xp-green animate-pulse" />
            Accounting built for gaming creators
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight"
          >
            We handle the books.{' '}
            <span className="text-xp-green">You build the worlds.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="mt-6 text-lg md:text-xl text-xp-muted leading-relaxed max-w-2xl"
          >
            Expert accounting and bookkeeping for the top UGC gaming creators across
            Fortnite, Roblox, and Discord. We take care of your finances — so you can
            focus on creating.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-8 flex flex-col sm:flex-row gap-4"
          >
            <Button href="#contact" className="text-base px-8 py-4">
              Book a Free Consultation <ArrowRight size={18} />
            </Button>
            <Button href="#services" variant="outline" className="text-base px-8 py-4">
              See Our Services
            </Button>
          </motion.div>

          {/* Platform badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="mt-12 flex items-center gap-6"
          >
            <span className="text-xs text-xp-muted uppercase tracking-wider">Trusted by creators on</span>
            <div className="flex items-center gap-4">
              <PlatformIcon platform="fortnite" />
              <PlatformIcon platform="roblox" />
              <PlatformIcon platform="discord" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
