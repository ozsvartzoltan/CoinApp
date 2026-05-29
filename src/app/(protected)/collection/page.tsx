"use client"

import { useContext, useEffect, useState } from "react"
import { AuthContext } from "@/contexts/authContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/supabase/supabaseClient"
import type { UserCoinDisplay } from "@/lib/coins"
import { AlertCircle, Trash2, Edit2, Eye } from "lucide-react"

export default function CollectionPage() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("No context found")
  const { user } = context

  const [coins, setCoins] = useState<UserCoinDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [expandedCoins, setExpandedCoins] = useState<Set<string>>(new Set())
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMaterial, setFilterMaterial] = useState("")
  const [filterOrigin, setFilterOrigin] = useState("")

  const supabase = createClient()

  // Load user's collection
  useEffect(() => {
    const loadCollection = async () => {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from("user_coins")
          .select("*, coins(*)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (error) {
          setMessage({ type: "error", text: "Failed to load collection" })
          return
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
            ...item.custom_desc,
            customized: !!item.custom_desc && Object.keys(item.custom_desc).length > 0,
          },
        }))

        setCoins(displayData)
      } catch (err) {
        console.error("Error loading collection:", err)
        setMessage({ type: "error", text: "An unexpected error occurred" })
      } finally {
        setLoading(false)
      }
    }

    loadCollection()
  }, [user, supabase])

  // Filter coins based on search and filters
  const filteredCoins = coins.filter((item) => {
    const coin = item.coin
    const search = searchQuery.toLowerCase()

    const matchesSearch =
      !search ||
      coin.origin?.toLowerCase().includes(search) ||
      coin.denomination?.toLowerCase().includes(search) ||
      coin.mint?.toLowerCase().includes(search)

    const matchesMaterial =
      !filterMaterial || coin.material?.toLowerCase().includes(filterMaterial.toLowerCase())

    const matchesOrigin =
      !filterOrigin || coin.origin?.toLowerCase().includes(filterOrigin.toLowerCase())

    return matchesSearch && matchesMaterial && matchesOrigin
  })

  const handleRemoveCoin = async (userCoinId: string) => {
    if (!confirm("Are you sure you want to remove this coin from your collection?")) {
      return
    }

    try {
      const { error } = await supabase
        .from("user_coins")
        .delete()
        .eq("id", userCoinId)

      if (error) {
        setMessage({ type: "error", text: "Failed to remove coin" })
        return
      }

      setCoins(coins.filter((c) => c.userCoinId !== userCoinId))
      setMessage({ type: "success", text: "Coin removed from collection" })
    } catch (err) {
      console.error("Error removing coin:", err)
      setMessage({ type: "error", text: "An unexpected error occurred" })
    }
  }

  const toggleExpanded = (userCoinId: string) => {
    const newExpanded = new Set(expandedCoins)
    if (newExpanded.has(userCoinId)) {
      newExpanded.delete(userCoinId)
    } else {
      newExpanded.add(userCoinId)
    }
    setExpandedCoins(newExpanded)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading collection...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Collection</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {filteredCoins.length} {filteredCoins.length === 1 ? "coin" : "coins"}
        </p>
      </div>

      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                type="text"
                placeholder="Origin, denomination, mint..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="material">Material</Label>
              <Input
                id="material"
                type="text"
                placeholder="Gold, Silver, Bronze..."
                value={filterMaterial}
                onChange={(e) => setFilterMaterial(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="origin">Origin</Label>
              <Input
                id="origin"
                type="text"
                placeholder="Rome, Egypt, China..."
                value={filterOrigin}
                onChange={(e) => setFilterOrigin(e.target.value)}
              />
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery("")
              setFilterMaterial("")
              setFilterOrigin("")
            }}
          >
            Clear Filters
          </Button>
        </CardContent>
      </Card>

      {/* Collection Grid */}
      {filteredCoins.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-gray-500">
              <p className="text-lg font-medium">No coins found</p>
              <p className="text-sm mt-1">
                {coins.length === 0
                  ? "Start by adding coins to your collection"
                  : "Try adjusting your filters"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCoins.map((item) => (
            <Card key={item.userCoinId} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {item.coin.denomination} - {item.coin.origin}
                    </CardTitle>
                    <CardDescription>
                      {item.coin.mint && `Mint: ${item.coin.mint}`}
                    </CardDescription>
                  </div>
                  {item.coin.customized && (
                    <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2 py-1 rounded">
                      Customized
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-grow space-y-3">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {item.coin.material && (
                    <>
                      <span className="text-gray-600 dark:text-gray-400">Material:</span>
                      <span className="font-medium">{item.coin.material}</span>
                    </>
                  )}
                  {item.coin.condition && (
                    <>
                      <span className="text-gray-600 dark:text-gray-400">Condition:</span>
                      <span className="font-medium">{item.coin.condition}</span>
                    </>
                  )}
                  {item.coin.weight && (
                    <>
                      <span className="text-gray-600 dark:text-gray-400">Weight:</span>
                      <span className="font-medium">{item.coin.weight}</span>
                    </>
                  )}
                  {item.coin.width && (
                    <>
                      <span className="text-gray-600 dark:text-gray-400">Width:</span>
                      <span className="font-medium">{item.coin.width}</span>
                    </>
                  )}
                </div>

                {/* Collection Info */}
                <div className="pt-3 border-t space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
                    <span className="font-medium">{item.quantity}</span>
                  </div>

                  {item.estimated_value && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Valuation:</span>
                      <span className="font-medium">
                        {item.estimated_value} {item.currency}
                      </span>
                    </div>
                  )}

                  {item.notes && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Notes: {item.notes}
                    </div>
                  )}
                </div>
              </CardContent>

              <div className="flex gap-2 p-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled
                  title="Coming soon"
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  onClick={() => handleRemoveCoin(item.userCoinId)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}


/*
"use client"

import { useContext, useEffect, useState } from "react"
import { AuthContext } from "@/contexts/authContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/supabase/supabaseClient"
import type { UserCoinDisplay } from "@/lib/coins"
import { AlertCircle, Trash2, Edit2, Eye } from "lucide-react"

export default function CollectionPage() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("No context found")
  const { user } = context

  const [coins, setCoins] = useState<UserCoinDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [expandedCoins, setExpandedCoins] = useState<Set<string>>(new Set())
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMaterial, setFilterMaterial] = useState("")
  const [filterOrigin, setFilterOrigin] = useState("")

  const supabase = createClient()

  // Load user's collection
  useEffect(() => {
    const loadCollection = async () => {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from("user_coins")
          .select("*, coins(*)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (error) {
          setMessage({ type: "error", text: "Failed to load collection" })
          return
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
            ...item.custom_desc,
            customized: !!item.custom_desc && Object.keys(item.custom_desc).length > 0,
          },
        }))

        setCoins(displayData)
      } catch (err) {
        console.error("Error loading collection:", err)
        setMessage({ type: "error", text: "An unexpected error occurred" })
      } finally {
        setLoading(false)
      }
    }

    loadCollection()
  }, [user, supabase])

  // Filter coins based on search and filters
  const filteredCoins = coins.filter((item) => {
    const coin = item.coin
    const search = searchQuery.toLowerCase()

    const matchesSearch =
      !search ||
      coin.origin?.toLowerCase().includes(search) ||
      coin.denomination?.toLowerCase().includes(search) ||
      coin.mint?.toLowerCase().includes(search)

    const matchesMaterial =
      !filterMaterial || coin.material?.toLowerCase().includes(filterMaterial.toLowerCase())

    const matchesOrigin =
      !filterOrigin || coin.origin?.toLowerCase().includes(filterOrigin.toLowerCase())

    return matchesSearch && matchesMaterial && matchesOrigin
  })

  const handleRemoveCoin = async (userCoinId: string) => {
    if (!confirm("Are you sure you want to remove this coin from your collection?")) {
      return
    }

    try {
      const { error } = await supabase
        .from("user_coins")
        .delete()
        .eq("id", userCoinId)

      if (error) {
        setMessage({ type: "error", text: "Failed to remove coin" })
        return
      }

      setCoins(coins.filter((c) => c.userCoinId !== userCoinId))
      setMessage({ type: "success", text: "Coin removed from collection" })
    } catch (err) {
      console.error("Error removing coin:", err)
      setMessage({ type: "error", text: "An unexpected error occurred" })
    }
  }

  const toggleExpanded = (userCoinId: string) => {
    const newExpanded = new Set(expandedCoins)
    if (newExpanded.has(userCoinId)) {
      newExpanded.delete(userCoinId)
    } else {
      newExpanded.add(userCoinId)
    }
    setExpandedCoins(newExpanded)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading collection...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Collection</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {filteredCoins.length} {filteredCoins.length === 1 ? "coin" : "coins"}
        </p>
      </div>

      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                type="text"
                placeholder="Origin, denomination, mint..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="material">Material</Label>
              <Input
                id="material"
                type="text"
                placeholder="Gold, Silver, Bronze..."
                value={filterMaterial}
                onChange={(e) => setFilterMaterial(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="origin">Origin</Label>
              <Input
                id="origin"
                type="text"
                placeholder="Rome, Egypt, China..."
                value={filterOrigin}
                onChange={(e) => setFilterOrigin(e.target.value)}
              />
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery("")
              setFilterMaterial("")
              setFilterOrigin("")
            }}
          >
            Clear Filters
          </Button>
        </CardContent>
      </Card>

      {filteredCoins.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-gray-500">
              <p className="text-lg font-medium">No coins found</p>
              <p className="text-sm mt-1">
                {coins.length === 0
                  ? "Start by adding coins to your collection"
                  : "Try adjusting your filters"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-900">
                    <th className="px-4 py-3 text-left text-sm font-semibold">Denomination</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Origin</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Mint</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Material</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Condition</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Weight</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Width</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Qty</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Value</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCoins.map((item) => (
                    <tbody key={item.userCoinId}>
                      <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium">
                          {item.coin.denomination || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm">{item.coin.origin || "-"}</td>
                        <td className="px-4 py-3 text-sm">{item.coin.mint || "-"}</td>
                        <td className="px-4 py-3 text-sm">{item.coin.material || "-"}</td>
                        <td className="px-4 py-3 text-sm">{item.coin.condition || "-"}</td>
                        <td className="px-4 py-3 text-sm">{item.coin.weight || "-"}</td>
                        <td className="px-4 py-3 text-sm">{item.coin.width || "-"}</td>
                        <td className="px-4 py-3 text-sm font-medium">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm">
                          {item.estimated_value ? `${item.estimated_value} ${item.currency}` : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpanded(item.userCoinId)}
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled
                              title="Coming soon"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                              onClick={() => handleRemoveCoin(item.userCoinId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {expandedCoins.has(item.userCoinId) && (
                        <tr className="border-b bg-gray-50 dark:bg-gray-900">
                          <td colSpan={10} className="px-4 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                              {item.coin.customized && (
                                <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2 py-1 rounded w-fit">
                                  Customized
                                </div>
                              )}
                              {item.coin.authority && (
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Authority:</span>
                                  <p className="font-medium">{item.coin.authority}</p>
                                </div>
                              )}
                              {item.coin.deity && (
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Deity:</span>
                                  <p className="font-medium">{item.coin.deity}</p>
                                </div>
                              )}
                              {item.coin.issuer && (
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Issuer:</span>
                                  <p className="font-medium">{item.coin.issuer}</p>
                                </div>
                              )}
                              {item.coin.time_interval && (
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Period:</span>
                                  <p className="font-medium">{item.coin.time_interval}</p>
                                </div>
                              )}
                              {item.coin.dynasty && (
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Dynasty:</span>
                                  <p className="font-medium">{item.coin.dynasty}</p>
                                </div>
                              )}
                              {item.coin.front && (
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Obverse:</span>
                                  <p className="font-medium">{item.coin.front}</p>
                                </div>
                              )}
                              {item.coin.back && (
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Reverse:</span>
                                  <p className="font-medium">{item.coin.back}</p>
                                </div>
                              )}
                              {item.coin.symbol && (
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Symbol:</span>
                                  <p className="font-medium">{item.coin.symbol}</p>
                                </div>
                              )}
                              {item.coin.prep_method && (
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Prep Method:</span>
                                  <p className="font-medium">{item.coin.prep_method}</p>
                                </div>
                              )}
                              {item.coin.manufacture && (
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Manufacture:</span>
                                  <p className="font-medium">{item.coin.manufacture}</p>
                                </div>
                              )}
                              {item.notes && (
                                <div className="col-span-2 md:col-span-3 lg:col-span-4">
                                  <span className="text-gray-600 dark:text-gray-400">Notes:</span>
                                  <p className="font-medium">{item.notes}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
*/