const fs = require('fs')
const path = require('path')
const dir = path.join(__dirname, '../dist/renderer')
fs.mkdirSync(dir, { recursive: true })
fs.copyFileSync(
  path.join(__dirname, '../src/renderer/index.html'),
  path.join(dir, 'index.html')
)
