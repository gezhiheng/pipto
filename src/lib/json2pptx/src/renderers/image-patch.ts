import type { ElementFilters } from '../types/ppt'
import { getFilterOpacity } from './shared'

function stripImageFilterTags(value: string): string {
  return value
    .replace(/<a:alphaModFix\b[^>]*\/>/g, '')
    .replace(/<a:grayscl\s*\/>/g, '')
}

function hasEnabledGrayscale(value?: string | number): boolean {
  if (value === undefined || value === null) return false
  if (typeof value === 'number') return value > 0

  const normalized = value.trim()
  if (!normalized) return false
  if (normalized.endsWith('%')) {
    const percent = Number.parseFloat(normalized)
    return Number.isFinite(percent) && percent > 0
  }

  const numeric = Number.parseFloat(normalized)
  return Number.isFinite(numeric) && numeric > 0
}

function buildImageFilterXml(filters?: ElementFilters): string {
  if (!filters) return ''

  const xml: string[] = []
  const opacity = getFilterOpacity(filters.opacity)
  if (opacity !== undefined) {
    xml.push(`<a:alphaModFix amt="${Math.round(opacity * 100000)}"/>`)
  }
  if (hasEnabledGrayscale(filters.grayscale)) {
    xml.push('<a:grayscl/>')
  }

  return xml.join('')
}

export function imageFiltersRequireXmlPatch(filters?: ElementFilters): boolean {
  if (!filters) return false
  return getFilterOpacity(filters.opacity) !== undefined || hasEnabledGrayscale(filters.grayscale)
}

export function applyImageFilterPatch(
  slideXml: string,
  objectName: string,
  filters?: ElementFilters
): string {
  const filterXml = buildImageFilterXml(filters)
  if (!filterXml) return slideXml

  const nameToken = `name="${objectName}"`
  let cursor = 0
  let result = slideXml

  while (true) {
    const nameIndex = result.indexOf(nameToken, cursor)
    if (nameIndex === -1) break

    const picStart = result.lastIndexOf('<p:pic', nameIndex)
    const picEnd = result.indexOf('</p:pic>', nameIndex)
    if (picStart === -1 || picEnd === -1) break

    const picXml = result.slice(picStart, picEnd + '</p:pic>'.length)
    const blipOpenClose = picXml.match(/<a:blip\b([^>]*)>([\s\S]*?)<\/a:blip>/)

    let updatedPicXml = picXml
    if (blipOpenClose) {
      const attrs = blipOpenClose[1]
      const inner = stripImageFilterTags(blipOpenClose[2])
      const nextBlip = `<a:blip${attrs}>${filterXml}${inner}</a:blip>`
      updatedPicXml = picXml.replace(blipOpenClose[0], nextBlip)
    }
    else {
      const blipSelfClosing = picXml.match(/<a:blip\b([^>]*)\/>/)
      if (!blipSelfClosing) {
        cursor = picEnd + 1
        continue
      }

      const attrs = blipSelfClosing[1]
      const nextBlip = `<a:blip${attrs}>${filterXml}</a:blip>`
      updatedPicXml = picXml.replace(blipSelfClosing[0], nextBlip)
    }

    result = result.slice(0, picStart) + updatedPicXml + result.slice(picEnd + '</p:pic>'.length)
    cursor = picStart + updatedPicXml.length
  }

  return result
}
