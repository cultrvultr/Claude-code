import { useState } from 'react'
import type { FormEvent } from 'react'
import { Send } from 'lucide-react'
import { SectionWrapper } from '../layout/section-wrapper.tsx'
import { Button } from '../ui/button.tsx'

export function Contact() {
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <SectionWrapper id="contact" className="hero-gradient grid-bg">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold">
          Ready to <span className="text-xp-green">level up</span> your finances?
        </h2>
        <p className="mt-4 text-xp-muted">
          Book a free consultation and let's talk about how we can support your creator
          business. No obligations, no jargon — just a real conversation about your money.
        </p>

        {submitted ? (
          <div className="mt-10 p-8 rounded-xl bg-xp-card border border-xp-green/30">
            <div className="text-xp-green text-4xl mb-4">&#10003;</div>
            <h3 className="text-xl font-bold mb-2">We got your message!</h3>
            <p className="text-xp-muted text-sm">
              We'll be in touch within 24 hours. In the meantime, feel free to explore
              our services above.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10 text-left space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-xp-text mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="w-full px-4 py-3 rounded-lg bg-xp-card border border-xp-border text-xp-text text-sm placeholder-xp-muted/50 focus:outline-none focus:border-xp-green/50 transition-colors"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-xp-text mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="w-full px-4 py-3 rounded-lg bg-xp-card border border-xp-border text-xp-text text-sm placeholder-xp-muted/50 focus:outline-none focus:border-xp-green/50 transition-colors"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="platform" className="block text-sm font-medium text-xp-text mb-1.5">
                  Primary Platform
                </label>
                <select
                  id="platform"
                  name="platform"
                  required
                  className="w-full px-4 py-3 rounded-lg bg-xp-card border border-xp-border text-xp-text text-sm focus:outline-none focus:border-xp-green/50 transition-colors cursor-pointer"
                >
                  <option value="">Select platform</option>
                  <option value="fortnite">Fortnite / UEFN</option>
                  <option value="roblox">Roblox</option>
                  <option value="discord">Discord</option>
                  <option value="multiple">Multiple Platforms</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="revenue" className="block text-sm font-medium text-xp-text mb-1.5">
                  Monthly Revenue Range
                </label>
                <select
                  id="revenue"
                  name="revenue"
                  className="w-full px-4 py-3 rounded-lg bg-xp-card border border-xp-border text-xp-text text-sm focus:outline-none focus:border-xp-green/50 transition-colors cursor-pointer"
                >
                  <option value="">Select range</option>
                  <option value="0-1k">$0 - $1,000</option>
                  <option value="1k-5k">$1,000 - $5,000</option>
                  <option value="5k-20k">$5,000 - $20,000</option>
                  <option value="20k-50k">$20,000 - $50,000</option>
                  <option value="50k+">$50,000+</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-xp-text mb-1.5">
                Tell us about your situation
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                className="w-full px-4 py-3 rounded-lg bg-xp-card border border-xp-border text-xp-text text-sm placeholder-xp-muted/50 focus:outline-none focus:border-xp-green/50 transition-colors resize-none"
                placeholder="What platforms do you create on? What financial challenges are you facing?"
              />
            </div>

            <Button type="submit" className="w-full text-base py-4">
              Book a Free Consultation <Send size={18} />
            </Button>
          </form>
        )}
      </div>
    </SectionWrapper>
  )
}
