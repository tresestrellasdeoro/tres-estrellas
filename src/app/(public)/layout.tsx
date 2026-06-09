import { Navbar } from '@/components/shared/navbar'
import { Footer } from '@/components/shared/footer'
import { Chatbot } from '@/components/public/chatbot'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <Chatbot />
    </>
  )
}
