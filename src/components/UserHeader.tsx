"use client"
import { AuthContext } from "@/contexts/authContext"
import { Button } from "@/components/ui/button"
import { useContext } from "react"
import Link from "next/link"

export default function UserHeader() {
  const auth = useContext(AuthContext)
  if (!auth) return null

  const { user, isLoading, logout } = auth

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
        <Link href="/home" className="text-2xl font-bold text-blue-600">
          CoinApp
        </Link>

        {!isLoading && user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Welcome, <span className="font-medium">{user.email}</span>
            </span>
            <Button
              onClick={logout}
              variant="outline"
              size="sm"
            >
              Logout
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
