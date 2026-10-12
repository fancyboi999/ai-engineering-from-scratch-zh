# 将真实 WAV 字节送过识别器边界

> provider 超时后成功，记录 attempts=2。每个输出行保留 start、end、text 和精确编码片段的 SHA256。第二片段不能与前一片段重叠，小数样本索引无效。

**类型：** Build
**阶段：** 第 3 阶段，共 4 阶段
**预计时间：** 约 2 小时

## 实用边界

调用 provider 前将每个选定跨度编码为完整 WAV。真实 HTTP 适配器向明确配置的 audio/transcriptions 端点发送含 model 和 file 的 multipart 表单。解析返回文本，拒绝空或畸形结果。端点选择就是显式上传边界。

```figure
pj-voice-note-transcriber-pipeline-3
```

## 推演示例

provider 超时后成功，记录 attempts=2。每个输出行保留 start、end、text 和精确编码片段的 SHA256。第二片段不能与前一片段重叠，小数样本索引无效。

编码前写下返回字段和预期副作用次数。保留第二个应失败输入，让成功示例不能变成硬编码答案。

## 构建契约

在学习者工作区实现 `transcribe(...) in transcribe.py; http_recognizer(endpoint, model, api_key, timeout) in provider.py`。保留导出名称，继续使用前面阶段，不重复它们的政策。

允许零到五次重试，只重试 TimeoutError，并计数尝试。适配器要求远程 HTTPS，HTTP 仅允许 localhost 或显式回环 IPv4/IPv6。校验主机名和端口，拒绝 URL 凭据、片段和空白。使用专用 urllib opener，其 HTTPRedirectHandler.redirect_request 返回 None，拒绝全部重定向，使凭据与音频始终绑定选定端点。还检查 WAV 签名、20 MB 上传上限、1 MB 响应上限和最多 120 秒超时。TRANSCRIPTION_API_KEY 提供可选认证。受控传输测试验证真实 multipart 序列化，不测量识别准确率。

## 提示

测试中捕获发出请求，确认包含 WAV 字节而非文件名字符串。让测试端点返回一条不同的留出句子。源哈希与文本一起保存，使经审核转录能关联实际音频。

## 验证你的实现

```bash
python3 scripts/project_test.py voice-note-transcriber-pipeline --init my-voice-note-transcriber-pipeline
python3 scripts/project_test.py voice-note-transcriber-pipeline --stage 3 --path my-voice-note-transcriber-pipeline --strict
```

初始化一次。累积测试导入工作区并保留之前源文件。参考方案运行验证教学实现，绝不会授予学习者证书。可选 SDK 检查需要项目 README 中的依赖和命令。

## 检查结果

为什么认证错误应立即失败，而非消耗超时重试预算？音频哈希证明什么，不证明什么？

完成的项目生成 audio.wav、captions.vtt、transcript.json，以及带嵌入播放和 cue 跳转按钮的 HTML 页。

```bash
cd projects/voice-note-transcriber-pipeline/solution
python3 pipeline.py --input fixtures/repair-note.wav --transcript-file fixtures/reference.json --out voice-output
```

用自己工作流程的小型输入替换 fixture。预期结果与观察证据一起保存，再另留一组案例用于评估。provider 请求测试证明序列化和控制流，不证明模型质量。

## 主要参考

[官方 API 文档](https://docs.python.org/3/library/wave.html)。实现、政策选择和示例均为原创。
