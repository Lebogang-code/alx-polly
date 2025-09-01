export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt: Date
}

export interface Poll {
  id: string
  title: string
  description?: string
  options: PollOption[]
  totalVotes: number
  isActive: boolean
  createdBy: string
  createdAt: Date
  expiresAt?: Date
}

export interface PollOption {
  id: string
  text: string
  votes: number
  percentage: number
}

export interface Vote {
  id: string
  pollId: string
  optionId: string
  userId: string
  createdAt: Date
}

export interface CreatePollRequest {
  title: string
  description?: string
  options: string[]
  expiresAt?: Date
}

export interface EditPollFormData {
  title: string
  description?: string
  options: {
    id: string
    text: string
  }[]
}

export interface AuthResponse {
  user: User
  token: string
}
