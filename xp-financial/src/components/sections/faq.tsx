import { SectionWrapper } from '../layout/section-wrapper.tsx'
import { AccordionItem } from '../ui/accordion-item.tsx'
import { faqItems } from '../../data/faq.ts'

export function FAQ() {
  return (
    <SectionWrapper id="faq" className="bg-xp-surface/30">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold">
            Frequently asked <span className="text-xp-green">questions</span>
          </h2>
          <p className="mt-4 text-xp-muted">
            Everything you need to know about working with XP Financial.
          </p>
        </div>

        <div className="space-y-3">
          {faqItems.map((item) => (
            <AccordionItem key={item.question} question={item.question} answer={item.answer} />
          ))}
        </div>
      </div>
    </SectionWrapper>
  )
}
