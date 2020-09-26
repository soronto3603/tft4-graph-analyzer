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
}
</style>
<template>
  <div class="container">
    <canvas ref="canvas" class="canvas"></canvas>
    <div class="toolbox">
      <div class="combinations">
        <div class="combination" v-for="(combination, combinationIndex) in combinations" :key="combinationIndex">
          <h1>{{combination.name}}</h1>
          <div
            :class="{ champions: true, select: selectedCombination === combination }"
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
import { NetworkGraph, Edge } from '../native/force-directed-graph'
import { champions } from './data/champions'
import { traits } from './data/traits'
import { unique, flatten } from '../utils/array'
import IconHexagon from '../components/hexagon.vue'

const COST_COLORS = [
  '',
  '#808080',
  '#15B288',
  '#2079C7',
  '#C441DA',
  '#FFB93C',
]

export interface Combination {
  name: string
  champions: string[]
  summary?: string
}

//  ["Set4_Mystic", "Cultist", "Set4_Shade", "Set4_Ninja", "Set4_Spirit", "Set4_Adept", "Set4_Exile", "Duelist", "Warlord", "Set4_Vanguard", "Divine", "Set4_Brawler", "Hunter", "Set4_Mage", "Set4_Elderwood", "Sharpshooter", "Dusk", "Set4_Assassin", "Set4_Enlightened", "Fortune", "Moonlight", "Boss", "Keeper", "Set4_Dazzler", "Set4_Tormented", "Emperor"]
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
  selectedCombination: Combination | null = null

  costColors = COST_COLORS
  combinations = [
    {
      name: '9 광신도',
      champions: [
        'TFT4_TwistedFate',
        'TFT4_Elise',
        'TFT4_Pyke',
        'TFT4_Kalista',
        'TFT4_Aatrox',
        'TFT4_Jhin',
        'TFT4_Zilean',
      ],
    },
    {
      name: '추방자 결투가',
      champions: [
        'TFT4_Yasuo',
        'TFT4_Fiora',
        'TFT4_Jax',
        'TFT4_XinZhao',
        'TFT4_Kalista',
        'TFT4_Shen',
        'TFT4_LeeSin',
        'TFT4_Yone',
      ],
    },
    {
      name: '6명사수',
      champions: [
        'TFT4_Nidalee',
        'TFT4_Vayne',
        'TFT4_Teemo',
        'TFT4_Yuumi',
        'TFT4_Jinx',
        'TFT4_Aatrox',
        'TFT4_Jhin',
        'TFT4_Zilean',
      ],
    },
    {
      name: '영혼 요술사',
      champions: [
        'TFT4_Nami',
        'TFT4_Lulu',
        'TFT4_Annie',
        'TFT4_Veigar',
        'TFT4_Yuumi',
        'TFT4_Ahri',
        'TFT4_Cassiopeia',
        'TFT4_Lillia',
      ],
    },
    {
      name: '영혼 그림자',
      champions: [
        'TFT4_Teemo',
        'TFT4_Zed',
        'TFT4_Pyke',
        'TFT4_Evelynn',
        'TFT4_Kindred',
        'TFT4_Ahri',
        'TFT4_Kayn',
      ],
    },
  ]

  mounted() {
    const nodes = champions.map(champion => {
      return {
        id: champion.championId,
        color: COST_COLORS[champion.cost],
        ...champion,
      }
    })

    const traits = unique(flatten<string>(champions.map(champion => champion.traits)))

    const edges = []
    for (const src of champions) {
      for (const dest of champions) {
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
    window.addEventListener('resize', this.onResize)
  }

  onResize() {
    this.$graph.resize()
  }

  getChampion(id: string) {
    return champions.find(champion => champion.championId === id)
  }

  onClickCombination(combination: Combination) {
    if (this.selectedCombination === combination) {
      this.selectedCombination = null
      this.$graph.clearFixNodes()
      return
    }

    this.selectedCombination = combination
    this.$graph.clearFixNodes()
    const nodes = combination.champions.map(champion => this.$graph.nodes.find(_champion => champion === _champion.championId)!)
    this.$graph.setFixNodes(nodes)
  }
}
</script>