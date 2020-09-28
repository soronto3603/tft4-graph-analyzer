<style lang="postcss" scoped>
.container {
  .canvas {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
  }
  .toolbox {
    position: fixed;
    right: 10px;
    top: 10px;
    max-width: 400px;
    width: 100%;
    height: calc(100% - 20px);
    overflow-y: scroll;
    background-color: rgba(0, 0, 0, 0.5);
  }

  .combination {
    h1 {
      font-bold: 500;
      font-size: 1.25rem;
      color: white;
      margin: 0.5rem;
      margin-bottom: 0.25rem;
      margin-left: 1rem;
    }
    .champions {
      display: flex;
      flex-wrap: wrap;
      margin: 1rem;
      &.select {
        background-color: rgba(0, 0, 0, 0.5)
      }
    }
    .portrait {
      width: 38px;
      height: 38px;
      border-radius: 5px;
      margin: 0.5rem;
      img {
        width: 100%;
        height: 100%;
        border-radius: 5px;
      }
    }
  }

  .shell {
    position: fixed;
    top: 10px;
    left: 10px;
    max-width: 400px;
    max-height: calc(100% - 20px);
    width: 100%;
    overflow-y: scroll;
    background-color: rgba(0, 0, 0, 0.5);
    color: white;

    .trajactory {
      display: flex;
      margin: 1rem 0.5rem 1rem 0.5rem;
      .name {
        width: 30%;
      }
      .area {
        width: 30%;
      }
      &.result {
        padding-top: 1rem;
        border-top: 1px solid #fff;
        font-weight: 500;
      }
    }
  }
}
</style>
<template>
  <div class="container">
    <canvas ref="canvas" class="canvas"></canvas>
    <div class="shell">
      <div
        v-for="(trajactory, index) in trajactories"
        :key="index"
        class="trajactory">
        <div class="name">{{trajactory.name}}</div>
        <div class="area">{{getArea(trajactory)}}</div>
      </div>
      <div class="trajactory result">
        <div class="name">total</div>
        <div class="area">{{trajactoriesSummary}}</div>
      </div>
      <div v-if="trajactories.length === 2">
        {{trajactoriesSummary - getArea(trajactory)}}
      </div>
    </div>
    <div class="toolbox">
      <div class="combinations">
        <div class="combination" v-for="(combination, combinationIndex) in combinations" :key="combinationIndex">
          <h1>{{combination.name}}</h1>
          <div
            :class="{ champions: true, select: isSelectedCombination(combination) }"
            @click="onClickCombination(combination)">
            <div
              v-for="(champion,championIndex) in combination.champions" :key="championIndex"
              class="portrait"
              :style="{ border: `3px solid${costColors[getChampion(champion).cost]}` }">
              <img :src="`champions/${getChampion(champion).championId}.png`"/>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import { NetworkGraph } from '../graph/force-directed-graph'
import { Point, Trajactory, Node, Edge } from '../graph/types'
import { champions } from './data/champions'
import { traits } from './data/traits'
import { unique, flatten } from '../utils/array'
import IconHexagon from '../components/hexagon.vue'
import { convexHull, calcPolygonArea } from '../utils/geo/geo'

const COST_COLORS = [
  '',
  '#808080',
  '#15B288',
  '#2079C7',
  '#C441DA',
  '#FFB93C',
]

const COMB_COLORS = [
  '#003f5c',
  '#2f4b7c',
  '#665191',
  '#a05195',
  '#d45087',
  '#f95d6a',
  '#ff7c43',
  '#ffa600',
]

export interface Combination {
  name: string
  champions: string[]
  summary?: string
}

async function loadImage($img: HTMLImageElement, src: string) {
  return new Promise((resolve, reject) => {
    $img.src = src
    $img.onload = () => resolve($img)
  })
}

@Component({
  components: {
    IconHexagon,
  }
})
export default class Index extends Vue {
  $refs!: {
    canvas: HTMLCanvasElement,
  }

  $graph!: NetworkGraph
  selectedCombinations: Combination[] = []
  traits: string[] = []

  costColors = COST_COLORS
  get combinations(): Combination[] {
    if (this.traits.length === 0) {
      return []
    }

    return this.traits.map(trait => ({
      name: traits.find(_trait => _trait.key === trait)?.name ?? '',
      champions: champions.filter(champion => champion.traits.find(_trait => _trait === trait)).map(champion => champion.championId),
    } as Combination))
  }

  isSelectedCombination(combination: Combination) {
    return !!this.selectedCombinations.find(selected => selected === combination)
  }

  async mounted() {
    const nodes = await Promise.all(champions.map(async champion => {
      return {
        id: champion.championId,
        color: COST_COLORS[champion.cost],
        ...champion,
        $image: await loadImage(new Image(), `./champions/${champion.championId}.png`)
      } as Node
    }))

    this.traits = unique(flatten<string>(nodes.map(champion => champion.traits)))

    const edges = []
    for (const src of nodes) {
      for (const dest of nodes) {
        if (src.championId === dest.championId) {
          continue
        }

        if ([...new Set([...src.traits, ...dest.traits])].length !== src.traits.length + dest.traits.length) {
          edges.push({
            source: src.championId,
            target: dest.championId,
          } as Edge)
        }
      }
    }

    this.$graph = new NetworkGraph(this.$refs.canvas, nodes, edges)
    this.$graph.on('onTick', this.onGraphTick)
    window.addEventListener('resize', this.onResize)
  }

  onGraphTick(drawInfo: { trajactory: Node[] }) {
    const area = calcPolygonArea(drawInfo.trajactory.map(node => ({ x: node.x ?? 0, y: node.y ?? 0 })))
  }

  onResize() {
    this.$graph.resize()
  }

  getChampion(id: string) {
    return champions.find(champion => champion.championId === id)
  }

  get trajactories(): Trajactory[] {
    return this.selectedCombinations.map((combination, index) => {
      return {
        name: combination.name,
        points: combination
          .champions
          .map(champion => this.$graph.nodes.find(node => node.championId === champion)!),
        color: COMB_COLORS[index % COMB_COLORS.length],
      }
    })
  }

  get trajactoriesSummary() {
    const points = flatten<Point>(this.trajactories.map(trajactory => trajactory.points))
    const filterd = convexHull(points)
    return calcPolygonArea(filterd)
  }

  getArea(trajactory: Trajactory): number {
    return calcPolygonArea(convexHull(trajactory.points.map(point => ({ x: point.x ?? 0, y: point.y ?? 0 }))))
  }

  getDifference() {
    if (this.trajactories.length === 2) {
      const [t1, t2] = this.trajactories
      return this.getArea(t1) + this.getArea(t2) - this.trajactoriesSummary
    }
  }

  onClickCombination(combination: Combination) {
    if (this.selectedCombinations.find(selected => selected === combination)) {
      this.selectedCombinations = this.selectedCombinations.filter(selected => selected !== combination)
    } else {
      this.selectedCombinations.push(combination)
    }


    this.$graph.clearTrajactory()
    for (const trajectory of this.trajactories) {
      this.$graph.addTrajactory(trajectory)
    }
  }
}
</script>