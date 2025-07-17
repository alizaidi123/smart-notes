"use client"
import { Loader2 } from "lucide-react"
import { Button } from "./ui/button"
import { useState } from "react"
import { toast} from "sonner"
import { useRouter } from "next/navigation"
import { logOutAction } from "@/actions/users"


function LogOutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false);
  const handleLogOut = async () => {
    setLoading(true)
    const {errorMessage} = await logOutAction()


    if (!errorMessage){
   toast.success("You have been successfully Logged Out! ");
  router.push("/")  
  } else{
    toast.error("Logout Failed", {
      description: errorMessage
    })
  }
    
    

    setLoading(false)
    console.log("loggin out....")
  }
  return (
     <Button
      variant="outline"
      onClick={handleLogOut}
      disabled={loading}
      className="w-24"
    >
      {loading ? <Loader2 className="animate-spin" /> : "Log Out"}
    </Button>
  )
}

export default LogOutButton
