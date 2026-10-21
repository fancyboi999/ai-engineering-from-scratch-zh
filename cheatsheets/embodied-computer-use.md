---
id: embodied-computer-use
title: 具身 VLA 与电脑操作 agent
code: EC
subtitle: 机器人动作格式、GUI 动作模式、安全闸门，以及浏览器和桌面的有界 agent 循环。
hue: 28
sources: phases/12-multimodal-ai/21-embodied-vlas-openvla-pi0-groot, phases/12-multimodal-ai/25-multimodal-agents-computer-use, phases/14-agent-engineering/21-computer-use-agents, phases/15-autonomous-systems/11-browser-agents, projects/browser-agent, projects/desktop-control
source_hash: 30a3cfcf5ece3df8
---

## 关键术语
type: concepts
from: phases/12-multimodal-ai/21-embodied-vlas-openvla-pi0-groot/docs/zh.md, phases/12-multimodal-ai/25-multimodal-agents-computer-use/docs/zh.md, phases/14-agent-engineering/21-computer-use-agents/docs/zh.md, phases/15-autonomous-systems/11-browser-agents/docs/zh.md

- **VLA**：一个模型接收图像与指令，输出动作命令。
- **动作 token 化**：将每个关节目标量化为 256 个区间，每个区间对应一个词表 ID。
- **FAST**：DCT 加量化，将 30 步轨迹变成约 10 个 token。
- **流匹配头**：小型 transformer 通过 rectified flow 输出 50 步动作序列。
- **系统 1 / 系统 2**：大型 VLM 缓慢规划，小型动作头快速执行。
- **GUI 定位**：模型输出截图中指令目标的 (x, y) 坐标。
- **混合 agent**：结合使用截图和无障碍树。
- **读写边界**：读取不触发有后果的操作，写入需要新的批准。

## VLA 动作格式
type: comparison
from: phases/12-multimodal-ai/21-embodied-vlas-openvla-pi0-groot/docs/zh.md, phases/12-multimodal-ai/21-embodied-vlas-openvla-pi0-groot/code/main.py
span: 2

| 维度 | RT-2 | OpenVLA | π0 | GR00T N1 |
|---|---|---|---|---|
| 模式 | PaLM-X + 离散区间 | Llama 7B + 离散区间 | 流匹配头 | 双系统人形机器人 |
| 动作输出 | 每步 10 个 token | 每维 256 个区间 | 连续的 50 步序列 | 先子目标，再关节命令 |
| 速率 | 3-5 Hz | A100 上 4-5 Hz | 有效速率 50 Hz | 规划约 1 Hz，执行 50-100 Hz |
| 网页与机器人数据混合比 | ~1:1 | ~0.5:1 | 类似 | 仿真到真实数据 |
| 权重 | 闭源 | 开放 | 开放 | 开放 |

## 代码中的动作分词器
type: annotated-code
lang: python
from: phases/12-multimodal-ai/21-embodied-vlas-openvla-pi0-groot/code/main.py

```python
tokens = discretize(action, bins=256)          # 将 [-1,1]^D 映射为 D 个整数区间
idx = int((a + 1) / 2 * (bins - 1))            # 再截断到 0..bins-1
recovered = undiscretize(tokens, bins=256)     # 区间宽度 = 2/255 ~ 0.0078
fast_tokens = fast_compress(trajectory, keep_coeff=4)  # 逐维 DCT，bins=32
coeffs = dct(series)[:keep_coeff]              # 保留低频项
continuous_flow_count = 1                      # 单次动作头输出
```

## 多模态 agent 循环
type: flow
from: phases/12-multimodal-ai/25-multimodal-agents-computer-use/docs/zh.md, phases/12-multimodal-ai/25-multimodal-agents-computer-use/code/main.py, phases/14-agent-engineering/21-computer-use-agents/docs/zh.md

1. **Agent**：截取浏览器画面。
2. **VLM**：将截图、URL 和目标解析为计划。
3. **VLM**：每步输出一个结构化 JSON 动作。
4. **安全检查**：执行前评估每个动作，拒绝不安全动作。
5. **包装器**：`apply_action(state, action)` 返回新状态。
6. **Agent**：观察下一张截图，重复直至 `done`。

## GUI 动作模式
type: task-table
from: phases/12-multimodal-ai/25-multimodal-agents-computer-use/code/main.py, phases/12-multimodal-ai/25-multimodal-agents-computer-use/docs/zh.md

| 任务 | 代码 |
|---|---|
| 点击目标 | `"click": ["x", "y", "element_desc"]` |
| 输入文本 | `"type":  ["text", "x", "y"]` |
| 滚动 | `"scroll": ["direction", "amount"]` |
| 拖动 | `"drag": ["x0", "y0", "x1", "y1"]` |
| 选择选项 | `"select": ["option_index"]` |
| 前往 URL | `"navigate": ["url"]` |
| 裁剪并放大 | `"screenshot_region": ["x0", "y0", "x1", "y1"]` |
| 结束任务 | `"done": ["success", "explanation"]` |

## 浏览器 agent 回执
type: architecture
from: projects/browser-agent/solution/main.ts, projects/browser-agent/solution/pixels.py, projects/browser-agent/API.md

```arch
node | task | 1,1 | 任务 | name、email、allowedOrigin | client
node | loop | 2,1 | runAgent | maxSteps = 5 | process
node | choose | 3,1 | choose | fill、click、done、blocked | process
node | driver | 1,2 | 驱动器 | observe、act、capture | client
node | png | 2,2 | inspectPNG | pixels.py greenFraction | process
node | out | 3,2 | 回执 | status、trace、visual | store
edge | task | loop |
edge | loop | choose | 观察
edge | driver | loop | observe
edge | loop | png | capture
edge | png | out | > 0.0005
edge | choose | out | blocked
```

## 运行项目
type: command-table
from: projects/browser-agent/README.md, projects/desktop-control/README.md
span: 2

| 命令 | 作用 |
|---|---|
| `python3 scripts/project_test.py browser-agent --init learning-artifacts/browser-agent` | 创建起始工作区，完成实现前会失败 |
| `python3 scripts/project_test.py browser-agent --all --path learning-artifacts/browser-agent --strict` | 评测工作区的所有阶段 |
| `node cli.ts --task samples/contact.json --output browser-run.json` | 运行离线表单任务并保存回执 |
| `node cli.ts --task samples/contact.json --live` | 驱动真实 Chromium，先设置 BROWSE_BIN |
| `rustc --edition 2021 cli.rs -o desktop-cli` | 构建桌面动作运行器 |
| `./desktop-cli samples/actions.tsv desktop-frames` | 运行六个 TSV 动作，写入 PPM 帧与 trace.txt |

## 默认值与限制
type: defaults
from: projects/browser-agent/solution/main.ts, projects/browser-agent/solution/cli.ts, projects/desktop-control/solution/main.rs, projects/desktop-control/solution/cli.rs, projects/desktop-control/README.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `maxSteps` | 5 | 必须是 1 至 100 的整数 |
| `max_steps` | 8 | 来自任务文件的 CLI 步数预算 |
| `greenFraction` | 0.0005 | 超过该值时状态为完成 |
| `submitLabel` | Save request | 按钮必须唯一、启用且无危险 |
| `max_calls` | 32 | CLI 上限。`Controller::new` 拒绝 0 或超过 100 的值 |
| 文本长度 | 200 | 桌面输入拒绝空文本或控制字符 |
| `scale` | 1.0 | 测试帧。有效范围大于 0 且不超过 4.0 |
| 命令超时 | 20000 | 每次 gstack browse 调用的毫秒数 |

## 错误与修正
type: troubleshooting
from: projects/browser-agent/solution/main.ts, projects/browser-agent/API.md, projects/desktop-control/solution/main.rs, projects/desktop-control/README.md

| 现象 | 原因 | 修正 |
|---|---|---|
| `origin changed` | 页面 URL 离开 `allowedOrigin` | 始终在允许的回环源上运行 |
| `missing or ambiguous field` | 标签匹配零个或两个字段 | 使用精确且唯一的标签 |
| `completion values disagree` | done 为 true，但某个值不一致 | 不要只相信成功提示条 |
| `unsafe or ambiguous submit` | 按钮危险、禁用或不唯一 | 提供一个安全的提交按钮 |
| `stalled` | 动作后观察结果重复 | 检查驱动器是否应用动作 |
| `screenshot-error` | 截图或 PNG 检查失败 | CLI 以状态 2 退出，修正图片 |
| `stale frame` | 点击代数不是最近一次截图的代数 | 重新截图，并使用新代数 |
| `action budget exhausted` | 调用达到 `max_calls` | 提高预算或减少动作 |

## 注入防御
type: comparison
from: phases/15-autonomous-systems/11-browser-agents/code/main.py, phases/15-autonomous-systems/11-browser-agents/docs/zh.md

| 页面 | naive | sanitizer | rw_boundary |
|---|---|---|---|
| 正常页面 | 正常提交 | 正常提交 | 正常提交 |
| 可见文本注入 | 提交到 /api/exfil | 成功拦截 | 阻断写入 |
| URL 片段注入 | 提交到 /api/exfil | 漏检 | 阻断写入 |
| 弱点 | 服从页面文本 | 不检查 URL | 需要正确标记内容来源 |

## 关键数字
type: concepts
from: phases/12-multimodal-ai/21-embodied-vlas-openvla-pi0-groot/docs/zh.md, phases/14-agent-engineering/21-computer-use-agents/docs/zh.md, phases/15-autonomous-systems/11-browser-agents/docs/zh.md, phases/12-multimodal-ai/25-multimodal-agents-computer-use/docs/zh.md

- **控制预算**：30 Hz 控制循环意味着每个动作预算为 33ms。
- **Open X-Embodiment**：为 OpenVLA 提供跨 22 种机器人的 970k 条轨迹。
- **机器人适配**：用 100-1000 个任务专属演示进行 LoRA 微调。
- **OpenAI CUA 发布时**：OSWorld 38.1%、WebArena 58.1%、WebVoyager 87%。
- **Gemini 2.5 Computer Use**：仅浏览器，13 种动作，Online-Mind2Web 约 70%。
- **WebArena-Verified**：修正约 11.3% 的假阴性，困难子集有 258 个任务。
- **AgentVista**：前沿模型 27-40%，开放模型 10-20%。

## 问答
type: qa
from: phases/12-multimodal-ai/21-embodied-vlas-openvla-pi0-groot/docs/zh.md, phases/14-agent-engineering/21-computer-use-agents/docs/zh.md, phases/15-autonomous-systems/11-browser-agents/docs/zh.md

- **为什么联合微调？** 只用机器人数据的模型无法处理分布外指令。
- **什么算授权？** 只有用户直接指令。截图与 DOM 文本都不可信。
- **过滤器能解决 prompt 注入吗？** 不能。防御提高攻击成本，却不能消除整类攻击。

## 安全提示
type: tips
from: phases/12-multimodal-ai/21-embodied-vlas-openvla-pi0-groot/docs/zh.md, phases/14-agent-engineering/21-computer-use-agents/docs/zh.md, phases/15-autonomous-systems/11-browser-agents/docs/zh.md

- 将关节、速度和工作空间限制放在 VLA 之外，作为控制层检查。
- 每次动作前运行逐步安全分类器。
- 登录、购买或删除文件前询问人类。
- 只允许任务所需的工具。
- 浏览器会话只使用限定作用域的凭证。
