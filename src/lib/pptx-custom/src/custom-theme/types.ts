import type { ThemeLogoPosition, ThemeScopeKey } from '../types'

export type RGB = {
  r: number
  g: number
  b: number
}

export type ColorMapping = {
  fromRgb: RGB
  toRgb: RGB
  toHex?: string
}

export type SlideScopeKey = ThemeScopeKey | null

export type MediaElementType = 'background' | 'logo'

export type MediaElementBaseInput = {
  src: string
  slideWidth: number
  slideHeight: number
  slideIndex: number
}

export type BackgroundElementInput = MediaElementBaseInput

export type LogoElementInput = MediaElementBaseInput & {
  position: ThemeLogoPosition
  logoWidth?: number
  logoHeight?: number
}

export type LogoSize = {
  width: number
  height: number
}
