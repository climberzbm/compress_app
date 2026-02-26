# 媒体压缩工具 (CompressedApp)

基于 Electron 的媒体文件压缩桌面应用。

## 环境要求

- Node.js
- npm

## 安装

```bash
npm install
```

### FFmpeg（视频/音频压缩必需）

打包前需将 FFmpeg 放入 `resources` 目录：

- **Windows**：下载 [ffmpeg releases](https://github.com/BtbN/FFmpeg-Builds/releases)，解压后将 `ffmpeg.exe` 放到 `resources/` 下
- **macOS**：`brew install ffmpeg` 后，将 `/opt/homebrew/bin/ffmpeg` 复制到 `resources/ffmpeg`

## 开发

```bash
npm run dev
```

## 构建

```bash
npm run build
```

## 打包

- Windows: `npm run pack:win`
- macOS: `npm run pack:mac`
- 通用: `npm run pack`

打包产物输出到 `release` 目录。

## 技术栈

- Electron
- TypeScript
- Sharp（图像处理）

## 许可证

ISC
