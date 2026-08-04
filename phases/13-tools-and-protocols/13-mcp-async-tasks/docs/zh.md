# 异步 Tasks（SEP-1686）——现在调用、稍后取结果，应对长跑工作

> 真实的 agent 工作要花几分钟到几小时：CI 跑批、深度研究合成、批量导出。同步工具调用会掉连接、超时，或阻塞 UI。SEP-1686 在 2025-11-25 合入，加了一个 Tasks 基元：任何请求都可被增强成一个 task，结果可以稍后取，或经由状态 notification 流式获取。漂移风险提示：Tasks 在 2026 上半年是实验性的；SDK 表面仍在围绕规范设计。

**类型：** Build
**语言：** Python（标准库，异步 task 状态机）
**前置要求：** 阶段 13 · 07（MCP server）、阶段 13 · 09（传输）
**预计时间：** ~75 分钟

## 学习目标

- 识别何时把一个工具从同步提升为 task 增强（server 端工作 >30 秒）。
- 走一遍 task 生命周期：`working` → `input_required` → `completed` / `failed` / `cancelled`。
- 持久化 task 状态，让崩溃不丢失在途工作。
- 正确地轮询 `tasks/status` 并取 `tasks/result`。

## 问题背景

一个 `generate_report` 工具跑一条数分钟的抽取管线。同步模型下的选项：

1. 把连接开三分钟。远程传输会掐断它；client 超时；UI 冻住。
2. 立刻返回一个占位符；要求 client 轮询一个自定义端点。破坏了 MCP 的统一性。
3. 发了不管；没有结果。

没一个是好的。SEP-1686 加了第四个：task 增强。任何请求（通常是 `tools/call`）都可被标记为一个 task。server 立刻返回一个 task id。client 轮询 `tasks/status`，完成时取 `tasks/result`。server 端状态在重启后存活。

## 核心概念

### Task 增强

一个请求靠设 `params._meta.task.required: true`（或 `optional: true`，server 决定）变成 task。server 立刻响应：

```json
{
  "jsonrpc": "2.0", "id": 1,
  "result": {
    "_meta": {
      "task": {
        "id": "tsk_9f7b...",
        "state": "working",
        "ttl": 900000
      }
    }
  }
}
```

`ttl` 是 server 保留状态的承诺；ttl 过后 task 结果被丢弃。

### 每工具的选择加入

工具 annotation 能声明 task 支持：

- `taskSupport: "forbidden"`——这个工具总是同步跑。对快工具安全。
- `taskSupport: "optional"`——client 可以请求 task 增强。
- `taskSupport: "required"`——client 必须用 task 增强。

一个 `generate_report` 工具会是 `required`。一个 `notes_search` 工具会是 `forbidden`。

### 状态

```
working  -> input_required -> working  (经由 elicitation 循环)
working  -> completed
working  -> failed
working  -> cancelled
```

状态机是只追加的：一旦 `completed`、`failed` 或 `cancelled`，task 就是终态。

### 方法

- `tasks/status {taskId}`——返回当前状态和一个进度提示。
- `tasks/result {taskId}`——阻塞，或在尚未完成时返回 404。
- `tasks/cancel {taskId}`——幂等；终态忽略。
- `tasks/list`——可选；枚举活跃的和近期完成的 task。

### 流式状态变更

server 支持时，client 可以订阅状态 notification：

```
server -> notifications/tasks/updated {taskId, state, progress?}
```

流式而非轮询的 client 拿到更好的 UX。轮询作为最小表面始终被支持。

### 持久状态

规范要求声明 task 支持的 server 持久化状态。崩溃不应丢失 ttl 内已完成的结果。存储从 SQLite 到 Redis 到文件系统都行。第 13 课的脚手架用文件系统。

### 取消语义

`tasks/cancel` 是幂等的。如果 task 在执行中途，server 尝试停（看执行器是否协作式取消）。如果已是终态，请求是空操作。

### 崩溃恢复

当 server 进程重启时：

1. 加载所有持久化的 task 状态。
2. 把任何进程已死的 `working` task 标记为 `failed`，错误为 `CRASH_RECOVERY`。
3. 在 ttl 内保留 `completed` / `failed` / `cancelled`。

### 异步 tasks 加 sampling

一个 task 本身可以调 `sampling/createMessage`。长跑研究 task 就是这么干的：server 的 task 线程按需采样 client 的模型，而 client 的 UI 把 task 显示为 `working`，配定期进度更新。

### 为什么这是实验性的

SEP-1686 在 2025-11-25 发布，但更宽的路线图点出三个开放问题：持久订阅基元、子任务（父子 task 关系），以及 result-TTL 标准化。预计规范在整个 2026 年演化。生产代码应只对常见情况把 Tasks 当稳定，并对子任务的未来 SDK 变更加守卫。

```figure
tp-task-lifecycle
```

## 实际使用

`code/main.py` 实现一个持久 task 存储（文件系统后端）和一个跑在后台线程的 `generate_report` 工具。client 调那个工具，立刻拿到一个 task id，在 worker 更新进度时轮询 `tasks/status`，完成时取 `tasks/result`。取消好使；崩溃恢复靠杀掉 worker 线程并重载状态来模拟。

要看什么：

- task 状态 JSON 持久化到 `/tmp/lesson-13-tasks/<id>.json`。
- worker 线程更新 `progress` 字段；轮询显示它在推进。
- client 侧的取消设置一个事件；worker 检查并提前退出。
- "崩溃"时的状态重载把在途 task 标记为 `failed`，附 `CRASH_RECOVERY`。

## 拿去用

本课产出 `outputs/skill-task-store-designer.md`。给定一个长跑工具（研究、构建、导出），这个 skill 设计 task 存储（状态形状、ttl、持久性），挑正确的 taskSupport 标志，并勾画进度 notification。

## 练习

1. 跑 `code/main.py`。启动一个 `generate_report` task，轮询状态，然后取结果。

2. 在运行中途加一个 `tasks/cancel` 调用。验证 worker 尊重它，且状态变成 `cancelled`。

3. 模拟崩溃恢复：杀掉 worker 线程，重启加载器，观察 `CRASH_RECOVERY` 失败模式。

4. 把存储扩展到 SQLite。持久性收益一样；查询选项打开了（列出会话 X 的所有 task）。

5. 读 2026 年的 MCP 路线图博文。找出最可能在来年影响 SDK API 设计的那个 Tasks 相关开放问题。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Task | "长跑工具调用" | 用 `_meta.task` 增强、用于异步执行的请求 |
| SEP-1686 | "Tasks 规范" | 在 2025-11-25 加入 Tasks 的 Spec Evolution Proposal |
| `_meta.task` | "task 外壳" | 含 id、state、ttl 的每请求元数据 |
| taskSupport | "工具标志" | 每工具的 `forbidden` / `optional` / `required` |
| `tasks/status` | "轮询方法" | 取当前状态和可选的进度提示 |
| `tasks/result` | "取结果" | 返回完成载荷，或尚未完成时返回 404 |
| `tasks/cancel` | "停掉它" | 幂等的取消请求 |
| ttl | "保留预算" | server 承诺保留 task 状态的毫秒数 |
| `notifications/tasks/updated` | "状态推送" | server 发起的状态变更事件 |
| Durable store | "崩溃安全状态" | 文件系统 / SQLite / Redis 持久层 |

## 延伸阅读

- [MCP — GitHub SEP-1686 issue](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1686) — 起源提案与完整讨论
- [WorkOS — MCP async tasks for AI agent workflows](https://workos.com/blog/mcp-async-tasks-ai-agent-workflows) — 带理由的设计讲解
- [DeepWiki — MCP task system and async operations](https://deepwiki.com/modelcontextprotocol/modelcontextprotocol/2.7-task-system-and-async-operations) — 机制与状态机
- [FastMCP — Tasks](https://gofastmcp.com/servers/tasks) — SDK 层面的 task 实现模式
- [MCP blog — 2026 roadmap](https://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/) — 开放问题与 2026 优先事项，含子任务
