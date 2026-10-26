---
id: production-llm-app
title: 交付生产级 LLM 应用
code: SP
subtitle: 请求流水线、重试、回退链、SSE 流、恢复、演示限制与回退网关。
hue: 15
sources: phases/11-llm-engineering/13-production-app, phases/17-infrastructure-and-production/29-model-demo-interfaces, projects/streaming-answer-recovery, projects/llm-gateway-with-fallbacks
source_hash: c2e0d189811f84db
---

## 课程任务
type: task-table
span: 2
from: phases/11-llm-engineering/13-production-app/docs/zh.md, phases/11-llm-engineering/13-production-app/code/production_app.py, phases/17-infrastructure-and-production/29-model-demo-interfaces/docs/zh.md, phases/17-infrastructure-and-production/29-model-demo-interfaces/code/main.py

| 任务 | 代码 |
|---|---|
| 安装服务端技术栈 | `pip install fastapi uvicorn` |
| 使用 4 个 worker 运行应用 | `uvicorn production_app:app --host 0.0.0.0 --port 8000 --workers 4` |
| 选择主模型 | `LLM_MODEL=gpt-4o` |
| 启动演示服务 | `python3 code/main.py --serve` |
| 要求访问 token | `export DEMO_ACCESS_TOKEN=<token>` |
| 发送一次预测 | `curl -s -X POST http://127.0.0.1:8000/api/predict -H 'Content-Type: application/json' -d '{"text": "ok"}'` |
| 查看事件流 | `curl -N -X POST http://127.0.0.1:8000/api/stream -H 'Content-Type: application/json' -d '{"text": "<text>"}'` |
| 运行演示测试 | `python3 -m unittest discover -s code/tests -v` |

## 请求流水线
type: architecture
from: phases/11-llm-engineering/13-production-app/docs/zh.md, phases/11-llm-engineering/13-production-app/code/production_app.py

```arch
node | client | 1,1 | 客户端 | 网页、移动端、API | client
node | gw | 2,1 | API 网关 | 认证、限流 | process
node | gin | 3,1 | 输入护栏 | 注入检测、PII 脱敏 | process
node | router | 4,1 | Prompt 路由器 | 模板、A/B 版本 | process
node | cache | 4,2 | 语义缓存 | 阈值 0.92 | store
node | llm | 3,2 | LLM 调用 | 重试、回退链 | model
node | gout | 2,2 | 输出护栏 | 替换被标记文本 | process
node | resp | 1,2 | 响应 | 评估日志、成本、SSE | client
edge | client | gw |
edge | gw | gin |
edge | gin | router | 通过
edge | router | cache |
edge | cache | llm | 未命中
edge | llm | gout |
edge | gout | resp |
```

## 退避重试
type: annotated-code
lang: python
from: phases/11-llm-engineering/13-production-app/code/production_app.py

```python
async def call_llm_with_retry(prompt, model, max_retries=3):
    for attempt in range(max_retries + 1):
        try:
            ...  # 一次提供方调用
        except (ConnectionError, TimeoutError):
            if attempt < max_retries:
                backoff = min(2 ** attempt + random.uniform(0, 1), 10)  # 上限 10 秒
                await asyncio.sleep(backoff)
            else:
                raise
    raise ConnectionError(f"All {max_retries} retries exhausted for {model.value}")
# call_with_fallback 遍历 FALLBACK_CHAIN，优先模型在前。
```

## 故障处理
type: troubleshooting
from: phases/11-llm-engineering/13-production-app/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| API 429 | 限流 | 退避重试，将请求入队 |
| API 500 | 服务端错误 | 重试 3 次，切换回退模型 |
| API 超时超过 30s | 提供方缓慢 | 重试一次；缩短 prompt，使用更小模型 |
| 输出格式错误 | 模型故障 | 将错误加入 prompt 后重试 |
| 护栏阻断 | 不安全输入 | 不重试，解释阻断原因 |
| 向量存储不可用 | 应用故障 | 跳过 RAG 上下文 |
| 缓存不可用 | 应用故障 | 直接调用 LLM |
| 所有模型都失败 | 回退链耗尽 | 先返回缓存响应，再使用固定致歉信息 |

## 代码默认值
type: defaults
from: phases/11-llm-engineering/13-production-app/code/production_app.py, phases/17-infrastructure-and-production/29-model-demo-interfaces/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `similarity_threshold` | 0.92 | 语义缓存命中分数 |
| `ttl_seconds` | 3600 | 缓存条目寿命 |
| `max_entries` | 10000 | 缓存容量 |
| `max_retries` | 3 | 链中每个模型的重试次数 |
| `MAX_CHARS` | 500 | 演示文本上限 |
| `MAX_BODY_BYTES` | 4096 | 更大的请求体返回 413 |
| `BUCKET_CAPACITY` | 5 | 每秒补充 0.5 个 token |
| `DAILY_CALL_CAP` | 2000 | 超过上限返回 503 |

## 演示错误码
type: command-table
from: phases/17-infrastructure-and-production/29-model-demo-interfaces/docs/zh.md, phases/17-infrastructure-and-production/29-model-demo-interfaces/code/main.py

| 命令 | 作用 |
|---|---|
| `413 body_too_large` | 请求体超过 4,096 字节 |
| `408 request_timeout` | 请求体在达到 `Content-Length` 前停止 |
| `415 unsupported_media_type` | 内容类型不是 JSON |
| `400 bad_json` | 请求体不是 JSON 对象 |
| `422 text_too_long` | 文本超过 500 字符 |
| `422 control_characters` | 文本包含控制字符 |
| `429 rate_limited` | token 桶为空；读取 `Retry-After` |
| `503 usage_cap_reached` | 达到每日上限；读取 `Retry-After` |

## SSE 传输格式
type: annotated-code
lang: bash
from: phases/17-infrastructure-and-production/29-model-demo-interfaces/docs/zh.md

```bash
event: token  # Content-Type text/event-stream
data: {"index":0,"text":"Label:"}
  # 空行结束一个事件
event: token
data: {"index":1,"text":" positive."}

event: done
data: {"label":"positive","score":1.0,"tokens":11}
```

## 恢复流式回答
type: flow
from: projects/streaming-answer-recovery/README.md, projects/streaming-answer-recovery/solution/main.ts, projects/streaming-answer-recovery/solution/cli.ts

1. **SSEDecoder**：将拆开的 UTF-8 字节拼接成完整事件。
2. **apply**：要求连续正数 ID。出现间隙时抛出 `noncontiguous answer event ID`。
3. **apply**：相同数据的重复 ID 不做操作；数据不同时抛错。
4. **apply**：载荷类型为 `text`、`citation` 或 `complete`。引用必须使用 http 或 https。
5. **connect**：在 `complete` 前断开会将状态设为 `interrupted`。
6. **connect**：下次调用发送 `Last-Event-ID`，仅接收后续事件。
7. **trace**：将接受的事件与 `schemaVersion: 1` 写入记录。`replay` 重建状态。

## 网关回退策略
type: comparison
from: projects/llm-gateway-with-fallbacks/README.md, projects/llm-gateway-with-fallbacks/solution/stage2.go, projects/llm-gateway-with-fallbacks/solution/stage4.go, projects/llm-gateway-with-fallbacks/solution/config.go

| 比较项 | 2xx | 429 或 5xx | 其他状态 | 取消 |
|---|---|---|---|---|
| `ClassifyStatus` | `success` | `retry` | `terminal` | 无 |
| 下一个提供方 | 否 | 是 | 否 | 否 |
| 路由状态 | `completed` | 链尾为 `exhausted` | `terminal-error` | `cancelled` |
| 代理响应 | 上游响应体 | 链尾为 502 | 502 | 504 |

## 网关提供方文件
type: annotated-code
lang: bash
from: projects/llm-gateway-with-fallbacks/solution/fixtures/providers.example.json, projects/llm-gateway-with-fallbacks/README.md

```bash
{"providers": [
  {"name": "primary", "url": "http://127.0.0.1:11434/v1/chat/completions"},
  {"name": "backup", "url": "http://127.0.0.1:11435/v1/chat/completions",
   "key_env": "ORCHARD_BACKUP_KEY"}],  # 环境变量名，不是密钥
 "max_attempts": 2,  # 1 至 16，每个提供方访问一次
 "max_response_bytes": 65536,  # 1 字节至 16 MiB
 "timeout_ms": 4000}  # 1 至 5000，针对整条路由
```

## 项目任务
type: task-table
span: 2
from: projects/streaming-answer-recovery/README.md, projects/llm-gateway-with-fallbacks/README.md

| 任务 | 代码 |
|---|---|
| 创建工作目录 | `python3 scripts/project_test.py <project> --init /tmp/<project>-work` |
| 评测一个阶段 | `python3 scripts/project_test.py <project> --stage 1 --path /tmp/<project>-work --strict` |
| 流式演示，断开后恢复 | `cd projects/streaming-answer-recovery/solution && python3 demo.py` |
| 读取自己的 SSE 端点 | `node --experimental-strip-types cli.ts <url> /tmp/trace.json` |
| 网关演示，503 后转备份 | `cd projects/llm-gateway-with-fallbacks/solution && go run .` |
| 运行网关代理 | `go run . --config /tmp/providers.json --listen 127.0.0.1:8088` |
| 调用代理 | `curl --fail-with-body http://127.0.0.1:8088/v1/chat/completions --data-binary @fixtures/request.json` |

## 目标与清单
type: tips
from: phases/11-llm-engineering/13-production-app/docs/zh.md

- P50 延迟低于 2s，P99 延迟低于 10s。
- 缓存命中率高于 30%，护栏阻断率低于 5%。
- 每请求成本低于 $0.01。
- 每用户每分钟限 10 至 50 个请求。
- 上线前以 100 个并发用户做负载测试。

## 问答
type: qa
from: phases/17-infrastructure-and-production/29-model-demo-interfaces/docs/zh.md

- **为何用 POST 而非 `EventSource`？** `EventSource` 只发送 GET。GET 会把输入放进被记录的 URL。
- **状态 200 后模型失败怎么办？** 状态已发出，在流中发送 `error` 事件。
- **错误响应体包含什么？** `code`、`message`、`hint` 与 `request_id`。
