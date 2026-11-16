import { awards } from '@/data/content'

export type AwardItem = (typeof awards)[number]

/** Awards grouped by year, newest year first (order within a year follows the source list). */
export const awardsByYear: { year: number; items: AwardItem[] }[] = (() => {
  const groups = new Map<number, AwardItem[]>()
  for (const award of awards) {
    const list = groups.get(award.year) ?? []
    list.push(award)
    groups.set(award.year, list)
  }
  return [...groups.entries()].sort((a, b) => b[0] - a[0]).map(([year, items]) => ({ year, items }))
})()

/**
 * Splits the year groups into two columns of similar height (each group costs its awards plus a little
 * for the row itself), keeping newest-first order down the first column and then the second.
 */
export function splitYearGroups(groups = awardsByYear): [typeof awardsByYear, typeof awardsByYear] {
  const weight = (g: (typeof awardsByYear)[number]) => g.items.length + 0.6
  const total = groups.reduce((sum, g) => sum + weight(g), 0)
  let running = 0
  let cut = groups.length
  for (let i = 0; i < groups.length; i++) {
    if (running + weight(groups[i]) / 2 > total / 2) {
      cut = i
      break
    }
    running += weight(groups[i])
  }
  return [groups.slice(0, cut), groups.slice(cut)]
}

/** The awards the company marks as highlights, newest first. */
export const featuredAwards: AwardItem[] = awards.filter((a) => a.highlight).sort((a, b) => b.year - a.year)

export const firstAwardYear = Math.min(...awards.map((a) => a.year))
export const latestAwardYear = Math.max(...awards.map((a) => a.year))
