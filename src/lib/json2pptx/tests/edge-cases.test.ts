import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { createPPTX } from '../src/index'
import { toPoints } from '../src/svgPathParser'
import type { PresentationData, SlideElement } from '../src/types/ppt'

const TEST_DIR = fileURLToPath(new URL('.', import.meta.url))
const FIXTURE_DIR = join(TEST_DIR, 'assets')
const IMAGE_FIXTURE = join(FIXTURE_DIR, 'original-image1.json')
const SHAPE_FIXTURE = join(FIXTURE_DIR, 'original-shape2.json')
const INLINE_PNG =
  'data:image/png;base64,' +
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg=='

function loadJsonFixture<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

function getPointCommandSequence(points: ReturnType<typeof toPoints>): string[] {
  return points.map((point) => {
    if ('close' in point) return 'z'
    if (point.type === 'M') return 'M'
    if (point.curve?.type === 'cubic') return 'C'
    if (point.curve?.type === 'quadratic') return 'Q'
    return 'L'
  })
}

function isFinitePoint(point: ReturnType<typeof toPoints>[number]): boolean {
  if ('close' in point) return true

  const values = [point.x, point.y]
  if (point.curve?.type === 'cubic') {
    values.push(point.curve.x1, point.curve.y1, point.curve.x2, point.curve.y2)
  }
  if (point.curve?.type === 'quadratic') {
    values.push(point.curve.x1, point.curve.y1)
  }

  return values.every((value) => Number.isFinite(value))
}

describe('json2pptx edge cases', () => {
  it('normalizes relative and shorthand SVG path commands before export', () => {
    const points = toPoints('M10 10 l5 0 c1 2 3 4 5 6 s7 8 9 10 h4 v5 z')

    expect(getPointCommandSequence(points)).toEqual(['M', 'L', 'C', 'C', 'L', 'L', 'z'])
    expect(points[1]).toMatchObject({ x: 15, y: 10 })
    expect(points[2]).toMatchObject({
      x: 20,
      y: 16,
      curve: {
        type: 'cubic',
        x1: 16,
        y1: 12,
        x2: 18,
        y2: 14
      }
    })
    expect(points[3]).toMatchObject({
      x: 29,
      y: 26,
      curve: {
        type: 'cubic',
        x1: 22,
        y1: 18,
        x2: 27,
        y2: 24
      }
    })
    expect(points[4]).toMatchObject({ x: 33, y: 26 })
    expect(points[5]).toMatchObject({ x: 33, y: 31 })
  })

  it('normalizes complex relative and smooth-curve shape fixtures without NaN geometry', () => {
    const shape = loadJsonFixture<SlideElement>(SHAPE_FIXTURE)
    expect(shape.type).toBe('shape')
    if (shape.type !== 'shape' || !shape.path) return

    const points = toPoints(shape.path)
    const sequence = getPointCommandSequence(points)

    expect(sequence[0]).toBe('M')
    expect(sequence.at(-1)).toBe('z')
    expect(sequence.every((command) => ['M', 'L', 'C', 'Q', 'z'].includes(command))).toBe(true)
    expect(sequence.filter((command) => command === 'C').length).toBeGreaterThan(5)
    expect(points.every(isFinitePoint)).toBe(true)
  })

  it('writes grayscale image filters as PPT blip effects', async () => {
    const image = loadJsonFixture<SlideElement>(IMAGE_FIXTURE)
    const source = {
      title: 'Image Filters Export',
      width: 960,
      height: 540,
      slides: [
        {
          elements: [
            {
              ...image,
              src: INLINE_PNG
            }
          ]
        }
      ]
    } satisfies PresentationData

    const { blob } = await createPPTX(source as any)
    const zip = await JSZip.loadAsync(await blob.arrayBuffer())
    const slideXml = await zip.file('ppt/slides/slide1.xml')!.async('string')

    expect(slideXml).toContain('<a:grayscl/>')
    expect(slideXml).toContain('<a:alphaModFix amt="100000"/>')
  })

  it('exports PPTX without embedding custom JSON payloads', async () => {
    const source = {
      title: 'Round Trip Visual',
      width: 960,
      height: 540,
      slides: [
        {
          background: {
            type: 'gradient',
            gradient: {
              type: 'linear',
              rotate: 0,
              colors: [
                { pos: 0, color: '#EFEFEF' },
                { pos: 100, color: '#D6E4FF' }
              ]
            }
          },
          elements: [
            {
              id: 'text-1',
              type: 'text',
              left: 40,
              top: 60,
              width: 320,
              height: 70,
              content: '<p><strong>Round trip</strong> visual</p>',
              defaultColor: '#123456',
              defaultFontName: 'Aptos',
              fill: {
                type: 'solid',
                color: '#FFFFFF'
              },
              paragraphSpace: 0.5
            }
          ]
        }
      ]
    } satisfies PresentationData

    const { blob } = await createPPTX(source as any)
    const zip = await JSZip.loadAsync(await blob.arrayBuffer())

    expect(zip.file('json2ppt-editor.json')).toBeNull()
  })
})
