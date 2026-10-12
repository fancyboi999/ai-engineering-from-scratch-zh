# provider 与模型

> docker-agent 1.149.0 已知的全部 provider id、凭据、provider/model 引用、DMR 端点顺序、auto 规则及模型调优键。

录制机器 `docker-agent doctor` 输出20 provider 及凭据变量，全部 not set（research/sources/probes/docker-agent-doctor.txt）。文档列31 ids，schema provider 说明列内置别名 {{schema ProviderConfig}}。下表是并集，先 doctor 顺序，再文档顺序。doctor 输出 fireworks-ai 等规范 id，旧 id 仍接受为别名（[冲突 C58](#s-ref-sources-and-the-conflicts-register)）。

## provider ids {#s-ref-providers-and-models-the-provider-ids}

| Provider id | 旧 id | 凭据 | 来源 |
|---|---|---|---|
| `anthropic` | 无 | ANTHROPIC_API_KEY，或 auth.type: workload_identity_federation | doctor, {{docs-agent Models}} |
| `openai` | 无 | `OPENAI_API_KEY` | doctor |
| `chatgpt` | 无 | 无；通过 docker agent setup 浏览器登录，显示 CHATGPT_OAUTH_TOKEN | doctor, {{docs-agent Model Providers}} |
| `github-copilot` | 无 | GITHUB_TOKEN 或 GH_TOKEN，带 copilot scope 的 PAT | doctor, {{docs-agent Model Providers}} |
| `google` | 无 | GOOGLE_API_KEY 或 GEMINI_API_KEY；Vertex AI 用 GOOGLE_GENAI_USE_VERTEXAI、GOOGLE_CLOUD_PROJECT、GOOGLE_CLOUD_LOCATION | doctor, {{docs-agent Models}} |
| `mistral` | 无 | `MISTRAL_API_KEY` | doctor |
| `openrouter` | 无 | `OPENROUTER_API_KEY` | doctor |
| `baseten` | 无 | `BASETEN_API_KEY` | doctor |
| `ovhcloud` | 无 | `OVH_AI_ENDPOINTS_ACCESS_TOKEN` | doctor |
| `groq` | 无 | `GROQ_API_KEY` | doctor |
| `fireworks-ai` | `fireworks` | `FIREWORKS_API_KEY` | doctor, {{docs-agent Models}} |
| `deepseek` | 无 | `DEEPSEEK_API_KEY` | doctor |
| `cerebras` | 无 | `CEREBRAS_API_KEY` | doctor |
| `togetherai` | `together` | `TOGETHER_API_KEY` | doctor, {{docs-agent Models}} |
| `huggingface` | 无 | `HF_TOKEN` | doctor |
| `moonshotai` | `moonshot` | `MOONSHOT_API_KEY` | doctor, {{docs-agent Models}} |
| `vercel` | 无 | `AI_GATEWAY_API_KEY` | doctor |
| `amazon-bedrock` | 无 | AWS_BEARER_TOKEN_BEDROCK 或 AWS 凭据链，doctor 将后者计为另三个变量 | doctor, {{docs-agent Models}} |
| `opencode` | `opencode-zen` | `OPENCODE_API_KEY` | doctor, {{docs-agent Model Providers}} |
| `opencode-go` | 无 | `OPENCODE_API_KEY` | doctor |
| `dmr` | 无 | 无；本地 Docker Model Runner | {{docs-agent Models}} |
| `ollama` | 无 | 无；可选 base_url | {{docs-agent Models}} |
| `xai` | 无 | `XAI_API_KEY` | {{docs-agent Models}} |
| `nebius` | 无 | `NEBIUS_API_KEY` | {{docs-agent Models}} |
| `nvidia` | 无 | `NVIDIA_API_KEY` | {{docs-agent Models}} |
| `minimax` | 无 | `MINIMAX_API_KEY` | {{docs-agent Models}} |
| `cloudflare-workers-ai` | 无 | CLOUDFLARE_API_TOKEN 与 CLOUDFLARE_ACCOUNT_ID | {{docs-agent Models}} |
| `cloudflare-ai-gateway` | 无 | CLOUDFLARE_API_TOKEN、CLOUDFLARE_ACCOUNT_ID、CLOUDFLARE_GATEWAY_ID | {{docs-agent Models}} |
| `requesty` | 无 | `REQUESTY_API_KEY` | {{docs-agent Models}} |
| `azure` | 无 | AZURE_API_KEY 与 base_url | {{docs-agent Models}} |
| providers 下名称 | 无 | token_key 中的变量 | {{schema ProviderConfig}} |

doctor 有11 ids 未被文档表计为 provider，文档有10个未被 doctor 输出。凭据也可来自 ~/.config/cagent/.env、用户配置 credential_helper 命令、Docker Desktop 或 1Password op:// 引用 {{docs-agent Secrets}}。

## 模型引用 {#s-ref-providers-and-models-the-model-reference}

| 形式 | 示例 | 含义 | 来源 |
|---|---|---|---|
| `provider/model` | `dmr/ai/qwen3`, `anthropic/claude-sonnet-4-5` | 已知 provider 的内联模型 | {{docs-agent Models}} |
| models 名称 | `model: local` | 带自身键的命名模型 | {{docs-agent Models}} |
| `name/model` | `my_gateway/gpt-4o` | providers 定义的 provider 上的模型 | {{docs-agent Provider Definitions}} |
| `a,b` | `anthropic/claude-sonnet-4-5,openai/gpt-5` | alloy，运行时在同对话交替模型 | {{docs-agent Models}} |
| `auto` | `model: auto` | 首个有凭据云 provider，否则已拉取 DMR 模型 | {{docs-agent Set up a model}} |
| `first_available: [...]` | 引用列表 | 加载时解析首个已配置凭据候选 | {{docs-agent Models}} |
| `--model [agent=]provider/model` | `--model root=dmr/ai/qwen3` | CLI 覆盖，可逐 agent 重复 | {{help-agent docker-agent run}} |

## auto 规则 {#s-ref-providers-and-models-the-auto-rule}

auto 先选首个有凭据云 provider，再选本地已拉 Model Runner 模型 {{docs-agent Set up a model}}。DMR 优先 model: 指定且已拉取的模型；否则取首个可用非嵌入模型，而非要求拉 ai/qwen3:latest {{docs-agent Docker Model Runner}}。从不选 providers 下自定义 provider {{docs-agent Provider Definitions}}。DOCKER_AGENT_DEFAULT_MODEL 设置未给模型时的默认 {{docs-agent User settings}}。录制机器无凭据、runner 不可达时，doctor 仍打印 auto -> dmr/ai/qwen3:latest，并报一个 issue（research/sources/probes/docker-agent-doctor.txt）。

## DMR 端点 {#s-ref-providers-and-models-the-dmr-endpoint}

| 步骤 | 端点 | 来源 |
|---|---|---|
| 1 | 已设置时用模型或 provider 的 base_url | {{docs-agent Docker Model Runner}} |
| 2 | docker model 插件报告的端点；doctor 经 Desktop context 执行 docker model status --json | research/sources/probes/docker-agent-doctor.txt |
| 3 | 找不到插件时默认 `http://127.0.0.1:12434/engines/llama.cpp/v1` | {{docs-agent Docker Model Runner}}，03-stack.md 说明14 |
| 容器中 | `http://model-runner.docker.internal/engines/v1`，provider 配 unload_api: /engines/_unload | {{docs-agent Docker Model Runner}} |
| 卸载 | base_url 尾部 /v1 替换为 _unload，由 on_agent_switch 的 unload 内置调用 | {{docs-agent Docker Model Runner}} |

runner 无需 API key，API 无认证（[冲突 C84](#s-ref-sources-and-the-conflicts-register)）。文档只说找不到插件时用默认 URL；上表按研究文件理解，将它排在 base_url 与插件之后第三位。

## 模型网关 {#s-ref-providers-and-models-the-models-gateway}

--models-gateway 与 DOCKER_AGENT_MODELS_GATEWAY 经一个地址路由模型流量；bypass_models_gateway: true 或自定义 base_url 则直达 provider {{docs-agent Model Configuration}}。docker agent models 先问网关 /v1/models，无可用响应则用有凭据 provider {{docs-agent features/cli}}。Docker 网关需要 Docker token；Desktop 提供15分钟有效 token，没有时 docker-agent 经 HTTPS 将 docker login access token 交换为新 token {{docs-agent Secrets}}。交换缓存于缓存目录，DOCKER_AGENT_NO_TOKEN_EXCHANGE=1 关闭，docker agent debug auth 显示所用 token。

## 模型调优键 {#s-ref-providers-and-models-keys-that-tune-a-model}

| 键 | 适用对象 | 值 | 来源 |
|---|---|---|---|
| `temperature`, `top_p`, `frequency_penalty`, `presence_penalty` | 全部 provider | 每请求发送的采样参数 | {{schema ModelConfig}} |
| `max_tokens` | 全部 provider | 每响应输出 token，不是上下文窗口 | {{schema ModelConfig}} |
| `thinking_budget` | OpenAI | `none`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`；xhigh 需 gpt-5.2以上，none/max 需 gpt-5.6以上 | {{schema ModelConfig}} |
| `thinking_budget` | Anthropic | 1024至32768整数、adaptive、adaptive/<effort> 或 effort 级别 | {{schema ModelConfig}} |
| `thinking_budget` | 带 Claude 的 Amazon Bedrock | 整数或 low、medium、high | {{schema ModelConfig}} |
| `thinking_budget` | Gemini 2.5 | 整数，-1动态，0关闭，最多24576 | {{schema ModelConfig}} |
| `thinking_budget` | Gemini 3 | minimal 仅 Flash；low、medium、high | {{schema ModelConfig}} |
| `thinking_budget` | llama.cpp 上的 DMR | 经 _configure 发 llamacpp.reasoning-budget；vLLM 每请求发 thinking_token_budget；MLX/SGLang 忽略 | {{docs-agent Docker Model Runner}} |
| `task_budget` | Anthropic | 整数或 {type: tokens, total: N}，以 output_config.task_budget 发送 | {{schema ModelConfig}} |
| `provider_opts.context_size` | DMR | 经 _configure 发上下文窗口；max_tokens 从不是窗口 | {{docs-agent Docker Model Runner}} |
| `provider_opts.runtime_flags`, `raw_runtime_flags` | DMR | 推理运行时 flags，列表或字符串，两键互斥 | {{docs-agent Docker Model Runner}} |
| `provider_opts.keep_alive` | DMR | Go duration，0立即卸载，-1永不卸载 | {{docs-agent Docker Model Runner}} |
| `provider_opts.mode` | DMR | `completion`, `embedding`, `reranking`, `image-generation` | {{docs-agent Docker Model Runner}} |
| `provider_opts.speculative_draft_model`, `speculative_num_tokens`, `speculative_acceptance_rate` | DMR | 使用草稿模型的推测解码 | {{docs-agent Docker Model Runner}} |
| `provider_opts.gpu_memory_utilization`, `hf_overrides` | vLLM 上的 DMR | 经 _configure 发送引擎设置 | {{docs-agent Docker Model Runner}} |
| `provider_opts.supports_images`, `supports_pdf` | DMR | 声明附件类型，因为 DMR 模型不在 models.dev 目录 | {{schema ModelConfig}} |
| `provider_opts.http_headers` | OpenAI 兼容 provider | 每请求 headers，如 Copilot 集成 id | {{schema ModelConfig}} |
| `fallback.models`, `retries` (`2`), `cooldown` (`1m`) | 全部 provider | 失败后按退避尝试的模型 | {{schema FallbackConfig}} |
| `capabilities`, `output_capabilities`, `cost` | 全部 provider | 附件标志、图像输出与覆盖目录的美元价格 | {{schema ModelConfig}} |
| `title_model`, `compaction_model`, `compaction_threshold` (`0.9`) | 全部 provider | 标题/摘要用低价模型及压缩点 | {{schema ModelConfig}} |
| providers.<name> 默认值 | 全部 provider | temperature、max_tokens、thinking_budget、task_budget 及其他继承默认值 | {{docs-agent Provider Definitions}} |

文档逐 provider 给默认推理 effort {{docs-agent Models}}：OpenAI 必须推理模型为 medium，Anthropic 关闭，Gemini 2.5 为 -1，Gemini 3 取决于模型。

Sources: research/sources/probes/docker-agent-doctor.txt, docker-agent-models-list.txt; research/sources/agent-schema.json (`ModelConfig`, `ProviderConfig`, `FallbackConfig`); research/sources/docs-docker-agent.md (pages concepts/models, configuration/models, providers/overview, providers/custom, providers/dmr, getting-started/set-up-a-model, guides/secrets, configuration/user-settings, features/cli); research/sources/help-docker-agent.md (`run`, `models`, `doctor`); /Users/rohitghumare/.cache/aiefs-manuals-wip/docker-research/03-stack.md note 14; research/conflicts-register.md rows C58, C84
