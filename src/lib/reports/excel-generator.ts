/**
 * Excel Report Generator using ExcelJS
 */

import ExcelJS from 'exceljs'
import { logger } from '../logger'

export interface ExcelColumn {
  header: string
  key: string
  width?: number
  style?: Partial<ExcelJS.Style>
}

export interface ExcelSheet {
  name: string
  columns: ExcelColumn[]
  data: any[]
}

/**
 * Generate Excel workbook from data
 */
export async function generateExcel(sheets: ExcelSheet[]): Promise<Buffer> {
  try {
    const workbook = new ExcelJS.Workbook()
    
    workbook.creator = 'AdPilot AI'
    workbook.created = new Date()
    workbook.modified = new Date()

    for (const sheetData of sheets) {
      const worksheet = workbook.addWorksheet(sheetData.name)

      // Set columns
      worksheet.columns = sheetData.columns.map(col => ({
        header: col.header,
        key: col.key,
        width: col.width || 15,
      }))

      // Style header row
      worksheet.getRow(1).font = { bold: true, size: 12 }
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' }, // Indigo
      }
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }

      // Add data rows
      sheetData.data.forEach(row => {
        worksheet.addRow(row)
      })

      // Auto-filter
      worksheet.autoFilter = {
        from: 'A1',
        to: `${String.fromCharCode(64 + sheetData.columns.length)}1`,
      }

      // Freeze header row
      worksheet.views = [
        { state: 'frozen', xSplit: 0, ySplit: 1 }
      ]
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()
    return Buffer.from(buffer)
  } catch (error) {
    logger.error('Excel generation failed', error)
    throw error
  }
}

/**
 * Format campaign data for Excel export
 */
export function formatCampaignDataForExcel(campaigns: any[]): ExcelSheet {
  return {
    name: 'Campaigns',
    columns: [
      { header: 'Campaign Name', key: 'name', width: 30 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Objective', key: 'objective', width: 20 },
      { header: 'Spend', key: 'spend', width: 15 },
      { header: 'Impressions', key: 'impressions', width: 15 },
      { header: 'Clicks', key: 'clicks', width: 12 },
      { header: 'CTR %', key: 'ctr', width: 12 },
      { header: 'CPC', key: 'cpc', width: 12 },
      { header: 'Conversions', key: 'conversions', width: 15 },
      { header: 'Revenue', key: 'revenue', width: 15 },
      { header: 'ROAS', key: 'roas', width: 12 },
    ],
    data: campaigns.map(c => ({
      name: c.name || c.campaign_name,
      status: c.status,
      objective: c.objective,
      spend: parseFloat(c.spend || 0).toFixed(2),
      impressions: parseInt(c.impressions || 0),
      clicks: parseInt(c.clicks || 0),
      ctr: parseFloat(c.ctr || 0).toFixed(2),
      cpc: parseFloat(c.cpc || 0).toFixed(2),
      conversions: parseInt(c.conversions || 0),
      revenue: parseFloat(c.revenue || c.purchase_value || 0).toFixed(2),
      roas: parseFloat(c.roas || 0).toFixed(2),
    })),
  }
}

export default generateExcel
