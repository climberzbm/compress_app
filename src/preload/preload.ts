/** @format */

import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  startCompress: (folderPath: string) =>
    ipcRenderer.invoke('start-compress', folderPath),
  onProgress: (callback: (data: { current: number; total: number }) => void) =>
    ipcRenderer.on('progress', (_: any, data: { current: number; total: number }) => callback(data))
})
