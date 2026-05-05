import { copyFileSync, existsSync } from 'fs'
import { join } from 'path'

const root = process.cwd()
const dist = join(root, 'dist')

const files = [
  'lista.html',
  'convite.html',
  'tarefa.html',
  'sw.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'icon.svg',
]

for (const file of files) {
  const src = join(root, file)
  const dest = join(dist, file)
  if (existsSync(src)) {
    copyFileSync(src, dest)
    console.log(`Copied: ${file}`)
  } else {
    console.warn(`Not found (skipped): ${file}`)
  }
}

console.log('Static files copy done.')
