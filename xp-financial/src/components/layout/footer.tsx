export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-xp-darker border-t border-xp-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <a href="#hero" className="inline-flex items-center gap-1">
              <span className="text-2xl font-extrabold text-xp-green">XP</span>
              <span className="text-lg font-semibold text-xp-text">Financial</span>
            </a>
            <p className="mt-3 text-xp-muted text-sm leading-relaxed max-w-md">
              We take care of your finances — so you can focus on creating.
              Expert accounting and bookkeeping built for UGC gaming creators.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-sm font-semibold text-xp-text mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {['Platforms', 'Services', 'How It Works', 'Testimonials', 'FAQ'].map((item) => (
                <li key={item}>
                  <a
                    href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                    className="text-sm text-xp-muted hover:text-xp-green transition-colors"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-xp-text mb-4">Get in Touch</h4>
            <ul className="space-y-2 text-sm text-xp-muted">
              <li>
                <a href="#contact" className="hover:text-xp-green transition-colors">
                  Book a Consultation
                </a>
              </li>
              <li>
                <a href="mailto:hello@xpfinancial.gg" className="hover:text-xp-green transition-colors">
                  hello@xpfinancial.gg
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-xp-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-xp-muted">
            &copy; {currentYear} XP Financial. All rights reserved.
          </p>
          <p className="text-xs text-xp-muted">
            Built for creators, by people who get gaming.
          </p>
        </div>
      </div>
    </footer>
  )
}
