"use client"

import { useContext, useEffect, useState } from "react"
import { AuthContext } from "@/contexts/authContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/supabase/supabaseClient"
import Link from "next/link"
import { AlertCircle, Check } from "lucide-react"

interface ProfileData {
  display_name: string
  email: string
  is_admin: boolean
}

type CollectionRow = {
  quantity: number
  estimated_value?: number | null
  currency: string
}

type FrankfurterRate = {
  date: string
  base: string
  quote: string
  rate: number
}

const displayCurrencies = ["USD", "EUR", "GBP", "HUF"] as const

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value)
}

export default function ProfilePage() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("No context found")
  const { user } = context

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [totalCoins, setTotalCoins] = useState(0)
  const [collectionValue, setCollectionValue] = useState<number | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [selectedCurrency, setSelectedCurrency] = useState<(typeof displayCurrencies)[number]>("USD")

  const supabase = createClient()

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        if (error) {
          setMessage({ type: "error", text: "Failed to load profile" })
          return
        }

        if (data) {
          setProfile(data)
          setDisplayName(data.display_name || "")
        }
      } catch (err) {
        console.error("Error loading profile:", err)
        setMessage({ type: "error", text: "An unexpected error occurred" })
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [user, supabase])

  useEffect(() => {
    const loadCollectionStats = async () => {
      if (!user) {
        setStatsLoading(false)
        return
      }

      setStatsLoading(true)
      setStatsError(null)

      try {
        const [{ data, error }, ratesResponse] = await Promise.all([
          supabase
            .from("user_coins")
            .select("quantity, estimated_value, currency")
            .eq("user_id", user.id),
          fetch(`https://api.frankfurter.dev/v2/rates?base=${selectedCurrency}`),
        ])

        if (error) {
          setStatsError("Failed to load collection stats")
          return
        }

        if (!ratesResponse.ok) {
          setStatsError("Failed to load currency rates")
          return
        }

        const rows = (data || []) as CollectionRow[]
        const totalQuantity = rows.reduce((sum, row) => sum + (row.quantity || 0), 0)
        const rates = (await ratesResponse.json()) as FrankfurterRate[]
        const rateMap = new Map<string, number>()

        for (const rate of rates) {
          if (rate.base.toUpperCase() === selectedCurrency) {
            rateMap.set(rate.quote.toUpperCase(), rate.rate)
          }
        }

        let valueSum = 0

        for (const row of rows) {
          if (row.estimated_value === null || row.estimated_value === undefined) {
            continue
          }

          const rowCurrency = row.currency.toUpperCase()
          if (rowCurrency === selectedCurrency) {
            valueSum += row.estimated_value
            continue
          }

          const rate = rateMap.get(rowCurrency)
          if (!rate || !Number.isFinite(rate)) {
            continue
          }

          valueSum += row.estimated_value / rate
        }

        setTotalCoins(totalQuantity)
        setCollectionValue(valueSum)
      } catch (err) {
        console.error("Error loading collection stats:", err)
        setStatsError("An unexpected error occurred")
      } finally {
        setStatsLoading(false)
      }
    }

    loadCollectionStats()
  }, [user, supabase, selectedCurrency])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !displayName.trim()) {
      setMessage({ type: "error", text: "Display name cannot be empty" })
      return
    }

    setUpdating(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName })
        .eq("id", user.id)

      if (error) {
        setMessage({ type: "error", text: "Failed to update profile" })
        return
      }

      setMessage({ type: "success", text: "Profile updated successfully" })
      setProfile(prev => prev ? { ...prev, display_name: displayName } : null)
    } catch (err) {
      console.error("Error updating profile:", err)
      setMessage({ type: "error", text: "An unexpected error occurred" })
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Manage your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {message && (
            <Alert variant={message.type === "error" ? "destructive" : "default"}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="px-3 py-2 bg-muted rounded-md text-sm">
              {user?.email}
            </div>
            <p className="text-xs text-gray-500">Email cannot be changed</p>
          </div>

          {/* Display Name */}
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
              />
            </div>

            <Button type="submit" disabled={updating}>
              {updating ? "Updating..." : "Update Profile"}
            </Button>
          </form>

          {/* Admin Status */}
          {profile?.is_admin && (
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                <Check className="h-4 w-4" />
                Admin Access
              </div>
              <p className="text-xs text-gray-500 mt-1">
                You can approve pending coins and manage the catalog
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link href="/collection" className="block">
            <Button variant="outline" className="w-full">
              View My Collection
            </Button>
          </Link>
          <Link href="/search" className="block">
            <Button variant="outline" className="w-full">
              Search & Add Coins
            </Button>
          </Link>
          {profile?.is_admin && (
            <Link href="/admin" className="block">
              <Button variant="outline" className="w-full">
                Admin Dashboard
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>

      {/* Stats (placeholder for future) */}
      <Card>
        <CardHeader>
          <CardTitle>Collection Stats</CardTitle>
          <CardDescription>Track your total coins and collection value in your preferred currency.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">Total Coins</p>
              <p className="mt-2 text-3xl font-bold">
                {statsLoading ? "..." : totalCoins.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Collection Value</p>
                <div className="w-24">
                  <Select
                    value={selectedCurrency}
                    onValueChange={(value) => setSelectedCurrency(value as (typeof displayCurrencies)[number])}
                  >
                    <SelectTrigger className="h-8 rounded-md">
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {displayCurrencies.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="mt-2 text-3xl font-bold">
                {statsLoading
                  ? "..."
                  : collectionValue !== null
                    ? formatCurrency(collectionValue, selectedCurrency)
                    : "—"}
              </p>
            </div>
          </div>
          {statsError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{statsError}</AlertDescription>
            </Alert>
          )}
          <p className="text-xs text-muted-foreground">
            Values are converted using live Frankfurter exchange rates.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
