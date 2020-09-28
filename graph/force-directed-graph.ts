import d3, {
  Simulation,
  forceSimulation,
  forceManyBody,
  ForceCenter,
  ForceLink,
  forceCenter,
  forceLink,
  ZoomTransform,
  event,
  zoom,
  zoomIdentity,
  select,
  contourDensity,
  text,
} from 'd3'
import EventEmitter from 'eventemitter3'
import { unique, flatten } from '../utils/array'
import { convexHull, calcPolygonArea } from '../utils/geo/geo'
import { Edge, Node, Point, Trajactory } from './types'

const PI_2 = Math.PI * 2
const ZOOM_MAX = 2
const HEXAGON_SIZE = 40

function drawEdge(ctx: CanvasRenderingContext2D, source: Point, target: Point, color?: string, alpha?: number, label?: string) {
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(source.x, source.y)
  ctx.lineTo(target.x, target.y)
  ctx.strokeStyle = color ?? 'black'
  ctx.globalAlpha = alpha ?? 0.5
  ctx.stroke()

  if (label) {
    ctx.font = '4px Arial'
    const x = Math.min(source.x, target.x) + Math.abs(source.x - target.x) / 2
    const y = Math.min(source.y, target.y) + Math.abs(source.y - target.y) / 2

    ctx.translate(x, y)
    ctx.rotate(Math.atan2(source.y - target.y, source.x - target.x))
    ctx.textAlign = 'center'
    ctx.fillText(label, 0, 12)
    // ctx.fillText(label, , )
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

function drawPolygon(ctx: CanvasRenderingContext2D, nodes: Node[], color?: string, alpha?: number) {
  ctx.save()
  ctx.beginPath()
  const first = nodes.find(node => true)

  const center = {
    x: nodes.reduce((sum, node) => sum + (node.x ?? 0), 0) / nodes.length,
    y: nodes.reduce((sum, node) => sum + (node.y ?? 0), 0) / nodes.length,
  }

  // const area = calcPolygonArea(nodes.map(node => ({ x: node.x ?? 0, y: node.y ?? 0 })))
  // const { width: textWidth } = ctx.measureText(`${Math.round(area)}`)
  // ctx.fillStyle = '#000'
  // ctx.fillText(`${Math.round(area)}`, center.x - textWidth / 2, center.y)
  ctx.moveTo(first?.x ?? 0, first?.y ?? 0)
  for (const node of nodes) {
    ctx.lineTo(node?.x ?? 0, node?.y ?? 0)
  }
  ctx.lineTo(first?.x ?? 0, first?.y ?? 0)
  ctx.closePath()

  ctx.fillStyle = color ?? '#000'
  ctx.globalAlpha = alpha ?? 0.05
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.restore()
}

function drawHexagonImage(ctx: CanvasRenderingContext2D, node: Node, size: number, alpha?: number) {
  ctx.save()
  ctx.beginPath()

  const width = size * 3 / 4
  const height = size

  const x = (node.x ?? 0) - width / 2
  const y = (node.y ?? 0) - height / 2

  if (!node.$image) {
    const image = new Image()
    image.src = `./champions/${node.championId}.png`
    node.$image = image
  }

  ctx.globalAlpha = alpha ?? 1
  ctx.moveTo(x + width / 2, y)
  ctx.lineTo(x + width / 2, y)
  ctx.lineTo(x + width, y + height / 4)
  ctx.lineTo(x + width, y + height * 3 / 4)
  ctx.lineTo(x + width / 2, y + height)
  ctx.lineTo(x + width / 2, y + height)
  ctx.lineTo(x, y + height * 3 / 4)
  ctx.lineTo(x, y + height / 4)
  ctx.closePath()

  ctx.strokeStyle = node.color
  ctx.lineWidth = 5
  ctx.stroke()
  ctx.clip()

  ctx.drawImage(node.$image, x, y, width, height)
  ctx.globalAlpha = 1
  ctx.restore()
}

function drawCircle(ctx: CanvasRenderingContext2D, point: Point, r: number, color: string) {
  ctx.beginPath()
  ctx.arc(point.x, point.y, r, 0, PI_2, true)
  ctx.fillStyle = color
  ctx.fill()
}

function isString(object: any) {
  return typeof object === 'string'
}

export class NetworkGraph extends EventEmitter {
  nodes: Node[]
  edges: Edge[]

  width: number
  height: number

  fixNodes: Node[] | null = null
  trajactories: Trajactory[] = []

  $forceCenter: ForceCenter<Node>
  $forceLink: ForceLink<Node, Edge>

  $simulator: Simulation<Node, Edge>
  $transform: ZoomTransform
  constructor(public $canvas: HTMLCanvasElement, nodes: Node[], edges: Edge[]) {
    super()

    const { width, height } = $canvas.getBoundingClientRect()

    this.width = $canvas.width = width
    this.height = $canvas.height = height

    this.nodes = nodes
    this.edges = edges

    this.$forceCenter = forceCenter(width / 2, height / 2)
    this.$forceLink = forceLink<Node, Edge>()
      .id((node) => node.id)

    this.$simulator = forceSimulation<Node>()
      .force('charge', forceManyBody().strength(-200))
      .force('center', this.$forceCenter)
      .force('link', this.$forceLink)

    this.$simulator.nodes(this.nodes)
    this.$forceLink.links(this.edges)

    this.onTick = this.onTick.bind(this)
    this.onClick = this.onClick.bind(this)
    this.onMousemove = this.onMousemove.bind(this)
    this.$simulator.on('tick', this.onTick)
    this.$canvas.addEventListener('mousemove', this.onMousemove)
    this.$canvas.addEventListener('click', this.onClick)


    const selectedCanvas = select($canvas).call(zoom<HTMLCanvasElement, any>().scaleExtent([1 / 10, 8]).on('zoom', ({transform}) => {
      return this.onZoom(transform)
    }))
    this.$transform = zoomIdentity
  }

  addTrajactory(trajactory: Trajactory) {
    this.trajactories.push(trajactory)
    this.onTick()
  }

  clearTrajactory() {
    this.trajactories = []
    this.onTick()
  }

  setFixNodes(nodes: Node[]) {
    this.fixNodes = nodes
    for (const node of this.fixNodes) {
      node.emphasize = true
    }
    this.onTick()
  }

  clearFixNodes() {
    for (const node of this.fixNodes ?? []) {
      node.emphasize = false
    }
    this.fixNodes = null
    this.onTick()
  }

  findNode(point: Point) {
    for (const node of this.$simulator.nodes()) {
      const dx = point.x - node.x!
      const dy = point.y - node.y!

      if (dx ** 2 + dy ** 2 < 200) {
        return node
      }
    }
    return null
  }

  onClick(e: MouseEvent) {
    const { left, top } = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const x = this.$transform.invertX(e.x - left)
    const y = this.$transform.invertY(e.y - top)

    const point = this.findNode({ x, y })
    if (!point) {
      return
    }

    // point.emphasize = true
  }

  onMousemove(e: MouseEvent) {
    if (this.fixNodes) {
      return
    }

    const { left, top } = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const x = this.$transform.invertX(e.x - left)
    const y = this.$transform.invertY(e.y - top)

    const point = this.findNode({ x, y })

    for (const node of this.$simulator.nodes()) {
      node.emphasize = false
    }

    if (!point) {
      this.onTick()
      return
    }

    point.emphasize = true
    this.onTick()
  }

  resize() {
    const { width, height } = this.$canvas.getBoundingClientRect()

    this.width = this.$canvas.width = width
    this.height = this.$canvas.height = height

    this.$forceCenter.x(width / 2).y(height / 2)
    this.onTick()
  }

  onZoom(transform: ZoomTransform) {
    this.$transform = transform
    this.onTick()
    this.emit('zoom')
  }

  onTick() {
    const $ctx = this.$canvas.getContext('2d')

    if (!$ctx) {
      return
    }

    $ctx.save()
    $ctx.clearRect(0, 0, this.width, this.height)

    $ctx.translate(this.$transform.x, this.$transform.y)
    $ctx.scale(this.$transform.k, this.$transform.k)

    const emphasizedNodes = this.trajactories.length === 0 ? this.$simulator.nodes().filter(node => node.emphasize) : []

    for (const link of this.$forceLink.links()) {
      if (!isString(link)) {
        const source = (link.source as Node)
        const target = (link.target as Node)

        let alpha = .05
        if (emphasizedNodes.length === 1) {
          alpha = emphasizedNodes.find(node => node === source) || emphasizedNodes.find(node => node === target) ? 0.5 : .05
        } else if (emphasizedNodes.length >= 2) {
          alpha = emphasizedNodes.find(node => node === source) && emphasizedNodes.find(node => node === target) ? 0.5 : .05
        }

        const isEmphasizeNode = !!(emphasizedNodes.find(node => node === source) || emphasizedNodes.find(node => node === source))

        const traits = Object.entries(
          [
            ...source.traits,
            ...target.traits,
          ].reduce((dict, trait) => {
            dict[trait] = dict[trait] ? dict[trait] + 1 : 1
            return dict
          }, {} as Record<string, number>)
        ).filter(([trait, count]) => count > 1)
          .map(([trait, count]) => trait)
          .sort()

        if (traits.length === 1) {
          drawEdge(
            $ctx,
            {
              x: source.x ?? 0,
              y: source.y ?? 0,
            },
            {
              x: target.x ?? 0,
              y: target.y ?? 0,
            },
            'black',
            alpha,
            isEmphasizeNode ? traits[0] : '',
          )
        } else if (traits.length === 2) {
          drawEdge(
            $ctx,
            {
              x: (source.x ?? 0) - HEXAGON_SIZE / 4,
              y: source.y ?? 0,
            },
            {
              x: (target.x ?? 0) - HEXAGON_SIZE / 4,
              y: target.y ?? 0,
            },
            'black',
            alpha,
            isEmphasizeNode ? traits[0] : '',
          )
          drawEdge(
            $ctx,
            {
              x: (source.x ?? 0) + HEXAGON_SIZE / 4,
              y: source.y ?? 0,
            },
            {
              x: (target.x ?? 0) + HEXAGON_SIZE / 4,
              y: target.y ?? 0,
            },
            'black',
            alpha,
            isEmphasizeNode ? traits[1] : '',
          )
        }
      }
    }

    const relativeNodes = this.$forceLink.links()
      .filter(link => {
        if(!isString(link)) {
          return emphasizedNodes.find(node => node === (link.source as Node)) || emphasizedNodes.find(node => node === (link.target as Node))
        }
      })
      .map(link => {
        return emphasizedNodes.find(node => node === link.source) ? link.target : link.source
      })

    for (const node of this.$simulator.nodes()) {
      if (emphasizedNodes.length > 0) {
        if (emphasizedNodes.length === 1) {
          if (emphasizedNodes.find(_node => _node === node) || relativeNodes.find(_node => _node === node)) {
            drawHexagonImage($ctx, node, HEXAGON_SIZE, 1)
          } else {
            drawHexagonImage($ctx, node, HEXAGON_SIZE, 0.05)
          }
        } else if (emphasizedNodes.length > 1) {
          if (emphasizedNodes.find(_node => _node === node)) {
            drawHexagonImage($ctx, node, HEXAGON_SIZE, 1)
          } else {
            drawHexagonImage($ctx, node, HEXAGON_SIZE, 0.05)
          }
        }
      } else {
        drawHexagonImage($ctx, node, HEXAGON_SIZE, 1)
      }
    }

    for (const trajactory of this.trajactories) {
      const filtered = convexHull(trajactory.points.map(node => ({
        ...node,
        x: node.x ?? 0,
        y: node.y ?? 0,
      }))) as Node[]
      drawPolygon($ctx, filtered, trajactory.color, 0.5)
    }

    $ctx.restore()
  }
}
