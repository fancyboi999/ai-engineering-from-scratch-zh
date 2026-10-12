# Docker Sandboxes 与 Docker Agent 入门录制套件

手册每个 listing 都截自 out/ 文件。套件在运行宿主驱动真实 sbx、docker-agent、docker，记录输出，遮蔽每次变化值，仅用 Python 标准库。本目录记录来自上游，不表示中文镜像在本机重新执行；录制任务需另行授权。

```bash
python3 run.py                  # 写out/，重放cassettes/
python3 run.py --re-record      # 重新录制全部cassette，使用Model Runner
python3 run.py --check          # 录至临时目录，与out/比较
python3 run.py --tier a         # 仅无守护进程、网络、模型的步骤
python3 run.py --tier ab        # 不含模型级
python3 run.py --only K09,K10   # 开发用步骤子集，之前步骤需保留沙箱
```

完整三级从清空 out/ 开始，保留两个一次性文件，重写 out/README.md。少于三级（包括跳过M的默认运行）或 --only 只重写对应步骤文件，删除对应 <step>-error.txt，其余包括 out/README.md 保持。--check 只写临时目录与忽略的 work/，不录 cassette。cassettes/ 缺文件会报漂移。

此主题不能满足手册标准要求的离线录制。sbx 需登录 Docker，从Hub镜像启动真实microVM，agent需模型。因此套件分级，宿主不能运行时 run.py --check 跳过并退出0，让没有这些程序的仓库CI通过。有docker-agent/sbx/docker却无runner或ai/qwen3时，运行A/B并打印tier m skipped。

## 级别

| 级别 | 要求 | 本版内容 |
|---|---|---|
| A | 安装docker-agent/sbx/docker客户端；无守护进程、网络、模型、key | K00版本、K01根帮助、K16 version/doctor/toolsets/models list/sandbox list/run --dry-run、K29 Desktop4.94旧命令（docker sandbox、docker agent version、插件列表） |
| B | sbx v0.47.0已登录、sandboxd、Hub拉镜像、example.com/mcp.deepwiki.com出站HTTPS | 生命周期、端口、cp、策略、宿主接收器密钥、MCP、v2/v3 kit、env plan、skills、模板、--clone、prune、share pull |
| M | Desktop4.94.0、TCP12434 Model Runner、已拉ai/qwen3:4b、容器docker守护进程、Compose、buildx、本地registry | K17至K28：new、单agent、团队、权限/hooks、会话、eval、五服务、share、DMR、Compose、run --sandbox、v3构建；K98移除创建对象 |
| C | 费用（Cloud Sandboxes）、GitHub token、修改 ~/.ssh/config | 未实现；--tier abcm打印说明并运行A/B/M；run.py的STEPS用c字母归类步骤 |

A级用不存在的context DOCKER_CONTEXT=m101-no-daemon运行doctor、models list、run --dry-run，因此每台宿主无论有无Desktop都展示无runner路径（16-doctor.txt、16-dry-run.txt）；K25录可达runner的doctor（25-doctor.txt）。

## 模型级与 cassette

M级每agent用宿主runner的dmr/ai/qwen3:4b。无runner时doctor为auto指定8B的dmr/ai/qwen3:latest（16-doctor.txt）；只拉4B时指定dmr/docker.io/ai/qwen3:4b（25-doctor.txt）。录制宿主两次8B拉取在最后5.03GB blob后digest不符（25-model-pull-latest.txt），因此全部文件与--judge-model用同仓库文档4B tag。无托管provider或API key。

`docker-agent run --record=cassettes/NAME` 将模型HTTP交互写YAML（go-vcr v2 cassette：发送请求与收到的流式回复）；--fake cassettes/NAME经本地假代理重放，无需模型。serve api也接受两flags。运行发现三点：record只接受--record=PATH，分开词视为agent引用；路径相对--working-dir，所以套件传绝对路径；dmr录制代理回400，除非加--models-gateway http://localhost:12434/engines，显式providers.*.base_url则绕过录制、cassette为空。文件缺失或--re-record时录一次，丢弃该次输出；录前移除work/cassettes/旧文件，录制会话存--data-dir work/record-data，只有重放进入work/data/session.db（21-session-db.txt）。out/各重放输出来自--fake，所以跨宿主check条件相同。cassette以cassettes/NAME.yaml.gz提交，目录遮为$CAPTURE/$HOME。run.py按执行宿主路径解包到work/cassettes/，因为重放按正文匹配，部分正文含工作目录；re-record后再打包。它用realpath解析自身目录，子命令环境去掉PWD；即使通过macOS的/tmp等符号链接访问，命令、cassette、子进程工作路径都一致。文件含prompt、工具定义、模型文本，不含凭据：localhost模型无key，请求也无。ai/qwen3:4b回答前流数千推理token；exec打印后由套件截成[... N lines of model reasoning cut ...]；json丢agent_choice_reasoning并合并agent_choice，*-transcript.txt按序列用户消息、工具调用/结果与答案。

无fake的步骤按temperature: 0实时结果比较：eval（22-*）、serve chat/mcp --http/a2a（23-chat.http、23-mcp.http、23-a2a.http）、显式base_url（25-run-dmr.txt）、run --sandbox（27-*，VM内调用）。文件要求固定答案，变化token/成本/耗时/id被清除。new即使给描述仍开/dev/tty，所以无控制终端运行，17-new.txt记录拒绝。

重放按请求正文匹配。一轮两工具会并行执行，按完成顺序追加结果，后续正文跨运行不同，返回500（requested interaction not found）。4B思考模型遇到一消息两任务会合并调用，parallel_tool_calls: false及逐工具指令都无效（llama.cpp忽略flag）。因此每运行给多消息，每条一调用（docker-agent run … "first" "second"，即帮助中的turn），让录制与重放一致。

M系列笔记本4B模型每带工具录制轮次需一至三分钟，重放数秒；全部cassette的--re-record约半小时。

## 全量运行前置要求

- Apple silicon macOS，Hypervisor.framework（sysctl kern.hv_support为1）。
- Homebrew cask sbx v0.47.0已登录（由你sbx login，套件不登录），守护进程健康；status失败时套件启动一次。
- Homebrew docker-agent v1.149.0在PATH排Desktop插件前；docker agent是内置v1.144.0，仅K29使用。
- Desktop4.94.0运行（Engine29.8.2、buildx0.37.2、Compose5.5.1、docker model1.2.6），runner开启宿主TCP12434（model status为running，curl http://localhost:12434/engines/v1/models响应），你已拉ai/qwen3:4b（约2.5GB）。套件不自行拉模型，但加载DMR文件的任意docker-agent命令会拉缺失模型，所以model ls列出4B前拒绝M级。
- Python3.12以上、git、curl。
- 磁盘：B级shell-docker镜像和一个模板约1.3GiB；M级需registry:2、alpine:3.22、docker/mcp-gateway、docker/docker-agent:1.149.0、docker/sandbox-templates:shell（压缩521MB）、docker/sandbox-kit:3、moby/buildkit:buildx-stable-1，以及docker/docker-agent-sbx-templates:latest。
- 空闲宿主端口18080密钥接收器、18081沙箱端口、8080/8081/8082/8083的api/mcp/a2a/chat、15000本地registry；macOS5000被AirPlay Receiver占用，故绑定127.0.0.1:15000。
- 全局策略未初始化或已为balanced。未初始化则一次policy init balanced并记03-policy-init.txt。绝不执行reset、policy reset、setup ssh、login、logout或任何--cloud；不改全局规则或settings键。

cassette重放且镜像已有时，M系列笔记本全三级约17分钟：B约八镜像，其余供实时eval、五服务、沙箱运行、kit构建；首次拉取及re-record另计。

## 创建与移除对象

对象均为m101-*：沙箱m101-demo/demo-2/secret/mcp/mcp-dyn/kit/from-tpl/clone/v3；模板m101-tpl:v1；MCP注册m101-deepwiki；变量M101_开头的自定义密钥；m101-net网络上的m101-registry；builder m101-builder；Compose项目m101；镜像localhost:15000/m101/hello-kit:*与localhost:15000/docker/sandbox-templates:shell；以及run --sandbox为fixtures/repo创建的沙箱。开头清理旧尝试残留，结尾对上述对象运行sbx rm/template rm/mcp rm/secret rm、docker rm/network rm/buildx rm/image rm，以及只卸载套件模型的docker model unload ai/qwen3:4b（98-model-final-state.txt、99-final-state.txt）。沙箱规则随沙箱删除；全局策略和已拉镜像保留。

模型级每命令都传--config-dir work/cfg、--data-dir work/data（session.db）、--cache-dir work/cache（models.dev目录和kit），不读写~/.cagent或~/.config/cagent。录cassette改用work/record-data；out/命令行省略三个flags。

仅存假值m101-dummy-receiver-0000（自定义密钥，最后移除）与m101-chat-key（serve chat的api-key，仅服务器运行时存在）；不读写真实token、key或密码。

## Fixtures

| 路径 | 用途 |
|---|---|
| `fixtures/repo/` | 每次生成含固定日期两提交的git仓库，跨宿主hash一致，也是agent工作目录 |
| `fixtures/repo-clone/`, `fixtures/repo-kit/`, `fixtures/repo-sandbox/` | repo的新副本，用于--clone、--kit、v3与run --sandbox；后者需工作区内data-dir（repo-sandbox/.m101-data） |
| `fixtures/kits/hello-mixin/` | v2 mixin（spec.yaml、files/workspace/HELLO.md），安装tree，允许example.com |
| `fixtures/kits/env-mixin/` | 一个变量与允许主机的v2 mixin，是kit add接受的形态 |
| `fixtures/kits/hello-kit/kit.yaml`, `HELLO.md` | v3 workload，syntax3、基于shell的内联build、network-policy@2；v2拒绝（13-*），buildx构建推送（28-*） |
| `fixtures/env/sbxenv.yaml` | sbx env plan环境文件 |
| `fixtures/agents/greeter.yaml` | run --dry-run文件 |
| `fixtures/agents/files.yaml` | filesystem/shell单agent，dmr/ai/qwen3:4b、temperature0（K18/K21/K22/K24） |
| `fixtures/agents/files-sandbox.yaml` | 同agent加providers块，base_url http://host.docker.internal:12434/engines/llama.cpp/v1，供沙箱K27 |
| `fixtures/agents/team.yaml` | root含sub_agents: [writer]、handoffs: [reviewer]及background_agents（K19） |
| `fixtures/agents/guarded.yaml` | shell含allow/deny模式与preempt_yolo: true的pre_tool_use命令hook（K20） |
| `fixtures/agents/dmr.yaml` | DMR显式providers块，base_url http://localhost:12434/engines/llama.cpp/v1（K25）；URL绕过record，每次实时 |
| `fixtures/agents/pong.yaml` | 回答pong的agent，五种服务（K23） |
| `fixtures/hooks/log-hook.sh` | hook把stdin JSON追加$M101_HOOK_LOG，打印allow决定 |
| `fixtures/evals/*.json`, `fixtures/evals/working_dirs/repo/` | 文档格式两eval（shell、list_directory、相关性声明、长度）与挂载工作目录 |
| `fixtures/compose/compose.yaml` | 顶层models、use_api_socket: true的docker/mcp-gateway、打印注入LLM_URL/LLM_MODEL的printer |
| `fixtures/mcp-probe.sh` | 沙箱内对$MCP_GATEWAY_URL运行initialize/notifications/initialized/tools/list，带Mcp-Session-Id |
| `cassettes/*.yaml` | --fake重放的18-files、19-team、19-background、20-strict、20-restricted、23-api；包含全部流式推理token，合计约16MB |

生成目录见.gitignore。work/存模板tar、kit zip、拉取文件、agent状态、服务日志、eval结果和buildkitd.toml，每次重建。

## 遮蔽规则

写文件时遮蔽，out/无用户名/id/时间戳。除README末尾宿主事实外，check逐字节比。路径遮蔽只匹配路径终点，因此/home/dev不改/home/developer；用户名仅路径段，Docker用户仅signed_in_as后，用户root不改agent root。规则在run.py的MASKS、mask_text逐行规则及SCRUB_KEYS：

| 模式 | 标记 |
|---|---|
| realpath后的本目录绝对路径 | `$CAPTURE` |
| 家目录，然后/后的用户名路径段 | `$HOME`, `$USER` |
| signed_in_as（mcp ls --json）或signed in as后的Hub用户 | `<docker-user>` |
| m101-policy-<6hex>/m101-secret-<6hex>每次后缀；新名用于隔离守护进程跨rm保留的日志 | `m101-policy`, `m101-secret` |
| UUID：沙箱、策略/规则、SANDBOX_ID、会话 | `<uuid>` |
| 12位hex镜像/层id、kit-<hash>、swap容器名称 | `<id>`, `-swap-<id>` |
| 64位hex digest/容器id | `sha256:<digest>`, `<sha256>` |
| RFC3339、YYYY/MM/DD hh:mm:ss日志、LAST SEEN、HTTP Date | `<ts>`, `<http-date>` |
| 127.0.0.1:、[::1]:、::1:或host_port后的49152至65535临时端口 | `<port>` |
| Mcp-Session-Id和SSE事件id | `<session>`, `<event-id>` |
| 自定义占位sbx-cs-…、sk-… | `sbx-cs-<rand>`, `sk-<rand>` |
| `PROXY_CA_CERT_B64` | `<base64>` |
| 安装耗时、诊断字节、可用空间、请求计数、镜像大小、ls日期、df列、N days ago | <dur>、<n>、<date>、<age>、<size>等 |
| create拉取进度块（首次下载，后续已有） | `<layers>` |
| 工具调用id（文本call_…、JSON tool_call_id/id下20字符以上）、chat completion id、sandbox-kits hash、eval运行名 | `call_<id>`, `<call-id>`, `chatcmpl-<id>`, `sandbox-kits/<hash>`, `<run>` |
| mcp-gateway bearer token、网关耗时、ANSI及Compose重复进度 | Bearer <token>、<dur>，或丢弃 |
| buildx步骤耗时与View build details链接 | `DONE <dur>`, `<url>` |
| Compose Container/Network/Volume/Image行后的进度耗时 | `<dur>` |
| SCRUB_KEYS中token/成本/时间戳/耗时/序列键的JSON数字 | `"<n>"` |

policy log写前过滤排序。守护进程按沙箱名称保存且跨rm保留，第二次可看到第一次行，原排序按时间。套件仅保留自己接触主机：example.com:443、接收器localhost:18080/gateway.docker.internal:18080、模板每次启动接触的ports.ubuntu.com:80/download.docker.com:443，按主机排序；集合为run.py的DEMO_HOSTS、SECRET_HOSTS。

28-buildx*.txt丢层传输行，每步骤只留一次；28-manifest.json解码vnd.docker.sandbox.kit.descriptor，将派生provides截为五项。

03-policy-init.txt仅初始化全局策略那次写，不参与check。录制宿主在首运行前几小时手工用同命令sbx policy init balanced初始化，out/按套件格式保留当时输出。25-model-pull-latest.txt为8B失败日志，一次写、不比较。

## 录制环境

- sbx v0.47.0（revision 0411f50ee4700fe7bd37e6e7e3aced563e850ca9，API0.38.0），shell-docker模板image id1560168ac5fb（Ubuntu26.04.1、内核7.0.14、Engine29.8.1）
- Homebrew docker-agent v1.149.0，旁有Desktop插件docker agent v1.144.0
- Desktop4.94.0：client29.2.1、Engine29.8.2、buildx0.37.2、Compose5.5.1、mcp0.44.1、model1.2.6及llama.cpp b9879-metal；docker/sandbox-kit:3解析3.0.0-m.8
- localhost:12434的DMR ai/qwen3:4b；录制宿主无法拉ai/qwen3:latest（8B、5.03GB）
- arm64 macOS26.2（25C56）、Python3.14

准确原始行在out/README.md顶部，每次完整三级run.py从sbx version、docker-agent version、docker --version、docker model ls写入。

check比较主题版本：out/README.md的sbx/docker-agent/model行与00-versions.txt两version块；排除宿主事实，即README的docker/host行与00中的sw_vers、uname -m、sysctl kern.hv_support、python3 --version（run.py HOST_FACTS）。所以单独更新macOS/Python/Desktop不使这两文件漂移，下次全量记录新值。但以Desktop为主题的29-docker-plugins.txt仍变化。

## 录制展示但文档或计划没说的行为

- 最后会话结束30秒后自动停止（04-auto-stop.txt，auto-stop grace period expired）；exec、cp、ports --publish重新启动。各录制命令前exec NAME true避免started successfully随机出现。
- 同作用域已有allow的主机，deny被拒为冲突（09-deny-conflict.txt）；帮助说拒绝优先，但守护进程不存这对规则。
- 非终端template save拒绝运行沙箱，要求先stop（07-template-save.txt）；inspect本版仅云（07-template-inspect.txt）。
- validate/pack拒绝v3；inspect通过Docker守护进程及自己的builder kit构建，Desktop4.94默认overlay2报OCI exporter is not supported for the docker driver（13-kit-v3-inspect.txt、28-kit-inspect-source.txt）。sbx kit产物命令仅v1/v2。
- 默认docker driver的buildx -f kit.yaml --push推Docker schema2、丢全部注解（28-buildx-docker-driver.txt、28-manifest-docker-driver.json）；docker-container推OCI index，平台manifest含四kit与派生OCI键（28-buildx.txt、28-manifest.json），index无，尽管规范要求attestation存在时提升（28-index.json）。builder看不到守护进程镜像，所以发布基础镜像到本地registry，在work/buildkitd.toml声明为docker.io镜像（28-builder.txt）。
- kit.allowedSources默认docker.io/，inspect和create都拒绝推送kit（28-kit-inspect.txt、28-run-kit.txt）；套件不改设置。
- kit add拒静态文件mixin，接受仅变量/安装命令/允许网络的mixin（12-kit-add-files.txt、12-kit-add.txt）。
- 帮助registry示例https://registry.modelcontextprotocol.io/v0/servers/fetch-mcp/versions/latest返回404（11-mcp-add-registry.txt）。
- 自定义密钥只到之后新建沙箱，已有沙箱无变量（10-env-existing.txt、10-env-sentinel.txt）；代理对绑定主机替换任意header中的占位值，带/不带Bearer都可（10-receiver.log）。
- 内部代理gateway.docker.internal:3128，MCP_GATEWAY_URL=http://mcp-gateway.docker.internal/mcp；host.docker.internal经localhost:18080等规则到宿主（04-env.txt、04-guest.txt、10-*）。
- exec/strict下无模式决定会发confirmation，无终端工具结果为The user rejected the tool call；restricted的同pwd执行打印$CAPTURE。两者allow运行echo，deny以denied by permissions configuration拒rm（20-strict.txt、20-restricted.txt、20-restricted.ndjson）。一消息三命令时模型并行调shell，pre_tool_use同时三次，两次同时追加日志；log-hook.sh每记录一个printf，20-hook-stdin.jsonl排序。套件改为每消息一命令。
- 单消息4B模型同轮transfer_task/handoff，套件用两消息（19-transcript.txt）。exec默认安全下run_background_agent需确认，无终端拒绝，模型重复至第五次停止（detected 5 consecutive identical calls，19-background.txt）。
- Desktop的Compose5.5.1注入LLM_URL=http://model-runner.docker.internal/v1/、LLM_MODEL=ai/qwen3:4b，而非文档/engines/v1/；容器GET ${LLM_URL}models成功（26-compose-up.txt）。网关无服务器，打印随机bearer token，裸请求401。
- run --sandbox拒工作区外data/cache/config-dir（must be inside the sandbox's writable workspace，27-data-dir-outside.txt），不碰~/.cagent则必须放工作区。启动打印模型网关、models.dev允许、sandbox allow主机、工作区rw/agent目录ro/kit ro/config ro、镜像及VM规格，创建docker-agent-<hash>（27-sandbox-run.txt、27-sbx-ls.txt、27-kit-cache.txt）。内部模型调用前SQLite无法在virtiofs建会话库（attempt to write a readonly database (1032)）；同挂载python3 sqlite3插入复现（27-sqlite-probe.txt）。VM按文档仍运行，套件以exec及/tmp/m101状态、base_url http://host.docker.internal:12434/engines/llama.cpp/v1在内部执行任务；经sandbox allow的localhost:12434代理访问宿主模型（27-inside-run.txt），最后移除。
- latest模板内是version main、commit154b78f2，不是v1.149.0；每次自更新因非release版本串失败（27-inside.txt）。内部sandbox list为空：持久允许留宿主，以代理规则到达，不是文件。
- Desktop4.94仍列sandbox v0.13.0，docker sandbox仅输出移除通知，退出1（29-docker-plugins.txt、29-docker-sandbox.txt）。
- record NAME/fake NAME追加.yaml；否则fake报requested cassette not found: NAME.yaml。
- 任何加载未拉DMR模型的命令都会自行model pull，包括debug toolsets/dry-run。录制宿主两次8B latest的docker model pull ai/qwen3在末5.03GB blob后digest不符，每次hash不同；doctor无runner为auto指定它。日志25-model-pull-latest.txt，套件用4B录。
- share push到普通HTTP localhost:PORT无需insecure-registry；manifest含io.docker.agent.version、io.docker.cagent.version、artifactType application/vnd.docker.agent.config.v1+json（24-manifest.json）。
- a2a仅在/.well-known/agent-card.json发布，agent.json及POST /为404；card指定/invoke JSONRPC1.0，1.0名称SendMessage回COMPLETED任务、artifacts答案、adk_*元数据，GetTask回带history同任务（23-a2a.http）。mcp --http在/mcp及/以SSE JSON-RPC响应，版本2025-11-25，工具唯一参数message，call回structuredContent: {"response": …}（23-mcp.http）。chat模型id为root而非文件名，无bearer为401（23-chat.http）。api需{"messages": [{"role": "user", "content": …}]}，SSE与run --json同事件，含推理（23-api-run.sse）。acp initialize回agentCapabilities，session/new结果前通知slash命令（23-acp.jsonl）。
- eval的dmr容器无docker CLI发现端点（exec: docker: executable file not found in $PATH，22-eval.txt）；--models-gateway http://model-runner.docker.internal/engines也移动judge，宿主不可达403（22-eval-gateway.txt）。-e DOCKER_AGENT_MODELS_GATEWAY=http://model-runner.docker.internal/engines只改容器，judge留localhost:12434，两项运行、长度/相关性通过；列文件多一调用F1 0.67（22-eval-container-env.txt、22-eval-run-container-env.json）。两eval加judge，4B约五分半。
