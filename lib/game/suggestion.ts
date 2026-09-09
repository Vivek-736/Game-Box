import {
  Car,
  Crosshair,
  Gamepad2,
  Pickaxe,
  Plane,
  Swords,
  Zap,
  type LucideIcon,
} from "lucide-react"

export interface Suggestion {
  label: string
  icon: LucideIcon
}

export const SUGGESTIONS: Suggestion[] = [
  { label: "Voxel survival", icon: Pickaxe },
  { label: "Ink samurai duel", icon: Swords },
  { label: "Comic-book firefight", icon: Zap },
  { label: "Realistic battlefield", icon: Plane },
  { label: "Fight-first shooter", icon: Crosshair },
  { label: "Jungle expedition drive", icon: Car },
  { label: "Sunny kingdom platformer", icon: Gamepad2 },
]