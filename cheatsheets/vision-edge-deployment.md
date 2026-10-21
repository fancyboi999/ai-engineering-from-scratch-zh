---
id: vision-edge-deployment
title: 视觉流水线与边缘部署
code: VP
subtitle: 测量、量化、导出并部署视觉流水线。根据内存带宽估算边缘设备上的 LLM 解码能力。
hue: 25
sources: phases/04-computer-vision/15-real-time-edge, phases/04-computer-vision/16-vision-pipeline-capstone, phases/17-infrastructure-and-production/12-edge-inference
source_hash: 740d6a7c48c312f9
---

## 视觉流水线阶段
type: architecture
from: phases/04-computer-vision/16-vision-pipeline-capstone/docs/zh.md

```arch
node | req | 1,1 | HTTP 请求 | 图像字节 | client
node | load | 2,1 | 解码 | 预处理 | process
node | det | 3,1 | 检测器 | YOLO 或 Mask R-CNN | gpu
node | crop | 4,1 | 裁剪与缩放 | 每个检测结果 | process
node | cls | 4,2 | 分类器 | ConvNeXt-Tiny | gpu
node | agg | 3,2 | 聚合 | 检测结果与类别 | process
node | schema | 2,2 | Pydantic | 校验 | process
node | resp | 1,2 | JSON 响应 | | client
edge | req | load |
edge | load | det |
edge | det | crop |
edge | crop | cls |
edge | cls | agg |
edge | agg | schema |
edge | schema | resp |
```

## 代码任务
type: task-table
from: phases/04-computer-vision/15-real-time-edge/docs/zh.md, phases/04-computer-vision/15-real-time-edge/code/main.py, phases/04-computer-vision/16-vision-pipeline-capstone/code/main.py

| 任务 | 代码 |
|---|---|
| 延迟分位数 | `measure_latency(model, input_shape)` |
| 统计参数 | `parameter_count(model)` |
| 估算 FLOPs | `flops_estimate(model, input_shape)` |
| INT8 静态量化 | `quantise_ptq(model, calibration_loader)` |
| 导出 ONNX | `export_onnx(model, sample_input)` |
| 比较 4 个主干 | `compare_backbones(resolution=160)` |
| 运行流水线 | `pipe.run(img, image_id="demo")` |
| 逐阶段计时 | `benchmark(pipe, num_runs=10)` |

## 正确测量延迟
type: annotated-code
lang: python
from: phases/04-computer-vision/15-real-time-edge/code/main.py, phases/04-computer-vision/15-real-time-edge/docs/zh.md

```python
model = model.to(device).eval()
with torch.no_grad():
    for _ in range(warmup):                 # 代码中为 5，文档中为 10
        model(x)
    torch.cuda.synchronize()                # 计时前后均调用，仅限 cuda
    t0 = time.perf_counter()
    model(x)
    times.append((time.perf_counter() - t0) * 1000)  # 毫秒
times.sort()
p50 = times[len(times) // 2]
p95 = times[int(len(times) * 0.95)]         # 报告分位数，而非均值
```

## 量化与导出
type: annotated-code
lang: python
from: phases/04-computer-vision/15-real-time-edge/docs/zh.md

```python
import torch.ao.quantization as tq
model.qconfig = tq.get_default_qconfig(backend)  # backend="x86"
tq.prepare(model, inplace=True)                  # 插入观察器
for x, _ in calibration_loader:
    model(x)                                     # 用真实数据校准
tq.convert(model, inplace=True)                  # 融合并量化
torch.onnx.export(model, sample_input, path,
    input_names=["input"], output_names=["output"],
    dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},  # 任意批大小
    opset_version=17)                            # 2026 年的稳妥默认值
```

## 部署与运行
type: command-table
from: phases/04-computer-vision/16-vision-pipeline-capstone/docs/zh.md, phases/04-computer-vision/15-real-time-edge/docs/zh.md, phases/04-computer-vision/15-real-time-edge/code/main.rs, phases/17-infrastructure-and-production/12-edge-inference/docs/zh.md

| 命令 | 作用 |
|---|---|
| `uvicorn main:app --host 0.0.0.0 --port 8000` | 启动 FastAPI 服务 |
| `curl -F 'file=@dog.jpg' http://localhost:8000/detect` | 上传一张图像 |
| `rustc --edition 2021 -O code/main.rs` | 构建 Rust 边缘基准程序 |
| `code/main.py` (lesson 17.12) | 输出各边缘目标的解码上限 |
| `trtexec` | TensorRT 独立 CLI 的测量数值 |
| `benchmark_app` | OpenVINO 独立 CLI 的测量数值 |

## 测量规范
type: flow
from: phases/04-computer-vision/15-real-time-edge/docs/zh.md

1. **预热**：执行 5-10 次模拟前向，忽略其结果。
2. **同步**：计时代码块前后调用 `torch.cuda.synchronize()`。
3. **固定输入尺寸**：使用生产分辨率。224x224 不等于 512x512。
4. **计时**：每次前向前后使用 `time.perf_counter()`。
5. **报告**：给出 p50、p95 和 p99，均值会掩盖尾部。
6. **决策**：架构搜索看 FLOPs，交付看设备实测延迟。

## 默认值与数值
type: defaults
from: phases/04-computer-vision/15-real-time-edge/docs/zh.md, phases/04-computer-vision/15-real-time-edge/code/main.py, phases/04-computer-vision/16-vision-pipeline-capstone/docs/zh.md, phases/04-computer-vision/16-vision-pipeline-capstone/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `opset_version` | 17 | ONNX 导出 |
| 延迟循环 | `warmup=10, iters=50` | 文档值，代码使用 5 和 20 |
| `min_crop` | 32 | 文档值，代码使用 16。更小的框跳过分类器 |
| 裁剪缩放尺寸 | 224 | 文档值，代码使用 64 |
| `backend` | x86 | PTQ qconfig |
| 微批次窗口 | 20ms | 收集请求后批处理 |
| INT8 准确率损失 | 0.1-1 | 静态 PTQ 下的百分点 |
| CPU 阶段耗时 | 300-500 ms | 检测。预处理约为 3 ms |

## 边缘目标与格式
type: concepts
from: phases/17-infrastructure-and-production/12-edge-inference/docs/zh.md

- **Apple ANE**：38 TOPS，统一内存。通过 Core ML 使用 INT4 权重与 FP16 激活。
- **Qualcomm Hexagon**：45 TOPS。通过 AI Hub 转换器使用 QNN INT8 / INT4。
- **WebGPU / WebLLM**：使用 `mlc_llm convert_weight` 生成 Q4 MLC（`q4f16_1`），不支持 GGUF。
- **Jetson Orin Nano**：Q4 GGUF 或 TRT-LLM INT4，受内存带宽限制。
- **Jetson AGX / Thor**：Edge-LLM 路径使用 NVFP4 + FP8 KV。
- **视觉运行时**：将 PyTorch 导出为 ONNX，再选 ONNX Runtime、TensorRT、Core ML 或 TFLite。

## 带宽决定解码上限
type: concepts
from: phases/17-infrastructure-and-production/12-edge-inference/docs/zh.md, phases/17-infrastructure-and-production/12-edge-inference/code/main.py, phases/04-computer-vision/15-real-time-edge/docs/zh.md

- **上限**：$\text{tok/s} = \frac{\text{bandwidth (GB/s)}}{\text{model size (GB)}}$。解码每个 token 都读取全部权重。
- **移动端**：以 50 GB/s 读取 3.5 GB 需要 70 ms，上限约为 14 tok/s。
- **数据中心**：3 TB/s 的 HBM3 在 1.2 ms 内读完 3.5 GB，上限为 830 tok/s。
- **差距**：数据中心与边缘的带宽相差 30-50 倍。
- **手机上下文**：8 GB RAM 上，4 GB 模型加 32K tokens 的 2 GB KV 缓存会 OOM。保持 4K-8K。
- **卷积 FLOPs**：一层卷积为 $2 \, c_{in} \, c_{out} \, k_h \, k_w \, h \, w$。
- **INT8**：模型大小与内存带宽需求降低 4 倍，计算量降低 2-4 倍。

## 故障排查
type: troubleshooting
from: phases/04-computer-vision/15-real-time-edge/docs/zh.md, phases/04-computer-vision/16-vision-pipeline-capstone/docs/zh.md, phases/17-infrastructure-and-production/12-edge-inference/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 最初几次计时很慢 | 冷缓存和 JIT 编译 | 预热 5-10 次 |
| GPU 延迟看起来极低 | 测到的是内核派发时间 | 计时代码块前后同步 |
| 裁剪结果为空 | 框采用 (cx, cy, w, h) | 使用 Pydantic 校验 (x1, y1, x2, y2) |
| 边缘处裁剪失败 | 框越界 | 限制到图像尺寸内 |
| 损坏上传返回 500 | 没有解码检查 | 返回 400 和明确命名的错误 |
| 首个请求失败 | 模型加载太晚 | 服务启动时加载 |
| 手机长上下文 OOM | 32K tokens 的 KV 缓存 | 保持 4K-8K 上下文 |
| PTQ 准确率损失过高 | 静态 PTQ 不够 | 使用带标注数据的 QAT |

## 缩写
type: glossary
from: phases/04-computer-vision/15-real-time-edge/docs/zh.md, phases/17-infrastructure-and-production/12-edge-inference/docs/zh.md

- **PTQ**：训练后量化，无需重新训练即可量化已训练模型。
- **QAT**：量化感知训练。准确率最好，需要标注数据。
- **ONNX**：中立模型格式，所有主流运行时都能读取。
- **FLOPs**：每次前向的浮点操作数，是计算量的粗略替代指标。
- **ANE**：Apple Neural Engine，采用统一内存的设备端 NPU。
- **QNN**：Qualcomm Neural Network SDK，用于访问 Hexagon。
- **统一内存**：CPU 和 NPU 看到同一块 RAM，没有复制开销。

## 问答
type: qa
from: phases/04-computer-vision/15-real-time-edge/docs/zh.md, phases/04-computer-vision/16-vision-pipeline-capstone/docs/zh.md, phases/17-infrastructure-and-production/12-edge-inference/docs/zh.md

- **少于 3M 参数选什么模型？** MobileNetV3-Small，能在各处编译。
- **10-20M 参数选什么模型？** ConvNeXt-Tiny，对 CPU 友好。
- **更多 FLOPs 为何可能更快？** 深度卷积容易优化编译，大型 7x7 卷积则不然。
- **流水线延迟花在哪里？** 预处理在 CPU 上；检测器占 GPU 时间的 70-90%。
- **边缘解码为何慢？** 解码受内存带宽限制，计算是次要因素。

## 提示
type: tips
from: phases/04-computer-vision/15-real-time-edge/docs/zh.md, phases/04-computer-vision/16-vision-pipeline-capstone/docs/zh.md

- 无特定理由时，将每个边缘模型量化为 INT8。
- 表格中每项数值都在目标设备上测量，不在工作站上测量。
- 每个响应记录模型名和权重 hash。
- 使用逐请求 trace ID 记录每个阶段耗时。
- 分类器超时时，返回检测结果，不附分类。
