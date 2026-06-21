/**
 * Setup Script - Validates environment and prepares for development
 */

import * as fs from 'fs'
import * as path from 'path'

interface CheckResult {
  name: string
  status: 'pass' | 'warn' | 'fail'
  message: string
}

const checks: CheckResult[] = []

function check(name: string, condition: boolean, message: string, severity: 'fail' | 'warn' = 'fail') {
  checks.push({
    name,
    status: condition ? 'pass' : severity,
    message: condition ? '✓ ' + message : (severity === 'fail' ? '✗ ' : '⚠ ') + message,
  })
}

console.log('🔍 Running setup validation...\n')

// 1. Check Node.js version
const nodeVersion = process.version
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0])
check(
  'Node.js Version',
  majorVersion >= 18,
  majorVersion >= 18 ? `Node.js ${nodeVersion} (OK)` : `Node.js ${nodeVersion} (Requires 18+)`
)

// 2. Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local')
const envExists = fs.existsSync(envPath)
check(
  'Environment File',
  envExists,
  envExists ? '.env.local found' : '.env.local not found. Copy .env.example to .env.local',
  'warn'
)

// 3. Check critical environment variables
if (envExists) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  const hasSupabaseUrl = envContent.includes('NEXT_PUBLIC_SUPABASE_URL=')
  const hasSupabaseKey = envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY=')
  
  check(
    'Supabase URL',
    hasSupabaseUrl && !envContent.includes('NEXT_PUBLIC_SUPABASE_URL=https://your-project'),
    hasSupabaseUrl ? 'Supabase URL configured' : 'Supabase URL missing'
  )
  
  check(
    'Supabase Key',
    hasSupabaseKey && !envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key'),
    hasSupabaseKey ? 'Supabase anon key configured' : 'Supabase anon key missing'
  )
}

// 4. Check if node_modules exists
const nodeModulesPath = path.join(process.cwd(), 'node_modules')
const nodeModulesExists = fs.existsSync(nodeModulesPath)
check(
  'Dependencies',
  nodeModulesExists,
  nodeModulesExists ? 'Dependencies installed' : 'Run: npm install'
)

// 5. Check if migrations directory exists
const migrationsPath = path.join(process.cwd(), 'supabase', 'migrations')
const migrationsExist = fs.existsSync(migrationsPath)
check(
  'Migrations',
  migrationsExist,
  migrationsExist ? 'Migration files found' : 'Migration directory missing',
  'warn'
)

// 6. Check Redis availability (optional)
const hasRedis = process.env.REDIS_HOST || process.env.UPSTASH_REDIS_REST_URL
check(
  'Redis (Optional)',
  true,
  hasRedis ? 'Redis configured' : 'Redis not configured (will use in-memory fallback)',
  'warn'
)

// Print results
console.log('📋 Setup Validation Results:\n')
checks.forEach(({ name, status, message }) => {
  const icon = status === 'pass' ? '✅' : status === 'warn' ? '⚠️' : '❌'
  console.log(`${icon} ${name}: ${message}`)
})

// Summary
console.log('\n' + '='.repeat(60))
const passed = checks.filter(c => c.status === 'pass').length
const warned = checks.filter(c => c.status === 'warn').length
const failed = checks.filter(c => c.status === 'fail').length

if (failed > 0) {
  console.log(`\n❌ Setup validation FAILED (${failed} critical issues)`)
  console.log('\n📝 Next steps:')
  checks
    .filter(c => c.status === 'fail')
    .forEach(c => console.log(`   - Fix: ${c.name}`))
  process.exit(1)
} else if (warned > 0) {
  console.log(`\n⚠️  Setup validation PASSED with warnings (${warned} warnings)`)
  console.log('\n💡 Optional improvements:')
  checks
    .filter(c => c.status === 'warn')
    .forEach(c => console.log(`   - ${c.name}: ${c.message}`))
} else {
  console.log(`\n✅ Setup validation PASSED (${passed}/${checks.length})`)
}

console.log('\n🚀 Ready to start development!')
console.log('   Run: npm run dev\n')
