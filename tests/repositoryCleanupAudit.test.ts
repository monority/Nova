/** Step 10CB - repository cleanup and architecture audit. */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '..')
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  readonly scripts: Readonly<Record<string, string>>
  readonly dependencies: Readonly<Record<string, string>>
  readonly devDependencies: Readonly<Record<string, string>>
}

const filesUnder = (directory: string): string[] => {
  const result: string[] = []
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) result.push(...filesUnder(path))
    else result.push(path)
  }
  return result
}

const sourceFiles = filesUnder(join(root, 'src')).filter((path) => path.endsWith('.ts'))

const importsIn = (path: string): string[] => {
  const source = readFileSync(path, 'utf8')
  return [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1] ?? '')
}

const resolveImport = (fromFile: string, specifier: string): string | null => {
  if (!specifier.startsWith('.')) return null
  const base = resolve(join(fromFile, '..'), specifier)
  const withoutJsExtension = base.endsWith('.js') ? base.slice(0, -3) : base
  for (const candidate of [base, `${base}.ts`, `${withoutJsExtension}.ts`, join(base, 'index.ts')]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  return null
}

const reachableFrom = (entry: string): Set<string> => {
  const seen = new Set<string>()
  const visit = (path: string): void => {
    const absolute = resolve(path)
    if (seen.has(absolute) || !existsSync(absolute)) return
    seen.add(absolute)
    for (const specifier of importsIn(absolute)) {
      const imported = resolveImport(absolute, specifier)
      if (imported !== null) visit(imported)
    }
  }
  visit(entry)
  return seen
}

describe('Step 10CB — repository cleanup and architecture audit', () => {
  it('keeps the runtime dependency set minimal and intentional', () => {
    expect(Object.keys(packageJson.dependencies)).toEqual(['three'])
    for (const dependency of Object.keys(packageJson.devDependencies)) {
      expect([
        '@eslint/js',
        '@types/node',
        '@types/three',
        'eslint',
        'playwright',
        'typescript',
        'typescript-eslint',
        'vite',
        'vitest',
      ]).toContain(dependency)
    }
  })

  it('keeps every E2E script target present', () => {
    for (const [name, command] of Object.entries(packageJson.scripts)) {
      if (!name.startsWith('test:e2e:')) continue
      const match = /^node (.+\.mjs)$/.exec(command)
      expect(match, `${name} must run one tracked E2E module`).not.toBeNull()
      if (match?.[1] !== undefined) expect(existsSync(join(root, match[1]))).toBe(true)
    }
  })

  it('keeps domain and simulation independent from app and rendering', () => {
    for (const file of sourceFiles.filter((path) => /[\\/]src[\\/](domain|application[\\/]queries[\\/]resources)/.test(path))) {
      for (const specifier of importsIn(file)) {
        expect(specifier).not.toMatch(/^(\.\.\/)+app\//)
        expect(specifier).not.toMatch(/^(\.\.\/)+renderer\//)
        expect(specifier).not.toBe('react')
        expect(specifier).not.toBe('three')
      }
    }
  })

  it('keeps all source modules reachable from public or application entries', () => {
    const reachable = new Set([
      ...reachableFrom(join(root, 'src/index.ts')),
      ...reachableFrom(join(root, 'src/app/main.ts')),
    ])
    const orphans = sourceFiles
      .map((file) => resolve(file))
      .filter((file) => !reachable.has(file))
      .map((file) => relative(root, file).replace(/\\/g, '/'))
    expect(orphans).toEqual([])
  })

})
