// Central bus configuration — editable via admin dashboard
// This represents the data that would live in Supabase in production

export type StopCode = 'LA' | 'HP' | 'SYS' | 'TIJ' | 'OTY'

export interface Stop {
  code: StopCode
  name: string
  city: string
  state: string
}

export const ALL_STOPS: Record<StopCode, Stop> = {
  LA:  { code: 'LA',  name: 'Los Angeles',        city: 'Los Angeles',    state: 'CA' },
  HP:  { code: 'HP',  name: 'Huntington Park',     city: 'Huntington Park',state: 'CA' },
  SYS: { code: 'SYS', name: 'San Ysidro',          city: 'San Diego',      state: 'CA' },
  TIJ: { code: 'TIJ', name: 'Aeropuerto Tijuana',  city: 'Tijuana',        state: 'BC' },
  OTY: { code: 'OTY', name: 'Garita de Otay',      city: 'Tijuana',        state: 'BC' },
}

export interface BusStop {
  code: StopCode
  time: string
  type: 'boarding' | 'dropping' | 'both'
}

export interface BusRoute {
  id: string
  name: string
  departs: string
  direction: 'LA_TO_TJ' | 'TJ_TO_LA'
  capacity: number
  stops: BusStop[]
}

// Price per adult: key = "ORIGIN:DESTINATION"
// Editable in admin → Tarifas tab
// Round trip = (price × 2) × 0.75  (25% discount)
export const ROUTE_PRICES: Record<string, { adult: number; child: number }> = {
  // ── Los Angeles → Tijuana ──
  'LA:SYS':  { adult: 45, child: 40 },
  'LA:TIJ':  { adult: 55, child: 50 },
  'LA:OTY':  { adult: 55, child: 50 },

  // ── Huntington Park → Tijuana (HP is ~$10 less than LA) ──
  'HP:SYS':  { adult: 35, child: 30 },
  'HP:TIJ':  { adult: 45, child: 40 },
  'HP:OTY':  { adult: 45, child: 40 },

  // ── Tijuana → Los Angeles ──
  'OTY:LA':  { adult: 55, child: 50 },
  'OTY:HP':  { adult: 45, child: 40 },
  'OTY:SYS': { adult: 20, child: 15 },

  'TIJ:LA':  { adult: 55, child: 50 },
  'TIJ:HP':  { adult: 45, child: 40 },
  'TIJ:SYS': { adult: 15, child: 12 },

  // ── San Ysidro → Los Angeles ──
  'SYS:LA':  { adult: 45, child: 40 },
  'SYS:HP':  { adult: 35, child: 30 },
}

export function getPrice(origin: StopCode, destination: StopCode) {
  return ROUTE_PRICES[`${origin}:${destination}`] || { adult: 35, child: 20 }
}

// Luggage pricing — editable in admin
export interface LuggageOption {
  id: string
  label: string
  description: string
  price: number
  maxKg?: number
  icon: string
}

export const LUGGAGE_OPTIONS: LuggageOption[] = [
  {
    id: 'none',
    label: 'Sin equipaje adicional',
    description: 'Solo equipaje de mano (incluido)',
    price: 0,
    icon: '🎒',
  },
  {
    id: 'one_bag',
    label: '1 maleta',
    description: 'Una maleta hasta 25 kg',
    price: 10,
    maxKg: 25,
    icon: '🧳',
  },
  {
    id: 'two_bags',
    label: '2 maletas',
    description: 'Dos maletas hasta 25 kg c/u',
    price: 18,
    maxKg: 25,
    icon: '🧳🧳',
  },
  {
    id: 'extra',
    label: 'Equipaje extra',
    description: 'Más de 2 maletas o artículos grandes',
    price: 25,
    icon: '📦',
  },
]

// All 13 bus routes (sourced from mediumaquamarine-raven-425194.hostingersite.com)
export const BUS_ROUTES: BusRoute[] = [
  // ── LA → Tijuana (full: LA, HP boarding → SYS, TIJ, OTY dropping) ──
  {
    id: 'bus-1',
    name: '3:20 AM Los Angeles – Tijuana',
    departs: '3:20 AM',
    direction: 'LA_TO_TJ',
    capacity: 56,
    stops: [
      { code: 'LA',  time: '3:20 AM',  type: 'boarding' },
      { code: 'HP',  time: '4:00 AM',  type: 'boarding' },
      { code: 'SYS', time: '6:30 AM',  type: 'dropping' },
      { code: 'TIJ', time: '8:00 AM',  type: 'dropping' },
      { code: 'OTY', time: '8:30 AM',  type: 'dropping' },
    ],
  },
  {
    id: 'bus-2',
    name: '5:20 AM Los Angeles – Tijuana',
    departs: '5:20 AM',
    direction: 'LA_TO_TJ',
    capacity: 56,
    stops: [
      { code: 'LA',  time: '5:20 AM',  type: 'boarding' },
      { code: 'HP',  time: '6:00 AM',  type: 'boarding' },
      { code: 'SYS', time: '9:00 AM',  type: 'dropping' },
      { code: 'TIJ', time: '11:00 AM', type: 'dropping' },
      { code: 'OTY', time: '11:30 AM', type: 'dropping' },
    ],
  },
  {
    id: 'bus-3',
    name: '7:20 AM Los Angeles – Tijuana',
    departs: '7:20 AM',
    direction: 'LA_TO_TJ',
    capacity: 56,
    stops: [
      { code: 'LA',  time: '7:20 AM',  type: 'boarding' },
      { code: 'HP',  time: '8:00 AM',  type: 'boarding' },
      { code: 'SYS', time: '12:00 PM', type: 'dropping' },
      { code: 'TIJ', time: '3:00 PM',  type: 'dropping' },
      { code: 'OTY', time: '3:30 PM',  type: 'dropping' },
    ],
  },
  {
    id: 'bus-4',
    name: '9:20 AM Los Angeles – Tijuana',
    departs: '9:20 AM',
    direction: 'LA_TO_TJ',
    capacity: 56,
    stops: [
      { code: 'LA',  time: '9:20 AM',  type: 'boarding' },
      { code: 'HP',  time: '10:00 AM', type: 'boarding' },
      { code: 'SYS', time: '2:00 PM',  type: 'dropping' },
      { code: 'TIJ', time: '4:00 PM',  type: 'dropping' },
      { code: 'OTY', time: '4:30 PM',  type: 'dropping' },
    ],
  },
  {
    id: 'bus-5',
    name: '11:20 AM Los Angeles – Tijuana',
    departs: '11:20 AM',
    direction: 'LA_TO_TJ',
    capacity: 56,
    stops: [
      { code: 'LA',  time: '11:20 AM', type: 'boarding' },
      { code: 'HP',  time: '12:00 PM', type: 'boarding' },
      { code: 'SYS', time: '4:00 PM',  type: 'dropping' },
      { code: 'TIJ', time: '5:00 PM',  type: 'dropping' },
      { code: 'OTY', time: '5:30 PM',  type: 'dropping' },
    ],
  },
  // ── LA → San Ysidro (boarding LA, HP → dropping SYS) ──
  {
    id: 'bus-6',
    name: '1:20 PM Los Angeles – San Ysidro',
    departs: '1:20 PM',
    direction: 'LA_TO_TJ',
    capacity: 56,
    stops: [
      { code: 'LA',  time: '1:20 PM', type: 'boarding' },
      { code: 'HP',  time: '2:00 PM', type: 'boarding' },
      { code: 'SYS', time: '6:00 PM', type: 'dropping' },
    ],
  },
  {
    id: 'bus-7',
    name: '3:20 PM Los Angeles – San Ysidro',
    departs: '3:20 PM',
    direction: 'LA_TO_TJ',
    capacity: 56,
    stops: [
      { code: 'LA',  time: '3:20 PM', type: 'boarding' },
      { code: 'HP',  time: '4:00 PM', type: 'boarding' },
      { code: 'SYS', time: '8:00 PM', type: 'dropping' },
    ],
  },
  {
    id: 'bus-8',
    name: '5:20 PM Los Angeles – San Ysidro',
    departs: '5:20 PM',
    direction: 'LA_TO_TJ',
    capacity: 56,
    stops: [
      { code: 'LA',  time: '5:20 PM',  type: 'boarding' },
      { code: 'HP',  time: '6:00 PM',  type: 'boarding' },
      { code: 'SYS', time: '10:30 PM', type: 'dropping' },
    ],
  },
  {
    id: 'bus-9',
    name: '7:20 PM Los Angeles – San Ysidro',
    departs: '7:20 PM',
    direction: 'LA_TO_TJ',
    capacity: 56,
    stops: [
      { code: 'LA',  time: '7:20 PM',  type: 'boarding' },
      { code: 'HP',  time: '8:00 PM',  type: 'boarding' },
      { code: 'SYS', time: '12:00 AM', type: 'dropping' },
    ],
  },
  // ── Tijuana → LA ──
  {
    id: 'bus-tj-1',
    name: '11:30 AM Garita de Otay – Los Angeles',
    departs: '11:30 AM',
    direction: 'TJ_TO_LA',
    capacity: 56,
    stops: [
      { code: 'OTY', time: '11:30 AM', type: 'boarding' },
      { code: 'SYS', time: '1:30 PM',  type: 'both' },
      { code: 'LA',  time: '5:30 PM',  type: 'dropping' },
    ],
  },
  {
    id: 'bus-tj-2',
    name: '1:30 PM Garita de Otay – Los Angeles',
    departs: '1:30 PM',
    direction: 'TJ_TO_LA',
    capacity: 56,
    stops: [
      { code: 'OTY', time: '1:30 PM', type: 'boarding' },
      { code: 'SYS', time: '2:30 PM', type: 'both' },
      { code: 'HP',  time: '5:30 PM', type: 'dropping' },
      { code: 'LA',  time: '6:30 PM', type: 'dropping' },
    ],
  },
  {
    id: 'bus-tj-3',
    name: '3:30 PM Garita de Otay – Los Angeles',
    departs: '3:30 PM',
    direction: 'TJ_TO_LA',
    capacity: 56,
    stops: [
      { code: 'OTY', time: '3:30 PM', type: 'boarding' },
      { code: 'SYS', time: '4:30 PM', type: 'both' },
      { code: 'HP',  time: '7:00 PM', type: 'dropping' },
      { code: 'LA',  time: '8:00 PM', type: 'dropping' },
    ],
  },
  {
    id: 'bus-tj-4',
    name: '7:30 PM Garita de Otay – Los Angeles',
    departs: '7:30 PM',
    direction: 'TJ_TO_LA',
    capacity: 56,
    stops: [
      { code: 'OTY', time: '7:30 PM',  type: 'boarding' },
      { code: 'SYS', time: '8:30 PM',  type: 'both' },
      { code: 'HP',  time: '11:30 PM', type: 'dropping' },
      { code: 'LA',  time: '12:30 AM', type: 'dropping' },
    ],
  },
]

export function getBusById(id: string): BusRoute | undefined {
  return BUS_ROUTES.find(b => b.id === id)
}

export function getBoardingStops(bus: BusRoute): BusStop[] {
  return bus.stops.filter(s => s.type === 'boarding' || s.type === 'both')
}

export function getDroppingStops(bus: BusRoute): BusStop[] {
  return bus.stops.filter(s => s.type === 'dropping' || s.type === 'both')
}

// Seats available — shown in search results (will be replaced with real DB counts)
export const DEMO_SEATS_AVAILABLE: Record<string, number> = {
  'bus-1': 48, 'bus-2': 50, 'bus-3': 44, 'bus-4': 52, 'bus-5': 40,
  'bus-6': 56, 'bus-7': 38, 'bus-8': 50, 'bus-9': 45,
  'bus-tj-1': 46, 'bus-tj-2': 42, 'bus-tj-3': 56, 'bus-tj-4': 48,
}
