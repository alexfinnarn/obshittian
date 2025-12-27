import { describe, it, expect } from 'vitest'

describe('test setup', () => {
  it('works', () => {
    expect(1 + 1).toBe(2)
  })

  it('can use TypeScript', () => {
    const add = (a: number, b: number): number => a + b
    expect(add(2, 3)).toBe(5)
  })
})
