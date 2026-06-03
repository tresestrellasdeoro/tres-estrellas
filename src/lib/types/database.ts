export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'customer' | 'driver' | 'admin' | 'super_admin'
export type TripStatus = 'scheduled' | 'boarding' | 'in_transit' | 'arrived' | 'cancelled' | 'delayed'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded' | 'used'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type PaymentProvider = 'stripe' | 'square' | 'cash'
export type TicketType = 'one_way' | 'round_trip'
export type PassengerType = 'adult' | 'child' | 'senior'
export type LoyaltyTier = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          role: UserRole
          loyalty_tier: LoyaltyTier
          loyalty_points: number
          total_trips: number
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      stops: {
        Row: {
          id: string
          code: string
          name: string
          city: string
          state: string
          address: string | null
          terminal_name: string | null
          lat: number | null
          lng: number | null
          is_active: boolean
          sort_order: number
        }
        Insert: Omit<Database['public']['Tables']['stops']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['stops']['Insert']>
      }
      routes: {
        Row: {
          id: string
          code: string
          name: string
          origin_stop_id: string
          destination_stop_id: string
          duration_minutes: number
          distance_miles: number | null
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['routes']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['routes']['Insert']>
      }
      buses: {
        Row: {
          id: string
          plate: string
          model: string
          brand: string
          year: number
          capacity: number
          amenities: Json
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['buses']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['buses']['Insert']>
      }
      schedules: {
        Row: {
          id: string
          route_id: string
          departure_time: string
          days_of_week: number[]
          is_active: boolean
        }
        Insert: Omit<Database['public']['Tables']['schedules']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['schedules']['Insert']>
      }
      trips: {
        Row: {
          id: string
          trip_number: string
          schedule_id: string
          bus_id: string | null
          driver_id: string | null
          departure_date: string
          departure_time: string
          estimated_arrival: string
          actual_departure: string | null
          actual_arrival: string | null
          status: TripStatus
          seats_total: number
          seats_available: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['trips']['Row'], 'id' | 'trip_number' | 'created_at'>
        Update: Partial<Database['public']['Tables']['trips']['Insert']>
      }
      pricing: {
        Row: {
          id: string
          route_id: string
          terminal_id: string
          passenger_type: PassengerType
          ticket_type: TicketType
          price: number
        }
        Insert: Omit<Database['public']['Tables']['pricing']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['pricing']['Insert']>
      }
      bookings: {
        Row: {
          id: string
          booking_number: string
          trip_id: string
          customer_id: string
          return_trip_id: string | null
          ticket_type: TicketType
          status: BookingStatus
          total_amount: number
          points_earned: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['bookings']['Row'], 'id' | 'booking_number' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>
      }
      passengers: {
        Row: {
          id: string
          booking_id: string
          full_name: string
          passenger_type: PassengerType
          seat_number: string | null
          qr_code: string
          price: number
          terminal_id: string
          checked_in: boolean
          checked_in_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['passengers']['Row'], 'id' | 'qr_code'>
        Update: Partial<Database['public']['Tables']['passengers']['Insert']>
      }
      payments: {
        Row: {
          id: string
          booking_id: string
          amount: number
          provider: PaymentProvider
          provider_payment_id: string | null
          status: PaymentStatus
          payment_method: string | null
          metadata: Json
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
      }
      loyalty_transactions: {
        Row: {
          id: string
          customer_id: string
          booking_id: string | null
          points: number
          type: 'earned' | 'redeemed' | 'expired' | 'bonus'
          description: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['loyalty_transactions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['loyalty_transactions']['Insert']>
      }
      luggage_types: {
        Row: {
          id: string
          name: string
          description: string | null
          max_weight_lbs: number
          extra_fee: number
          is_active: boolean
        }
        Insert: Omit<Database['public']['Tables']['luggage_types']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['luggage_types']['Insert']>
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Stop = Database['public']['Tables']['stops']['Row']
export type Route = Database['public']['Tables']['routes']['Row']
export type Bus = Database['public']['Tables']['buses']['Row']
export type Schedule = Database['public']['Tables']['schedules']['Row']
export type Trip = Database['public']['Tables']['trips']['Row']
export type Pricing = Database['public']['Tables']['pricing']['Row']
export type Booking = Database['public']['Tables']['bookings']['Row']
export type Passenger = Database['public']['Tables']['passengers']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']
export type LoyaltyTransaction = Database['public']['Tables']['loyalty_transactions']['Row']

export type TripWithDetails = Trip & {
  schedule: Schedule & {
    route: Route & {
      origin_stop: Stop
      destination_stop: Stop
    }
  }
  bus: Bus | null
  pricing: Pricing[]
}

export type BookingWithDetails = Booking & {
  trip: TripWithDetails
  passengers: Passenger[]
  payment: Payment | null
}
