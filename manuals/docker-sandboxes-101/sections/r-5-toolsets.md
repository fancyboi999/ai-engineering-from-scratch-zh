# 工具集

> docker-agent 1.149.0 的27种工具集，逐项列工具、选项及文件之外的依赖。

2026-10-08 的 docker-agent toolsets 输出27类型（research/sources/probes/docker-agent-toolsets.txt），schema type enum 相同 {{schema Toolset}}。工具列来自各类型 tools/ 文档页，未记录表示无页面。选项是 [R.4](#s-ref-agent-file-keys) 中该类型读取的键及文档默认值。要求列指出外部依赖：无、宿主 shell、网络、凭据、程序或 Docker。共享 instruction、tools、readonly、model、defer、toon 适用全部类型，不重复 {{docs-agent Tool Configuration}}。

## 27种类型 {#s-ref-toolsets-the-27-types}

| 类型 | 工具 | 选项 | 要求 |
|---|---|---|---|
| `a2a` | 每远程 agent 一个工具，以 name 或 card 命名 {{docs-agent A2A Tool}} | `url`（必需）、`name`、`headers`、`allow_private_ips` | 网络与远程 A2A 服务器；服务器用 --auth-token 时 headers 需 token |
| `api` | 每 api_config 一个工具，按 api_config.name 命名 {{docs-agent API Tool}} | api_config 含 name、endpoint、method（文档 GET/POST，schema 五种动词）、instruction、args、required、headers、output_schema；timeout（30）、allow_private_ips | 网络；headers 经 `${env.VAR}` 传 token |
| `background_agents` | `run_background_agent`, `list_background_agents`, `view_background_agent`, `stop_background_agent` {{docs-agent Background Agents Tool}} | 无 | sub_agents 中的 agent |
| `background_jobs` | `run_background_job`、`list_background_jobs`、`view_background_job`、`stop_background_job`、`wait_background_job`（timeout 默认60） {{docs-agent Background Jobs Tool}} | `env`, `recall` (`false`) | 宿主 shell |
| `environment` | 未记录；探测摘要说报告 OS 与解析后 shell，只读，无参数 | 未记录 | 无 |
| `fetch` | fetch 参数 urls、format（text、markdown、html）、timeout（1至300） {{docs-agent Fetch Tool}} | `timeout` (`30`), `allowed_domains`, `blocked_domains`, `allow_private_ips` (`false`), `headers`, `escape_html` (`false`) | 网络，仅 GET，默认拒绝非公共地址 |
| `file` | 未记录；探测摘要说可读、写、编辑单文件 | post_edit、allow_list、deny_list，schema 为 filesystem/file 定义 | 无 |
| `filesystem` | `read_file`, `read_multiple_files`, `write_file`, `edit_file`, `list_directory`, `directory_tree`, `create_directory`, `remove_directory`, `search_files_content` {{docs-agent Filesystem Tool}} | `ignore_vcs` (`true`), `post_edit` (`path`, `cmd`), `allow_list`, `deny_list` | 无 |
| `git` | `git_status`、`git_log`（limit 默认20、path）、`git_branches`、`git_show`（ref）、`git_blame`（path 必需、rev） {{docs-agent Git Tool}} | 无 | 无，使用 go-git，不需 git 程序 |
| `lsp` | `lsp_workspace`, `lsp_hover`, `lsp_definition`, `lsp_references`, `lsp_document_symbols`, `lsp_workspace_symbols`, `lsp_diagnostics`, `lsp_code_actions`, `lsp_rename`, `lsp_format`, `lsp_call_hierarchy`, `lsp_type_hierarchy`, `lsp_implementations`, `lsp_signature_help`, `lsp_inlay_hints` {{docs-agent LSP Tool}} | command（必需）、args、env、file_types、working_dir、version、lifecycle | 语言服务器程序，缺失时从 aqua registry 安装 |
| `mcp` | 服务器所列工具，经 tools 过滤 {{docs-agent MCP Tool}} | ref（docker:<name> 或 mcps 名）；或 command、args、env、version、working_dir；或 remote 含 url、transport_type（streamable/sse）、headers、oauth；另有 config、lifecycle、allow_private_ips | ref: docker: 需 MCP Gateway 与 Docker；command 需程序；remote 需网络，服务器要求时需 OAuth 登录 |
| `mcp_catalog` | `search_remote_mcp_servers`, `enable_remote_mcp_server`, `list_remote_mcp_servers`, `disable_remote_mcp_server`, `reset_remote_mcp_server_auth` {{docs-agent MCP Catalog Tool}} | `allowed_servers`, `blocked_servers` | 网络，必要时 OAuth；无网关，因为目录子集仅流式 HTTP |
| `memory` | `add_memory`, `get_memories`, `delete_memory`, `search_memories`, `update_memory` {{docs-agent Memory Tool}} | `path` (`~/.cagent/memory/<config-name>/memory.db`) | 磁盘 SQLite 文件 |
| `model_picker` | change_model（model 必需）、revert_model {{docs-agent Model Picker Tool}} | models（必需） | 所列模型凭据 |
| `open_url` | 一个工具，默认 open_url {{docs-agent Open URL Tool}} | url（必需）、name | 宿主浏览器，经 open、xdg-open 或 rundll32 |
| `openapi` | 每文档 operation 一个工具 {{docs-agent OpenAPI Tool}} | url（必需）、headers、timeout（30）、max_output_bytes（30000）、allow_private_ips | 文档与各次调用都需网络 |
| `plan` | `write_plan`, `read_plan`, `list_plans`, `delete_plan`, `update_plan_from_file`, `export_plan_to_file`, `set_plan_status`, `get_plan_status` {{docs-agent Plan Tool}} | 无 | ~/.cagent/plans/ 存储，该类型全部 agent 共享 |
| `rag` | rag_config.tool 命名的搜索工具 {{docs-agent RAG Tool}} | rag_config 含 docs、strategies（chunked-embeddings、semantic-embeddings、bm25）、results、respect_vcs（true）、indexing_timeout | 嵌入模型，需 provider 凭据或 Model Runner，每策略一个 SQLite 数据库 |
| `scheduler` | create_schedule（prompt、when 必需，name）、list_schedules、cancel_schedule（id 必需） {{docs-agent Scheduler Tool}} | 无 | 支持 recall 的运行中会话；计划不持久化 |
| `script` | shell 下每项一个工具，按键命名 {{docs-agent Script Tool}} | `shell.<name>.cmd`, `description`, `args`, `required`, `env`, `working_dir` | 宿主 shell |
| `session_context` | `list_sessions`, `read_session` {{docs-agent Session Context Tool}} | 无 | 会话数据库 |
| `shell` | shell 含 cmd（必需）、cwd（.）、timeout（30） {{docs-agent Shell Tool}} | env、sudo_askpass（false）、safer（弃用且忽略） | 宿主 shell；批准前每命令分类为 safe、destructive 或 unknown |
| `tasks` | `create_task`, `get_task`, `update_task`, `delete_task`, `list_tasks`, `next_task`, `add_dependency`, `remove_dependency` {{docs-agent Tasks Tool}} | `path` (`tasks.json`) | 磁盘 JSON 文件 |
| `think` | 一个推理工具，页面未命名 {{docs-agent Think Tool}} | schema 中的 shared | 无，无副作用 |
| `todo` | `create_todo`, `create_todos`, `update_todos`, `list_todos` {{docs-agent Todo Tool}} | `shared` (`false`) | 无 |
| `user_prompt` | user_prompt 含 message（必需）、title、schema {{docs-agent User Prompt Tool}} | 无 | elicitation handler，TUI/CLI 提供，部分 MCP 客户端不提供 |
| `webhook` | send_webhook 含 message {{docs-agent Webhook Tool}} | webhook_config 含 url（必需）、provider（默认 generic，或 slack、discord、ifttt、telegram、mattermost、rocketchat、googlechat、teams）、headers、chat_id | 网络；Slack/Mattermost 的 URL 本身就是凭据 |

## 不是类型的名称 {#s-ref-toolsets-names-that-are-not-types}

两个工具无需 toolsets 条目：sub_agents 注入 transfer_task，handoffs 注入同名工具（[冲突 C56](#s-ref-sources-and-the-conflicts-register)）。文档内置表将两者列为类型，schema enum 与探测却排除。

| 名称 | 工具 | 注入来源 | 要求 |
|---|---|---|---|
| `transfer_task` | transfer_task 含 agent、task、expected_output（全部必需），始终自动批准 {{docs-agent Transfer Task Tool}} | 调用者的 sub_agents | 指定子 agent |
| handoffs 的工具 | 带必需 agent 的工具，把对话移到本地 agent，不开网络连接 {{docs-agent Handoff Tool}} | 调用者的 handoffs | 同文件指定 agent |
| `session_plan` | `write_session_plan`, `read_session_plan`, `exit_plan_mode` {{docs-agent Session Plan Tool}} | 文档列为内置类型，v1.149.0 enum/探测未列，所以固定程序不接受该 type | ~/.cagent/session_plans/ 下每会话文件 |

文档将 session_plan 列为类型，schema 的27类型没有它。schema 在本手册中优先于文档，因此固定版本视其不可用。

Sources: research/sources/probes/docker-agent-toolsets.txt; research/sources/agent-schema.json (`Toolset`, `MCPToolset`, `Remote`, `ApiConfig`, `WebhookConfig`, `RAGConfig`, `ScriptShellToolConfig`, `PostEditConfig`, `Lifecycle`); research/sources/docs-docker-agent.md (page configuration/tools and the 28 pages under tools/: a2a, api, background-agents, background-jobs, fetch, filesystem, git, handoff, lsp, mcp-catalog, mcp, memory, model-picker, open-url, openapi, plan, rag, scheduler, script, session_context, session_plan, shell, tasks, think, todo, transfer-task, user-prompt, webhook); research/conflicts-register.md row C56
