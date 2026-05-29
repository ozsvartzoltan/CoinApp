"use client"
import { createContext, useEffect, useState } from "react"
import { createClient } from "@/supabase/supabaseClient"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  logout: () => Promise<void>
  handleLogin: (email: string, password: string) => Promise<{ error: string | null }>
  handleRegister: (
    email: string,
    password: string,
    name: string
  ) => Promise<{ error: string | null }>
  handleGoogleLogin: () => Promise<void>
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
  ): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        // Provide user-friendly error message
        let userMessage = error.message
        if (error.message.includes("Invalid") || error.message.includes("credentials")) {
          userMessage = "Invalid email or password"
        }
        return { error: userMessage }
      }
      if (data.user) {
        setUser(data.user)
        router.push("/home")
      }
      return { error: null }
    } catch (error) {
      console.error("Login error:", error)
      return { error: "An unexpected error occurred during login" }
    }
  }

  const handleRegister = async (
    email: string,
    password: string,
    name: string
  ): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password })

      if (error) {
        let userMessage = error.message
        
        // Handle specific error codes
        if (error.code === "over_email_send_rate_limit") {
          userMessage = "Too many registration attempts. Please wait a few minutes before trying again."
        } else if (error.message.includes("already registered")) {
          userMessage = "This email is already registered"
        } else if (error.message.includes("weak password")) {
          userMessage = "Password is too weak. Please use a stronger password"
        }
        return { error: userMessage }
      }

      const user = data.user
      if (user) {
        // Update user's display name in auth metadata
        const { error: updateError } = await supabase.auth.updateUser({
          data: { display_name: name },
        })

        if (updateError) {
          console.error("Failed to update display name:", updateError)
        }

        // Set user state and redirect to home
        setUser(user)
        router.push("/home")
      }

      return { error: null }
    } catch (error) {
      console.error("Registration error:", error)
      return { error: "An unexpected error occurred during registration" }
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        console.error("Google login error:", error)
        return
      }
    } catch (error) {
      console.error("Google login error:", error)
    }
  }

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.error("Error fetching session:", error)
          setIsLoading(false)
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
      } catch (error) {
        console.error("Error in fetchSession:", error)
        setIsLoading(false)
      }
    }

    fetchSession()
  }, [supabase])

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error("Logout error:", error)
        return
      }
      setUser(null)
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        logout,
        handleLogin,
        handleRegister,
        handleGoogleLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
