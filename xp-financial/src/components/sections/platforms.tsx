import { motion } from 'framer-motion'
import { SectionWrapper } from '../layout/section-wrapper.tsx'
import { Card } from '../ui/card.tsx'
import { PlatformIcon } from '../ui/platform-icon.tsx'
import { platforms } from '../../data/platforms.ts'

export function Platforms() {
  return (
    <SectionWrapper id="platforms">
      <div className="text-center mb-14">
        <h2 className="text-3xl md:text-4xl font-bold">
          Built for the platforms <span className="text-xp-green">you create on</span>
        </h2>
        <p className="mt-4 text-xp-muted max-w-2xl mx-auto">
          We understand the unique revenue models, payout structures, and tax
          implications of each platform — because that's all we do.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {platforms.map((platform, i) => (
          <motion.div
            key={platform.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15, duration: 0.5 }}
          >
            <Card className="h-full">
              <div className="flex items-center gap-3 mb-4">
                <PlatformIcon platform={platform.platform} size={40} />
                <h3 className="text-xl font-bold">{platform.name}</h3>
              </div>
              <p className="text-xp-muted text-sm mb-4">{platform.description}</p>
              <ul className="space-y-2">
                {platform.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-sm text-xp-muted">
                    <span className="text-xp-green mt-1 flex-shrink-0">&#9656;</span>
                    {bullet}
                  </li>
                ))}
              </ul>
            </Card>
          </motion.div>
        ))}
      </div>
    </SectionWrapper>
  )
}
