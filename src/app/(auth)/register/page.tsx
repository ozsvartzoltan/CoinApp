"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/supabase/supabaseClient"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [name, setName] = useState<string>("")

  const handleRegister = async () => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    console.log(data, error)

    if (error) {
      alert(error.message)
      return
    }

    const user = data.user
    if (user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ name })
        .eq("id", user.id)

      if (profileError) {
        alert("Failed to save name: " + profileError.message)
        return
      }
    }

    router.push("/")
  }

  return (
    <main className="p-4">
      <h1>Register</h1>
      <div className="flex flex-col gap-4">
        <div className="flex flex-row gap-4 w-[700px]">
          <Input
            type="text"
            placeholder="Name"
            onChange={(e) => setName(e.target.value)}
            value={name}
          />
          <Input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
            value={password}
          />
        </div>
        <Button className="max-w-32" onClick={handleRegister}>
          Register
        </Button>
        <Button className="max-w-32" onClick={() => router.push("/login")}>
          Login
        </Button>
      </div>
    </main>
  )
}
