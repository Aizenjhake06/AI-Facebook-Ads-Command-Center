/**
 * Deployment Validation Script
 * Checks if all components are ready for production deployment
 */

import * as fs from 'fs'
import * as path from 'path'

interface ValidationResult {
  category: string
  checks: Array<{
    name: string
    status: 'pass' | 'fail' | 'warning'
    message: string
  }>
}

const results: ValidationResult[] = []

/**
 * Check environment variables
 */
function checkEnvironmentVariables(): ValidationResult {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'REDIS_HOST',
    'REDIS_PORT',
    'FACEBOOK_APP_ID',
    'FACEBOOK_APP_SECRET',
  ]

  const optional = [
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',
    'SENTRY_DSN',
    'DATADOG_API_KEY',
  ]

  const checks = []

  for (const key of required) {
    if (process.env[key]) {
      checks.push({
        name: `${key}`,
        status: 'pass' as const,
        message: 'Set',
      })
    } else {
      checks.push({
        name: `${key}`,
        status: 'fail' as const,
        message: 'Missing - Required for production',
      })
    }
  }

  for (const key of optional) {
    if (process.env[key]) {
      checks.push({
        name: `${key}`,
        status: 'pass' as const,
        message: 'Set',
      })
    } else {
      checks.push({
        name: `${key}`,
        status: 'warning' as const,
        message: 'Not set - Optional but recommended',
      })
    }
  }

  return {
    category: 'Environment Variables',
    checks,
  }
}

/**
 * Check required files
 */
function checkRequiredFiles(): ValidationResult {
  const requiredFiles = [
    'package.json',
    'next.config.ts',
    'tsconfig.json',
    '.env.example',
    'supabase/migrations/00_complete_schema.sql',
    'supabase/migrations/01_add_2fa_support.sql',
    'src/lib/supabase/server.ts',
    'src/lib/jobs/queue.ts',
    'src/lib/jobs/sync-worker.ts',
    'src/lib/jobs/alert-worker.ts',
    'src/lib/jobs/report-worker.ts',
    'src/lib/jobs/notification-worker.ts',
    'src/lib/email/mailer.ts',
    'src/lib/cache.ts',
    'src/lib/auth/two-factor.ts',
  ]

  const checks = requiredFiles.map((file) => {
    const fullPath = path.join(process.cwd(), file)
    const exists = fs.existsSync(fullPath)
    return {
      name: file,
      status: exists ? ('pass' as const) : ('fail' as const),
      message: exists ? 'Found' : 'Missing',
    }
  })

  return {
    category: 'Required Files',
    checks,
  }
}

/**
 * Check documentation
 */
function checkDocumentation(): ValidationResult {
  const docs = [
    'README.md',
    'QUICK_START.md',
    'API_DOCUMENTATION.md',
    'PRODUCTION_SETUP.md',
    'PRODUCTION_READINESS_REPORT.md',
    'FINAL_IMPLEMENTATION_SUMMARY.md',
  ]

  const checks = docs.map((doc) => {
    const fullPath = path.join(process.cwd(), doc)
    const exists = fs.existsSync(fullPath)
    return {
      name: doc,
      status: exists ? ('pass' as const) : ('warning' as const),
      message: exists ? 'Found' : 'Missing',
    }
  })

  return {
    category: 'Documentation',
    checks,
  }
}

/**
 * Check package.json scripts
 */
function checkScripts(): ValidationResult {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
  )

  const requiredScripts = [
    'dev',
    'build',
    'start',
    'test',
    'worker:sync',
    'worker:alerts',
    'worker:reports',
    'worker:notifications',
  ]

  const checks = requiredScripts.map((script) => {
    const exists = packageJson.scripts && packageJson.scripts[script]
    return {
      name: script,
      status: exists ? ('pass' as const) : ('fail' as const),
      message: exists ? 'Defined' : 'Missing',
    }
  })

  return {
    category: 'NPM Scripts',
    checks,
  }
}

/**
 * Check dependencies
 */
function checkDependencies(): ValidationResult {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
  )

  const requiredDeps = [
    'next',
    'react',
    '@supabase/supabase-js',
    'bull',
    'ioredis',
    'nodemailer',
    'exceljs',
    'pdfkit',
    'otplib',
    'qrcode',
  ]

  const checks = requiredDeps.map((dep) => {
    const exists =
      (packageJson.dependencies && packageJson.dependencies[dep]) ||
      (packageJson.devDependencies && packageJson.devDependencies[dep])
    return {
      name: dep,
      status: exists ? ('pass' as const) : ('fail' as const),
      message: exists ? 'Installed' : 'Missing',
    }
  })

  return {
    category: 'Dependencies',
    checks,
  }
}

/**
 * Check Node.js version
 */
function checkNodeVersion(): ValidationResult {
  const version = process.version
  const major = parseInt(version.split('.')[0].substring(1))

  return {
    category: 'Runtime',
    checks: [
      {
        name: 'Node.js version',
        status: major >= 20 ? 'pass' : 'fail',
        message: `${version} (requires 20+)`,
      },
    ],
  }
}

/**
 * Print results
 */
function printResults(results: ValidationResult[]) {
  console.log('\n' + '='.repeat(70))
  console.log('🔍 DEPLOYMENT VALIDATION REPORT')
  console.log('='.repeat(70) + '\n')

  let totalChecks = 0
  let passedChecks = 0
  let failedChecks = 0
  let warnings = 0

  for (const result of results) {
    console.log(`\n📦 ${result.category}`)
    console.log('-'.repeat(70))

    for (const check of result.checks) {
      totalChecks++
      const icon =
        check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️'
      
      if (check.status === 'pass') passedChecks++
      if (check.status === 'fail') failedChecks++
      if (check.status === 'warning') warnings++

      console.log(`${icon} ${check.name.padEnd(40)} ${check.message}`)
    }
  }

  console.log('\n' + '='.repeat(70))
  console.log('📊 SUMMARY')
  console.log('='.repeat(70))
  console.log(`Total Checks:    ${totalChecks}`)
  console.log(`✅ Passed:       ${passedChecks}`)
  console.log(`❌ Failed:       ${failedChecks}`)
  console.log(`⚠️  Warnings:     ${warnings}`)

  const percentage = Math.round((passedChecks / totalChecks) * 100)
  console.log(`\n🎯 Readiness:    ${percentage}%`)

  if (failedChecks === 0) {
    console.log('\n🎉 STATUS: READY FOR DEPLOYMENT')
  } else if (failedChecks <= 3) {
    console.log('\n⚠️  STATUS: NEEDS ATTENTION (Minor issues)')
  } else {
    console.log('\n❌ STATUS: NOT READY (Critical issues)')
  }

  console.log('='.repeat(70) + '\n')

  return failedChecks === 0
}

/**
 * Main validation
 */
async function main() {
  console.log('Starting deployment validation...\n')

  results.push(checkNodeVersion())
  results.push(checkEnvironmentVariables())
  results.push(checkRequiredFiles())
  results.push(checkDependencies())
  results.push(checkScripts())
  results.push(checkDocumentation())

  const isReady = printResults(results)

  if (isReady) {
    console.log('✅ All checks passed! System is ready for deployment.\n')
    process.exit(0)
  } else {
    console.log('❌ Some checks failed. Please fix the issues before deploying.\n')
    process.exit(1)
  }
}

// Run validation
main().catch((error) => {
  console.error('Validation error:', error)
  process.exit(1)
})
