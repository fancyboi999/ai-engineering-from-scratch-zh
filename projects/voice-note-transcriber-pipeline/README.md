# 语音笔记转录流水线

将选定 WAV 转成转录文本、WebVTT 字幕和音频审核页。你将构建 PCM 解码、声学活动检测、真实 HTTP 识别适配器，以及带音频哈希的可移植导出。

Python 3.10 或更新版本。必需核心使用标准库。先学习 bytes 和上下文管理器，再学习采样率、声道和注入的 provider 可调用对象。

```bash
python3 scripts/project_test.py voice-note-transcriber-pipeline --init my-voice-pipeline
python3 scripts/project_test.py voice-note-transcriber-pipeline --stage 1 --path my-voice-pipeline --strict
python3 scripts/project_test.py voice-note-transcriber-pipeline --all --solution --strict
cd projects/voice-note-transcriber-pipeline/solution
python3 pipeline.py --input fixtures/repair-note.wav --transcript-file fixtures/reference.json --out voice-output
```

打开 voice-output/index.html 播放嵌入音频并跳转到 cue。目录还含 audio.wav、captions.vtt 和 transcript.json。将 VTT 放在页面旁边，供下载链接使用。

原创维修笔记由操作系统通用语音在本地合成。配套转录是作者提供的文本，绑定 WAV 的 SHA256。离线演示用语音 fixture 检查流水线，不执行也不宣称语音识别。

## 转录自己的音频

使用显式兼容 OpenAI 的 audio/transcriptions 端点，接受 multipart 的 file 和 model 字段：

```bash
python3 pipeline.py --input YOUR_NOTE.wav --endpoint http://127.0.0.1:8080/v1/audio/transcriptions --model YOUR_MODEL --out voice-output
```

仅在 endpoint 模式上传选定音频。端点要求认证时由 TRANSCRIPTION_API_KEY 提供。远程识别器要求 HTTPS；HTTP 仅接受 localhost 和显式回环 IP 地址。拒绝 URL 凭据和重定向。适配器发送实际 WAV 字节，检查响应文本，限制请求时间和响应大小，并传播非超时失败。测试用受控响应检查 multipart 请求，不测量在线识别器准确率。

核心接受单声道有符号 16-bit PCM WAV，CLI 上限 20 MB。如果已使用 FFmpeg，运行前明确转换手机录音：

```bash
ffmpeg -i YOUR_NOTE.m4a -ac 1 -ar 16000 -c:a pcm_s16le YOUR_NOTE.wav
```

FFmpeg 是可选工具，本项目不会安装。默认识别整个片段。--segment 主动启用基于 RMS 的活动切分，可能漏掉轻声话语或包含响亮背景噪声。这些时间戳描述选定片段，不是逐词对齐。

## 审核与纠正

编辑导出 transcript.json 的文本字段，保持音频哈希不变，再渲染，无需联系识别器：

```bash
python3 pipeline.py --input YOUR_NOTE.wav --review-file EDITED_TRANSCRIPT.json --out corrected-output
```

有限且有序的 cue 必须在音频时长内。不支持编码、重叠跨度、空文本和音频哈希不匹配都会明确失败。

1. [解码音频时钟](stages/01-pcm/docs/zh.md)
2. [测量声学活动](stages/02-activity/docs/zh.md)
3. [将 WAV 发送给识别器](stages/03-transcribe/docs/zh.md)
4. [导出并审核字幕](stages/04-captions/docs/zh.md)

[Python WAV API](https://docs.python.org/3/library/wave.html)和 [WebVTT 规范](https://www.w3.org/TR/webvtt1/)。实现、朗读句子和测试均为原创。
