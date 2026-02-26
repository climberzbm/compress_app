const STORAGE_KEY = 'compressParams'

interface CompressParams {
  videoCrf: number
  audioBitrate: string
  imageQuality: number
}

const DEFAULT_PARAMS: CompressParams = {
  videoCrf: 23,
  audioBitrate: '96k',
  imageQuality: 75
}

const AUDIO_BITRATE_OPTIONS = ['64k', '96k', '128k', '192k', '320k']

const selectBtn = document.getElementById('selectBtn')! as HTMLButtonElement
const startBtn = document.getElementById('startBtn')! as HTMLButtonElement
const folderEl = document.getElementById('folder')!
const progressBar = document.getElementById('progress') as HTMLProgressElement
const statusEl = document.getElementById('status')!
const completedListEl = document.getElementById('completedList')! as HTMLUListElement
const openOutputBtn = document.getElementById('openOutputBtn')! as HTMLButtonElement
const videoCrfEl = document.getElementById('videoCrf')! as HTMLInputElement
const videoCrfValueEl = document.getElementById('videoCrfValue')!
const audioBitrateEl = document.getElementById('audioBitrate')! as HTMLSelectElement
const imageQualityEl = document.getElementById('imageQuality')! as HTMLInputElement
const imageQualityValueEl = document.getElementById('imageQualityValue')!

let selectedPath = ''
let lastOutputDir = ''

function setStatus(text: string, isError = false) {
  statusEl.textContent = text
  statusEl.style.color = isError ? '#c53030' : ''
}

function loadParams(): CompressParams {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PARAMS }
    const parsed = JSON.parse(raw) as Partial<CompressParams>
    return {
      videoCrf: clamp(parsed.videoCrf ?? DEFAULT_PARAMS.videoCrf, 18, 32),
      audioBitrate: AUDIO_BITRATE_OPTIONS.includes(parsed.audioBitrate ?? '')
        ? parsed.audioBitrate!
        : DEFAULT_PARAMS.audioBitrate,
      imageQuality: clamp(parsed.imageQuality ?? DEFAULT_PARAMS.imageQuality, 50, 95)
    }
  } catch {
    return { ...DEFAULT_PARAMS }
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

function saveParams(params: CompressParams) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(params))
  } catch {
    /* ignore */
  }
}

function getParamsFromUI(): CompressParams {
  return {
    videoCrf: clamp(parseInt(videoCrfEl.value, 10) || DEFAULT_PARAMS.videoCrf, 18, 32),
    audioBitrate: AUDIO_BITRATE_OPTIONS.includes(audioBitrateEl.value)
      ? audioBitrateEl.value
      : DEFAULT_PARAMS.audioBitrate,
    imageQuality: clamp(parseInt(imageQualityEl.value, 10) || DEFAULT_PARAMS.imageQuality, 50, 95)
  }
}

function applyParamsToUI(params: CompressParams) {
  videoCrfEl.value = String(params.videoCrf)
  videoCrfValueEl.textContent = String(params.videoCrf)
  audioBitrateEl.value = params.audioBitrate
  imageQualityEl.value = String(params.imageQuality)
  imageQualityValueEl.textContent = String(params.imageQuality)
}

function onParamsChange() {
  const params = getParamsFromUI()
  saveParams(params)
  applyParamsToUI(params)
}

function initParams() {
  applyParamsToUI(loadParams())
  videoCrfEl.addEventListener('input', () => {
    videoCrfValueEl.textContent = videoCrfEl.value
    onParamsChange()
  })
  videoCrfEl.addEventListener('change', onParamsChange)
  audioBitrateEl.addEventListener('change', onParamsChange)
  imageQualityEl.addEventListener('input', () => {
    imageQualityValueEl.textContent = imageQualityEl.value
    onParamsChange()
  })
  imageQualityEl.addEventListener('change', onParamsChange)
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
    completedListEl.innerHTML = ''
    openOutputBtn.disabled = true
    startBtn.disabled = true
    const params = getParamsFromUI()
    const result = await (window as any).api.startCompress(selectedPath, params)
    if (result?.ok) {
      setStatus('压缩完成')
      lastOutputDir = result.outputDir ?? ''
      openOutputBtn.disabled = !lastOutputDir
    } else {
      setStatus(result?.error || '压缩失败', true)
    }
  } catch (e: any) {
    setStatus(e?.message || '压缩失败', true)
  } finally {
    startBtn.disabled = false
  }
}

openOutputBtn.onclick = () => {
  if (lastOutputDir) (window as any).api.openFolder(lastOutputDir)
}

;(window as any).api.onFileComplete(({ fileName }: { fileName: string }) => {
  const li = document.createElement('li')
  li.textContent = fileName
  completedListEl.appendChild(li)
})

;(window as any).api.onProgress(({ current, total }: { current: number; total: number }) => {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0
  progressBar.value = percent
  progressBar.max = 100
  statusEl.textContent = total > 0 ? `${current} / ${total}` : '准备中…'
  statusEl.style.color = ''
})

openOutputBtn.disabled = true
initParams()
