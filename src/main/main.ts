/** @format */

import { execFile } from 'child_process'
import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
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
    // 打包后：extraResources "to":"." 将 ffmpeg.exe 放在 resources 根目录
    return path.join(process.resourcesPath, ffmpegName)
  }

  // 开发环境
  const localPath = path.join(process.cwd(), 'resources', ffmpegName)
  if (fs.existsSync(localPath)) return localPath

  // fallback：使用系统 PATH 中的 ffmpeg
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

interface CompressParams {
  videoCrf?: number
  audioBitrate?: string
  imageQuality?: number
}

ipcMain.handle('start-compress', async (event, folderPath: string, params?: CompressParams) => {
  try {
    const p = params ?? {}
    const videoCrf = Math.min(Math.max(p.videoCrf ?? 23, 18), 32)
    const audioBitrate = p.audioBitrate ?? '96k'
    const imageQuality = Math.min(Math.max(p.imageQuality ?? 75, 50), 95)

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
          String(videoCrf),
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
            '-b:a', audioBitrate,
            '-y',
            outputPath
          ])
        } else {
          await runFFmpeg([
            '-i', fullPath,
            '-c:a', 'aac',
            '-b:a', audioBitrate,
            '-y',
            outputPath
          ])
        }
      }

      if (type === 'image') {
        await sharp(fullPath).jpeg({ quality: imageQuality }).toFile(outputPath)
      }

      processed++
      event.sender.send('progress', { current: processed, total })
      event.sender.send('file-complete', { fileName: file })
    }

    return { ok: true, outputDir }
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) }
  }
})

ipcMain.handle('open-folder', async (_event, folderPath: string) => {
  await shell.openPath(folderPath)
})
