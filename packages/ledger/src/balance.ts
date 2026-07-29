import { reduceLedger } from './reduce'
import type { Journal, LedgerConfig, Minutes } from './types'

/** The balance as of `atMs` — entries after that moment are ignored. */
export function remainingMinutes(journal: Journal, config: LedgerConfig, atMs: number): Minutes {
  const days = reduceLedger(journal, config, atMs)
  return days[days.length - 1]!.balance
}
