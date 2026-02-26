/** @format */

import { execFile } from 'child_process'
import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'

let win: BrowserWindow

function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js')
    }
  })

  win.loadFile(path.join(__dirname, '../renderer/index.html'))

  if (!app.isPackaged) {
    import('chokidar').then(({ default: chokidar }) => {
      chokidar.watch(path.join(__dirname, '../renderer')).on('change', () => {
        if (win && !win.isDestroyed()) win.reload()
      })
    })
  }
}

app.whenReady().then(createWindow)

const ffmpegName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'

function getFFmpegPath() {
  if (app.isPackaged) {
    // ✅ 打包后 ffmpeg 就在 resources 根目录
    return path.join(process.resourcesPath, ffmpegName)
  }

  // ✅ 开发环境
  const localPath = path.join(process.cwd(), 'resources', ffmpegName)

  if (fs.existsSync(localPath)) return localPath

  // ✅ fallback：使用系统 ffmpeg（mac 已安装）
  return 'ffmpeg'
}

function getFileType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase()

  if (['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm'].includes(ext)) {
    return 'video'
  }
  if (['.mp3', '.wav', '.aac', '.m4a', '.ogg', '.flac', '.wma'].includes(ext)) {
    return 'audio'
  }
  if (
    ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'].includes(ext)
  ) {
    return 'image'
  }
  return null
}

function runFFmpeg(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    execFile(getFFmpegPath(), args, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

ipcMain.handle('select-folder', async () => {
  const res = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  return res.filePaths[0]
})

ipcMain.handle('start-compress', async (event, folderPath: string) => {
  try {
    const files = fs.readdirSync(folderPath)
    const outputDir = path.join(path.dirname(folderPath), path.basename(folderPath) + '_压缩后')

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir)

    let processed = 0
    const list = files.filter((f) => {
      const fullPath = path.join(folderPath, f)
      return fs.statSync(fullPath).isFile() && getFileType(f)
    })
    const total = list.length

    event.sender.send('progress', { current: 0, total })

    for (const file of files) {
      const fullPath = path.join(folderPath, file)
      if (!fs.statSync(fullPath).isFile()) continue

      const type = getFileType(file)
      if (!type) continue

      const outputPath = path.join(outputDir, file)

      if (type === 'video') {
        await runFFmpeg([
          '-y',
          '-i',
          fullPath,
          '-vcodec',
          'libx264',
          '-crf',
          '23',
          outputPath
        ])
      }

      if (type === 'audio') {
        const ext = path.extname(file).toLowerCase()
        const isMp3 = ext === '.mp3'
        if (isMp3) {
          await runFFmpeg([
            '-i', fullPath,
            '-c:a', 'libmp3lame',
            '-b:a', '96k',
            '-y',
            outputPath
          ])
        } else {
          await runFFmpeg([
            '-i', fullPath,
            '-c:a', 'aac',
            '-b:a', '96k',
            '-y',
            outputPath
          ])
        }
      }

      if (type === 'image') {
        await sharp(fullPath).jpeg({ quality: 75 }).toFile(outputPath)
      }

      processed++
      event.sender.send('progress', { current: processed, total })
    }

    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) }
  }
})
