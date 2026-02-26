/** @format */

import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  startCompress: (folderPath: string, params?: { videoCrf: number; audioBitrate: string; imageQuality: number }) =>
    ipcRenderer.invoke('start-compress', folderPath, params ?? { videoCrf: 23, audioBitrate: '96k', imageQuality: 75 }),
  onProgress: (callback: (data: { current: number; total: number }) => void) =>
    ipcRenderer.on('progress', (_: any, data: { current: number; total: number }) => callback(data)),
  onFileComplete: (callback: (data: { fileName: string }) => void) =>
    ipcRenderer.on('file-complete', (_: any, data: { fileName: string }) => callback(data)),
  openFolder: (folderPath: string) => ipcRenderer.invoke('open-folder', folderPath)
})
