<style lang="postcss" scoped>
.container {
  width: 100%;
  height: 100%;
  .svg {
    width: 100%;
    height: 100%;
    min-height: 800px;
  }
  .article {
    position: fixed;
    left: 0;
    bottom: 0;
    background-color: white;
    z-index: 99;
    width: 100%;
  }
}
.color-blue {
  color: cadetblue;
}
h5 {
  font-weight: normal;
  padding: 0px;
  margin: 0.25rem;
}
</style>
<template>
  <div class="container">
    <svg class="svg" ref="svg"/>
    <div class="article">
      <div>
        <h4>위의 시각화는 전략적 팀 난투에서 다이아몬드 이상 티어에서 <font class="color-blue">2020-10-02</font>의 데이터를 기반하여 만들어진 자료 입니다.</h4>
        <h2>조합간의 상성의 존재와 상성 관계를 분석하기 위해서 만들어졌습니다.</h2>
        <h5>호에서 발생하는 현의 넓이는 곧 승리한 판 수이며, 이어진 반대편의 호는 반대측이 승리한 판 수 입니다.</h5>
        <h5>예를들어 <font class="color-blue">4hunter-4spirit-3moonlight-2brawler</font> vs <font class="color-blue">4mystic-4vanguard-2dusk-2spirit</font></h5>
        <h5>위의 리스트업에서는 영혼 사냥꾼 조합이 17전 13승으로 영혼 사냥꾼 측에서 넓은 현과 점점 가늘어지는 4신비 선봉대의 현의 모양을 확인 할 수 있습니다</h5>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import { data } from '../data/data'
import { combinationPredictor, stringifyCombinationTrait } from '../utils/tft4/combination'
import d3, { Selection, select, chord, descending, arc, ribbon, zoom, event, ZoomTransform, zoomIdentity } from 'd3'

@Component
export default class Index extends Vue {
  $refs!: {
    canvas: HTMLCanvasElement,
    svg: SVGElement,
  }

  $svg!: Selection<any, any, any, any>
  dict: Record<string, Record<string, number>> = {}


  mounted() {
    const combinationSet = Object.keys(data).reduce((dict, key) => {
      dict[key] = 0
      return dict
    },{} as Record<string, number>)
    for (const [stringCombination, games] of Object.entries(data)) {
      for (const game of games) {
        const [winner, ..._lossers] = game.combination
        const lossers = [_lossers[0], _lossers[1]]
        const losserCombinations = lossers.map(combination => combinationPredictor({
            name: '',
            champions: combination,
          }).reduce((max, v) => max.similarity > v.similarity ? max : v)
        )

        for (const losserCombination of losserCombinations) {
          const stringified = stringifyCombinationTrait(losserCombination.combination)

          if (!this.dict[stringCombination]) {
            this.dict[stringCombination] = {}
          }

          this.dict[stringCombination][stringified] = this.dict[stringCombination][stringified]
            ? this.dict[stringCombination][stringified] + 1
            : 1
        }
      }
    }
    this.draw()
  }

  selected: number | null = null

  onClicked() {
    const chrod = this.$svg
      .select('.chord')
      .selectAll('path')
      .attr('fill-opacity', (d: any) => {
        if (d.source.index === this.selected || d.target.index === this.selected) {
          return 1
        }
        return 0.25
      })
  }

  $transform!: ZoomTransform

  onZoom(transform: ZoomTransform) {
    this.$transform = transform
    this.$svg.attr("transform", `${transform}`)
  }

  draw() {
    const { width, height } = this.$refs.svg.getBoundingClientRect()

    const keys = Object.keys(data)
    const matrix = Object.assign(
      keys.map(keyRow => {
        return keys.map(keyCol => {
          if (!this.dict[keyRow][keyCol] || this.dict[keyRow][keyCol] < 3) {
            return 0
          }
          return this.dict[keyRow][keyCol]
        })
      }), {
        names: Object.keys(data),
      }
    )
    // select($canvas).call(zoom<HTMLCanvasElement, any>().scaleExtent([1 / 10, 8]).on('zoom', ({transform}) => {
    //   return this.onZoom(transform)
    // }))
    this.$svg = select(this.$refs.svg)
      .call(zoom<any, any>().scaleExtent([1 / 10, 8]).on('zoom', ({transform}) => {
        this.$svg.attr('transform', `${transform}`)
      }))
      .append('g')

    this.$transform = zoomIdentity


    // 4 groups, so create a vector of 4 colors
    var colors = [ "#003f5c" ]

    var res = chord()
        .padAngle(0.05)
        (matrix)

    // add the groups on the outer part of the circle
    this.$svg
      .datum(res)
      .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`)
      .selectAll("g")
      .data(function(d) {
        return d.groups
      })
      .enter()
      .append("g")
      .append("path")
        .style("fill", function(d,i){
          return colors[0]
        })
        .attr("d", arc<any>()
          .innerRadius(200)
          .outerRadius(210)
        )
      .on('click', (e, i: any) => {
        this.selected = i.index
        this.onClicked()
      })

    this.$svg
      .datum(res)
      .append('g')
        .attr('transform', `translate(${width / 2}, ${height / 2})`)
      .selectAll('g')
      .data(({groups}) => groups)
      .enter()
      .append('text')
      .attr("dy", "0.35em")
      .attr('font-size', '.5rem')
      .attr("transform", d => `
          rotate(${(d.startAngle + d.endAngle) / 2 * 180 / Math.PI - 90})
          translate(${210 + 5})
          ${(d.startAngle + d.endAngle) / 2 > Math.PI ? "rotate(180)" : ""}
        `)
      .attr("text-anchor", d => {
        return (d.startAngle + d.endAngle) / 2 > Math.PI ? "end" : null
      })
      .text(d => {
        return keys[d.index]
      })

    this.$svg
      .datum(res)
      .append("g")
        .classed('chord', true)
        .attr("transform", `translate(${width / 2}, ${height / 2})`)
      .selectAll("path")
      .data(function(d) { return d; })
      .enter()
      .append("path")
        .attr("fill-opacity", d => {
          if (this.selected) {
            console.log(this.selected)
            if (d.source.index === this.selected) {
              return 0.75
            } else {
              return 0.25
            }
          } else {
            return 0.75
          }
        })
        .attr("d", ribbon<any, any>()
          .radius(200)
        )
        .style("fill", function(d){ return(colors[0]) })
        .on('click', (e, i: any) => {
          this.selected = i.source.index
          this.onClicked()
        })
  }
}
</script>