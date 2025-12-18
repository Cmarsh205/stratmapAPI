export type User = {
    id: number
    username: string
    email: string
  }

export type Stratmap = {
    id: number
    title: string
    description: string
    map: string
    user_id?: number | null
    createdAt: Date
    updatedAt: Date
}