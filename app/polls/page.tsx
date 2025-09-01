"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Loader2 } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { useAuth } from "@/app/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"

type Poll = {
  id: string
  title: string
  description?: string
  totalVotes: number
  createdAt: string
  isActive: boolean
  created_by: string
}

export default function PollsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [polls, setPolls] = useState<Poll[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPolls = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem("auth_token")
      const headers: HeadersInit = {}
      
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }
      
      const response = await fetch("/api/polls", {
        headers
      })
      
      if (!response.ok) {
        throw new Error("Failed to fetch polls")
      }
      
      const data = await response.json()
      setPolls(data)
    } catch (error) {
      console.error("Error fetching polls:", error)
      setError("Failed to load polls. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }
  
  useEffect(() => {
    fetchPolls()
  }, [])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Loading polls...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Polls</h1>
        <Link href="/polls/create">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Poll
          </Button>
        </Link>
      </div>
      
      {error && (
        <div className="p-4 mb-6 bg-red-100 border border-red-300 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {polls.length === 0 && !error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-center text-muted-foreground mb-4">
              No polls found. Create your first poll to get started!
            </p>
            <Link href="/polls/create">
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Poll
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {polls.map((poll) => (
            <Card key={poll.id} className="h-full transition-all hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{poll.title}</CardTitle>
                  <Badge variant={poll.isActive ? "default" : "secondary"}>
                    {poll.isActive ? "Active" : "Closed"}
                  </Badge>
                </div>
                {poll.description && (
                  <CardDescription className="line-clamp-2">
                    {poll.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pb-2">
                <div className="text-sm text-muted-foreground">
                  <div className="w-full flex justify-between items-center">
                    <span>{poll.totalVotes} votes</span>
                    <span>Created {formatDistanceToNow(new Date(poll.createdAt))} ago</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-0">
                <Link href={`/polls/${poll.id}`}>
                  <Button variant="outline" size="sm">View</Button>
                </Link>
                {user && user.id === poll.created_by && (
                  <div className="flex gap-2">
                    <Link href={`/polls/${poll.id}/edit`}>
                      <Button variant="outline" size="sm">Edit</Button>
                    </Link>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={async (e) => {
                        e.preventDefault()
                        if (confirm('Are you sure you want to delete this poll?')) {
                          try {
                            const token = localStorage.getItem("auth_token")
                            const response = await fetch(`/api/polls/${poll.id}`, {
                              method: 'DELETE',
                              headers: {
                                'Authorization': `Bearer ${token}`
                              }
                            })
                            
                            if (!response.ok) {
                              throw new Error('Failed to delete poll')
                            }
                            
                            toast({
                              title: "Poll Deleted",
                              description: "Your poll has been deleted successfully."
                            })
                            
                            // Refresh the polls list
                            fetchPolls()
                          } catch (error) {
                            console.error('Error deleting poll:', error)
                            toast({
                              title: "Error",
                              description: error instanceof Error ? error.message : "Failed to delete poll",
                              variant: "destructive"
                            })
                          }
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
