# 处理前解码音频时钟

> 整数样本 0、16384 和 -16384 变成 0、0.5 和 -0.5。16000 Hz 下样本索引 800 表示 0.05 秒。同一索引若按 8000 Hz 解释，即使不改一个字节，时间戳也会翻倍。

**类型：** Build
**阶段：** 第 1 阶段，共 4 阶段
**预计时间：** 约 2 小时

## 实用边界

解释字节前读取 WAV 头。核心接受未压缩单声道有符号 16-bit PCM，样本除以 32768 归一化。保留实际采样率：后续每个时间戳都是样本索引除以该速率。不支持的立体声或压缩输入必须明确失败。

```figure
pj-voice-note-transcriber-pipeline-1
```

## 推演示例

整数样本 0、16384 和 -16384 变成 0、0.5 和 -0.5。16000 Hz 下样本索引 800 表示 0.05 秒。同一索引若按 8000 Hz 解释，即使不改一个字节，时间戳也会翻倍。

编码前写下返回字段和预期副作用次数。保留第二个应失败输入，让成功示例不能变成硬编码答案。

## 构建契约

在学习者工作区实现 `decode_wav(data), encode_wav(samples, rate=16000) in pcm.py`。保留导出名称，继续使用前面阶段，不重复它们的政策。

编写的 repair-note.wav 是一段 5.685 秒朗读句子，由操作系统语音在本地合成。配套 reference.json 含作者提供文本和原 WAV 哈希。这是语音 fixture，不是项目识别了语音的证明。运行已提交 fixture 不需要生成工具。

## 提示

解包前检查声道、样本宽度和压缩类型。验证字节数等于声明帧数乘二。测试负样本和最大正有符号值处的截断。

## 验证你的实现

```bash
python3 scripts/project_test.py voice-note-transcriber-pipeline --init my-voice-note-transcriber-pipeline
python3 scripts/project_test.py voice-note-transcriber-pipeline --stage 1 --path my-voice-note-transcriber-pipeline --strict
```

初始化一次。累积测试导入工作区并保留之前源文件。参考方案运行验证教学实现，绝不会授予学习者证书。可选 SDK 检查需要项目 README 中的依赖和命令。

## 检查结果

为什么样本值有效，猜测采样率仍可能产生错误字幕？处理手机语音笔记前应进行什么转换？

完成的项目生成 audio.wav、captions.vtt、transcript.json，以及带嵌入播放和 cue 跳转按钮的 HTML 页。

```bash
cd projects/voice-note-transcriber-pipeline/solution
python3 pipeline.py --input fixtures/repair-note.wav --transcript-file fixtures/reference.json --out voice-output
```

用自己工作流程的小型输入替换 fixture。预期结果与观察证据一起保存，再另留一组案例用于评估。provider 请求测试证明序列化和控制流，不证明模型质量。

## 主要参考

[官方 API 文档](https://docs.python.org/3/library/wave.html)。实现、政策选择和示例均为原创。
