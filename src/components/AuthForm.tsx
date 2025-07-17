"use client"

import { useRouter } from "next/navigation"
import { CardContent, CardFooter } from "./ui/card"
import { Label } from "./ui/label"
import { Input } from "./ui/input"
import { useTransition } from "react"
import { Button } from "./ui/button"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { loginAction, signUpAction } from "@/actions/users"

type Props = {
    type: "Login" | "signUp"
}

function AuthForm({type}: Props) {
  const isLoginForm = type === "Login"
  const router = useRouter()

    const [isPending, startTransition] = useTransition()

  const handleSubmit = (formData: FormData) => {
    startTransition(async() => {
        const email = formData.get("email") as string
        const password = formData.get("password") as string

        // FIX: Declare errorMessage here before its first use
        let errorMessage: string | null; 
        let toastTitle: string;
        let toastDescription: string;

        if(isLoginForm){
            errorMessage = (await loginAction(email,password)).errorMessage
            toastTitle = "Logged In"
            toastDescription = "You have been successfully logged in."
        } else {
            errorMessage = (await signUpAction(email,password)).errorMessage
            toastTitle = "Signed Up"
            toastDescription = "Check your email for a confirmation link."
        }

        if (!errorMessage){
            toast.success(toastTitle, {
                description: toastDescription
            })
            router.replace("/")
        } else {
            toast.error(errorMessage) 
        }
    })
  }
    return (
    <form action={handleSubmit}>
        <CardContent className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
                <Label htmlFor="email">
                    Email
                </Label>
                <Input
                    id="email"
                    name="email"
                    placeholder="Enter Your Email"
                    type="email"
                    required
                    disabled={isPending}/>
            </div>
            <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">
                    Password
                </Label>
                <Input
                    id="password"
                    name="password"
                    placeholder="Enter Your Password"
                    type="password"
                    required
                    disabled={isPending}/>
            </div>
        </CardContent>
        <CardFooter className="flex flex-col mt-5 gap-6">
            <Button className="w-full" disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin mr-2"/>: isLoginForm ? "Login" : "Sign Up"}
            </Button>
            <p className="text-xs">
                {isLoginForm? "Don't have an account yet?": "Already have an account?"}{" "}
                <Link className={`text-blue-500 underline ${isPending ? "pointer-events-none opacity-50" : ""}`} href={isLoginForm ? "/sign-up": "/login"}>
                {isLoginForm ? "Sign Up" : "Login"}
                </Link>
            </p>
        </CardFooter>
    </form>
  )
}

export default AuthForm
