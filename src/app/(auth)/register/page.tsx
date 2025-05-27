"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AuthContext } from "@/contexts/authContext"
import { useRouter } from "next/navigation"
import { useContext, useState } from "react"

export default function RegisterPage() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error("No context found for AuthContext")
  const { handleRegister } = auth
  const router = useRouter()
  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [name, setName] = useState<string>("")

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
        <Button
          className="max-w-32"
          onClick={() => {
            handleRegister(email, password, name)
          }}
        >
          Register
        </Button>
        <Button className="max-w-32" onClick={() => router.push("/login")}>
          Login
        </Button>
      </div>
    </main>
  )
}
