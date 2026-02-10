import { motion } from 'framer-motion'
import { Quote } from 'lucide-react'
import { SectionWrapper } from '../layout/section-wrapper.tsx'
import { Card } from '../ui/card.tsx'
import { PlatformIcon } from '../ui/platform-icon.tsx'
import { testimonials } from '../../data/testimonials.ts'

export function Testimonials() {
  return (
    <SectionWrapper id="testimonials">
      <div className="text-center mb-14">
        <h2 className="text-3xl md:text-4xl font-bold">
          Trusted by <span className="text-xp-green">top creators</span>
        </h2>
        <p className="mt-4 text-xp-muted max-w-2xl mx-auto">
          Hear from gaming creators who leveled up their finances with XP Financial.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15, duration: 0.5 }}
          >
            <Card className="h-full flex flex-col">
              <Quote size={24} className="text-xp-green/30 mb-4" aria-hidden="true" />
              <blockquote className="text-sm text-xp-muted leading-relaxed flex-1">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div className="mt-6 pt-4 border-t border-xp-border flex items-center gap-3">
                <PlatformIcon platform={t.platform} size={36} />
                <div>
                  <p className="text-sm font-semibold text-xp-text">{t.name}</p>
                  <p className="text-xs text-xp-muted">{t.handle} · {t.role}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </SectionWrapper>
  )
}
