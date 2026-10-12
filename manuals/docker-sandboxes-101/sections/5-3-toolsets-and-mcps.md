# toolsets 与 mcps

> 工具集使用固定27种 `type` 之一向 agent 提供工具；`mcp` 通过 Docker 引用、命令或 URL 连接服务器。

agent 凭记忆回答仓库问题，你怀疑它没拿到文件工具。agent 文件写着 `filesystem`，但模型看到的是工具名，不是工具集。

读完本节，你能列出 agent 给模型的工具、不调用模型直接测试工具，并选择 MCP 形式。

## 27种类型 {#s-toolsets-and-mcps-the-27-types}

**工具集：** agent 的 `toolsets` 下含 `type` 和选项的条目，运行时转为一个或多个工具。`docker-agent toolsets` 输出27种类型，schema `Toolset` enum 相同 {{schema Toolset}}。

```listing
title: 27种工具集类型中的六种
source: capture/out/16-toolsets.txt
lang: text
note: 仅保留表头与六行，其余21种在工具集参考表中。
---
$ docker-agent toolsets
TYPE                SUMMARY
…
background_agents   Dispatch work to sub-agents concurrently and collect results
…
filesystem          Read, write, list, search, and navigate files and directories
…
mcp                 Extend agents with external tools via the Model Context Protocol
mcp_catalog         Discover and activate remote MCP servers from the Docker MCP Catalog
…
plan                Shared persistent scratchpad for multi-agent collaboration
…
shell               Execute shell commands in the user's environment
…
[exit 0]
```

`transfer_task` 与 `handoff` 不是类型。文档内置表列了它们，schema enum 与 CLI 没有；它们由 `sub_agents` 和 `handoffs` 注入（[冲突 C56](#s-ref-sources-and-the-conflicts-register)）。同一文档表还列出 CLI 不输出的 `session_plan`，却漏了 `environment` 和 `file` {{docs-agent Tool Configuration}}。[工具集表](#s-ref-toolsets) 遵循 CLI。

## 从工具集到工具 {#s-toolsets-and-mcps-from-toolsets-to-tools}

`files.yaml` 声明 `filesystem` 和 `shell` 两个工具集。运行中每个 `toolset_info` 事件都报告 `"available_tools": 10`（`18-run-json.ndjson`）。cassette `18-files.yaml` 的请求列出它们：从 `directory_tree` 到 `remove_directory` 的九个 filesystem 工具，再加 `shell`。模型选了 `list_directory` 和 `read_file`。

`debug toolsets FILE --json` 不调用模型就打印相同名称与 schema {{help-agent docker-agent debug toolsets}}。`guarded.yaml` 只输出一个工具：

```listing
title: guarded.yaml 的唯一工具
source: capture/out/20-debug-toolsets.json
lang: json
note: description 与 output schema 已截去。
---
[
  {
    "agent": "root",
    "tools": [
      {
        "name": "shell",
        "category": "shell",
…
        "parameters": {
          "additionalProperties": false,
          "properties": {
            "cmd": {
              "description": "Shell command",
              "type": "string"
            },
            "cwd": {
              "description": "Working directory (default \".\")",
              "type": "string"
            },
            "timeout": {
              "description": "Timeout in seconds (default 30)",
              "type": "integer"
            }
          },
…
        "annotations": {
          "idempotentHint": false,
          "readOnlyHint": false,
          "title": "Shell"
        },
…
```

`debug tool FILE TOOL JSON` 不经过模型轮次直接调用工具；“Calls have real side effects and bypass other hooks and approval checks” {{help-agent docker-agent debug tool}}，有真实副作用，绕过其他 hooks 与批准检查。`20-debug-tool.txt` 中，`shell` 参数 `{"cmd":"echo m101-direct"}` 输出 `m101-direct`。模型调用前可用它测试工具。

## 工具集共有键 {#s-toolsets-and-mcps-keys-every-toolset-shares}

**工具过滤：** 收窄工具集向模型提供内容的键。`tools` 只保留列出名称；`readonly` 只保留注解有只读提示的工具 {{schema Toolset}}。`defer` 隐藏工具，直到模型用 `search_tool` 和 `add_tool` 发现。`instruction` 替换内置指令，除非含 `{ORIGINAL_INSTRUCTIONS}`。`model` 指定工具结果后轮次所用模型。自 v1.148.0 完整工具结果上限为50 KiB {{rel-agent v1.148.0}}。

`shell` 的 `readOnlyHint: false` 在[权限、--safety 与 hooks](#s-permissions-safety-and-hooks) 中还会影响决定。

## mcp 类型 {#s-toolsets-and-mcps-the-mcp-type}

**MCP 工具集：** `type: mcp` 连接一个 MCP 服务器，把工具交给 agent。文档列三种形式 {{docs-agent Tool Configuration}}：

- `ref: docker:duckduckgo` 通过 MCP Gateway 在容器中运行目录服务器。
- `command`、`args` 和 `env` 通过 stdio 启动本地进程；缺失程序从 aqua registry 安装到 `~/.cagent/tools/bin/`。
- `remote.url` 配 `transport_type` 为 `streamable` 或 `sse`，通过网络访问服务器，可选 `headers`。

`lifecycle.profile` 设置每个 `mcp` 工具集的重连方式：默认 `resilient`，另有 `strict` 或 `best-effort`。顶层 `mcps` 存服务器定义，agent 以 `{type: mcp, ref: <name>}` 引用 {{schema mcps}}。顶层 `toolsets` 通过 `use_toolsets` 命名引用，为任意类型提供同样复用 {{schema toolsets}}。

本版录制没运行 `mcp` 工具集，所以三种形式依据文档与 schema。`ref: docker:` 是否需要 Docker Desktop MCP Toolkit 仍未知（[冲突 C73](#s-ref-sources-and-the-conflicts-register)）。沙箱侧 MCP 见 [sbx mcp add、load 与 --static-mcp](#s-sbx-mcp-add-load-and-static-mcp)；将 agent 作为 MCP 服务器见 [serve mcp 与 serve acp](#s-serve-mcp-and-serve-acp)。

```figure
id: fig-5-3
kind: flow
title: 每个工具集条目给模型什么
claim: 每个 `toolsets` 条目成为模型请求中的命名工具；内置类型进程内运行，`mcp` 经网关、子进程或 URL。
caption: 每行从左到右，从文件条目读到模型请求中的工具名。实线行在 capture/out/18-run-json.ndjson 中运行，名称来自 capture/cassettes/18-files.yaml.gz 的 tools 数组。虚线行依据 Tool Configuration 文档，未运行。
```

```takeaways
- `docker-agent debug toolsets FILE --json` 显示模型获取的工具名与 schema。
- 模型调用前用 `docker-agent debug tool` 测试；它有真实副作用。
- 设置 `tools` 或 `readonly`，少给 agent 一些工具。
- 重复的 MCP 服务器放在顶层 `mcps`，按名称引用。
```

Sources: schema Toolset, mcps (research/sources/agent-schema.json); docs-agent Tool Configuration (research/sources/docs-docker-agent.md, page configuration/tools); help-agent docker-agent toolsets, debug toolsets, debug tool (research/sources/help-docker-agent.md); rel-agent v1.148.0 (research/sources/docker-agent-CHANGELOG.md); conflicts C56, C73 (research/conflicts-register.md); capture/fixtures/agents/files.yaml, guarded.yaml; capture/cassettes/18-files.yaml.gz; capture/out/16-toolsets.txt, 18-run-json.ndjson, 20-debug-toolsets.json, 20-debug-tool.txt
