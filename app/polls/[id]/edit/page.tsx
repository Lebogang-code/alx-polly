"use client"

import { useState, useEffect, FormEvent } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Plus, X } from "lucide-react"
import { useAuth } from "@/app/contexts/auth-context"
import { Poll } from "@/app/types"

export default function EditPollPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [options, setOptions] = useState<{id: string, text: string}[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [poll, setPoll] = useState<Poll | null>(null)

  useEffect(() => {
    const fetchPoll = async () => {
      setIsLoading(true)
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
        
        const pollData = await response.json()
        setPoll(pollData)
        
        // Set form data
        setTitle(pollData.title)
        setDescription(pollData.description || "")
        setOptions(pollData.options.map((opt: any) => ({ id: opt.id, text: opt.text })))
        
        // Check if user is the creator
        if (user && user.id !== pollData.created_by) {
          toast({
            title: "Unauthorized",
            description: "You don't have permission to edit this poll",
            variant: "destructive"
          })
          router.push(`/polls/${params.id}`)
        }
      } catch (error) {
        console.error("Error fetching poll:", error)
        toast({
          title: "Error",
          description: "Failed to load poll data",
          variant: "destructive"
        })
        router.push("/polls")
      } finally {
        setIsLoading(false)
      }
    }
    
    if (user) {
      fetchPoll()
    }
  }, [params.id, user, router, toast])

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}
    
    if (!title.trim()) {
      newErrors.title = "Title is required"
    }
    
    const validOptions = options.filter(opt => opt.text.trim() !== "")
    if (validOptions.length < 2) {
      newErrors.options = "At least two options are required"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = { ...newOptions[index], text: value }
    setOptions(newOptions)
  }

  const addOption = () => {
    setOptions([...options, { id: `new-${Date.now()}`, text: "" }])
  }

  const removeOption = (index: number) => {
    if (options.length <= 2) return
    const newOptions = [...options]
    newOptions.splice(index, 1)
    setOptions(newOptions)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Filter out empty options
      const validOptions = options.filter(opt => opt.text.trim() !== "")
      
      const pollData = {
        title,
        description: description || undefined,
        options: validOptions
      }
      
      // Get auth token from localStorage
      const token = localStorage.getItem("auth_token")
      
      const response = await fetch(`/api/polls/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(pollData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update poll")
      }
      
      toast({
        title: "Poll Updated",
        description: "Your poll has been updated successfully."
      })
      
      // Redirect to the poll page
      router.push(`/polls/${params.id}`)
    } catch (error) {
      console.error("Error updating poll:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update poll",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Loading poll data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Edit Poll</CardTitle>
          <CardDescription>
            Update your poll details and options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {errors.general && (
              <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
                {errors.general}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="title">Poll Title</Label>
              <Input
                id="title"
                placeholder="What would you like to ask?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              {errors.title && (
                <p className="text-sm text-red-500 mt-1">{errors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Provide more context about your poll..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-4">
              <Label>Poll Options</Label>
              {errors.options && (
                <p className="text-sm text-red-500 mt-1">{errors.options}</p>
              )}
              <div className="space-y-3">
                {options.map((option, index) => (
                  <div key={option.id} className="flex gap-2">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option.text}
                      onChange={(e) => updateOption(index, e.target.value)}
                      required
                    />
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeOption(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addOption}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Option
              </Button>
            </div>

            <div className="flex gap-4">
              <Button 
                type="submit" 
                className="flex-1"
                disabled={isSubmitting || !user}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Poll"
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={() => router.push(`/polls/${params.id}`)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}