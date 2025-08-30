import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, Calendar } from "lucide-react"
import Link from "next/link"

// Mock data for demonstration
const mockPolls = [
  {
    id: "1",
    title: "What's your favorite programming language?",
    description: "A survey to understand developer preferences in 2024",
    totalVotes: 156,
    createdAt: "2024-01-15",
    isActive: true,
  },
  {
    id: "2",
    title: "Best framework for web development",
    description: "Which framework do you prefer for building modern web apps?",
    totalVotes: 89,
    createdAt: "2024-01-10",
    isActive: true,
  },
  {
    id: "3",
    title: "Remote work preferences",
    description: "How do you prefer to work in the post-pandemic era?",
    totalVotes: 234,
    createdAt: "2024-01-05",
    isActive: false,
  },
]

export default function PollsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Polls</h1>
          <p className="text-gray-600 mt-2">Discover and participate in community polls</p>
        </div>
        <Link href="/polls/create">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Poll
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {mockPolls.map((poll) => (
          <Card key={poll.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{poll.title}</CardTitle>
                <Badge variant={poll.isActive ? "default" : "secondary"}>
                  {poll.isActive ? "Active" : "Closed"}
                </Badge>
              </div>
              <CardDescription>{poll.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {poll.totalVotes} votes
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {poll.createdAt}
                </div>
              </div>
              <Link href={`/polls/${poll.id}`}>
                <Button variant="outline" className="w-full">
                  View Poll
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
