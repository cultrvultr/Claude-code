import { Navbar } from './components/layout/navbar.tsx'
import { Footer } from './components/layout/footer.tsx'
import { Hero } from './components/sections/hero.tsx'
import { Platforms } from './components/sections/platforms.tsx'
import { Services } from './components/sections/services.tsx'
import { HowItWorks } from './components/sections/how-it-works.tsx'
import { StatsBar } from './components/sections/stats-bar.tsx'
import { Testimonials } from './components/sections/testimonials.tsx'
import { FAQ } from './components/sections/faq.tsx'
import { Contact } from './components/sections/contact.tsx'

function App() {
  return (
    <div className="bg-xp-dark text-xp-text min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <Platforms />
        <Services />
        <HowItWorks />
        <StatsBar />
        <Testimonials />
        <FAQ />
        <Contact />
      </main>
      <Footer />
    </div>
  )
}

export default App
