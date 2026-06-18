#!/usr/bin/env node
// Dev tool (plain Node, runs OUTSIDE the Workflow runtime). Lints a generated
// tournament workflow script against the runtime's hard constraints.
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const file = process.argv[2]
if (!file) { console.error('usage: lint.mjs <script.js>'); process.exit(2) }
const src = readFileSync(file, 'utf8')
const errors = [], warns = []

try { execFileSync('node', ['--check', file], { stdio: 'pipe' }) }
catch (e) { errors.push('node --check failed: ' + (e.stderr?.toString() || e.message)) }

const forbid = [
  [/\bDate\.now\s*\(/, 'Date.now() unavailable in runtime'],
  [/\bMath\.random\s*\(/, 'Math.random() unavailable in runtime'],
  [/\bnew\s+Date\s*\(\s*\)/, 'argless new Date() unavailable in runtime'],
  [/^\s*import\s+/m, 'import statements not allowed in workflow scripts'],
  [/\brequire\s*\(/, 'require() not allowed in workflow scripts'],
  [/\bnode:(fs|child_process|path|os)\b/, 'Node APIs not available in workflow scripts'],
]
for (const [re, msg] of forbid) if (re.test(src)) errors.push(msg)

if (!/export\s+const\s+meta\s*=\s*\{/.test(src)) errors.push('missing literal `export const meta = {`')

const pb = src.match(/phases\s*:\s*\[([\s\S]*?)\]/)
const metaPhases = pb ? [...pb[1].matchAll(/title\s*:\s*['"`]([^'"`]+)['"`]/g)].map(m => m[1]) : []
const called = [...src.matchAll(/\bphase\(\s*['"`]([^'"`]+)['"`]\s*\)/g)].map(m => m[1])
for (const p of new Set(called)) if (!metaPhases.includes(p)) warns.push(`phase("${p}") has no matching meta.phases entry`)

if (/await\s+parallel\(/.test(src) && !/\.filter\(Boolean\)/.test(src))
  warns.push('parallel() used but no .filter(Boolean) — guard against null agent results')

for (const w of warns) console.error('WARN: ' + w)
for (const e of errors) console.error('ERROR: ' + e)
process.exit(errors.length ? 1 : 0)
