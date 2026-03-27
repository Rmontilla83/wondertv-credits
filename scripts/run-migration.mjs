/**
 * Wonder TV - Database Migration Script
 *
 * Uses Supabase Management API to execute SQL.
 * Requires: npx supabase login (one-time), then npx supabase link
 *
 * Usage: node scripts/run-migration.mjs
 * Or with DB URL: node scripts/run-migration.mjs --db-url "postgresql://..."
 */
import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationPath = resolve(__dirname, '..', 'supabase', 'migration.sql')
const migration = readFileSync(migrationPath, 'utf-8')

// Split SQL into individual statements, respecting $$ blocks
function splitStatements(sql) {
  const statements = []
  let current = ''
  let inDollarBlock = false

  for (const line of sql.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('--') && !inDollarBlock) continue

    if (trimmed.includes('$$')) {
      const count = (trimmed.match(/\$\$/g) || []).length
      if (count % 2 === 1) inDollarBlock = !inDollarBlock
    }

    current += line + '\n'

    if (trimmed.endsWith(';') && !inDollarBlock) {
      const stmt = current.trim()
      if (stmt && stmt !== ';') statements.push(stmt)
      current = ''
    }
  }
  if (current.trim()) statements.push(current.trim())
  return statements
}

const dbUrl = process.argv.find(a => a.startsWith('--db-url='))?.split('=').slice(1).join('=')
  || process.argv[process.argv.indexOf('--db-url') + 1]

const statements = splitStatements(migration)
console.log(`Found ${statements.length} SQL statements to execute\n`)

let success = 0
let failed = 0

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i]
  const preview = stmt.substring(0, 90).replace(/\n/g, ' ').trim()

  try {
    const args = dbUrl
      ? `--db-url "${dbUrl}"`
      : '--linked'

    // Escape the SQL for shell
    const escaped = stmt.replace(/'/g, "'\\''")

    execSync(
      `npx supabase db query '${escaped}' ${args}`,
      {
        cwd: resolve(__dirname, '..'),
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30000,
      }
    )
    console.log(`✓ [${i + 1}/${statements.length}] ${preview}`)
    success++
  } catch (err) {
    const stderr = err.stderr?.toString() || err.message
    console.error(`✗ [${i + 1}/${statements.length}] ${preview}`)
    console.error(`  Error: ${stderr.split('\n')[0]}\n`)
    failed++
  }
}

console.log(`\nResults: ${success} succeeded, ${failed} failed out of ${statements.length}`)
