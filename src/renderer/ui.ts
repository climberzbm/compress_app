const selectBtn = document.getElementById('selectBtn')! as HTMLButtonElement
const startBtn = document.getElementById('startBtn')! as HTMLButtonElement
const folderEl = document.getElementById('folder')!
const progressBar = document.getElementById('progress') as HTMLProgressElement
const statusEl = document.getElementById('status')!

let selectedPath = ''

function setStatus(text: string, isError = false) {
  statusEl.textContent = text
  statusEl.style.color = isError ? '#c53030' : ''
}

selectBtn.onclick = async () => {
  try {
    setStatus('正在选择文件夹…')
    const path = await (window as any).api.selectFolder()
    selectedPath = path || ''
    folderEl.textContent = selectedPath ? `已选: ${selectedPath}` : '未选择'
    setStatus(selectedPath ? '请点击「开始压缩」' : '')
  } catch (e: any) {
    setStatus(e?.message || '选择失败', true)
  }
}

startBtn.onclick = async () => {
  if (!selectedPath) {
    setStatus('请先选择文件夹', true)
    return
  }
  try {
    setStatus('压缩中…')
    progressBar.value = 0
    progressBar.max = 100
    startBtn.disabled = true
    const result = await (window as any).api.startCompress(selectedPath)
    if (result?.ok) setStatus('压缩完成')
    else setStatus(result?.error || '压缩失败', true)
  } catch (e: any) {
    setStatus(e?.message || '压缩失败', true)
  } finally {
    startBtn.disabled = false
  }
}

;(window as any).api.onProgress(({ current, total }: { current: number; total: number }) => {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0
  progressBar.value = percent
  progressBar.max = 100
  statusEl.textContent = total > 0 ? `${current} / ${total}` : '准备中…'
  statusEl.style.color = ''
})