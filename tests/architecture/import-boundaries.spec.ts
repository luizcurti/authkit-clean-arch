import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const REPO_ROOT = join(__dirname, '..', '..')
const DOMAIN_DIR = join(REPO_ROOT, 'src', 'domain')
const APPLICATION_DIR = join(REPO_ROOT, 'src', 'application')

const BANNED_PACKAGES = ['express', 'typeorm', 'axios', 'multer', 'winston', 'jsonwebtoken']
const BANNED_PACKAGE_PREFIXES = ['@aws-sdk/']
const BANNED_LAYER_PREFIXES = ['@/infra', '@/main']

const listTsFiles = (dir: string): string[] => {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry)
    if (statSync(fullPath).isDirectory()) return listTsFiles(fullPath)
    return fullPath.endsWith('.ts') ? [fullPath] : []
  })
}

const extractImportSpecifiers = (filePath: string): string[] => {
  const content = readFileSync(filePath, 'utf-8')
  const importRegex = /(?:from|import)\s+['"]([^'"]+)['"]/g
  const specifiers: string[] = []
  let match = importRegex.exec(content)
  while (match !== null) {
    specifiers.push(match[1])
    match = importRegex.exec(content)
  }
  return specifiers
}

const isBanned = (specifier: string): boolean => {
  if (BANNED_PACKAGES.includes(specifier)) return true
  if (BANNED_PACKAGE_PREFIXES.some(prefix => specifier.startsWith(prefix))) return true
  if (BANNED_LAYER_PREFIXES.some(prefix => specifier === prefix || specifier.startsWith(`${prefix}/`))) return true
  return false
}

const findViolations = (dir: string): string[] => {
  return listTsFiles(dir).flatMap((file) => {
    const relativePath = file.replace(`${REPO_ROOT}/`, '')
    return extractImportSpecifiers(file)
      .filter(isBanned)
      .map(specifier => `${relativePath} imports "${specifier}"`)
  })
}

describe('Architecture boundaries', () => {
  it('domain layer must stay framework/infra/main-agnostic', () => {
    expect(listTsFiles(DOMAIN_DIR).length).toBeGreaterThan(0)
    expect(findViolations(DOMAIN_DIR)).toEqual([])
  })

  it('application layer must stay framework/infra/main-agnostic', () => {
    expect(listTsFiles(APPLICATION_DIR).length).toBeGreaterThan(0)
    expect(findViolations(APPLICATION_DIR)).toEqual([])
  })
})
