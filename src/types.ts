export type User = {
    id: number
    username: string
    email: string
  }

export type Stratmap = {
    id: string
    team_id: string
    created_by: string
    title: string
    description: string
    data: {
        snapshot?: unknown
        mapName?: string | null
        floorImage?: string | null
    }
    created_at: string
    updated_at: string
}

export type StratmapCreate = {
    title: string
    description: string
    data: {
        snapshot?: unknown
        mapName?: string | null
        floorImage?: string | null
    }
}

export type StratmapUpdate = {
    title?: string
    description?: string
    data?: {
        snapshot?: unknown
        mapName?: string | null
        floorImage?: string | null
    }
}