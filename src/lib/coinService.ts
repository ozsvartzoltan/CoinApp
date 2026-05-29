import { createClient } from "@/supabase/supabaseClient"
import type {
  Coin,
  UserCoin,
  UserCoinDisplay,
  CreateCoinInput,
  AddToCoinCollectionInput,
  UpdateUserCoinInput,
  CoinSearchParams,
} from "@/lib/coins"

const supabase = createClient()

// Generate unique ID for manual coins
export function generateCoinId(): string {
  return `manual_${crypto.randomUUID()}`
}

// Generate source ID from OCRE
export function generateSourceId(ocreId: string): string {
  return `ocre_${ocreId}`
}

/**
 * Search coins in catalog
 * Returns approved coins for regular users, all coins for admins
 */
export async function searchCoins(
  params: CoinSearchParams
): Promise<{ data: Coin[] | null; error: string | null }> {
  try {
    let query = supabase.from("coins").select("*").eq("status", "approved")

    if (params.q) {
      query = query.or(
        `origin.ilike.%${params.q}%,mint.ilike.%${params.q}%,symbol.ilike.%${params.q}%`
      )
    }

    if (params.origin) {
      query = query.ilike("origin", `%${params.origin}%`)
    }

    if (params.mint) {
      query = query.ilike("mint", `%${params.mint}%`)
    }

    if (params.material) {
      query = query.ilike("material", `%${params.material}%`)
    }

    if (params.limit) {
      query = query.limit(params.limit)
    }

    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1)
    }

    const { data, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("Search coins error:", error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (error) {
    console.error("Unexpected search error:", error)
    return { data: null, error: "An unexpected error occurred" }
  }
}

/**
 * Get single coin by ID
 */
export async function getCoinById(
  coinId: string
): Promise<{ data: Coin | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("coins")
      .select("*")
      .eq("id", coinId)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found
      console.error("Get coin error:", error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (error) {
    console.error("Unexpected get coin error:", error)
    return { data: null, error: "An unexpected error occurred" }
  }
}

/**
 * Check if coin already exists by source_id
 */
export async function checkCoinExists(
  sourceId: string
): Promise<{ exists: boolean; coin: Coin | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("coins")
      .select("*")
      .eq("source_id", sourceId)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("Check coin error:", error)
      return { exists: false, coin: null, error: error.message }
    }

    return { exists: !!data, coin: data, error: null }
  } catch (error) {
    console.error("Unexpected check coin error:", error)
    return { exists: false, coin: null, error: "An unexpected error occurred" }
  }
}

/**
 * Create a new coin in the catalog
 * Non-admins: coin status = 'pending' (needs approval)
 * Admins: coin status = 'approved' (visible immediately)
 */
export async function createCoin(
  coinData: CreateCoinInput,
  userId: string,
  isAdmin: boolean
): Promise<{ data: Coin | null; error: string | null }> {
  try {
    // If no source_id provided, generate one for manual coins
    const sourceId =
      coinData.source_id || generateCoinId()

    // Check if source_id already exists
    const { exists, error: checkError } = await checkCoinExists(sourceId)
    if (checkError) {
      return { data: null, error: checkError }
    }
    if (exists) {
      return {
        data: null,
        error: "A coin with this ID already exists in our catalog",
      }
    }

    const newCoin = {
      id: generateCoinId(),
      ...coinData,
      source_id: sourceId,
      source: coinData.source_id ? "ocre" : "user_added",
      created_by: userId,
      status: isAdmin ? "approved" : "pending",
    }

    const { data, error } = await supabase
      .from("coins")
      .insert([newCoin])
      .select()
      .single()

    if (error) {
      console.error("Create coin error:", error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (error) {
    console.error("Unexpected create coin error:", error)
    return { data: null, error: "An unexpected error occurred" }
  }
}

/**
 * Add coin to user's collection
 */
export async function addCoinToCollection(
  userId: string,
  coinInput: AddToCoinCollectionInput
): Promise<{ data: UserCoin | null; error: string | null }> {
  try {
    // Check if coin exists
    const { data: coin, error: coinError } = await getCoinById(
      coinInput.coin_id
    )
    if (coinError || !coin) {
      return { data: null, error: "Coin not found" }
    }

    // Check if already in collection
    const { data: existing } = await supabase
      .from("user_coins")
      .select("*")
      .eq("user_id", userId)
      .eq("coin_id", coinInput.coin_id)
      .single()

    if (existing) {
      // Update quantity instead
      return updateUserCoin(existing.id, userId, {
        quantity: existing.quantity + (coinInput.quantity || 1),
      })
    }

    const newUserCoin = {
      user_id: userId,
      coin_id: coinInput.coin_id,
      quantity: coinInput.quantity || 1,
      estimated_value: coinInput.estimated_value,
      currency: coinInput.currency || "USD",
      notes: coinInput.notes,
    }

    const { data, error } = await supabase
      .from("user_coins")
      .insert([newUserCoin])
      .select()
      .single()

    if (error) {
      console.error("Add to collection error:", error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (error) {
    console.error("Unexpected add to collection error:", error)
    return { data: null, error: "An unexpected error occurred" }
  }
}

/**
 * Get user's collection with coin details
 */
export async function getUserCollection(
  userId: string
): Promise<{ data: UserCoinDisplay[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("user_coins")
      .select("*, coins(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Get collection error:", error)
      return { data: null, error: error.message }
    }

    // Transform data to merge coin + custom_desc
    const displayData: UserCoinDisplay[] = (data || []).map((item: any) => ({
      userCoinId: item.id,
      quantity: item.quantity,
      estimated_value: item.estimated_value,
      currency: item.currency,
      notes: item.notes,
      coin: {
        ...item.coins,
        ...item.custom_desc, // Custom fields override original
        customized: !!item.custom_desc && Object.keys(item.custom_desc).length > 0,
      },
    }))

    return { data: displayData, error: null }
  } catch (error) {
    console.error("Unexpected get collection error:", error)
    return { data: null, error: "An unexpected error occurred" }
  }
}

/**
 * Update user coin (quantity, valuation, custom fields)
 */
export async function updateUserCoin(
  userCoinId: string,
  userId: string,
  updates: UpdateUserCoinInput
): Promise<{ data: UserCoin | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("user_coins")
      .update(updates)
      .eq("id", userCoinId)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) {
      console.error("Update user coin error:", error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (error) {
    console.error("Unexpected update error:", error)
    return { data: null, error: "An unexpected error occurred" }
  }
}

/**
 * Remove coin from user's collection
 */
export async function removeCoinFromCollection(
  userCoinId: string,
  userId: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from("user_coins")
      .delete()
      .eq("id", userCoinId)
      .eq("user_id", userId)

    if (error) {
      console.error("Remove from collection error:", error)
      return { error: error.message }
    }

    return { error: null }
  } catch (error) {
    console.error("Unexpected remove error:", error)
    return { error: "An unexpected error occurred" }
  }
}
