"use client"

import { useContext, useEffect, useMemo, useState } from "react"
import { AlertCircle, Edit2, Trash2 } from "lucide-react"

import { AuthContext } from "@/contexts/authContext"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/supabase/supabaseClient"
import type { Coin, UserCoinDisplay } from "@/lib/coins"

const currencyOptions = ["HUF", "USD", "EUR", "GBP"] as const

type UserCoinRow = {
  id: string
  quantity: number
  estimated_value?: number | null
  currency: string
  notes?: string | null
  custom_desc?: Partial<Coin> | null
  coins: Coin
}

type CollectionCoin = UserCoinDisplay & {
  customDesc?: Partial<Coin> | null
}

type CoinEditForm = {
  quantity: string
  estimated_value: string
  currency: string
  notes: string
  origin: string
  denomination: string
  mint: string
  material: string
  condition: string
  weight: string
  width: string
  prep_method: string
  authority: string
  deity: string
  dynasty: string
  issuer: string
  symbol: string
}

function mapRowToDisplay(item: unknown): CollectionCoin {
  const row = item as UserCoinRow
  const customDesc = row.custom_desc ?? null

  return {
    userCoinId: row.id,
    quantity: row.quantity,
    estimated_value: row.estimated_value ?? undefined,
    currency: row.currency,
    notes: row.notes ?? undefined,
    customDesc,
    coin: {
      ...row.coins,
      ...customDesc,
      customized: !!customDesc && Object.keys(customDesc).length > 0,
    },
  }
}

function createEditFormFromCoin(item: CollectionCoin): CoinEditForm {
  return {
    quantity: String(item.quantity),
    estimated_value: item.estimated_value !== undefined ? String(item.estimated_value) : "",
    currency: item.currency,
    notes: item.notes || "",
    origin: item.coin.origin || "",
    denomination: item.coin.denomination || "",
    mint: item.coin.mint || "",
    material: item.coin.material || "",
    condition: item.coin.condition || "",
    weight: item.coin.weight || "",
    width: item.coin.width || "",
    prep_method: item.coin.prep_method || "",
    authority: item.coin.authority || "",
    deity: item.coin.deity || "",
    dynasty: item.coin.dynasty || "",
    issuer: item.coin.issuer || "",
    symbol: item.coin.symbol || "",
  }
}

function CoinSpecs({ coin }: { coin: Coin }) {
  const specs = [
    { label: "Weight", value: coin.weight },
    { label: "Width", value: coin.width },
    { label: "Prep", value: coin.prep_method },
  ].filter((spec) => Boolean(spec.value))

  if (specs.length === 0) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {specs.map((spec) => (
        <Badge key={spec.label} variant="secondary" className="font-normal">
          {spec.label}: {spec.value}
        </Badge>
      ))}
    </div>
  )
}

function CoinActions({
  onEdit,
  onRemove,
}: {
  onEdit: () => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      <Button variant="outline" size="sm" className="h-8 px-3" onClick={onEdit}>
        <Edit2 className="mr-1 h-4 w-4" />
        Edit
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8 px-3 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
        onClick={onRemove}
      >
        <Trash2 className="mr-1 h-4 w-4" />
        Remove
      </Button>
    </div>
  )
}

function CollectionTableRow({
  item,
  onEdit,
  onRemove,
}: {
  item: CollectionCoin
  onEdit: () => void
  onRemove: () => void
}) {
  return (
    <TableRow className="align-top">
      <TableCell>
        <div className="space-y-1">
          <div className="font-medium leading-none">{item.coin.denomination || "Unknown coin"}</div>
          {item.coin.customized && (
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              Customized
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>{item.coin.origin || "—"}</TableCell>
      <TableCell>{item.coin.mint || "—"}</TableCell>
      <TableCell>{item.coin.material || "—"}</TableCell>
      <TableCell>{item.coin.condition || "—"}</TableCell>
      <TableCell>
        <CoinSpecs coin={item.coin} />
      </TableCell>
      <TableCell className="text-center font-medium">{item.quantity}</TableCell>
      <TableCell>
        {item.estimated_value !== undefined && item.estimated_value !== null
          ? `${item.estimated_value} ${item.currency}`
          : "—"}
      </TableCell>
      <TableCell>
        <CoinActions onEdit={onEdit} onRemove={onRemove} />
      </TableCell>
    </TableRow>
  )
}

export default function CollectionPage() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("No context found")
  const { user } = context

  const [coins, setCoins] = useState<CollectionCoin[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMaterial, setFilterMaterial] = useState("")
  const [filterOrigin, setFilterOrigin] = useState("")
  const [editingCoin, setEditingCoin] = useState<CollectionCoin | null>(null)
  const [editForm, setEditForm] = useState<CoinEditForm | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    const loadCollection = async () => {
      if (!user) {
        setLoading(false)
        return
      }

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

        setCoins((data || []).map(mapRowToDisplay))
      } catch (err) {
        console.error("Error loading collection:", err)
        setMessage({ type: "error", text: "An unexpected error occurred" })
      } finally {
        setLoading(false)
      }
    }

    loadCollection()
  }, [user, supabase])

  const filteredCoins = useMemo(() => {
    const search = searchQuery.trim().toLowerCase()
    const material = filterMaterial.trim().toLowerCase()
    const origin = filterOrigin.trim().toLowerCase()

    return coins.filter((item) => {
      const coin = item.coin

      const matchesSearch =
        !search ||
        coin.origin?.toLowerCase().includes(search) ||
        coin.denomination?.toLowerCase().includes(search) ||
        coin.mint?.toLowerCase().includes(search)

      const matchesMaterial = !material || coin.material?.toLowerCase().includes(material)
      const matchesOrigin = !origin || coin.origin?.toLowerCase().includes(origin)

      return matchesSearch && matchesMaterial && matchesOrigin
    })
  }, [coins, searchQuery, filterMaterial, filterOrigin])

  const handleRemoveCoin = async (userCoinId: string) => {
    if (!confirm("Are you sure you want to remove this coin from your collection?")) {
      return
    }

    try {
      const { error } = await supabase.from("user_coins").delete().eq("id", userCoinId)

      if (error) {
        setMessage({ type: "error", text: "Failed to remove coin" })
        return
      }

      setCoins((current) => current.filter((coin) => coin.userCoinId !== userCoinId))
      setMessage({ type: "success", text: "Coin removed from collection" })
    } catch (err) {
      console.error("Error removing coin:", err)
      setMessage({ type: "error", text: "An unexpected error occurred" })
    }
  }

  const openEditDialog = (item: CollectionCoin) => {
    setEditingCoin(item)
    setEditForm(createEditFormFromCoin(item))
  }

  const closeEditDialog = () => {
    setEditingCoin(null)
    setEditForm(null)
    setSavingEdit(false)
  }

  const handleEditFieldChange = (field: keyof CoinEditForm, value: string) => {
    setEditForm((current) => (current ? { ...current, [field]: value } : current))
  }

  const handleSaveEdit = async () => {
    if (!editingCoin || !editForm) return

    const quantity = Number(editForm.quantity)
    if (!Number.isFinite(quantity) || quantity < 1) {
      setMessage({ type: "error", text: "Quantity must be at least 1" })
      return
    }

    const estimatedValue = editForm.estimated_value.trim()
      ? Number(editForm.estimated_value)
      : null

    if (editForm.estimated_value.trim() && !Number.isFinite(estimatedValue ?? NaN)) {
      setMessage({ type: "error", text: "Estimated value must be a valid number" })
      return
    }

    if (!editForm.origin.trim()) {
      setMessage({ type: "error", text: "Origin is required" })
      return
    }

    const currentCustomDesc = editingCoin.customDesc ?? {}
    const nextCustomDesc = Object.fromEntries(
      Object.entries(currentCustomDesc).filter(([, value]) => typeof value === "string")
    ) as Record<string, string>

    const editableFields: Array<[keyof Partial<Coin>, keyof CoinEditForm]> = [
      ["origin", "origin"],
      ["denomination", "denomination"],
      ["mint", "mint"],
      ["material", "material"],
      ["condition", "condition"],
      ["weight", "weight"],
      ["width", "width"],
      ["prep_method", "prep_method"],
      ["authority", "authority"],
      ["deity", "deity"],
      ["dynasty", "dynasty"],
      ["issuer", "issuer"],
      ["symbol", "symbol"],
    ]

    for (const [coinField, formField] of editableFields) {
      const nextValue = editForm[formField].trim()
      const currentValue = typeof editingCoin.coin[coinField] === "string" ? editingCoin.coin[coinField] : ""

      if (!nextValue) {
        delete nextCustomDesc[coinField]
        continue
      }

      if (nextValue !== currentValue) {
        nextCustomDesc[coinField] = nextValue
      }
    }

    const hasCustomDesc = Object.keys(nextCustomDesc).length > 0

    try {
      setSavingEdit(true)
      const { error } = await supabase
        .from("user_coins")
        .update({
          quantity,
          estimated_value: estimatedValue,
          currency: editForm.currency.trim() || "USD",
          notes: editForm.notes.trim() || null,
          custom_desc: hasCustomDesc ? (nextCustomDesc as Partial<Coin>) : null,
        })
        .eq("id", editingCoin.userCoinId)

      if (error) {
        setMessage({ type: "error", text: "Failed to update coin" })
        return
      }

      setCoins((current) =>
        current.map((coin) =>
          coin.userCoinId === editingCoin.userCoinId
            ? {
                ...coin,
                quantity,
                estimated_value: estimatedValue === null ? undefined : estimatedValue,
                currency: editForm.currency.trim() || "USD",
                notes: editForm.notes.trim() || undefined,
                customDesc: hasCustomDesc ? (nextCustomDesc as Partial<Coin>) : null,
                coin: {
                  ...coin.coin,
                  ...(nextCustomDesc as Partial<Coin>),
                  customized: hasCustomDesc,
                },
              }
            : coin
        )
      )

      setMessage({ type: "success", text: "Coin updated successfully" })
      closeEditDialog()
    } catch (err) {
      console.error("Error updating coin:", err)
      setMessage({ type: "error", text: "An unexpected error occurred" })
    } finally {
      setSavingEdit(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>Loading collection...</div>
      </div>
    )
  }


  return (
    <div className="mx-auto max-w-6xl space-y-6 rounded-[2rem] border border-border/70 bg-card/80 p-4 shadow-2xl backdrop-blur sm:p-6 lg:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center rounded-full border border-border/70 bg-secondary/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-secondary-foreground">
            Collection ledger
          </div>
          <h1 className="text-3xl font-bold tracking-tight">My Collection</h1>
          <p className="mt-1 text-muted-foreground">
            {filteredCoins.length} {filteredCoins.length === 1 ? "coin" : "coins"}
          </p>
        </div>
      </div>

      {message && (
        <Alert
          variant={message.type === "error" ? "destructive" : "default"}
          className="border-border/70 bg-card/90 text-card-foreground"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden border-border/70 bg-card/90 backdrop-blur">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
          <Card className="overflow-hidden border-border/70 bg-card/90 backdrop-blur">
          <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium">No coins found</p>
              <p className="mt-1 text-sm">
                {coins.length === 0
                  ? "Start by adding coins to your collection"
                  : "Try adjusting your filters"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-border/70 bg-card/90 backdrop-blur">
          <CardContent className="p-0">
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Coin</TableHead>
                    <TableHead className="min-w-[120px]">Origin</TableHead>
                    <TableHead className="min-w-[120px]">Mint</TableHead>
                    <TableHead className="min-w-[120px]">Material</TableHead>
                    <TableHead className="min-w-[120px]">Condition</TableHead>
                    <TableHead className="min-w-[220px]">Specs</TableHead>
                    <TableHead className="w-[80px] text-center">Qty</TableHead>
                    <TableHead className="min-w-[120px]">Value</TableHead>
                    <TableHead className="w-[160px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCoins.map((item) => (
                    <CollectionTableRow
                      key={item.userCoinId}
                      item={item}
                      onEdit={() => openEditDialog(item)}
                      onRemove={() => handleRemoveCoin(item.userCoinId)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editingCoin} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit coin</DialogTitle>
          </DialogHeader>

          {editForm && editingCoin && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-quantity">Quantity</Label>
                  <Input
                    id="edit-quantity"
                    type="number"
                    min="1"
                    value={editForm.quantity}
                    onChange={(e) => handleEditFieldChange("quantity", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-value">Estimated value</Label>
                  <Input
                    id="edit-value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.estimated_value}
                    onChange={(e) => handleEditFieldChange("estimated_value", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-currency">Currency</Label>
                  <Select
                    value={editForm.currency}
                    onValueChange={(value) => handleEditFieldChange("currency", value)}
                  >
                    <SelectTrigger id="edit-currency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={editForm.notes}
                  onChange={(e) => handleEditFieldChange("notes", e.target.value)}
                  placeholder="Add private notes about this coin"
                />
              </div>

              <div className="rounded-lg border p-4">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold">Coin details</h3>
                  <p className="text-sm text-muted-foreground">
                    These values override the base catalog entry for this collection item.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {[
                    ["origin", "Origin"],
                    ["denomination", "Denomination"],
                    ["mint", "Mint"],
                    ["material", "Material"],
                    ["condition", "Condition"],
                    ["weight", "Weight"],
                    ["width", "Width"],
                    ["prep_method", "Prep method"],
                    ["authority", "Authority"],
                    ["deity", "Deity"],
                    ["dynasty", "Dynasty"],
                    ["issuer", "Issuer"],
                    ["symbol", "Symbol"],
                  ].map(([field, label]) => (
                    <div key={field} className="space-y-2">
                      <Label htmlFor={`edit-${field}`}>{label}</Label>
                      <Input
                        id={`edit-${field}`}
                        value={editForm[field as keyof CoinEditForm]}
                        onChange={(e) =>
                          handleEditFieldChange(field as keyof CoinEditForm, e.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={closeEditDialog} disabled={savingEdit}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} disabled={savingEdit}>
                  {savingEdit ? "Saving..." : "Save changes"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
