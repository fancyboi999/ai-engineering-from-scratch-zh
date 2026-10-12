# 导出可听、可纠正的转录

> fixture CLI 将原创朗读音频与提供参考文本配对，明确标注方法。真实识别用 --endpoint。检查播放后，编辑 transcript.json 行并用 --review-file 重渲染；报告必须匹配原始音频哈希。

**类型：** Build
**阶段：** 第 4 阶段，共 4 阶段
**预计时间：** 约 2 小时

## 实用边界

输出边界将片段时间渲染为 WebVTT。校验有限、有序、不重叠且文本非空的 cue。保存原 WAV 和 JSON 报告，再构建本地审核页，嵌入音频和跳至各片段的按钮。字幕描述片段边界，不是推断的逐词对齐。

```figure
pj-voice-note-transcriber-pipeline-4
```

## 推演示例

fixture CLI 将原创朗读音频与提供参考文本配对，明确标注方法。真实识别用 --endpoint。检查播放后，编辑 transcript.json 行并用 --review-file 重渲染；报告必须匹配原始音频哈希。

编码前写下返回字段和预期副作用次数。保留第二个应失败输入，让成功示例不能变成硬编码答案。

## 构建契约

在学习者工作区实现 `stamp, captions in captions.py; export_transcript and the CLI in pipeline.py`。保留导出名称，继续使用前面阶段，不重复它们的政策。

写出 audio.wav、captions.vtt、transcript.json 和 index.html。拒绝结束时间超过音频时长的 cue。HTML 中转义转录文本和方法标签。提供 transcript-file 是哈希绑定参考模式，不能与切分组合。参考或审核模式不调用 provider。

`export_transcript` 返回与 transcript.json 写入相同的对象：`schema_version=1`、提供的 `method`、原 WAV 字节的 `audio_sha256`、`duration_seconds` 和不变的 `rows`。每行含以秒为单位的 start 和 end 及 text；provider 行还可含片段哈希和尝试次数。导出时保留额外字段。时长为解码样本数除以实际采样率。把 WAV 嵌入为 base64 音频源，使本地打开 HTML 仍可播放。

## 提示

打开导出页面，播放实际音频并点击 cue。比较 JSON 行和 WebVTT 时间戳。在测试中把字幕改成类似 HTML 的字符串，确认按文本渲染。

## 验证你的实现

```bash
python3 scripts/project_test.py voice-note-transcriber-pipeline --init my-voice-note-transcriber-pipeline
python3 scripts/project_test.py voice-note-transcriber-pipeline --stage 4 --path my-voice-note-transcriber-pipeline --strict
```

初始化一次。累积测试导入工作区并保留之前源文件。参考方案运行验证教学实现，绝不会授予学习者证书。可选 SDK 检查需要项目 README 中的依赖和命令。

## 检查结果

裁剪音频后哪些字段需要更新？为什么可编辑参考转录是有用的集成测试，却不是语音识别基准？

完成的项目生成 audio.wav、captions.vtt、transcript.json，以及带嵌入播放和 cue 跳转按钮的 HTML 页。

```bash
cd projects/voice-note-transcriber-pipeline/solution
python3 pipeline.py --input fixtures/repair-note.wav --transcript-file fixtures/reference.json --out voice-output
```

用自己工作流程的小型输入替换 fixture。预期结果与观察证据一起保存，再另留一组案例用于评估。provider 请求测试证明序列化和控制流，不证明模型质量。

## 主要参考

[官方 API 文档](https://docs.python.org/3/library/wave.html)。实现、政策选择和示例均为原创。
