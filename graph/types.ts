import {
  SimulationNodeDatum,
  SimulationLinkDatum,
} from 'd3'

export interface Point {
  x: number
  y: number
}

export interface Trajactory {
  name?: string
  points: Node[]
  color?: string
}

export interface Node extends SimulationNodeDatum {
  id: string
  name: string
  championId: string
  cost: number
  traits: string[]
  color: string
  blur?: boolean
  focus?: boolean
  $image?: HTMLImageElement
  emphasize?: boolean
}

export interface Edge extends SimulationLinkDatum<Node> {
  source: string | Node
  target: string | Node
}