import { GState, jsPDF } from 'jspdf'
import { type BadgeTone, formatStatus, statusTone } from '../components/Badge'
import type { DonorVehicleListItem, InventoryListItem } from '../types/db'
import { getSignedPhotoUrls, type PhotoBucket } from './photos'

// jsPDF's base14 fonts (helvetica) only cover WinAnsi/Latin-1 — the ₹ glyph from Intl's
// currency formatter isn't in that set and renders as mojibake. Spell out "Rs." instead.
export function formatCurrencyPdf(amount: number): string {
  return `Rs. ${Math.round(amount).toLocaleString('en-IN')}`
}

export type Rgb = [number, number, number]

// Sampled from public/zamzam.png's stroke color so the accent rule matches the logo exactly.
export const ACCENT: Rgb = [222, 58, 59]
export const INK: Rgb = [23, 24, 28]
export const MUTED: Rgb = [102, 102, 111]
export const FAINT: Rgb = [147, 147, 156]
export const LINE: Rgb = [227, 227, 232]
const WATERMARK_GRAY: Rgb = [128, 128, 134]

export const STATUS_RGB: Record<BadgeTone, Rgb> = {
  success: [22, 163, 74],
  danger: [220, 38, 38],
  warning: [217, 119, 6],
  info: [37, 99, 235],
  neutral: [102, 102, 111],
}

export const STATUS_TINT: Record<BadgeTone, Rgb> = {
  success: [230, 247, 235],
  danger: [253, 232, 232],
  warning: [253, 240, 219],
  info: [223, 234, 253],
  neutral: [240, 240, 243],
}

export const MARGIN = 42
export const FOOTER_OFFSET = 46
export const BRAND_LINE = 'ZamZam Auto Parts — Narol, Ahmedabad'

interface PdfSection {
  heading: string
  rows: [string, string][]
}

export interface LoadedImage {
  dataUrl: string
  width: number
  height: number
}

export interface PageSize {
  width: number
  height: number
}

export async function loadImageWithDimensions(url: string): Promise<LoadedImage | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Could not read image'))
      reader.readAsDataURL(blob)
    })
    const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = () => reject(new Error('Could not measure image'))
      img.src = dataUrl
    })
    return { dataUrl, width, height }
  } catch {
    return null
  }
}

export function fitWithinBox(width: number, height: number, maxWidth: number, maxHeight: number) {
  const ratio = Math.min(maxWidth / width, maxHeight / height)
  return { width: width * ratio, height: height * ratio }
}

function formatFromDataUrl(dataUrl: string): string {
  const ext = (/^data:image\/(\w+);/.exec(dataUrl)?.[1] ?? 'jpeg').toUpperCase()
  return ext === 'JPG' ? 'JPEG' : ext
}

let logoPromise: Promise<LoadedImage | null> | null = null
export function loadLogo() {
  logoPromise ??= loadImageWithDimensions('/zamzam.png')
  return logoPromise
}

interface ContentBox {
  x: number
  y: number
  width: number
  height: number
}

// The bounding box of every non-background pixel — "background" meaning near-white or
// (for a PNG with alpha) near-transparent. Used to find how much of the source image is
// actually the logo mark versus baked-in padding.
function findContentBox(imageData: ImageData): ContentBox | null {
  const { data, width, height } = imageData
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const isWhite = data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245
      const isTransparent = data[i + 3] < 10
      if (isWhite || isTransparent) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (maxX < minX || maxY < minY) return null
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

// Crops an image down to its visible content (plus a small padding margin), dropping any
// blank border baked into the source file. zamzam.png in particular has ~30% dead space
// above the mark, so drawing it uncropped wastes a third of whatever box it's fit into —
// this is what lets the logo actually read as "large" on a small, space-constrained label.
async function cropToContent(image: LoadedImage, paddingRatio = 0.04): Promise<LoadedImage> {
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Could not load image for cropping'))
    img.src = image.dataUrl
  })

  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return image
  ctx.drawImage(img, 0, 0)

  const box = findContentBox(ctx.getImageData(0, 0, image.width, image.height))
  if (!box) return image

  const padX = Math.round(box.width * paddingRatio)
  const padY = Math.round(box.height * paddingRatio)
  const cropX = Math.max(0, box.x - padX)
  const cropY = Math.max(0, box.y - padY)
  const cropWidth = Math.min(image.width, box.x + box.width + padX) - cropX
  const cropHeight = Math.min(image.height, box.y + box.height + padY) - cropY

  const cropCanvas = document.createElement('canvas')
  cropCanvas.width = cropWidth
  cropCanvas.height = cropHeight
  const cropCtx = cropCanvas.getContext('2d')
  if (!cropCtx) return image
  cropCtx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)

  return { dataUrl: cropCanvas.toDataURL('image/png'), width: cropWidth, height: cropHeight }
}

let croppedLogoPromise: Promise<LoadedImage | null> | null = null
/** The navbar logo, auto-cropped to its visible mark — for layouts (like item labels) where
 * the logo needs to read large rather than sit inside its source file's blank margin. */
export function loadCroppedLogo() {
  croppedLogoPromise ??= loadLogo().then((logo) => (logo ? cropToContent(logo) : null))
  return croppedLogoPromise
}

/** Large, low-opacity rotated wordmark behind the page content — printed and reused-photo protection. */
export function drawWatermark(doc: jsPDF, width: number, height: number) {
  doc.saveGraphicsState()
  doc.setGState(new GState({ opacity: 0.06 }))
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(36)
  doc.setTextColor(...WATERMARK_GRAY)
  doc.text('ZAMZAM AUTO PARTS', width / 2, height / 2, { align: 'center', baseline: 'middle', angle: 28 })
  doc.restoreGraphicsState()
}

const HEADER_TOP = 24
const HEADER_LOGO_SIZE = 46

/** Logo + accent rule at the top of every page. Returns the y where page content should start. */
export function drawHeader(doc: jsPDF, width: number, logo: LoadedImage | null): number {
  if (logo) {
    const box = fitWithinBox(logo.width, logo.height, HEADER_LOGO_SIZE, HEADER_LOGO_SIZE)
    doc.addImage(logo.dataUrl, 'PNG', MARGIN, HEADER_TOP, box.width, box.height)
  }
  const ruleY = HEADER_TOP + HEADER_LOGO_SIZE + 14
  doc.setDrawColor(...ACCENT)
  doc.setLineWidth(1.6)
  doc.line(MARGIN, ruleY, width - MARGIN, ruleY)
  return ruleY + 30
}

/** Hairline + address at the bottom of every page. Page numbers are stamped in a final pass. */
export function drawFooterChrome(doc: jsPDF, width: number, height: number) {
  const y = height - FOOTER_OFFSET
  doc.setDrawColor(...LINE)
  doc.setLineWidth(1)
  doc.line(MARGIN, y, width - MARGIN, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...FAINT)
  doc.text(BRAND_LINE, MARGIN, y + 16)
}

export function drawStatusChip(doc: jsPDF, rightX: number, centerY: number, label: string, tone: BadgeTone) {
  const text = label.toUpperCase()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  const chipW = doc.getTextWidth(text) + 16
  const chipH = 16
  const chipX = rightX - chipW
  const chipY = centerY - chipH / 2
  doc.setFillColor(...STATUS_TINT[tone])
  doc.roundedRect(chipX, chipY, chipW, chipH, chipH / 2, chipH / 2, 'F')
  doc.setTextColor(...STATUS_RGB[tone])
  doc.text(text, chipX + chipW / 2, chipY + chipH / 2 + 0.5, { align: 'center', baseline: 'middle' })
}

/** Starts a fresh page (any orientation), draws its chrome, and returns the usable content box. */
export function openPage(
  doc: jsPDF,
  orientation: 'portrait' | 'landscape',
  logo: LoadedImage | null,
  pageSizes: PageSize[],
  isFirstPage: boolean,
) {
  if (!isFirstPage) doc.addPage('a4', orientation)
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  pageSizes.push({ width, height })
  const contentTop = drawHeader(doc, width, logo)
  drawFooterChrome(doc, width, height)
  return { width, height, contentTop, contentBottom: height - FOOTER_OFFSET }
}

export function stampPageNumbers(doc: jsPDF, pageSizes: PageSize[]) {
  pageSizes.forEach((page, index) => {
    doc.setPage(index + 1)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...FAINT)
    doc.text(`Page ${index + 1} of ${pageSizes.length}`, page.width - MARGIN, page.height - FOOTER_OFFSET + 16, {
      align: 'right',
    })
  })
}

async function buildSpecSheetPdf(options: {
  title: string
  subtitle: string
  statusLabel: string
  statusTone: BadgeTone
  bucket: PhotoBucket
  photoPaths: string[]
  sections: PdfSection[]
}): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const logo = await loadLogo()
  const pageSizes: PageSize[] = []
  const VALUE_X = MARGIN + 170
  const LINE_HEIGHT = 13

  let page = openPage(doc, 'portrait', logo, pageSizes, true)
  drawWatermark(doc, page.width, page.height)
  let y = page.contentTop

  function ensureSpace(needed: number) {
    if (y + needed > page.contentBottom) {
      page = openPage(doc, 'portrait', logo, pageSizes, false)
      drawWatermark(doc, page.width, page.height)
      y = page.contentTop
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(21)
  doc.setTextColor(...INK)
  doc.text(options.title, MARGIN, y)

  drawStatusChip(doc, page.width - MARGIN, y - 7, options.statusLabel, options.statusTone)
  y += 22

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...MUTED)
  doc.text(options.subtitle, MARGIN, y)
  y += 28

  for (const section of options.sections) {
    ensureSpace(34)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...INK)
    doc.text(section.heading, MARGIN, y)
    y += 6
    doc.setDrawColor(...ACCENT)
    doc.setLineWidth(1.2)
    doc.line(MARGIN, y, MARGIN + 26, y)
    y += 16

    for (const [label, value] of section.rows) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10.5)
      const maxValueWidth = page.width - VALUE_X - MARGIN
      const lines = doc.splitTextToSize(value || '—', maxValueWidth) as string[]
      const rowHeight = lines.length * LINE_HEIGHT
      ensureSpace(rowHeight + 4)

      doc.setTextColor(...MUTED)
      doc.text(label, MARGIN, y)
      doc.setTextColor(...INK)
      lines.forEach((line, index) => doc.text(line, VALUE_X, y + index * LINE_HEIGHT))
      y += rowHeight + 4
    }
    y += 14
  }

  const photoPaths = options.photoPaths.filter(Boolean)
  if (photoPaths.length > 0) {
    const signedUrls = await getSignedPhotoUrls(options.bucket, photoPaths)
    for (let i = 0; i < photoPaths.length; i++) {
      const signedUrl = signedUrls[i]
      const photo = signedUrl ? await loadImageWithDimensions(signedUrl) : null
      if (!photo) continue

      const orientation = photo.width >= photo.height ? 'landscape' : 'portrait'
      const photoPage = openPage(doc, orientation, logo, pageSizes, false)
      const captionH = 22
      const maxWidth = photoPage.width - MARGIN * 2
      const maxHeight = photoPage.contentBottom - photoPage.contentTop - captionH
      const box = fitWithinBox(photo.width, photo.height, maxWidth, maxHeight)
      const boxX = photoPage.width / 2 - box.width / 2
      const boxY = photoPage.contentTop + Math.max(0, (maxHeight - box.height) / 2)

      try {
        doc.addImage(photo.dataUrl, formatFromDataUrl(photo.dataUrl), boxX, boxY, box.width, box.height)
        // Watermark goes on top of the photo here (unlike the info pages) so it stays visible
        // instead of being painted over — this is what actually protects/brands the image.
        drawWatermark(doc, photoPage.width, photoPage.height)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9.5)
        doc.setTextColor(...MUTED)
        doc.text(`Photo ${i + 1} of ${photoPaths.length}`, photoPage.width / 2, boxY + box.height + 18, {
          align: 'center',
        })
      } catch {
        // Unsupported image format (e.g. WEBP) — drop this page rather than fail the whole document.
      }
    }
  }

  stampPageNumbers(doc, pageSizes)
  return doc.output('blob')
}

export async function buildPartPdf(item: InventoryListItem): Promise<Blob> {
  const vehicle = item.donor_vehicle?.vehicle_application
  const part = item.part_catalog
  const modelYears =
    vehicle?.year_from || vehicle?.year_to ? `${vehicle?.year_from ?? '—'} – ${vehicle?.year_to ?? '—'}` : '—'

  return buildSpecSheetPdf({
    title: item.item_name,
    subtitle: `SKU ${item.sku}`,
    statusLabel: formatStatus(item.status),
    statusTone: statusTone(item.status),
    bucket: 'part-photos',
    photoPaths: item.photos,
    sections: [
      {
        heading: 'Part',
        rows: [
          ['Part number', item.part_number || part?.primary_oem_number || '—'],
          ['Type', part?.part_type || '—'],
          ['Category', part?.category || '—'],
          ['Side', part?.side || '—'],
          ['Description', part?.description || '—'],
          ['Condition grade', item.condition_grade || '—'],
        ],
      },
      {
        heading: 'Donor vehicle',
        rows: [
          ['Make', vehicle?.make || '—'],
          ['Model', vehicle?.model || '—'],
          ['Variant', vehicle?.variant || '—'],
          ['Generation', vehicle?.generation_code || '—'],
          ['Body style', vehicle?.body_style || '—'],
          ['Model years', modelYears],
          ['Tag code', item.donor_vehicle?.tag_code || '—'],
        ],
      },
      {
        heading: 'Condition & testing',
        rows: [
          ['Tested', item.tested ? 'Yes' : item.tested === false ? 'No' : 'Unknown'],
          ['Test notes', item.test_notes || '—'],
          ['Paired set', item.paired_set_ref || '—'],
        ],
      },
      {
        heading: 'Inventory',
        rows: [
          ['Shelf location', item.shelf_location || 'Unassigned'],
          ['Price', item.price != null ? formatCurrencyPdf(item.price) : '—'],
          ['Listed', new Date(item.created_at).toLocaleDateString('en-IN')],
        ],
      },
    ],
  })
}

export async function buildCarPdf(vehicle: DonorVehicleListItem): Promise<Blob> {
  const app = vehicle.vehicle_application
  const title = [app?.make, app?.model].filter(Boolean).join(' ') || vehicle.tag_code
  const modelYears = app?.year_from || app?.year_to ? `${app?.year_from ?? '—'} – ${app?.year_to ?? '—'}` : '—'

  return buildSpecSheetPdf({
    title,
    subtitle: `Tag code ${vehicle.tag_code}`,
    statusLabel: formatStatus(vehicle.status),
    statusTone: statusTone(vehicle.status),
    bucket: 'car-photos',
    photoPaths: vehicle.photos,
    sections: [
      {
        heading: 'Vehicle',
        rows: [
          ['Make', app?.make || '—'],
          ['Model', app?.model || '—'],
          ['Variant', app?.variant || '—'],
          ['Generation', app?.generation_code || '—'],
          ['Body style', app?.body_style || '—'],
          ['Model years', modelYears],
        ],
      },
      {
        heading: 'Registration',
        rows: [
          ['RC number', vehicle.rc_number || '—'],
          ['VIN', vehicle.vin || '—'],
          ['Odometer', vehicle.odometer != null ? `${vehicle.odometer.toLocaleString('en-IN')} km` : '—'],
        ],
      },
      {
        heading: 'Acquisition',
        rows: [
          ['Source', vehicle.source || '—'],
          ['Purchase price', vehicle.purchase_price != null ? formatCurrencyPdf(vehicle.purchase_price) : '—'],
          ['Purchase date', vehicle.purchase_date ? new Date(vehicle.purchase_date).toLocaleDateString('en-IN') : '—'],
          ['Scrap certificate', vehicle.scrap_cert_ref || '—'],
          ['Scrap value', vehicle.scrap_value != null ? formatCurrencyPdf(vehicle.scrap_value) : '—'],
        ],
      },
      {
        heading: 'Fleet',
        rows: [
          ['In fleet', vehicle.in_fleet ? 'Yes' : 'No'],
          ['Listed', new Date(vehicle.created_at).toLocaleDateString('en-IN')],
        ],
      },
    ],
  })
}

export async function sharePdf(blob: Blob, filename: string, shareTitle: string): Promise<void> {
  const file = new File([blob], filename, { type: 'application/pdf' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: shareTitle })
      return
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
    }
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
