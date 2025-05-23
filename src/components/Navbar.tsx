"use client"

import { createClient } from "@/supabase/supabaseClient"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function Navbar() {
  const supabase = createClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <nav className="w-full px-6 py-4 flex items-center justify-between border-b bg-white">
      <h1 className="text-xl font-semibold">CoinApp</h1>
      <Button variant="outline" onClick={handleLogout}>
        Logout
      </Button>
    </nav>
  )
}
