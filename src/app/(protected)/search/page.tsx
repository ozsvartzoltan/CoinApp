"use client"

import { useContext, useEffect, useState } from "react"
import { AuthContext } from "@/contexts/authContext"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { createClient } from "@/supabase/supabaseClient"
import { Eye, Plus, X, Loader } from "lucide-react"
import Image from "next/image"
import type { Coin } from "@/lib/coins"

type CoinDetail = Coin & {
  time_interval?: {
    from?: string | number
    to?: string | number
  }
  image?: string
}

interface OcreCoin {
  id: string
  title: string
  origin?: string
  denomination?: string
  material?: string
  weight?: string
  width?: string
  timeFrom?: string
  timeTo?: string
  jsonldUrl?: string
  authority?: string
  mint?: string
  issuer?: string
  manufacture?: string
  obverseLegend?: string
  obverseDescription?: string
  reverseLegend?: string
  reverseDescription?: string
}

interface SearchResult {
  type: "supabase" | "ocre"
  coin: Coin | OcreCoin
}

export default function SearchPage() {
  // Add toast styles
  useEffect(() => {
    if (!document.getElementById("toast-styles")) {
      const style = document.createElement("style")
      style.id = "toast-styles"
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  const context = useContext(AuthContext)
  if (!context) throw new Error("No context found")
  const { user } = context

  const [searchQuery, setSearchQuery] = useState("")
  const [supabaseCoins, setSupabaseCoins] = useState<Coin[]>([])
  const [ocreCoins, setOcreCoins] = useState<OcreCoin[]>([])
  const [userCollectionIds, setUserCollectionIds] = useState<Set<string>>(new Set())
  
  const [loading, setLoading] = useState(false)
  const [supabaseLoading, setSupabaseLoading] = useState(false)
  const [ocreLoading, setOcreLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [selectedCoin, setSelectedCoin] = useState<SearchResult | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  
  const [showAllSupabase, setShowAllSupabase] = useState(false)
  const [showAllOcre, setShowAllOcre] = useState(false)
  const [addCoinDialogOpen, setAddCoinDialogOpen] = useState(false)
  const [manualCoinForm, setManualCoinForm] = useState({
    denomination: "",
    origin: "",
    mint: "",
    material: "",
    weight: "",
    width: "",
    condition: "",
    symbol: "",
    authority: "",
    deity: "",
    dynasty: "",
    issuer: "",
    prep_method: "",
  })

  const supabase = createClient()

  // Load user's collection on mount
  useEffect(() => {
    const loadUserCollection = async () => {
      if (!user) return
      const { data } = await supabase
        .from("user_coins")
        .select("coin_id")
        .eq("user_id", user.id)
      
      if (data) {
        setUserCollectionIds(new Set(data.map(item => item.coin_id)))
      }
    }
    
    loadUserCollection()
  }, [user, supabase])

  // Search function
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSupabaseCoins([])
      setOcreCoins([])
      setSupabaseLoading(false)
      setOcreLoading(false)
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      // Search Supabase
      setSupabaseLoading(true)
      try {
        // Fetch approved coins
        const { data: approvedCoins, error: approvedError } = await supabase
          .from("coins")
          .select("*")
          .eq("status", "approved")
          .limit(100)

        // Fetch user's coins
        const { data: userCoins, error: userError } = await supabase
          .from("coins")
          .select("*")
          .eq("created_by", user?.id)
          .limit(100)

        // Combine results
        const allCoins = [
          ...(approvedCoins || []),
          ...(userCoins || []).filter(
            userCoin => !(approvedCoins || []).some(approved => approved.id === userCoin.id)
          )
        ]

        // Filter client-side to match search query
        if (query.trim()) {
          const searchLower = query.toLowerCase()
          const filtered = allCoins.filter(coin =>
            (coin.origin?.toLowerCase().includes(searchLower)) ||
            (coin.mint?.toLowerCase().includes(searchLower)) ||
            (coin.denomination?.toLowerCase().includes(searchLower)) ||
            (coin.symbol?.toLowerCase().includes(searchLower))
          )
          setSupabaseCoins(filtered)
        } else {
          setSupabaseCoins(allCoins)
        }

        if (approvedError) console.error("Approved coins error:", approvedError)
        if (userError) console.error("User coins error:", userError)
      } catch (supabaseError) {
        console.error("Supabase search error:", supabaseError)
        setSupabaseCoins([])
      } finally {
        setSupabaseLoading(false)
      }

      // Search OCRE API
      setOcreLoading(true)
      try {
        // Search OCRE to get Atom feed results
        const searchUrl = `https://numismatics.org/ocre/apis/search?q=${encodeURIComponent(query)}&start=0&rows=100`
        const searchResponse = await fetch(searchUrl)
        
        if (searchResponse.ok) {
          const atomText = await searchResponse.text()
          
          // Parse Atom feed to extract coins
          const coins = parseOcreAtomFeed(atomText)
          setOcreCoins(coins)
        } else {
          setOcreCoins([])
        }
      } catch (ocreError) {
        console.error("OCRE API error:", ocreError)
        setOcreCoins([])
      } finally {
        setOcreLoading(false)
      }

      // Combine results
    } catch (err) {
      console.error("Search error:", err)
      setMessage({ type: "error", text: "Search failed" })
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCollection = async (coin: Coin | OcreCoin) => {
    if (!user) return

    try {
      const coinId = coin.id
      
      // Check if this is an OCRE coin (not yet in database)
      const isOcreCoin = 'jsonldUrl' in coin
      
      if (isOcreCoin) {
        const ocreCoin = coin as OcreCoin
        
        // If the coin doesn't have full details yet, fetch them
        if (!ocreCoin.denomination && ocreCoin.jsonldUrl) {
          try {
            const fullDetails = await fetchOcreCoinDetails(ocreCoin.jsonldUrl)
            Object.assign(coin, fullDetails)
          } catch (err) {
            console.error("Failed to fetch full coin details:", err)
            // Continue with partial data
          }
        }
        
        // First, insert the OCRE coin into the database
        const { error: insertError } = await supabase
          .from("coins")
          .insert({
            id: coinId,
            denomination: ocreCoin.denomination || null,
            origin: ocreCoin.origin || null,
            source: "ocre",
            created_by: "ocre",
            mint: ocreCoin.mint || null,
            material: ocreCoin.material || null,
            authority: ocreCoin.authority || null,
            deity: null,
            dynasty: null,
            issuer: ocreCoin.issuer || null,
            symbol: null,
            weight: ocreCoin.weight || null,
            width: ocreCoin.width || null,
            condition: null,
            prep_method: ocreCoin.manufacture || null,
            status: "approved",
          })

        if (insertError) {
          // If coin already exists, that's fine
          if (insertError.code !== "23505") {
            const errorMsg = insertError.message || "Failed to add coin to database"
            
            // Show error as toast
            const toast = document.createElement("div")
            toast.className = "fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in"
            toast.textContent = `✗ ${errorMsg}`
            document.body.appendChild(toast)
            setTimeout(() => toast.remove(), 4000)
            return
          }
        }
      }

      // Add to user's collection
      const { error: collectionError } = await supabase
        .from("user_coins")
        .insert({
          user_id: user.id,
          coin_id: coinId,
          quantity: 1,
          currency: "USD"
        })

      if (collectionError) {
        if (collectionError.code === "23505") {
          const toast = document.createElement("div")
          toast.className = "fixed bottom-4 right-4 bg-yellow-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in"
          toast.textContent = "⚠ Coin already in your collection"
          document.body.appendChild(toast)
          setTimeout(() => toast.remove(), 3000)
        } else {
          const errorMsg = collectionError.message || "Failed to add to collection"
          const toast = document.createElement("div")
          toast.className = "fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in"
          toast.textContent = `✗ ${errorMsg}`
          document.body.appendChild(toast)
          setTimeout(() => toast.remove(), 4000)
        }
        return
      }

      setUserCollectionIds(prev => new Set([...prev, coinId]))
      
      // Show success as toast
      const toast = document.createElement("div")
      toast.className = "fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in"
      toast.textContent = "✓ Coin added to collection!"
      document.body.appendChild(toast)
      setTimeout(() => toast.remove(), 3000)
    } catch (err) {
      console.error("Error adding coin:", err)
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred"
      
      // Show error as toast
      const toast = document.createElement("div")
      toast.className = "fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in"
      toast.textContent = `✗ ${errorMessage}`
      document.body.appendChild(toast)
      setTimeout(() => toast.remove(), 4000)
    }
  }

  const handleRemoveFromCollection = async (coinId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from("user_coins")
        .delete()
        .eq("user_id", user.id)
        .eq("coin_id", coinId)

      if (error) {
        setMessage({ type: "error", text: "Failed to remove coin" })
        return
      }

      setUserCollectionIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(coinId)
        return newSet
      })
      setMessage({ type: "success", text: "Coin removed from collection" })
    } catch (err) {
      console.error("Error removing coin:", err)
      setMessage({ type: "error", text: "An unexpected error occurred" })
    }
  }

  const handleAddCoinManually = async () => {
    if (!user) return

    try {
      // Generate a unique ID for the manual coin
      const coinId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Check if user is admin to determine status
      const isAdmin = user.user_metadata?.role === "admin" || user.user_metadata?.is_admin === true
      const coinStatus = isAdmin ? "approved" : "pending"

      // Insert the coin into the database
        const { error: insertError } = await supabase
        .from("coins")
        .insert({
          id: coinId,
          denomination: manualCoinForm.denomination || null,
          origin: manualCoinForm.origin || null,
          source: "manual",
          created_by: user.id,
          mint: manualCoinForm.mint || null,
          material: manualCoinForm.material || null,
          weight: manualCoinForm.weight || null,
          width: manualCoinForm.width || null,
          condition: manualCoinForm.condition || null,
          symbol: manualCoinForm.symbol || null,
          authority: manualCoinForm.authority || null,
          deity: manualCoinForm.deity || null,
          dynasty: manualCoinForm.dynasty || null,
          issuer: manualCoinForm.issuer || null,
          prep_method: manualCoinForm.prep_method || null,
          status: coinStatus,
          created_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error("Insert error details:", insertError)
        const errorMsg = insertError.message || "Failed to add coin to database"
        
        // Show error as toast
        const toast = document.createElement("div")
        toast.className = "fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in"
        toast.textContent = `✗ ${errorMsg}`
        document.body.appendChild(toast)
        setTimeout(() => toast.remove(), 4000)
        return
      }

      // Add to user's collection
      const { error: collectionError } = await supabase
        .from("user_coins")
        .insert({
          user_id: user.id,
          coin_id: coinId,
          quantity: 1,
          currency: "USD"
        })

      if (collectionError) {
        console.error("Collection error details:", collectionError)
        const errorMsg = collectionError.message || "Coin added but failed to add to collection"
        
        // Show error as toast
        const toast = document.createElement("div")
        toast.className = "fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in"
        toast.textContent = `✗ ${errorMsg}`
        document.body.appendChild(toast)
        setTimeout(() => toast.remove(), 4000)
        return
      }

      setUserCollectionIds(prev => new Set([...prev, coinId]))
      
      // Show success as toast
      const toast = document.createElement("div")
      toast.className = "fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in"
      toast.textContent = "✓ Coin added successfully!"
      document.body.appendChild(toast)
      setTimeout(() => toast.remove(), 3000)
      
      setAddCoinDialogOpen(false)
      
      // Reset form
      setManualCoinForm({
        denomination: "",
        origin: "",
        mint: "",
        material: "",
        weight: "",
        width: "",
        condition: "",
        symbol: "",
        authority: "",
        deity: "",
        dynasty: "",
        issuer: "",
        prep_method: "",
      })
    } catch (err) {
      console.error("Error adding coin:", err)
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred"
      
      // Show error as toast
      const toast = document.createElement("div")
      toast.className = "fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in"
      toast.textContent = `✗ ${errorMessage}`
      document.body.appendChild(toast)
      setTimeout(() => toast.remove(), 4000)
    }
  }

  const displayedSupabaseCoins = showAllSupabase ? supabaseCoins : supabaseCoins.slice(0, 10)
  const displayedOcreCoins = showAllOcre ? ocreCoins : ocreCoins.slice(0, 10)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Search Coins</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Search our catalog and historical records
          </p>
        </div>
        {user && (
          <div>
            <Button onClick={() => setAddCoinDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Coin Manually
            </Button>
          </div>
        )}
      </div>

      {/* Search Input */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Search by origin, denomination, mint, symbol..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                handleSearch(e.target.value)
              }}
              className="flex-1"
            />
            {searchQuery && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery("")
                  setSupabaseCoins([])
                  setOcreCoins([])
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Loading */}
      {(supabaseLoading || ocreLoading) && searchQuery && (
        <div className="space-y-4">
          {supabaseLoading && (
            <Card>
              <CardContent className="py-6 flex items-center justify-center gap-2">
                <Loader className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Searching catalog...</span>
              </CardContent>
            </Card>
          )}
          {ocreLoading && (
            <Card>
              <CardContent className="py-6 flex items-center justify-center gap-2">
                <Loader className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Searching historical records...</span>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Results */}
      {!loading && searchQuery && (
        <>
          {/* Supabase Results */}
          {supabaseCoins.length > 0 ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Our Catalog ({supabaseCoins.length})</h2>
              </div>
              <div className="space-y-2">
                {displayedSupabaseCoins.map((coin) => (
                  <CoinResultCard
                    key={coin.id}
                    coin={coin}
                    type="supabase"
                    isInCollection={userCollectionIds.has(coin.id)}
                    onView={() => {
                      setSelectedCoin({ type: "supabase", coin })
                      setDetailDialogOpen(true)
                    }}
                    onAdd={() => handleAddToCollection(coin)}
                    onRemove={() => handleRemoveFromCollection(coin.id)}
                  />
                ))}
              </div>
              {supabaseCoins.length > 10 && !showAllSupabase && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowAllSupabase(true)}
                >
                  Show More Catalog Results
                </Button>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-6">
                <div className="text-center text-gray-500">
                  <p className="text-sm">No coins found in our catalog for this search</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* OCRE Results */}
          {ocreCoins.length > 0 ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Historical Records ({ocreCoins.length})</h2>
              </div>
              <div className="space-y-2">
                {displayedOcreCoins.map((coin) => (
                  <CoinResultCard
                    key={coin.id}
                    coin={coin}
                    type="ocre"
                    isInCollection={false}
                    onView={() => {
                      // Fetch full details for OCRE coin
                      if ((coin as OcreCoin).jsonldUrl) {
                        fetchOcreCoinDetails(normalizeOcreUrl((coin as OcreCoin).jsonldUrl!)).then(details => {
                          setSelectedCoin({ type: "ocre", coin: details })
                          setDetailDialogOpen(true)
                        }).catch(err => {
                          console.error("Error loading coin details:", err)
                          setSelectedCoin({ type: "ocre", coin })
                          setDetailDialogOpen(true)
                        })
                      } else {
                        setSelectedCoin({ type: "ocre", coin })
                        setDetailDialogOpen(true)
                      }
                    }}
                    onAdd={() => handleAddToCollection(coin)}
                    onRemove={() => {}}
                  />
                ))}
              </div>
              {ocreCoins.length > 10 && !showAllOcre && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowAllOcre(true)}
                >
                  Show More Historical Results
                </Button>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-6">
                <div className="text-center text-gray-500">
                  <p className="text-sm">No historical records found for this search</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Detail Dialog */}
      {selectedCoin && (
        <CoinDetailDialog
          coin={selectedCoin.coin}
          type={selectedCoin.type}
          isOpen={detailDialogOpen}
          onClose={() => setDetailDialogOpen(false)}
          isInCollection={userCollectionIds.has(selectedCoin.coin.id)}
          onAdd={() => handleAddToCollection(selectedCoin.coin)}
          onRemove={() => handleRemoveFromCollection(selectedCoin.coin.id)}
        />
      )}

      {/* Add Coin Manually Dialog */}
      {user && (
        <Dialog open={addCoinDialogOpen} onOpenChange={setAddCoinDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Coin Manually</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Denomination</label>
                <Input
                  value={manualCoinForm.denomination}
                  onChange={(e) => setManualCoinForm({...manualCoinForm, denomination: e.target.value})}
                  placeholder="e.g., Denarius"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Origin</label>
                <Input
                  value={manualCoinForm.origin}
                  onChange={(e) => setManualCoinForm({...manualCoinForm, origin: e.target.value})}
                  placeholder="e.g., Rome"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Mint</label>
                <Input
                  value={manualCoinForm.mint}
                  onChange={(e) => setManualCoinForm({...manualCoinForm, mint: e.target.value})}
                  placeholder="e.g., Rome"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Material</label>
                <Input
                  value={manualCoinForm.material}
                  onChange={(e) => setManualCoinForm({...manualCoinForm, material: e.target.value})}
                  placeholder="e.g., Bronze"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Weight (g)</label>
                <Input
                  value={manualCoinForm.weight}
                  onChange={(e) => setManualCoinForm({...manualCoinForm, weight: e.target.value})}
                  placeholder="e.g., 10.5"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Width (mm)</label>
                <Input
                  value={manualCoinForm.width}
                  onChange={(e) => setManualCoinForm({...manualCoinForm, width: e.target.value})}
                  placeholder="e.g., 20"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Condition</label>
                <Input
                  value={manualCoinForm.condition}
                  onChange={(e) => setManualCoinForm({...manualCoinForm, condition: e.target.value})}
                  placeholder="e.g., VF"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Symbol</label>
                <Input
                  value={manualCoinForm.symbol}
                  onChange={(e) => setManualCoinForm({...manualCoinForm, symbol: e.target.value})}
                  placeholder="e.g., IMP"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Authority</label>
                <Input
                  value={manualCoinForm.authority}
                  onChange={(e) => setManualCoinForm({...manualCoinForm, authority: e.target.value})}
                  placeholder="e.g., Augustus"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Deity</label>
                <Input
                  value={manualCoinForm.deity}
                  onChange={(e) => setManualCoinForm({...manualCoinForm, deity: e.target.value})}
                  placeholder="e.g., Venus"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Dynasty</label>
                <Input
                  value={manualCoinForm.dynasty}
                  onChange={(e) => setManualCoinForm({...manualCoinForm, dynasty: e.target.value})}
                  placeholder="e.g., Julio-Claudian"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Issuer</label>
                <Input
                  value={manualCoinForm.issuer}
                  onChange={(e) => setManualCoinForm({...manualCoinForm, issuer: e.target.value})}
                  placeholder="e.g., Senate"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Prep Method</label>
                <Input
                  value={manualCoinForm.prep_method}
                  onChange={(e) => setManualCoinForm({...manualCoinForm, prep_method: e.target.value})}
                  placeholder="e.g., Struck"
                  className="mt-1"
                />
              </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  className="flex-1"
                  onClick={handleAddCoinManually}
                >
                  Add Coin
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setAddCoinDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// Helper function to parse OCRE Atom feed
function parseOcreAtomFeed(xmlText: string): OcreCoin[] {
  const coins: OcreCoin[] = []
  
  try {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlText, "text/xml")
    
    // Check for parse errors
    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
      console.error("XML parse error")
      return coins
    }
    
    // Find all entry elements
    const entries = xmlDoc.getElementsByTagName("entry")
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      
      // Extract title
      const titleElements = entry.getElementsByTagName("title")
      const title = titleElements.length > 0 ? titleElements[0].textContent || "Unknown" : "Unknown"
      
      // Extract ID
      const idElements = entry.getElementsByTagName("id")
      const id = idElements.length > 0 ? idElements[0].textContent || `ocre_${i}` : `ocre_${i}`
      
      // Extract JSON-LD link
      let jsonldUrl = ""
      const links = entry.getElementsByTagName("link")
      for (let j = 0; j < links.length; j++) {
        const link = links[j]
        const type = link.getAttribute("type")
        if (type === "application/ld+json") {
          jsonldUrl = normalizeOcreUrl(link.getAttribute("href") || "")
          break
        }
      }
      
      // Extract time span (begin and end dates)
      let timeFrom = ""
      let timeTo = ""
      
      const timeSpans = entry.getElementsByTagNameNS("http://www.google.com/kml/ext/2.2", "TimeSpan")
      if (timeSpans.length > 0) {
        const beginElements = timeSpans[0].getElementsByTagName("begin")
        const endElements = timeSpans[0].getElementsByTagName("end")
        timeFrom = beginElements.length > 0 ? beginElements[0].textContent || "" : ""
        timeTo = endElements.length > 0 ? endElements[0].textContent || "" : ""
      } else {
        // Try TimeStamp (single date)
        const timeStamps = entry.getElementsByTagNameNS("http://www.google.com/kml/ext/2.2", "TimeStamp")
        if (timeStamps.length > 0) {
          const whenElements = timeStamps[0].getElementsByTagName("when")
          timeFrom = whenElements.length > 0 ? whenElements[0].textContent || "" : ""
        }
      }
      
      coins.push({
        id: id,
        title: title,
        origin: "",
        denomination: "",
        material: "",
        weight: "",
        width: "",
        timeFrom: timeFrom,
        timeTo: timeTo,
        jsonldUrl: jsonldUrl,
      })
    }
  } catch (err) {
    console.error("Error parsing OCRE Atom feed:", err)
  }
  
  return coins
}

// Helper function to fetch and parse JSON-LD for OCRE coins
async function fetchOcreCoinDetails(jsonldUrl: string): Promise<OcreCoin> {
  try {
    const normalizedUrl = normalizeOcreUrl(jsonldUrl)
    const response = await fetch(normalizedUrl)
    if (!response.ok) throw new Error("Failed to fetch")
    
    const jsonld = await response.json()
    
    // Find the main coin object (TypeSeriesItem) in @graph
    let coinObject = null
    let obverseObject = null
    let reverseObject = null
    
    if (jsonld["@graph"] && Array.isArray(jsonld["@graph"])) {
      for (const item of jsonld["@graph"]) {
        const types = item["@type"] || []
        const typeArray = Array.isArray(types) ? types : [types]
        
        if (typeArray.includes("nmo:TypeSeriesItem")) {
          coinObject = item
        } else if (item["@id"]?.includes("#obverse")) {
          obverseObject = item
        } else if (item["@id"]?.includes("#reverse")) {
          reverseObject = item
        }
      }
    }
    
    if (!coinObject) {
      throw new Error("Could not find coin data")
    }
    
    // Extract basic values
    const extractLabel = (value: unknown): string => {
      if (!value) return ""
      if (typeof value === "string") return value
      if (Array.isArray(value) && value.length > 0) {
        const first = value[0]
        if (!first) return ""
        if (typeof first === "string") return first
        if (typeof first === "object") {
          const firstRecord = first as Record<string, unknown>
          if (typeof firstRecord["@value"] === "string") return firstRecord["@value"]
          if (typeof firstRecord["@id"] === "string") return extractIdLabel(firstRecord["@id"])
        }
      }
      if (typeof value === "object") {
        const record = value as Record<string, unknown>
        if (typeof record["@value"] === "string") return record["@value"]
        if (typeof record["@id"] === "string") return extractIdLabel(record["@id"])
      }
      return ""
    }
    
    const extractIdLabel = (id: string): string => {
      // Extract readable label from URL like "http://nomisma.org/id/dupondius" -> "Dupondius"
      const match = id.match(/\/id\/([^/]+)$/)
      if (match) {
        return match[1]
          .replace(/_/g, " ")
          .split(" ")
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      }
      return id
    }
    
    const title = extractLabel(coinObject["skos:prefLabel"])
    const denomination = extractLabel(coinObject["nmo:hasDenomination"])
    const material = extractLabel(coinObject["nmo:hasMaterial"])
    const authority = extractLabel(coinObject["nmo:hasAuthority"])
    const mint = extractLabel(coinObject["nmo:hasMint"])
    const region = extractLabel(coinObject["nmo:hasRegion"])
    const manufacture = extractLabel(coinObject["nmo:hasManufacture"])
    
    const startDate = extractLabel(coinObject["nmo:hasStartDate"])
    const endDate = extractLabel(coinObject["nmo:hasEndDate"])
    
    // Helper function to format dates as AD/BC
    const formatDate = (dateStr: string): string => {
      if (!dateStr) return ""
      const year = parseInt(dateStr, 10)
      if (isNaN(year)) return dateStr
      
      if (year < 0) {
        return `${Math.abs(year)} BC`
      } else if (year === 0) {
        return "1 BC"
      } else {
        return `${year} AD`
      }
    }
    
    const formattedStartDate = formatDate(startDate)
    const formattedEndDate = formatDate(endDate)
    
    // Extract obverse and reverse details
    let obverseDescription = ""
    let obverseLegend = ""
    let reverseDescription = ""
    let reverseLegend = ""
    
    if (obverseObject) {
      obverseLegend = extractLabel(obverseObject["nmo:hasLegend"])
      obverseDescription = extractLabel(obverseObject["dcterms:description"])
    }
    
    if (reverseObject) {
      reverseLegend = extractLabel(reverseObject["nmo:hasLegend"])
      reverseDescription = extractLabel(reverseObject["dcterms:description"])
    }
    
    const result: OcreCoin = {
      id: coinObject["@id"] || normalizedUrl.split("/").pop()?.replace(".jsonld", "") || "",
      title: title,
      origin: region !== "Uncertain Value" ? region : "",
      denomination: denomination !== "Uncertain Value" ? denomination : "",
      material: material !== "Uncertain Value" ? material : "",
      weight: "",
      width: "",
      timeFrom: formattedStartDate,
      timeTo: formattedEndDate,
      jsonldUrl: normalizedUrl,
      authority: authority !== "Uncertain Value" ? authority : "",
      mint: mint !== "Uncertain Value" ? mint : "",
      manufacture: manufacture,
      obverseLegend: obverseLegend,
      obverseDescription: obverseDescription,
      reverseLegend: reverseLegend,
      reverseDescription: reverseDescription,
    }
    
    return result
  } catch (err) {
    console.error("Error fetching OCRE coin details:", err)
    return {
      id: normalizeOcreUrl(jsonldUrl).split("/").pop()?.replace(".jsonld", "") || "",
      title: "Could not load details",
      jsonldUrl: normalizeOcreUrl(jsonldUrl),
    }
  }
}

function normalizeOcreUrl(url: string): string {
  if (!url) return url

  try {
    const parsedUrl = new URL(url)
    if (parsedUrl.hostname === "numismatics.org" && parsedUrl.protocol === "http:") {
      parsedUrl.protocol = "https:"
    }
    return parsedUrl.toString()
  } catch {
    return url.replace(/^http:\/\/numismatics\.org\//, "https://numismatics.org/")
  }
}

// Coin Result Card Component
function CoinResultCard({
  coin,
  type,
  isInCollection,
  onView,
  onAdd,
  onRemove,
}: {
  coin: Coin | OcreCoin
  type: "supabase" | "ocre"
  isInCollection: boolean
  onView: () => void
  onAdd: () => void
  onRemove: () => void
}) {
  const isSupabase = type === "supabase"
  const title = isSupabase 
    ? (coin as Coin).origin 
      ? `${(coin as Coin).denomination} - ${(coin as Coin).origin}`
      : (coin as Coin).denomination || "Unknown"
    : (coin as OcreCoin).title

  return (
    <Card>
      <CardContent className="p-2">
        <div className="flex justify-between items-center gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-sm">{title}</h3>
            
            {isSupabase && (
              <table className="text-xs w-full">
                <tbody className="space-y-1">
                  {((coin as Coin).mint || (coin as Coin).material || (coin as Coin).condition || (coin as Coin).weight || (coin as Coin).width) && (
                    <>
                      {(coin as Coin).mint && <tr><td className="text-gray-600 dark:text-gray-400">Mint:</td><td className="font-medium">{(coin as Coin).mint}</td></tr>}
                      {(coin as Coin).material && <tr><td className="text-gray-600 dark:text-gray-400">Material:</td><td className="font-medium">{(coin as Coin).material}</td></tr>}
                      {(coin as Coin).condition && <tr><td className="text-gray-600 dark:text-gray-400">Condition:</td><td className="font-medium">{(coin as Coin).condition}</td></tr>}
                      {(coin as Coin).weight && <tr><td className="text-gray-600 dark:text-gray-400">Weight:</td><td className="font-medium">{(coin as Coin).weight}</td></tr>}
                      {(coin as Coin).width && <tr><td className="text-gray-600 dark:text-gray-400">Width:</td><td className="font-medium">{(coin as Coin).width}</td></tr>}
                    </>
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onView}>
              <Eye className="h-4 w-4" />
            </Button>
            {isInCollection ? (
              <Button 
                size="sm" 
                variant="outline" 
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={onRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={onAdd}>
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Detail Dialog Component
function CoinDetailDialog({
  coin,
  type,
  isOpen,
  onClose,
  isInCollection,
  onAdd,
  onRemove,
}: {
  coin: Coin | OcreCoin
  type: "supabase" | "ocre"
  isOpen: boolean
  onClose: () => void
  isInCollection: boolean
  onAdd: () => void
  onRemove: () => void
}) {
  const isSupabase = type === "supabase"
  const coinData = coin as CoinDetail
  const ocreCoinData = coin as OcreCoin

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isSupabase ? `${coinData.denomination} - ${coinData.origin}` : ocreCoinData.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isSupabase && (
            <>
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {coinData.origin && <div><span className="text-gray-600 dark:text-gray-400">Origin:</span> <span className="font-medium">{coinData.origin}</span></div>}
                {coinData.denomination && <div><span className="text-gray-600 dark:text-gray-400">Denomination:</span> <span className="font-medium">{coinData.denomination}</span></div>}
                {coinData.mint && <div><span className="text-gray-600 dark:text-gray-400">Mint:</span> <span className="font-medium">{coinData.mint}</span></div>}
                {coinData.material && <div><span className="text-gray-600 dark:text-gray-400">Material:</span> <span className="font-medium">{coinData.material}</span></div>}
                {coinData.prep_method && <div><span className="text-gray-600 dark:text-gray-400">Prep Method:</span> <span className="font-medium">{coinData.prep_method}</span></div>}
                {coinData.authority && <div><span className="text-gray-600 dark:text-gray-400">Authority:</span> <span className="font-medium">{coinData.authority}</span></div>}
                {coinData.deity && <div><span className="text-gray-600 dark:text-gray-400">Deity:</span> <span className="font-medium">{coinData.deity}</span></div>}
                {coinData.dynasty && <div><span className="text-gray-600 dark:text-gray-400">Dynasty:</span> <span className="font-medium">{coinData.dynasty}</span></div>}
                {coinData.issuer && <div><span className="text-gray-600 dark:text-gray-400">Issuer:</span> <span className="font-medium">{coinData.issuer}</span></div>}
                {coinData.condition && <div><span className="text-gray-600 dark:text-gray-400">Condition:</span> <span className="font-medium">{coinData.condition}</span></div>}
                {coinData.symbol && <div><span className="text-gray-600 dark:text-gray-400">Symbol:</span> <span className="font-medium">{coinData.symbol}</span></div>}
                {coinData.weight && <div><span className="text-gray-600 dark:text-gray-400">Weight:</span> <span className="font-medium">{coinData.weight}</span></div>}
                {coinData.width && <div><span className="text-gray-600 dark:text-gray-400">Width:</span> <span className="font-medium">{coinData.width}</span></div>}
              </div>

              {/* Time Interval */}
              {coinData.time_interval && (
                <div className="pt-4 border-t">
                  <p className="font-semibold text-sm mb-2">Time Period</p>
                  <div className="text-sm">
                    {coinData.time_interval.from && <div>From: {coinData.time_interval.from}</div>}
                    {coinData.time_interval.to && <div>To: {coinData.time_interval.to}</div>}
                  </div>
                </div>
              )}

              {/* Image */}
              {coinData.image && (
                <div className="pt-4 border-t">
                  <p className="font-semibold text-sm mb-2">Image</p>
                  <div className="relative h-40 w-full max-w-sm overflow-hidden rounded-md bg-muted">
                    <Image
                      src={coinData.image}
                      alt="Coin"
                      fill
                      unoptimized
                      className="object-contain"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {!isSupabase && (
            <>
              {/* OCRE Coin Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {ocreCoinData.authority && <div><span className="text-gray-600 dark:text-gray-400">Authority:</span> <span className="font-medium">{ocreCoinData.authority}</span></div>}
                {ocreCoinData.denomination && <div><span className="text-gray-600 dark:text-gray-400">Denomination:</span> <span className="font-medium">{ocreCoinData.denomination}</span></div>}
                {ocreCoinData.material && <div><span className="text-gray-600 dark:text-gray-400">Material:</span> <span className="font-medium">{ocreCoinData.material}</span></div>}
                {ocreCoinData.mint && <div><span className="text-gray-600 dark:text-gray-400">Mint:</span> <span className="font-medium">{ocreCoinData.mint}</span></div>}
                {ocreCoinData.manufacture && <div><span className="text-gray-600 dark:text-gray-400">Manufacture:</span> <span className="font-medium">{ocreCoinData.manufacture}</span></div>}
                {ocreCoinData.origin && <div><span className="text-gray-600 dark:text-gray-400">Region:</span> <span className="font-medium">{ocreCoinData.origin}</span></div>}
              </div>

              {/* Time Period */}
              {(ocreCoinData.timeFrom || ocreCoinData.timeTo) && (
                <div className="pt-4 border-t">
                  <p className="font-semibold text-sm mb-2">Time Period</p>
                  <div className="text-sm">
                    {ocreCoinData.timeFrom && <div>From: {ocreCoinData.timeFrom}</div>}
                    {ocreCoinData.timeTo && <div>To: {ocreCoinData.timeTo}</div>}
                  </div>
                </div>
              )}

              {/* Obverse */}
              {(ocreCoinData.obverseLegend || ocreCoinData.obverseDescription) && (
                <div className="pt-4 border-t">
                  <p className="font-semibold text-sm mb-2">Obverse</p>
                  <div className="text-sm space-y-1">
                    {ocreCoinData.obverseLegend && <div><span className="text-gray-600 dark:text-gray-400">Legend:</span> {ocreCoinData.obverseLegend}</div>}
                    {ocreCoinData.obverseDescription && <div><span className="text-gray-600 dark:text-gray-400">Description:</span> {ocreCoinData.obverseDescription}</div>}
                  </div>
                </div>
              )}

              {/* Reverse */}
              {(ocreCoinData.reverseLegend || ocreCoinData.reverseDescription) && (
                <div className="pt-4 border-t">
                  <p className="font-semibold text-sm mb-2">Reverse</p>
                  <div className="text-sm space-y-1">
                    {ocreCoinData.reverseLegend && <div><span className="text-gray-600 dark:text-gray-400">Legend:</span> {ocreCoinData.reverseLegend}</div>}
                    {ocreCoinData.reverseDescription && <div><span className="text-gray-600 dark:text-gray-400">Description:</span> {ocreCoinData.reverseDescription}</div>}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            {isInCollection ? (
              <Button
                variant="outline"
                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={onRemove}
              >
                Remove from Collection
              </Button>
            ) : (
              <Button
                className="flex-1"
                onClick={onAdd}
              >
                Add to Collection
              </Button>
            )}
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

