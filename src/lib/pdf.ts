import { jsPDF } from 'jspdf'
import { formatStatus } from '../components/Badge'
import type { DonorVehicleListItem, InventoryListItem } from '../types/db'
import { getSignedPhotoUrl, type PhotoBucket } from './photos'

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

interface PdfSection {
  heading: string
  rows: [string, string][]
}

interface LoadedImage {
  dataUrl: string
  width: number
  height: number
}

async function loadImageWithDimensions(url: string): Promise<LoadedImage | null> {
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

function fitWithinBox(width: number, height: number, maxWidth: number, maxHeight: number) {
  const ratio = Math.min(maxWidth / width, maxHeight / height)
  return { width: width * ratio, height: height * ratio }
}

async function buildSpecSheetPdf(options: {
  title: string
  subtitle?: string
  bucket: PhotoBucket
  photoPath: string | null
  sections: PdfSection[]
}): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const marginX = 40
  let y = 30

  const logo = await loadImageWithDimensions('/zamzam.png')
  if (logo) {
    const box = fitWithinBox(logo.width, logo.height, 90, 40)
    doc.addImage(logo.dataUrl, 'PNG', marginX, y, box.width, box.height)
    y += box.height + 18
  }

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(options.title, marginX, y)
  y += 20

  if (options.subtitle) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(110)
    doc.text(options.subtitle, marginX, y)
    doc.setTextColor(20)
    y += 24
  }

  if (options.photoPath) {
    const signedUrl = await getSignedPhotoUrl(options.bucket, options.photoPath)
    const photo = signedUrl ? await loadImageWithDimensions(signedUrl) : null
    if (photo) {
      try {
        const box = fitWithinBox(photo.width, photo.height, 220, 165)
        doc.addImage(photo.dataUrl, 'JPEG', marginX, y, box.width, box.height)
        y += box.height + 16
      } catch {
        // Unsupported image format — skip the photo rather than fail the whole PDF.
      }
    }
  }

  for (const section of options.sections) {
    if (y > 700) {
      doc.addPage()
      y = 50
    }
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(section.heading, marginX, y)
    y += 18
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)

    for (const [label, value] of section.rows) {
      if (y > 760) {
        doc.addPage()
        y = 50
      }
      doc.setTextColor(110)
      doc.text(label, marginX, y)
      doc.setTextColor(20)
      doc.text(value || '—', marginX + 150, y)
      y += 16
    }
    y += 12
  }

  doc.setFontSize(9)
  doc.setTextColor(150)
  doc.text('ZamZam Auto Parts — Narol, Ahmedabad', marginX, 812)

  return doc.output('blob')
}

export async function buildPartPdf(item: InventoryListItem): Promise<Blob> {
  const vehicle = item.donor_vehicle?.vehicle_application
  const part = item.part_catalog

  return buildSpecSheetPdf({
    title: item.item_name,
    subtitle: `SKU ${item.sku}`,
    bucket: 'part-photos',
    photoPath: item.photos[0] ?? null,
    sections: [
      {
        heading: 'Part',
        rows: [
          ['Part number', part?.primary_oem_number || '—'],
          ['Type', part?.part_type || '—'],
          ['Category', part?.category || '—'],
          ['Side', part?.side || '—'],
          ['Condition grade', item.condition_grade || '—'],
        ],
      },
      {
        heading: 'Donor vehicle',
        rows: [
          ['Make', vehicle?.make || '—'],
          ['Model', vehicle?.model || '—'],
          ['Generation', vehicle?.generation_code || '—'],
          ['Tag code', item.donor_vehicle?.tag_code || '—'],
        ],
      },
      {
        heading: 'Inventory',
        rows: [
          ['Status', formatStatus(item.status)],
          ['Tested', item.tested ? 'Yes' : item.tested === false ? 'No' : 'Unknown'],
          ['Shelf location', item.shelf_location || 'Unassigned'],
          ['Price', item.price != null ? currency.format(item.price) : '—'],
        ],
      },
    ],
  })
}

export async function buildCarPdf(vehicle: DonorVehicleListItem): Promise<Blob> {
  const app = vehicle.vehicle_application
  const title = [app?.make, app?.model].filter(Boolean).join(' ') || vehicle.tag_code

  return buildSpecSheetPdf({
    title,
    subtitle: `Tag code ${vehicle.tag_code}`,
    bucket: 'car-photos',
    photoPath: vehicle.photos[0] ?? null,
    sections: [
      {
        heading: 'Vehicle',
        rows: [
          ['Generation', app?.generation_code || '—'],
          ['Variant', app?.variant || '—'],
          ['Body style', app?.body_style || '—'],
          ['Model years', `${app?.year_from ?? '—'} – ${app?.year_to ?? '—'}`],
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
          ['Status', formatStatus(vehicle.status)],
          ['Source', vehicle.source || '—'],
          ['Purchase price', vehicle.purchase_price != null ? currency.format(vehicle.purchase_price) : '—'],
          [
            'Purchase date',
            vehicle.purchase_date ? new Date(vehicle.purchase_date).toLocaleDateString('en-IN') : '—',
          ],
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
