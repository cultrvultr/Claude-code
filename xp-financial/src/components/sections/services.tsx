import { motion } from 'framer-motion'
import { SectionWrapper } from '../layout/section-wrapper.tsx'
import { Card } from '../ui/card.tsx'
import { ServiceIcon } from '../ui/service-icon.tsx'
import { services } from '../../data/services.ts'

export function Services() {
  return (
    <SectionWrapper id="services" className="bg-xp-surface/30">
      <div className="text-center mb-14">
        <h2 className="text-3xl md:text-4xl font-bold">
          Full-service <span className="text-xp-green">financial support</span>
        </h2>
        <p className="mt-4 text-xp-muted max-w-2xl mx-auto">
          By combining deep knowledge of the gaming creator economy with the backroom
          power of accounting and tax experts, we offer a customized and powerful service
          designed to support you and your business.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service, i) => (
          <motion.div
            key={service.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: (i % 3) * 0.1, duration: 0.5 }}
          >
            <Card className="h-full">
              <div className="w-10 h-10 rounded-lg bg-xp-green/10 flex items-center justify-center mb-4">
                <ServiceIcon name={service.icon} size={20} className="text-xp-green" />
              </div>
              <h3 className="text-lg font-bold mb-2">{service.title}</h3>
              <p className="text-xp-muted text-sm leading-relaxed">{service.description}</p>
            </Card>
          </motion.div>
        ))}
      </div>
    </SectionWrapper>
  )
}
