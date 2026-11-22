import type { Deck } from '../types'
import { syntax } from './typescript/syntax'
import { functions } from './typescript/functions'
import { logic } from './typescript/logic'
import { problems } from './typescript/problems'

export const DECKS: Deck[] = [{ lang: 'typescript', label: 'TypeScript', cards: [...syntax, ...functions, ...logic, ...problems] }]
