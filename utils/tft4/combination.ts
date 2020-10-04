import { data } from '../../data/data'
import { champions } from '../../data/champions'
import { traits } from '../../data/traits'

export interface Combination {
  name: string
  champions: string[]
  summary?: string
}

export interface CombinationTrait {
  count: number
  trait: string
  grade?: string | null
}

export function stringifyCombinationTrait(combinationTraits: CombinationTrait[]) {
  const sorted = combinationTraits.sort((a, b) => {
    if (a.count < b.count) {
      return 1
    } else if (a.count === b.count) {
      if (a.trait > b.trait) {
        return 1
      } else if (a.trait === b.trait) {
        return 0
      } else {
        return -1
      }
    } else {
      return -1
    }
  })
  return sorted
    .map(combinationTrait => `${combinationTrait.count}${combinationTrait.trait}`)
    .join('-')
}

export function parseCombinationTrait(string: string) {
  return Object.keys(data).map(comb => {
    return comb.split('-').map(trait => {
      const count = trait.match(/\d+/i)
      const _trait = trait.match(/[a-z]+/g)
      return {
        count: count ? +count[0] : 0,
        trait: _trait ? _trait[0] : '',
      } as CombinationTrait
    })
  })
}

export function combinationPredictor(combination: Combination) {
  const predefinedCombinations = Object.keys(data).map(comb => {
    return comb.split('-').map(trait => {
      const count = trait.match(/\d+/i)
      const _trait = trait.match(/[a-z]+/g)
      return {
        count: count ? +count[0] : 0,
        trait: _trait ? _trait[0] : '',
      } as CombinationTrait
    })
  })

  const combinationTraits = Object.entries(
    combination.champions
      .map(champion => champions.find(_champion => _champion.name === champion))
      .reduce((dict, champion) => {
        if (champion?.traits) {
          for (const trait of champion?.traits) {
            dict[trait] = dict[trait] ? dict[trait] + 1 : 1
          }
        }
        return dict
      }, {} as Record<string, number>)
  ).map(([key, value]) => {
    const trait = traits.find(trait => trait.key === key)

    if (!trait) {
      throw new Error()

    }

    return {
      count: value,
      trait: key,
      grade: trait.sets.reduce((v, set) => {
        return set.min <= value && (!set.max || set.max >= value)
          ? set.style
          : v
      }, null as null | string)
    } as CombinationTrait
  })

  const availableTraits = combinationTraits.filter(trait => trait.grade)

  const similarities = predefinedCombinations.map(combination => {
    let similarity = 0
    for (const trait of combination) {
      const found = availableTraits.find(_trait => {
        return _trait.trait.replace('Set4_', '').toLowerCase() === trait.trait
      })
      if (!found) {
        continue
      }

      similarity += found.count
    }
    return {
      combination,
      similarity: similarity / combination.reduce((sum, trait) => trait.count + sum, 0),
    }
  })
  return similarities
}
