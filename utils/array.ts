
export function unique<T>(array: T[]): T[] {
  return [...new Set(array)]
}

export function flatten<T>(array: any[]): T[] {
  if (array.length === 0) {
    return array
  }

  const q: any[] = [...array]
  const result: T[] = []
  while (q.length > 0) {
    const el = q.pop()
    if (Array.isArray(el)) {
      for (const _el of el) {
        q.push(_el)
      }
    } else {
      result.push(el)
    }
  }
  return result
}
