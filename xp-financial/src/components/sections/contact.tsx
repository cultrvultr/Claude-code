import { useState } from 'react'
import type { FormEvent } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { SectionWrapper } from '../layout/section-wrapper.tsx'
import { Button } from '../ui/button.tsx'

interface FormErrors {
  name?: string
  email?: string
  platform?: string
}

export function Contact() {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  function validate(form: HTMLFormElement): FormErrors {
    const data = new FormData(form)
    const errs: FormErrors = {}
    if (!data.get('name')?.toString().trim()) errs.name = 'Name is required'
    const email = data.get('email')?.toString().trim() ?? ''
    if (!email) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email'
    if (!data.get('platform')) errs.platform = 'Please select a platform'
    return errs
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    // Simulate network request — replace with actual API call
    await new Promise((resolve) => setTimeout(resolve, 1200))
    setSubmitting(false)
    setSubmitted(true)
  }

  const fieldClass =
    'w-full px-4 py-3 rounded-lg bg-xp-card border text-xp-text text-sm placeholder-xp-muted/50 focus:outline-none focus:border-xp-green/50 transition-colors'

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
          <div className="mt-10 p-8 rounded-xl bg-xp-card border border-xp-green/30" role="status">
            <div className="text-xp-green text-4xl mb-4">&#10003;</div>
            <h3 className="text-xl font-bold mb-2">We got your message!</h3>
            <p className="text-xp-muted text-sm">
              We'll be in touch within 24 hours. In the meantime, feel free to explore
              our services above.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10 text-left space-y-5" noValidate>
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
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                  className={`${fieldClass} ${errors.name ? 'border-red-500' : 'border-xp-border'}`}
                  placeholder="Your name"
                />
                {errors.name && (
                  <p id="name-error" className="mt-1 text-xs text-red-400" role="alert">{errors.name}</p>
                )}
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
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  className={`${fieldClass} ${errors.email ? 'border-red-500' : 'border-xp-border'}`}
                  placeholder="you@example.com"
                />
                {errors.email && (
                  <p id="email-error" className="mt-1 text-xs text-red-400" role="alert">{errors.email}</p>
                )}
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
                  aria-invalid={!!errors.platform}
                  aria-describedby={errors.platform ? 'platform-error' : undefined}
                  className={`${fieldClass} cursor-pointer ${errors.platform ? 'border-red-500' : 'border-xp-border'}`}
                >
                  <option value="">Select platform</option>
                  <option value="fortnite">Fortnite / UEFN</option>
                  <option value="roblox">Roblox</option>
                  <option value="discord">Discord</option>
                  <option value="multiple">Multiple Platforms</option>
                  <option value="other">Other</option>
                </select>
                {errors.platform && (
                  <p id="platform-error" className="mt-1 text-xs text-red-400" role="alert">{errors.platform}</p>
                )}
              </div>
              <div>
                <label htmlFor="revenue" className="block text-sm font-medium text-xp-text mb-1.5">
                  Monthly Revenue Range <span className="text-xp-muted">(optional)</span>
                </label>
                <select
                  id="revenue"
                  name="revenue"
                  className={`${fieldClass} border-xp-border cursor-pointer`}
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
                className={`${fieldClass} border-xp-border resize-none`}
                placeholder="What platforms do you create on? What financial challenges are you facing?"
              />
            </div>

            <Button type="submit" className="w-full text-base py-4" disabled={submitting}>
              {submitting ? (
                <>Sending… <Loader2 size={18} className="animate-spin" /></>
              ) : (
                <>Book a Free Consultation <Send size={18} /></>
              )}
            </Button>
          </form>
        )}
      </div>
    </SectionWrapper>
  )
}
