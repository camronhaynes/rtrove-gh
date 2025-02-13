export interface Project {
  id: string
  title: string
  description: string
  primaryType: string
  additionalTypes: string[]
  tags: string[]
  creator: string
  creatorId: string
  createdAt: string
  likes: string[]
  collaborators: string[]
  fundraisingGoal?: number
  commitments?: Commitment[]
}

export interface User {
  id: string
  username: string
  name: string
  avatar: string
  artType: string
  bio?: string
  location?: string
  following: string[]
  followers: string[]
  posts: string[]
}

export interface Commitment {
  userId: string
  username: string
  amount: number
  timestamp: number
}

