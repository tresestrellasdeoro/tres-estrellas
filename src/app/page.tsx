import { Navbar } from '@/components/shared/navbar'
import { Footer } from '@/components/shared/footer'
import { Hero } from '@/components/public/hero'
import { RoutesSection } from '@/components/public/routes-section'
import { TerminalsSection } from '@/components/public/terminals-section'
import { AmenitiesSection } from '@/components/public/amenities-section'
import { LoyaltySection } from '@/components/public/loyalty-section'
import { Chatbot } from '@/components/public/chatbot'

export default function HomePage() {
  return (
    <>
      <Navbar />
      <Hero />
      <RoutesSection />
      <TerminalsSection />
      <AmenitiesSection />
      <LoyaltySection />
      <Footer />
      <Chatbot />
    </>
  )
}
