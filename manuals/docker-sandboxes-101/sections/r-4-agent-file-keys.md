# agent 文件键

> schema 版本16的全部文件键，按块分组，类型、默认值、必需性与含义来自 v1.149.0 的 agent-schema.json。

schema 标题为 Docker Agent Configuration，固定副本取自 tag v1.149.0、commit bf4169cdd31229d52385410c52c3dcc59b497858 {{schema Docker Agent Configuration}}。version enum 从 "0" 到 "16"，当前形式为 "16" {{schema version}}。顶层及所有块设 additionalProperties false，未知键加载失败。唯一顶层必需键是 agents {{schema agents}}。必需列表示是否列在 required；默认列取 schema default，无表示未声明。

## 顶层键 {#s-ref-agent-file-keys-top-level-keys}

16键全部来自根 properties 对象 {{schema properties}}。configuration/overview 文档解释可复用 mcps、rag、commands、skills、toolsets 块。

| 键 | 类型 | 默认值 | 必需 | 含义 |
|---|---|---|---|---|
| `version` | string, `"0"` to `"16"` | 无 | 否 | 配置版本 |
| `providers` | 映射：ProviderConfig | 无 | 否 | 可复用 provider 默认值：`base_url`、`token_key`、`api_type` |
| `agents` | 映射：AgentConfig | 无 | 是 | agent 集合，至少一个 |
| `models` | 映射：ModelConfig | 无 | 否 | 命名模型配置 |
| `mcps` | 映射：MCPToolset | 无 | 否 | 可复用 MCP 定义，工具集按名称引用 |
| `rag` | 映射：RAGToolset | 无 | 否 | 可复用 RAG 来源定义 |
| `commands` | 映射：Commands | 无 | 否 | 命名命令组，use_commands 合并 |
| `skills` | 映射：SkillsConfig | 无 | 否 | 命名 skill 组，use_skills 合并 |
| `toolsets` | 映射：Toolset | 无 | 否 | 命名工具集，use_toolsets 追加 |
| `metadata` | Metadata | 无 | 否 | 作者、许可、readme、描述、版本、tags |
| `permissions` | PermissionsConfig | 无 | 否 | 全文件工具批准模式 |
| `runtime` | RuntimeDefaults | 无 | 否 | 作者期望执行默认值，CLI flags 与用户设置优先 |
| `budget` | BudgetConfig | 无 | 否 | 单次运行上限，由其中全部子会话共享 |
| `budgets` | 映射：BudgetConfig | 无 | 否 | 命名预算，使用同名的 agent 共享上限 |
| `flavors` | 映射：object 或 null | 无 | 否 | --flavor 应用的 YAML 补丁，按 JSON Merge Patch；key+ 追加，key- 移除 |
| `evaluators` | 映射：EvaluatorConfig | 无 | 否 | 用于 tool_guard 与路由 hooks 的命名 provider 评估 |

## agents 下的键 {#s-ref-agent-file-keys-keys-under-agents}

各键来自 AgentConfig {{schema AgentConfig}}；configuration/agents 文档解释它们，configuration/structured-output 解释 structured_output，features/harnesses 解释 harness。

| 键 | 类型 | 默认值 | 必需 | 含义 |
|---|---|---|---|---|
| `model` | string | 无 | 否 | models 名称或 provider/model |
| `fallback` | FallbackConfig: `models` (array), `retries` （默认 `2`), `cooldown` （默认 `1m`) | 无 | 否 | 主模型失败时按顺序尝试的模型及重试、冷却规则 |
| `description` | string | 无 | 否 | agent 描述 |
| `welcome_message` | string | 无 | 否 | agent 启动消息 |
| `toolsets` | 数组：Toolset | 无 | 否 | agent 工具集 |
| `instruction` | string 或 string 数组 | 无 | 否 | 系统 prompt，列表以空行连接 |
| `instruction_file` | string 或 string 数组 | 无 | 否 | 相对配置文件的指令文件，与 instruction 互斥 |
| `harness` | HarnessConfig: `type` （必需， `claude-code`, `codex`, `pi`, `opencode`), `model`, `effort`, `agent`, `thinking` | 无 | 否 | 代替模型 provider 运行 agent 的外部编程 CLI |
| `code_mode_tools` | boolean | 无 | 否 | 暴露一个通过 JavaScript 调其他工具的工具 |
| `sub_agents` | string 数组 | 无 | 否 | 父 agent 用 transfer_task 委派的目标：本地名、OCI 引用或 name:reference |
| `handoffs` | string 数组 | 无 | 否 | 可接收整段对话的 agent |
| `force_handoff` | string | 无 | 否 | 每次最终响应后始终接收对话的 agent |
| `routing` | AgentRouting: `allowed_agents` （必需）, `default_agent` | 无 | 否 | 路由 hook 可选 agent，及 evaluator 不确定时的默认目标 |
| `add_date` | boolean | 无 | 否 | 向上下文添加日期 |
| `add_environment_info` | boolean | 无 | 否 | 向上下文添加 cwd、git、OS 与架构 |
| `readonly` | boolean | 无 | 否 | 各工具集只保留只读注解工具 |
| `safety` | `strict`, `balanced`, `restricted`, `autonomous` | 无 | 否 | 新会话默认安全模式，低于用户选择 |
| `redact_secrets` | boolean | `true` | 否 | 在工具输入、模型输入与工具输出安装 redact_secrets 内置 hook |
| `max_iterations` | integer | 无 | 否 | 循环次数上限 |
| `budgets` | string 数组 | 无 | 否 | 此 agent 使用的顶层 budgets 名称 |
| `max_consecutive_tool_calls` | integer | `0` 表示 `5` | 否 | 停止前连续相同工具调用次数 |
| `max_old_tool_call_tokens` | integer | 无，不截断 | 否 | 旧工具参数与结果保留 token；-1 关闭截断 |
| `max_tool_result_tokens` | integer | 无 | 否 | 各工具结果保留 token，从中间向外截断 |
| `num_history_items` | integer | 无 | 否 | 保留历史项数量 |
| `session_compaction` | boolean | `true` | 否 | 达到阈值及上下文溢出后压缩会话 |
| `compaction_threshold` | number | `0.9` | 否 | 触发压缩的上下文占比，模型值优先 |
| `compaction_model` | string | 无 | 否 | 写摘要的模型，三层中优先级最高 |
| `add_prompt_files` | string 数组 | 无 | 否 | 加入上下文的 prompt 文件，如 AGENTS.md |
| `add_prompt_files_depth` | integer | `0` | 否 | 工作目录下按路径列同名文件的层数 |
| `commands` | object 或 array | 无 | 否 | slash 命令命名 prompt |
| `structured_output` | object: `name`, `description`, `schema`, `strict` | 无 | 否 | 约束响应的 JSON schema，OpenAI/Gemini 原生支持 |
| `add_description_parameter` | boolean | 无 | 否 | 每工具调用添加 description 参数 |
| `hooks` | HooksConfig | 无 | 否 | 此 agent 生命周期 hooks |
| `cache` | CacheConfig: `enabled` （默认 `false`), `case_sensitive` (`false`), `trim_spaces` (`false`), `path` | 无 | 否 | 相同问题重放上次回答 |
| `skills` | boolean 或 array | 无 | 否 | true 加载全部发现的 skill；列表混合来源、名称与内联 skill |
| `use_commands` | string 数组 | 无 | 否 | 待合并顶层命令组 |
| `use_skills` | string 数组 | 无 | 否 | 待合并顶层 skill 组 |
| `use_toolsets` | string 数组 | 无 | 否 | 追加在内联工具集后的顶层工具集 |

skills 内联 skill 必需 name、description、instructions，另可含 context: fork、model、allowed_tools、toolsets {{schema InlineSkill}}。commands 项是字符串，或含 description、instruction、agent、url 的对象 {{schema CommandConfig}}。

## models 下的键 {#s-ref-agent-file-keys-keys-under-models}

各键来自 ModelConfig {{schema ModelConfig}}；configuration/models 解释各项，configuration/routing 解释 routing。

| 键 | 类型 | 默认值 | 必需 | 含义 |
|---|---|---|---|---|
| `provider` | string | 无 | schema 否；文档是，除非设置 first_available | provider id，如 openai、anthropic、dmr |
| `model` | string | 无 | schema 否；文档是 | 模型名 |
| `description` | string | 无 | 否 | 人读摘要，不发送模型 |
| `temperature` | number | 无 | 否 | 采样温度 |
| `max_tokens` | integer | 无 | 否 | 每响应最大输出 token，不是上下文窗口 |
| `top_p` | number | 无 | 否 | Top-p 采样 |
| `frequency_penalty` | number | 无 | 否 | 频率惩罚 |
| `presence_penalty` | number | 无 | 否 | 存在惩罚 |
| `base_url` | string | 无 | 否 | API base URL，支持 `${env.VAR}` 替换 |
| `parallel_tool_calls` | boolean | 无 | 否 | 允许并行工具调用 |
| `token_key` | string | 无 | 否 | 保存 token 的环境变量 |
| `bypass_models_gateway` | boolean | 无 | 否 | 即使设置模型网关也直连 provider |
| `provider_opts` | object | 无 | 否 | provider 选项；dmr 包括 runtime_flags、context_size、keep_alive，更多见 [R.6](#s-ref-providers-and-models) |
| `track_usage` | boolean | 无 | 否 | 追踪用量 |
| `thinking_budget` | string 或 integer | 无 | 否 | 推理 effort 或 token 预算，形式见 [R.6](#s-ref-providers-and-models) |
| `task_budget` | integer 或 object | 无 | 否 | 任务总 token 预算，以 output_config.task_budget 发给 Anthropic |
| `routing` | 数组：RoutingRule: `model`, `examples` （两者必需） | 无 | 否 | 按示例语句选择模型的规则，此模型成为路由器 |
| `auth` | AuthConfig: `type` （必需， `workload_identity_federation`), `workload_identity_federation` | 无 | 否 | 非 API key 认证，优先于 provider 路径 |
| `first_available` | string 数组 | 无 | 否 | 按优先级排列候选，用首个有凭据项；与其他键互斥 |
| `title_model` | string | 无 | 否 | 写会话标题的模型 |
| `compaction_model` | string | 无 | 否 | 写压缩摘要的模型 |
| `compaction_threshold` | number | `0.9` | 否 | 此模型上 agent 的压缩阈值 |
| `capabilities` | CapabilitiesConfig: `image`, `pdf`, `audio`, `video` | 无 | 否 | models.dev 目录错误或未说明时的附件能力 |
| `output_capabilities` | OutputCapabilitiesConfig: `image` | 无 | 否 | 模型能否生成图像 |
| `cost` | CostConfig：input、output、cache_read、cache_write，每百万 token 美元 | 无 | 否 | 覆盖目录的价格 |

## providers 下的键 {#s-ref-agent-file-keys-keys-under-providers}

各键来自 ProviderConfig {{schema ProviderConfig}}，providers/custom 文档解释它们。

| 键 | 类型 | 默认值 | 必需 | 含义 |
|---|---|---|---|---|
| `provider` | string | 未设时 openai | 否 | 底层类型：openai、anthropic、google、amazon-bedrock、dmr 或内置别名 |
| `api_type` | `openai_chatcompletions`, `openai_responses` | schema 为 openai_chatcompletions，文档按模型决定 | 否 | OpenAI 兼容 provider 的 API schema |
| `base_url` | string | 无 | 否 | 端点，兼容 provider 必需，支持 `${env.VAR}` 替换 |
| `token_key` | string | 无 | 否 | 保存 token 的环境变量 |
| `unload_api` | string | 无 | 否 | unload 内置使用的模型卸载路径或 URL |
| `temperature` | number | 无 | 否 | 默认温度 |
| `max_tokens` | integer | 无 | 否 | 默认输出 token |
| `top_p` | number | 无 | 否 | 默认 top-p |
| `frequency_penalty` | number | 无 | 否 | 默认频率惩罚 |
| `presence_penalty` | number | 无 | 否 | 默认存在惩罚 |
| `parallel_tool_calls` | boolean | 无 | 否 | 默认并行工具调用 |
| `provider_opts` | object | 无 | 否 | 传给客户端的 provider 选项 |
| `track_usage` | boolean | 无 | 否 | 默认用量追踪 |
| `thinking_budget` | integer 或 string | 无 | 否 | 默认推理预算 |
| `task_budget` | integer 或 object | 无 | 否 | 默认任务预算 |
| `auth` | AuthConfig | 无 | 否 | 非 API key 认证 |
| `compaction_model` | string | 无 | 否 | 默认压缩模型，三层中最低 |

auth 下 federation 块必需 federation_rule_id（fdrl_ 前缀）、organization_id、identity_token，可选 service_account_id {{schema FederationAuthConfig}}。token 来源含 file、env、command、url、headers、response_field {{schema IdentityTokenSourceConfig}}。

## toolsets 下的键 {#s-ref-agent-file-keys-keys-under-toolsets}

各键来自 Toolset {{schema Toolset}}。configuration/tools 解释共享键，[R.5](#s-ref-toolsets) 指出哪种类型用哪些键。

| 键 | 类型 | 默认值 | 必需 | 含义 |
|---|---|---|---|---|
| `type` | 27名称之一 | 无 | schema 中非必需 | 工具集类型 |
| `instruction` | string | 无 | 否 | 替换内置指令，或用 `{ORIGINAL_INSTRUCTIONS}` 扩展 |
| `toon` | string | 无 | 否 | 逗号分隔工具正则，将其 JSON 输出重编码为 TOON |
| `readonly` | boolean | 无 | 否 | 仅保留只读注解工具 |
| `model` | string | 无 | 否 | 处理此工具集结果的轮次模型 |
| `ref` | string | 无 | 否 | docker:<name> 或 mcps 名称 |
| `config` | any | 无 | 否 | 工具专用配置 |
| `command` | string | 无 | 否 | stdio MCP 或 LSP 服务器命令 |
| `remote` | Remote: `url` （必需）, `transport_type`, `headers`, `oauth` | 无 | 否 | 远程 MCP 服务器 |
| `args` | string 数组 | 无 | 否 | 命令参数 |
| `tools` | string 数组 | 无 | 否 | 工具名称允许列表 |
| `env` | 映射：strings | 无 | 否 | 环境变量 |
| `shared` | boolean | 无 | 否 | think、todo 在 agent 间共享工具状态 |
| `path` | string | 无 | 否 | memory 或 tasks 存储路径 |
| `shell` | object | 无 | 否 | script 脚本定义：cmd、description、args、required、env、working_dir |
| `post_edit` | 数组：PostEditConfig: `path`, `cmd` （两者必需） | 无 | 否 | filesystem 或 file 编辑后的命令 |
| `api_config` | ApiConfig: `name`, `endpoint`, `method` （必需）, `instruction`, `headers`, `args`, `required`, `output_schema` | 无 | 否 | api 的 HTTP 工具 |
| `webhook_config` | WebhookConfig: `url` （必需）, `provider`, `headers`, `chat_id` | 无 | 否 | webhook 目标 |
| `rag_config` | RAGConfig: `strategies` （必需）, `tool`, `docs`, `respect_vcs` （默认 `true`), `indexing_timeout`, `results` | 无 | 否 | rag 来源与策略 |
| `ignore_vcs` | boolean | `true` | 否 | 文件系统操作排除 .git 及 .gitignore 模式 |
| `allow_list` | string 数组 | 无 | 否 | 文件工具可访问目录 |
| `deny_list` | string 数组 | 无 | 否 | 文件工具不可访问目录，优先于 allow_list |
| `defer` | boolean 或 array | 无 | 否 | 经 search_tool、add_tool 按需加载 |
| `timeout` | integer | 省略时 `30` | 否 | fetch、api、openapi 的 HTTP 超时秒数 |
| `max_output_bytes` | integer | `30000` | 否 | openapi 输出文本截断；0关闭 |
| `escape_html` | boolean | `false` | 否 | 多 URL fetch 结果的旧 HTML 转义 |
| `allowed_domains` | string 数组 | 无 | 否 | fetch 可访问主机 |
| `blocked_domains` | string 数组 | 无 | 否 | fetch 不可访问主机，与 allowed_domains 互斥 |
| `allow_private_ips` | boolean | 无 | 否 | 允许 fetch、api、openapi、a2a、远程 mcp 访问非公共地址 |
| `sudo_askpass` | boolean | 无 | 否 | shell 经宿主 UI 提示 sudo 密码 |
| `recall` | boolean | 无 | 否 | run_background_job 暴露 recall 参数 |
| `url` | string | 无 | 否 | a2a、openapi 或 open_url 的 URL |
| `headers` | 映射：strings | 无 | 否 | openapi、a2a、fetch 的 HTTP headers |
| `name` | string | 无 | 否 | a2a 工具名 |
| `file_types` | string 数组 | 无 | 否 | lsp 服务器处理的扩展名 |
| `allowed_servers` | string 数组 | 无 | 否 | mcp_catalog 提供的目录服务器 ids |
| `blocked_servers` | string 数组 | 无 | 否 | 从可用项移除的目录服务器 ids |
| `models` | string 数组 | 无 | 否 | model_picker 可选模型 |
| `version` | string | 无 | 否 | 自动安装 owner/repo@version，false 关闭 |
| `working_dir` | string | 无 | 否 | mcp 或 lsp 子进程工作目录 |
| `lifecycle` | Lifecycle: `profile` (`resilient`, `strict`, `best-effort`), `required`, `startup_timeout`, `call_timeout`, `restart`, `max_restarts`, `backoff` | 无 | 否 | mcp 或 lsp 工具集的监督规则 |

mcps 可复用项含 command、args、ref、remote、config、version、env、tools、instruction、name、defer、working_dir、lifecycle {{schema MCPToolset}}。remote 下 OAuth 含 clientId、clientSecret、callbackPort、scopes、callbackRedirectURL {{schema RemoteOAuthConfig}}。

## permissions 下的键 {#s-ref-agent-file-keys-keys-under-permissions}

三个键来自 PermissionsConfig {{schema PermissionsConfig}}，configuration/permissions 解释模式语法。

| 键 | 类型 | 默认值 | 必需 | 含义 |
|---|---|---|---|---|
| `allow` | string 数组 | 无 | 否 | 无需确认的批准模式，如 read_* 或 shell:cmd=ls* |
| `ask` | string 数组 | 无 | 否 | 始终询问，即使只读工具 |
| `deny` | string 数组 | 无 | 否 | 始终拒绝，优先于 allow |

## hooks 下的键 {#s-ref-agent-file-keys-keys-under-hooks}

事件来自 HooksConfig {{schema HooksConfig}}，configuration/hooks 逐项解释。每事件含数组。matcher 事件用 HookMatcherConfig，含 matcher、必需 hooks 和 preempt_yolo {{schema HookMatcherConfig}}；其他事件直接含 hook 定义。

| 事件 | 条目 | 运行时机 |
|---|---|---|
| `prompt_file_guard` | 定义 | 加载 prompt 文件存储或使用前，所有 hook 都须批准 |
| `skill_content_guard` | 定义 | 原始 skill 文本展开前，所有 hook 都须批准 |
| `pre_tool_use` | 匹配器 | 工具运行前，可允许、拒绝或修改 |
| `post_tool_use` | 匹配器 | 工具完成后，携带响应 |
| `permission_request` | 匹配器 | 询问用户批准前 |
| `session_start` | 定义 | 会话开始时 |
| `user_prompt_submit` | 定义 | 每用户消息一次，首个模型调用前 |
| `user_steering_messages_submit` | 定义 | 追加轮中排队消息时 |
| `user_followup_submit` | 定义 | 后续消息开始新轮次时 |
| `turn_start` | 定义 | 每模型调用开始，携带瞬时上下文 |
| `turn_end` | 定义 | 轮次因任意原因结束时 |
| `before_llm_call` | 定义 | 每模型调用即将开始前 |
| `after_llm_call` | 定义 | 每次成功模型调用后 |
| `session_end` | 定义 | 会话结束时 |
| `pre_compact` | 定义 | transcript 压缩前 |
| `subagent_stop` | 定义 | 子 agent 完成时 |
| `on_user_input` | 定义 | agent 需要用户输入时 |
| `stop` | 定义 | 模型回答完成时 |
| `notification` | 定义 | agent 发错误或 warning 时 |
| `on_error` | 定义 | 轮次遇到错误时 |
| `on_max_iterations` | 定义 | 达到 max_iterations 时 |
| `on_agent_switch` | 定义 | 活跃 agent 改变时 |
| `on_session_resume` | 定义 | 用户允许超过 max_iterations 继续时 |
| `on_tool_approval_decision` | 定义 | 批准链决定后、执行或记录拒绝前 |
| `before_compaction` | 定义 | 紧邻压缩前，可否决 |
| `after_compaction` | 定义 | 成功压缩后 |
| `tool_response_transform` | 匹配器 | 工具运行后、记录响应前，可重写输出 |
| `tool_input_transform` | 匹配器 | 每调用批准前，可修补参数 |
| `tool_guard` | 匹配器 | 输入变换后、批准前，任何安全模式都不能绕过 |
| `before_agent_run` | 路由定义 | 每 agent 激活一次，可路由到另一 agent |
| `after_agent_complete` | 路由定义 | agent 完成后，可路由到另一 agent |
| `worktree_create` | 定义 | --worktree 创建 worktree 后一次 |

hook 定义来自 HookDefinition {{schema HookDefinition}}。

| 键 | 类型 | 默认值 | 必需 | 含义 |
|---|---|---|---|---|
| `type` | `command`, `builtin`, `model`, `evaluator` | 无 | 是 | 执行内容：shell 命令、命名进程内函数、模型或 evaluator |
| `command` | string | 无 | 否 | shell 命令或内置名称 |
| `args` | string 数组 | 无 | 否 | handler 参数 |
| `name` | string | 无 | 否 | 日志与事件用名称 |
| `timeout` | integer | `60` | 否 | hook 截止前秒数 |
| `env` | 映射：strings | 无 | 否 | 仅此 hook 环境 |
| `working_dir` | string | 无 | 否 | 此 hook 工作目录 |
| `on_error` | `warn`, `ignore`, `block` | `warn` | 否 | 错误、超时或坏输出的处理；pre_tool_use 和 tool_guard 始终失败关闭 |
| `strict_output` | boolean | `false` | 否 | 要求一个 JSON 对象，拒绝未知字段 |
| `model` | string | 无 | 否 | model hook 的 provider/model |
| `prompt` | string | 无 | 否 | model hook 渲染的 Go 模板 |
| `schema` | string | 无 | 否 | pre_tool_use_decision 将模型回复转为结论 |
| `system_prompt` | string | 无 | 否 | model hook 的字面系统消息 |
| `evaluator` | string | 无 | 否 | evaluator hook 的顶层 evaluator |
| `evaluator_policy` | EvaluatorPolicy: `decisions`, `min_probability`, `fallback` （全部必需） | 无 | 否 | evaluator 结论到 guard 决定的映射 |
| `routing_policy` | RoutingPolicy: `routes`, `min_probability` （两者必需） | 无 | 否 | evaluator 选择到 agent 的映射 |

type 说明列17个内置 {{schema HookDefinition}}：`add_context`、`add_date`、`add_environment_info`、`add_prompt_files`、`add_git_status`、`add_git_diff`、`add_directory_listing`、`add_user_info`、`add_recent_commits`、`max_iterations`、`redact_secrets`、`transform_json`、`limit_large_tool_results`、`safer_shell`、`http_post`、`snapshot`、`unload`。

## runtime、budget、metadata 与 evaluators 下的键 {#s-ref-agent-file-keys-keys-under-runtime-budget-metadata-and-evaluators}

| 块 | 键 | 类型 | 默认值 | 必需 | 含义 |
|---|---|---|---|---|---|
| `runtime` | `sandbox` | boolean | 无 | 否 | 默认沙箱运行，等同 --sandbox {{schema RuntimeDefaults}} |
| `runtime` | `network_allowlist` | string 数组 | 无 | 否 | 加入沙箱允许列表的 host 或 host:port |
| `runtime` | `safety` | 四种模式之一 | 无 | 否 | 文件默认安全模式，低于逐 agent safety |
| `budget` | `max_cost` | number | 无 | 否 | 每运行最大美元，仅计有价格响应 {{schema BudgetConfig}} |
| `budget` | `max_tokens` | integer | 无 | 否 | 运行输入加输出 token 上限 |
| `budget` | `max_time` | string | 无 | 否 | 轮次耗时之和上限，Go duration |
| `metadata` | `author`, `license`, `readme`, `description`, `version`, `tags` | strings，tags 为数组 | 无 | 否 | 描述字段，version 用于 OCI 发布 {{schema Metadata}} |
| `evaluators` | `provider`, `model`, `type`, `instructions` | strings，type 为 boolean、choice、score 之一 | 无 | 是 | typesafe 或 openai Decisions 后端的命名评估 {{schema EvaluatorConfig}} |
| `evaluators` | `base_url`, `endpoint`, `token_key`, `bypass_models_gateway`, `choices`, `levels`, `timeout`, `cost` | 混合 | 说明中 timeout 为10s | 否 | evaluator 端点、凭据与输出形态 |

configuration/budget 与 configuration/flavors 文档用示例解释 budget 和 flavors。

Sources: research/sources/agent-schema.json at tag v1.149.0 (root `properties`, and the definitions `AgentConfig`, `ModelConfig`, `ProviderConfig`, `AuthConfig`, `FederationAuthConfig`, `IdentityTokenSourceConfig`, `Toolset`, `MCPToolset`, `Remote`, `RemoteOAuthConfig`, `PostEditConfig`, `ApiConfig`, `WebhookConfig`, `RAGConfig`, `Lifecycle`, `PermissionsConfig`, `HooksConfig`, `HookMatcherConfig`, `HookDefinition`, `RuntimeDefaults`, `BudgetConfig`, `Metadata`, `EvaluatorConfig`, `EvaluatorPolicy`, `AgentRouting`, `RoutingPolicy`, `RoutingRule`, `FallbackConfig`, `CacheConfig`, `CapabilitiesConfig`, `OutputCapabilitiesConfig`, `CostConfig`, `HarnessConfig`, `InlineSkill`, `CommandConfig`); research/sources/docs-docker-agent.md (pages configuration/overview, configuration/agents, configuration/models, providers/custom, configuration/tools, configuration/permissions, configuration/hooks, configuration/budget, configuration/flavors, configuration/routing); research/sources/README.md (the pin of the schema copy)
