import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { parseDocument, validateDocument } from 'json2pptx-schema'
import { parsePptxToJson } from '../index'
import { getPicFilters } from '../parser/fill'
import { getCustomShapePath } from '../parser/shape'
import type { PresentationData, Slide, SlideElement } from '../../../types/ppt'

const TEST_DIR = fileURLToPath(new URL('.', import.meta.url))
const FIXTURE_DIR = join(TEST_DIR, 'assets')
const SOURCE_PPTX = join(FIXTURE_DIR, 'template_1.pptx')
const EXPECTED_JSON = join(FIXTURE_DIR, 'template_1.json')
const PPTX_MIME_TYPE =
  
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'

type SlideSummary = {
  textLike: number
  image: number
  line: number
  table: number
  chart: number
  media: number
}

function loadExpectedFixture(): PresentationData {
  return JSON.parse(readFileSync(EXPECTED_JSON, 'utf8')) as PresentationData
}

function createFixtureFile(): File {
  const source = readFileSync(SOURCE_PPTX)
  return new File([source], 'template_1.pptx', { type: PPTX_MIME_TYPE })
}

async function createContentTypesPrefixedFixtureFile(): Promise<File> {
  const source = readFileSync(SOURCE_PPTX)
  const zip = await JSZip.loadAsync(source)
  const xml = await zip.file('[Content_Types].xml')!.async('string')
  const prefixedXml = xml
    .replace(
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
      '<ct:Types xmlns:ct="http://schemas.openxmlformats.org/package/2006/content-types">'
    )
    .replace(/<\/Types>/g, '</ct:Types>')
    .replace(/<Default\b/g, '<ct:Default')
    .replace(/<Override\b/g, '<ct:Override')

  zip.file('[Content_Types].xml', prefixedXml)

  const buffer = await zip.generateAsync({ type: 'uint8array' })
  return new File([buffer], 'template_1-prefixed-content-types.pptx', { type: PPTX_MIME_TYPE })
}

function getPathCommandSequence(path?: string): string[] {
  return path?.match(/[MLCQAZmlcqaz]/g) ?? []
}

function normalizeText(content: string): string {
  return content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getElementText(element: SlideElement): string {
  if (element.type === 'text') {
    return normalizeText(element.content ?? '')
  }

  if (element.type === 'shape') {
    const content = element.text?.content ?? element.content ?? ''
    return normalizeText(content)
  }

  return ''
}

function summarizeSlide(slide?: Slide): SlideSummary {
  const elements = slide?.elements ?? []

  return {
    textLike: elements.filter((element) => getElementText(element).length > 0).length,
    image: elements.filter((element) => element.type === 'image').length,
    line: elements.filter((element) => element.type === 'line').length,
    table: elements.filter((element) => element.type === 'table').length,
    chart: elements.filter((element) => element.type === 'chart').length,
    media: elements.filter((element) => element.type === 'video' || element.type === 'audio')
      .length
  }
}

function firstSlideText(slide?: Slide): string {
  const elements = slide?.elements ?? []
  for (const element of elements) {
    const text = getElementText(element)
    if (text.length > 0) {
      return text
    }
  }
  return ''
}

describe('pptx2json package tests', () => {
  it('converts template_1.pptx into schema-valid JSON', async () => {
    const { presentation, warnings } = await parsePptxToJson(createFixtureFile())

    expect(warnings).toEqual([])
    expect(() => validateDocument(presentation)).not.toThrow()

    const parsed = parseDocument(presentation)
    expect(parsed.schemaVersion).toBe('1.0.0')
    expect(parsed.slides.length).toBeGreaterThan(0)
  })

  it('matches template_1.json on structural conversion expectations', async () => {
    const expected = parseDocument(loadExpectedFixture()) as unknown as PresentationData
    const { presentation: actual } = await parsePptxToJson(createFixtureFile())

    expect(() => validateDocument(expected)).not.toThrow()
    expect(() => validateDocument(actual)).not.toThrow()

    const expectedSlides = expected.slides ?? []
    const actualSlides = actual.slides ?? []

    expect(actualSlides.length).toBe(expectedSlides.length)

    const expectedRatio = (expected.width ?? 1) / (expected.height ?? 1)
    const actualRatio = (actual.width ?? 1) / (actual.height ?? 1)
    expect(actualRatio).toBeCloseTo(expectedRatio, 6)

    for (let index = 0; index < expectedSlides.length; index += 1) {
      expect(summarizeSlide(actualSlides[index])).toEqual(summarizeSlide(expectedSlides[index]))
      expect(firstSlideText(actualSlides[index])).toBe(firstSlideText(expectedSlides[index]))
    }
  })

  it('parses PPTX when [Content_Types].xml uses namespaced tags', async () => {
    const { presentation, warnings } = await parsePptxToJson(
      await createContentTypesPrefixedFixtureFile()
    )

    expect(warnings).toEqual([])
    expect(() => validateDocument(presentation)).not.toThrow()
    expect(presentation.slides.length).toBeGreaterThan(0)
  })

  it('reads grayscale and opacity filters from blip effects', () => {
    const filters = getPicFilters({
      'a:blip': {
        'a:alphaModFix': { attrs: { amt: '100000' } },
        'a:grayscl': { attrs: { order: 1 } }
      }
    })

    expect(filters).toMatchObject({
      grayscale: '100%',
      opacity: '100%'
    })
  })

  it('preserves XML command order when rebuilding custom shape paths', () => {
    const path = getCustomShapePath(
      {
        'a:pathLst': {
          'a:path': {
            attrs: { w: '200', h: '200', order: 1 },
            'a:moveTo': {
              attrs: { order: 3 },
              'a:pt': { attrs: { x: '0', y: '0' } }
            },
            'a:lnTo': {
              attrs: { order: 7 },
              'a:pt': { attrs: { x: '160', y: '160' } }
            },
            'a:quadBezTo': {
              attrs: { order: 5 },
              'a:pt': [
                { attrs: { x: '40', y: '0' } },
                { attrs: { x: '80', y: '80' } }
              ]
            },
            'a:cubicBezTo': {
              attrs: { order: 9 },
              'a:pt': [
                { attrs: { x: '160', y: '80' } },
                { attrs: { x: '180', y: '120' } },
                { attrs: { x: '200', y: '200' } }
              ]
            },
            'a:close': {
              attrs: { order: 11 }
            }
          }
        }
      },
      200,
      200
    )

    expect(getPathCommandSequence(path)).toEqual(['M', 'Q', 'L', 'C', 'z'])
  })
})
