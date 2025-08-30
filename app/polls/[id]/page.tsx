import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Users, Calendar, BarChart3 } from "lucide-react"
import Link from "next/link"

// Mock data for demonstration
const mockPoll = {
  id: "1",
  title: "What's your favorite programming language?",
  description: "A survey to understand developer preferences in 2024. This poll will help us understand which programming languages are most popular among developers and why.",
  totalVotes: 156,
  createdAt: "2024-01-15",
  isActive: true,
  options: [
    { id: "1", text: "JavaScript/TypeScript", votes: 67, percentage: 43 },
    { id: "2", text: "Python", votes: 45, percentage: 29 },
    { id: "3", text: "Java", votes: 23, percentage: 15 },
    { id: "4", text: "C++", votes: 12, percentage: 8 },
    { id: "5", text: "Other", votes: 9, percentage: 6 },
  ],
}

export default function PollDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/polls">
          <Button variant="ghost" className="mb-4">
            ← Back to Polls
          </Button>
        </Link>
        
        <div className="flex items-center gap-4 mb-4">
          <h1 className="text-3xl font-bold text-gray-900">{mockPoll.title}</h1>
          <Badge variant={mockPoll.isActive ? "default" : "secondary"}>
            {mockPoll.isActive ? "Active" : "Closed"}
          </Badge>
        </div>
        
        <p className="text-gray-600 text-lg mb-4">{mockPoll.description}</p>
        
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {mockPoll.totalVotes} total votes
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            Created on {mockPoll.createdAt}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Poll Results
          </CardTitle>
          <CardDescription>
            Current voting results for this poll
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mockPoll.options.map((option) => (
            <div key={option.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">{option.text}</span>
                <span className="text-sm text-gray-600">
                  {option.votes} votes ({option.percentage}%)
                </span>
              </div>
              <Progress value={option.percentage} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {mockPoll.isActive && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Cast Your Vote</CardTitle>
            <CardDescription>
              Select your preferred option below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockPoll.options.map((option) => (
                <Button
                  key={option.id}
                  variant="outline"
                  className="w-full justify-start h-auto p-4"
                >
                  <div className="text-left">
                    <div className="font-medium">{option.text}</div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
