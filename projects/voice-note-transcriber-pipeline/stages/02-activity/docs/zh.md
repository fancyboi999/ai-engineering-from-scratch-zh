# 测量活动，不宣称语音检测

> 1000 Hz 下，40 个振幅 0.5 的样本、20 个静音样本和 40 个活动样本，在 gap_ms 为 40 时合并为 [0,100]。合并跨度为 100 ms。min_ms 为 40 时，孤立的 20 ms 突发被丢弃。

**类型：** Build
**阶段：** 第 2 阶段，共 4 阶段
**预计时间：** 约 2 小时

## 实用边界

计算每帧均方根能量。标记超过阈值的帧，合并间隔足够短的相邻活动跨度，丢弃短于最小时长的跨度。返回半开样本区间，让切片与时间戳共享同一坐标系。

```figure
pj-voice-note-transcriber-pipeline-2
```

## 推演示例

1000 Hz 下，40 个振幅 0.5 的样本、20 个静音样本和 40 个活动样本，在 gap_ms 为 40 时合并为 [0,100]。合并跨度为 100 ms。min_ms 为 40 时，孤立的 20 ms 突发被丢弃。

编码前写下返回字段和预期副作用次数。保留第二个应失败输入，让成功示例不能变成硬编码答案。

## 构建契约

在学习者工作区实现 `activity(samples, rate, frame_ms=20, threshold=0.02, min_ms=40, gap_ms=40) in activity.py`。保留导出名称，继续使用前面阶段，不重复它们的政策。

拒绝非有限样本或参数和无效负边界。声学能量不识别词、语言或说话人：风扇可能通过，轻声可能失败。CLI 默认发送整个片段；--segment 明确启用这种有损、基于能量的切分。

## 提示

合并前画出活动帧索引。将间隔条件与最小时长过滤分开。尝试稍高和稍低于帧 RMS 的阈值，解释输出变化。

## 验证你的实现

```bash
python3 scripts/project_test.py voice-note-transcriber-pipeline --init my-voice-note-transcriber-pipeline
python3 scripts/project_test.py voice-note-transcriber-pipeline --stage 2 --path my-voice-note-transcriber-pipeline --strict
```

初始化一次。累积测试导入工作区并保留之前源文件。参考方案运行验证教学实现，绝不会授予学习者证书。可选 SDK 检查需要项目 README 中的依赖和命令。

## 检查结果

移除安静区域可能丢失什么信息？如何在自己的录音条件下评估检测器？

完成的项目生成 audio.wav、captions.vtt、transcript.json，以及带嵌入播放和 cue 跳转按钮的 HTML 页。

```bash
cd projects/voice-note-transcriber-pipeline/solution
python3 pipeline.py --input fixtures/repair-note.wav --transcript-file fixtures/reference.json --out voice-output
```

用自己工作流程的小型输入替换 fixture。预期结果与观察证据一起保存，再另留一组案例用于评估。provider 请求测试证明序列化和控制流，不证明模型质量。

## 主要参考

[官方 API 文档](https://docs.python.org/3/library/wave.html)。实现、政策选择和示例均为原创。
