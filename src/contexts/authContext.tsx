"use client"
import { createContext, useEffect, useState } from "react"
import { createClient } from "@/supabase/supabaseClient"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  logout: () => void
  handleLogin: (email: string, password: string) => Promise<void>
  handleRegister: (
    email: string,
    password: string,
    name: string
  ) => Promise<void>
}

export const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  const handleLogin = async (
    email: string,
    password: string
  ): Promise<void> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    console.log(data, error)
    if (!error) router.push("/home")
    else alert(error.message)
  }

  const handleRegister = async (
    email: string,
    password: string,
    name: string
  ) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    console.log(data, error)

    if (error) {
      alert(error.message)
      console.log("kk", error)

      return
    }

    const user = data.user
    if (user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ name })
        .eq("id", user.id)

      if (profileError) {
        console.log("profileerror", profileError)

        alert("Failed to save name: " + profileError.message)
        return
      }
    }
    console.log("ok")

    router.push("/")
  }

  useEffect(() => {
    const fetchSession = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.error("Error fetching session:", error)
        return
      }
      const session = data.session

      if (session?.user) {
        setUser(session.user)
      }

      setIsLoading(false)

      const { data: authListener } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (session?.user) {
            setUser(session.user)
          } else {
            setUser(null)
          }
        }
      )

      return () => {
        authListener?.subscription.unsubscribe()
      }
    }

    fetchSession()
  }, [supabase])

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.push("/login")
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, logout, handleLogin, handleRegister }}
    >
      {children}
    </AuthContext.Provider>
  )
}
