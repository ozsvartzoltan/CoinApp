"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/supabase/supabaseClient"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function LoginPage() {
  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (): Promise<void> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    console.log(data, error)
    if (!error) router.push("/home")
    else alert(error.message)
  }

  return (
    <main className="p-4">
      <h1>Login</h1>
      <div className="flex flex-col gap-4">
        <div className="flex flex-row gap-4 w-[500px]">
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
        <Button className="max-w-32" onClick={handleLogin}>
          Log in
        </Button>
        <Button className="max-w-32" onClick={() => router.push("/register")}>
          Register
        </Button>
      </div>
    </main>
  )
}
