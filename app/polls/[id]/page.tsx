"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "@/components/ui/use-toast"
import { useAuth } from "@/app/contexts/auth-context"

type PollOption = {
  id: string
  text: string
  votes: number
  percentage: number
  isSelected?: boolean
}

type Poll = {
  id: string
  title: string
  description?: string
  totalVotes: number
  createdAt: string
  isActive: boolean
  options: PollOption[]
  userVoted?: boolean
  userVotedOptionId?: string
}

export default function PollDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [poll, setPoll] = useState<Poll | null>(null)
  const [selectedOption, setSelectedOption] = useState<string>("") 
  const [isLoading, setIsLoading] = useState(true)
  const [isVoting, setIsVoting] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPoll = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem("auth_token")
      const headers: HeadersInit = {}
      
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }
      
      const response = await fetch(`/api/polls/${params.id}`, {
        headers
      })
      
      if (!response.ok) {
        throw new Error("Failed to fetch poll")
      }
      
      const data = await response.json()
      setPoll(data)
      
      // If user has already voted, set the selected option
      if (data.userVotedOptionId) {
        setSelectedOption(data.userVotedOptionId)
      }
    } catch (error) {
      console.error("Error fetching poll:", error)
      setError("Failed to load poll. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPoll()
  }, [params.id])

  const handleVote = async () => {
    if (!selectedOption) {
      toast({
        title: "Error",
        description: "Please select an option to vote",
        variant: "destructive"
      })
      return
    }
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to vote",
        variant: "destructive"
      })
      router.push("/auth")
      return
    }
    
    setIsVoting(true)
    
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem("auth_token")
      
      const response = await fetch(`/api/polls/${params.id}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ optionId: selectedOption })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to cast vote")
      }
      
      toast({
        title: "Vote Cast",
        description: "Your vote has been recorded successfully."
      })
      
      // Refresh poll data to show updated results
      await fetchPoll()
    } catch (error) {
      console.error("Error casting vote:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cast vote",
        variant: "destructive"
      })
    } finally {
      setIsVoting(false)
    }
  }
  
  const handleRemoveVote = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to remove your vote",
        variant: "destructive"
      })
      return
    }
    
    setIsRemoving(true)
    
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem("auth_token")
      
      const response = await fetch(`/api/polls/${params.id}/vote`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to remove vote")
      }
      
      toast({
        title: "Vote Removed",
        description: "Your vote has been removed successfully."
      })
      
      setSelectedOption("")
      
      // Refresh poll data to show updated results
      await fetchPoll()
    } catch (error) {
      console.error("Error removing vote:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove vote",
        variant: "destructive"
      })
    } finally {
      setIsRemoving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Loading poll...</p>
        </div>
      </div>
    )
  }

  if (error || !poll) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error || "Poll not found"}</p>
              <Button onClick={() => router.push("/polls")}>Back to Polls</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{poll.title}</CardTitle>
              {poll.description && (
                <CardDescription className="mt-2">{poll.description}</CardDescription>
              )}
            </div>
            <Badge variant={poll.isActive ? "default" : "secondary"}>
              {poll.isActive ? "Active" : "Closed"}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            <p>Total votes: {poll.totalVotes}</p>
            <p>Created {formatDistanceToNow(new Date(poll.createdAt))} ago</p>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
              {poll.options.map((option) => (
                <div key={option.id} className="space-y-2">
                  <div className="flex items-center">
                    <RadioGroupItem 
                      value={option.id} 
                      id={option.id} 
                      disabled={!poll.isActive || isVoting}
                    />
                    <Label htmlFor={option.id} className="ml-2">
                      {option.text}
                    </Label>
                    <span className="ml-auto text-sm font-medium">
                      {option.votes} vote{option.votes !== 1 ? "s" : ""} ({option.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full rounded-full" 
                      style={{ width: `${option.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col sm:flex-row gap-3">
          {poll.isActive && (
            <>
              {poll.userVoted ? (
                <Button 
                  onClick={handleRemoveVote} 
                  variant="outline" 
                  className="w-full sm:w-auto"
                  disabled={isRemoving}
                >
                  {isRemoving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    "Remove Vote"
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={handleVote} 
                  className="w-full sm:w-auto"
                  disabled={!selectedOption || isVoting || !user}
                >
                  {isVoting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Voting...
                    </>
                  ) : (
                    "Vote"
                  )}
                </Button>
              )}
            </>
          )}
          <Button 
            onClick={() => router.push("/polls")} 
            variant="outline"
            className="w-full sm:w-auto"
          >
            Back to Polls
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
