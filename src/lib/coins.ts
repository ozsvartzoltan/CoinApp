// Time interval for coin production
export interface TimeInterval {
  from?: number
  to?: number
}

// Front/back side of coin
export interface CoinSide {
  img?: string
  desc?: string
}

// Profile/User with admin status
export interface UserProfile {
  id: string
  email: string
  display_name: string
  is_admin: boolean
  created_at: string
  updated_at: string
}

// Base coin object (stored in catalog)
export interface Coin {
  id: string
  
  // Basic info
  origin: string
  mint?: string
  denomination?: string
  material?: string
  prep_method?: string
  authority?: string
  deity?: string
  dynasty?: string
  issuer?: string
  condition?: string
  symbol?: string
  weight?: string
  width?: string
  
  // Complex nested data
  time_interval?: TimeInterval
  front?: CoinSide
  back?: CoinSide
  other?: Record<string, any>
  
  // Source tracking
  source_id?: string
  source: "ocre" | "user_added"
  created_by: string
  
  // Approval workflow
  status: "pending" | "approved" | "rejected"
  approved_by?: string
  approval_notes?: string
  
  created_at: string
  updated_at: string
}

// User's collection entry with customizations
export interface UserCoin {
  id: string
  user_id: string
  coin_id: string
  
  // Collection info
  quantity: number
  
  // Valuation
  estimated_value?: number
  currency: string
  
  // Custom overrides (user can change any coin field)
  custom_desc?: Partial<Coin>
  
  notes?: string
  
  created_at: string
  updated_at: string
}

// User coin with merged data (coin + user customizations)
export interface UserCoinDisplay {
  userCoinId: string
  quantity: number
  estimated_value?: number
  currency: string
  notes?: string
  // Merged coin data: custom fields override original
  coin: Coin & {
    customized?: boolean
  }
}

// For creating/updating coins
export interface CreateCoinInput {
  origin: string
  mint?: string
  denomination?: string
  material?: string
  prep_method?: string
  authority?: string
  deity?: string
  dynasty?: string
  issuer?: string
  condition?: string
  symbol?: string
  weight?: string
  width?: string
  time_interval?: TimeInterval
  front?: CoinSide
  back?: CoinSide
  other?: Record<string, any>
  source_id?: string // For OCRE: "ocre_12345", for manual: auto-generate
}

// For adding coin to user collection
export interface AddToCoinCollectionInput {
  coin_id: string
  quantity?: number
  estimated_value?: number
  currency?: string
  notes?: string
}

// For updating user coin
export interface UpdateUserCoinInput {
  quantity?: number
  estimated_value?: number
  currency?: string
  custom_desc?: Partial<Coin>
  notes?: string
}

// Search params
export interface CoinSearchParams {
  q?: string
  origin?: string
  mint?: string
  material?: string
  status?: "pending" | "approved" | "rejected"
  limit?: number
  offset?: number
}

// Admin approval input
export interface ApproveCoinInput {
  coin_id: string
  status: "approved" | "rejected"
  approval_notes?: string
}
