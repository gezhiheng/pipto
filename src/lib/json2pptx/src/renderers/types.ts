import type { ElementFill, ElementFilters } from '../types/ppt'

export type ShapeFillPatch = {
  kind: 'shape'
  slideIndex: number
  objectName: string
  fill: ElementFill
}

export type BackgroundFillPatch = {
  kind: 'background'
  slideIndex: number
  fill: ElementFill
}

export type ImageFilterPatch = {
  kind: 'image'
  slideIndex: number
  objectName: string
  filters?: ElementFilters
}

export type FillPatch = ShapeFillPatch | BackgroundFillPatch
