import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BarChart3, Plus } from "lucide-react"
import UserMenu from "./user-menu"

export default function Navigation() {
  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">PollApp</span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/polls">
                <Button variant="ghost">Browse Polls</Button>
              </Link>
              <Link href="/polls/create">
                <Button variant="ghost">Create Poll</Button>
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  )
}
