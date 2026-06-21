/**
 * Email Templates for Different Notification Types
 */

export interface AlertEmailData {
  campaignName: string
  alertType: string
  message: string
  severity: 'critical' | 'warning' | 'info'
  currentValue: string
  dashboardUrl: string
}

export interface ReportEmailData {
  reportType: string
  dateRange: string
  downloadUrl: string
  fileSize: string
  expiresAt: string
}

export interface DigestEmailData {
  workspaceName: string
  period: string
  summary: {
    totalSpend: string
    totalRevenue: string
    avgRoas: string
    activeAlerts: number
    newRecommendations: number
  }
  topCampaigns: Array<{
    name: string
    roas: string
    spend: string
  }>
  dashboardUrl: string
}

/**
 * Alert notification email template
 */
export function renderAlertEmail(data: AlertEmailData): string {
  const severityColors = {
    critical: '#DC2626',
    warning: '#F59E0B',
    info: '#3B82F6',
  }

  const severityIcons = {
    critical: '🚨',
    warning: '⚠️',
    info: 'ℹ️',
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Campaign Alert: ${data.alertType}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="font-size: 24px; font-weight: bold; color: #4F46E5;">🚀 AdPilot AI</div>
    </div>
    
    <div style="background-color: ${severityColors[data.severity]}15; border-left: 4px solid ${severityColors[data.severity]}; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
      <h2 style="margin: 0 0 10px 0; color: ${severityColors[data.severity]};">
        ${severityIcons[data.severity]} ${data.alertType.replace(/_/g, ' ').toUpperCase()}
      </h2>
      <p style="margin: 0; font-size: 14px; color: #666;">Campaign: <strong>${data.campaignName}</strong></p>
    </div>

    <div style="margin-bottom: 30px;">
      <p style="font-size: 16px; color: #555; margin-bottom: 15px;">${data.message}</p>
      
      <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px;">
        <p style="margin: 0; font-size: 14px; color: #666;">
          <strong>Current Value:</strong> ${data.currentValue}
        </p>
      </div>
    </div>

    <p style="text-align: center;">
      <a href="${data.dashboardUrl}" style="display: inline-block; padding: 12px 30px; background-color: #4F46E5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
        View in Dashboard
      </a>
    </p>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #999; text-align: center;">
      <p>This is an automated alert from AdPilot AI.<br>You can manage your alert preferences in your dashboard settings.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Report ready email template
 */
export function renderReportEmail(data: ReportEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Report is Ready</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="font-size: 24px; font-weight: bold; color: #4F46E5;">🚀 AdPilot AI</div>
    </div>
    
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="font-size: 48px; margin-bottom: 10px;">📊</div>
      <h2 style="margin: 0; color: #111;">Your Report is Ready!</h2>
    </div>

    <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 30px;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
        <strong>Report Type:</strong> ${data.reportType.replace(/_/g, ' ').toUpperCase()}
      </p>
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
        <strong>Date Range:</strong> ${data.dateRange}
      </p>
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
        <strong>File Size:</strong> ${data.fileSize}
      </p>
      <p style="margin: 0; font-size: 14px; color: #666;">
        <strong>Expires:</strong> ${data.expiresAt}
      </p>
    </div>

    <p style="text-align: center;">
      <a href="${data.downloadUrl}" style="display: inline-block; padding: 12px 30px; background-color: #10B981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Download Report
      </a>
    </p>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #999; text-align: center;">
      <p>This report will be available for 30 days.<br>© ${new Date().getFullYear()} AdPilot AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Daily/Weekly digest email template
 */
export function renderDigestEmail(data: DigestEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.period} Performance Digest</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="font-size: 24px; font-weight: bold; color: #4F46E5;">🚀 AdPilot AI</div>
    </div>
    
    <h2 style="margin: 0 0 20px 0; color: #111; text-align: center;">
      ${data.period} Performance Digest
    </h2>
    
    <p style="text-align: center; color: #666; margin-bottom: 30px;">
      ${data.workspaceName}
    </p>

    <!-- Summary Cards -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 30px;">
      <div style="background-color: #EEF2FF; padding: 15px; border-radius: 6px; text-align: center;">
        <div style="font-size: 24px; font-weight: bold; color: #4F46E5;">${data.summary.totalSpend}</div>
        <div style="font-size: 12px; color: #666;">Total Spend</div>
      </div>
      <div style="background-color: #ECFDF5; padding: 15px; border-radius: 6px; text-align: center;">
        <div style="font-size: 24px; font-weight: bold; color: #10B981;">${data.summary.totalRevenue}</div>
        <div style="font-size: 12px; color: #666;">Total Revenue</div>
      </div>
      <div style="background-color: #FEF3C7; padding: 15px; border-radius: 6px; text-align: center;">
        <div style="font-size: 24px; font-weight: bold; color: #F59E0B;">${data.summary.avgRoas}</div>
        <div style="font-size: 12px; color: #666;">Avg ROAS</div>
      </div>
      <div style="background-color: #FEE2E2; padding: 15px; border-radius: 6px; text-align: center;">
        <div style="font-size: 24px; font-weight: bold; color: #DC2626;">${data.summary.activeAlerts}</div>
        <div style="font-size: 12px; color: #666;">Active Alerts</div>
      </div>
    </div>

    <!-- Top Campaigns -->
    <div style="margin-bottom: 30px;">
      <h3 style="margin: 0 0 15px 0; color: #111; font-size: 16px;">🏆 Top Performing Campaigns</h3>
      ${data.topCampaigns.map((campaign, i) => `
        <div style="background-color: #f9fafb; padding: 12px; border-radius: 6px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 600; color: #111; font-size: 14px;">${i + 1}. ${campaign.name}</div>
              <div style="font-size: 12px; color: #666;">Spend: ${campaign.spend}</div>
            </div>
            <div style="font-size: 18px; font-weight: bold; color: #10B981;">
              ${campaign.roas}
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Recommendations -->
    ${data.summary.newRecommendations > 0 ? `
      <div style="background-color: #EEF2FF; border-left: 4px solid #4F46E5; padding: 15px; margin-bottom: 30px; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #666;">
          <strong>💡 ${data.summary.newRecommendations} new AI recommendations</strong> are waiting for you
        </p>
      </div>
    ` : ''}

    <p style="text-align: center;">
      <a href="${data.dashboardUrl}" style="display: inline-block; padding: 12px 30px; background-color: #4F46E5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
        View Full Dashboard
      </a>
    </p>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #999; text-align: center;">
      <p>You can change your digest preferences in your dashboard settings.<br>© ${new Date().getFullYear()} AdPilot AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

export default {
  renderAlertEmail,
  renderReportEmail,
  renderDigestEmail,
}
