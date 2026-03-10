import { parseDocument } from 'json2pptx-schema'
import type { Deck, PptxCustomThemeInput } from '../types'
import { replaceScopedMedia } from './media'
import { applyTheme2Json } from './theme-applier'

export function applyCustomTheme (
  deck: Deck,
  input: PptxCustomThemeInput
): Deck {
  const normalizedDeck = parseDocument(deck) as unknown as Deck
  const withColors = applyTheme2Json(normalizedDeck, input)
  const withMedia = replaceScopedMedia(withColors, input)
  return parseDocument(withMedia) as unknown as Deck
}

export { applyTheme2Json }
