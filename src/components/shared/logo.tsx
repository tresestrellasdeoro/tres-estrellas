import Link from 'next/link'
import Image from 'next/image'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  href?: string
}

export function TresEstrellasLogo({ size = 'md', href = '/' }: LogoProps) {
  const sizes = {
    sm: { stars: 'text-base gap-0.5', brand: 'text-xs', sub: 'text-[8px]', bus: 'w-16 h-7', usa: 'text-[7px]' },
    md: { stars: 'text-xl gap-1',     brand: 'text-sm', sub: 'text-[10px]', bus: 'w-20 h-9', usa: 'text-[9px]' },
    lg: { stars: 'text-3xl gap-1.5',  brand: 'text-xl', sub: 'text-sm',     bus: 'w-32 h-14', usa: 'text-xs' },
  }
  const s = sizes[size]

  const content = (
    <div className="flex flex-col items-center select-none">
      {/* Stars */}
      <div className={`flex ${s.stars} mb-0.5`}>
        {['★','★','★'].map((star, i) => (
          <span key={i} className="text-[#c8a951] drop-shadow-sm">{star}</span>
        ))}
      </div>
      {/* Brand name */}
      <div className={`font-black ${s.brand} text-[#0f2c5c] tracking-wider leading-none text-center`}>
        TRES ESTRELLAS
      </div>
      <div className={`font-black ${s.brand} text-[#0f2c5c] tracking-wider leading-tight text-center`}>
        DE ORO
      </div>
      {/* Bus SVG */}
      <div className={`${s.bus} my-1`}>
        <BusSVG />
      </div>
      {/* USA · México */}
      <div className={`${s.usa} font-bold text-[#0f2c5c] tracking-[0.2em] uppercase text-center`}>
        USA • MÉXICO
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }
  return content
}

function BusSVG() {
  return (
    <svg viewBox="0 0 120 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Speed lines */}
      <line x1="2" y1="32" x2="22" y2="32" stroke="#cc1a1a" strokeWidth="3" strokeLinecap="round"/>
      <line x1="2" y1="38" x2="18" y2="38" stroke="#cc1a1a" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="2" y1="43" x2="14" y2="43" stroke="#cc1a1a" strokeWidth="2" strokeLinecap="round"/>
      {/* Bus body */}
      <rect x="18" y="12" width="94" height="32" rx="4" fill="#1a3a6b"/>
      {/* Windows row */}
      <rect x="24" y="17" width="12" height="10" rx="2" fill="#8eb8e8" opacity="0.9"/>
      <rect x="40" y="17" width="12" height="10" rx="2" fill="#8eb8e8" opacity="0.9"/>
      <rect x="56" y="17" width="12" height="10" rx="2" fill="#8eb8e8" opacity="0.9"/>
      <rect x="72" y="17" width="12" height="10" rx="2" fill="#8eb8e8" opacity="0.9"/>
      <rect x="88" y="17" width="12" height="10" rx="2" fill="#8eb8e8" opacity="0.9"/>
      {/* Front window */}
      <rect x="102" y="15" width="7" height="14" rx="2" fill="#b8d8f0" opacity="0.95"/>
      {/* Red stripe */}
      <rect x="18" y="30" width="94" height="6" rx="0" fill="#cc1a1a"/>
      {/* Wheels */}
      <circle cx="38" cy="45" r="5" fill="#0f2c5c" stroke="#8a9bb0" strokeWidth="1.5"/>
      <circle cx="38" cy="45" r="2" fill="#8a9bb0"/>
      <circle cx="88" cy="45" r="5" fill="#0f2c5c" stroke="#8a9bb0" strokeWidth="1.5"/>
      <circle cx="88" cy="45" r="2" fill="#8a9bb0"/>
      {/* Headlight */}
      <rect x="111" y="20" width="5" height="6" rx="1" fill="#ffe066"/>
    </svg>
  )
}

export function LogoNavbar() {
  return (
    <Link href="/" className="flex items-center">
      <Image
        src="/logo.png"
        alt="Tres Estrellas de Oro"
        width={90}
        height={60}
        className="h-9 w-auto object-contain drop-shadow-md"
        priority
      />
    </Link>
  )
}
