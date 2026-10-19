# 术语表

> 以下术语在整本手册中含义一致，并注明定义所在章节。

每个术语只定义一次，位置见最后一列，来源见对应章节。下列含义来自固定标签的 rea 源码、文档、规范与捕获记录。

| 术语 | 本手册中的含义 | 定义位置 |
|---|---|---|
| 分析配置 | 提供器提交采用的设置，对其 RFC 8785 规范 JSON 求 hash，因此契约版本变化会改变摘要 | [1.2](#s-rea-function-end-to-end) |
| 分析快照缓存 | 单个会话的内存表，为一个目标身份最多保留 10,000 条缓存答案 | [5.3](#s-snapshots-and-the-answer-cache) |
| 应用图 | 以节点和有向边表示 JavaScript 应用的提供器中立模型，仅依据语法构建，每条边都有证据块 | [6.1](#s-analyze-javascript-application) |
| 产物图 | rea 对文件及内部文件建立的清单：每份不同 SHA-256 内容一个节点，每个位置一个出现项，容器到成员建立边 | [3.1](#s-inspect-artifact) |
| 权威性 | 事实背后的来源类别：`shipped-artifact`、`controlled-replay`、`historical-reference`、`external-service`、`analyst-inference` | [5.1](#s-the-evidence-record) |
| 基本块 | 顶部单一入口、底部单一出口的一段指令 | [4.3](#s-procedure-assembly) |
| 基本块列表 | 档案中的 `basic_blocks` 列表，结束地址不包含在范围内 | [1.2](#s-rea-function-end-to-end) |
| 桥接层 | `ReaGhidraBridge.java`，通过 Unix socket 每请求处理一行 JSON 的 Ghidra 后置脚本 | [1.1](#s-rea-providers-and-evidence) |
| 能力 | 一组共享操作，包含 `available` 标志、不可用时的原因和代码、七种影响中的有效项，以及限制 | [2.3](#s-rea-capabilities) |
| 规避 | 按 17 U.S.C. 1201(a)(3)(A)，未经版权所有者授权，避开、绕过、移除、停用或削弱技术措施 | [2.1](#s-the-readme-use-rule-and-the-law) |
| 声明状态 | `verify_reconstruction` 单个声明的 `pass`、`fail` 或 `unknown`，依次根据权威性限制、观测状态、未决未知项计算 | [7.1](#s-verify-reconstruction) |
| 组合操作 | 由其他操作构成的 rea 操作，提供器为 `rea-workflow`，`confidence: "derived"` | [3.4](#s-analyze-overview) |
| 置信度 | `observed`、`derived`、`inferred` 三个词之一，绝不是数字 | [5.1](#s-the-evidence-record) |
| 反编译器产物 | 反编译器需要、却并非由任何源码行生成的伪代码行 | [4.6](#s-analyze-function-and-pseudocode) |
| 函数档案 | `analyze_function` 返回的单函数组合记录，由五个 Ghidra 来源构建 | [4.6](#s-analyze-function-and-pseudocode) |
| Evidence | 每次成功分析调用返回的统一记录类型，具有 16 个字段的严格对象 | [1.1](#s-rea-providers-and-evidence) |
| 证据包 | 包含七个数组的 JSON 对象：`artifacts`、`providers`、`environments`、`scenarios`、`captures`、`unknowns`、`records` | [5.4](#s-evidence-bundles-export-and-import) |
| 证据台账 | Agent 在调查中维护的表，每个声明一行，注明类别、Evidence 标识和边界 | [8.2](#s-an-agent-investigation) |
| 证据记录 | 记录类型本身，[第 5 部分](#p-5)逐字段解读 | [5.1](#s-the-evidence-record) |
| 文件偏移 | 字节在文件中从零计数的位置 | [3.3](#s-address-to-file-offset) |
| 函数体 | Ghidra 分配给函数的地址集合，以包含结束地址的范围报告 | [4.2](#s-list-procedures-and-function-bodies) |
| 函数匹配 | `compare_functions` 判定两份档案描述同一函数的方式，捕获中为通过 `symbol` 得到 `matched` | [5.5](#s-compare-and-compare-functions) |
| 函数起始地址 | Mach-O 映像中的 LEB128 差值表，标识各函数入口 | [4.4](#s-xrefs-and-the-jump-table) |
| Ghidra 提供器 | 通过 `analyzeHeadless` 驱动已安装 Ghidra 的 rea 适配器，固定为 12.1.4 与 JDK 21 | [2.2](#s-rea-doctor-and-the-ghidra-provider) |
| 无界面导入 | 不打开窗口，将文件导入项目并执行默认分析器的 Ghidra 运行 | [4.1](#s-open-binary-and-the-headless-bridge) |
| 输入网格 | 证明框架送给原始实现与重建实现的输入单元列表，每类单元对应一种风险 | [7.2](#s-a-proof-harness-outside-rea) |
| 跳转表 | 由间接跳转索引的代码地址表 | [4.4](#s-xrefs-and-the-jump-table) |
| 加载命令 | Mach-O 文件头之后的一条记录，包含 `cmd` 类型和 `cmdsize` | [3.2](#s-inspect-binary-layout-and-the-load-image) |
| 过程 | 档案中的函数身份：地址、函数体范围、签名与分类 | [1.2](#s-rea-function-end-to-end) |
| 提供器 | 统一接口背后的分析引擎。6.7.0 的二进制会话有四个候选：`hopper`、`ghidra`、`ida`、`kuna` | [1.1](#s-rea-providers-and-evidence) |
| 查询标识 | `query_` 加单条缓存答案的目标身份、绑定、操作和参数的 SHA-256 | [5.3](#s-snapshots-and-the-answer-cache) |
| 引用 | 档案中的入边与出边，每条都有 Ghidra 引用类型 | [1.2](#s-rea-function-end-to-end) |
| 重定位掩码 | 字节比较前，将两个函数所有重定位字段清零，再比较记录并读取其指向的字节 | [7.2](#s-a-proof-harness-outside-rea) |
| 残留未知项 | 证据尚未解决的问题，以记录保留，包含 `unk_` 标识、修订链、状态和可关闭该问题的证据 | [5.2](#s-residual-unknowns-and-coverage) |
| 语义投影 | 计算记录标识 hash 所用的视图，排除 `subject.name` 与 `subject.local_path` | [5.1](#s-the-evidence-record) |
| 快照文件 | `close_binary` 写入、`open_binary` 读取的 JSON 文件，包含目标身份、绑定、缓存条目和证据包 | [5.3](#s-snapshots-and-the-answer-cache) |
| 规格 | `verify_reconstruction` 的输入：名称及至少一个包含类别、维度、比较标识的声明 | [7.1](#s-verify-reconstruction) |
| 启动期限 | rea 允许 Ghidra 导入、分析、连接并报告健康的时间，默认 330,000 ms | [8.1](#s-the-rea-mcp-server) |
| `Surface` | 调用方访问会话的入口：单次 CLI 或 MCP 服务 | [1.1](#s-rea-providers-and-evidence) |
| 目标快照 | 输入的私有副本，Ghidra 启动器携带 `-readOnly`、`-deleteProject` 导入，并在会话关闭时删除 | [5.3](#s-snapshots-and-the-answer-cache) |
| 目标文本 | 结果从被分析文件复制的字符串、符号名、注释与伪代码行，应引用而绝不执行 | [8.2](#s-an-agent-investigation) |
| Thunk | 只负责跳转到另一个函数的小函数 | [4.2](#s-list-procedures-and-function-bodies) |
| 工具目录 | MCP 服务在 `tools/list` 中公开的全部 207 个工具，不论当前是否可用 | [8.1](#s-the-rea-mcp-server) |
| 值表 | 由加载指令索引的数据表，使一条指令返回多个值中的一个 | [4.4](#s-xrefs-and-the-jump-table) |
| 虚拟地址 | 加载器映射包含某字节的段后，该字节在内存中的位置 | [3.3](#s-address-to-file-offset) |

Sources: the definition paragraphs of every file under sections/; rea at 27dc42d: src/domain/evidence.ts, src/domain/evidenceBundle.ts, src/domain/residualUnknown.ts, src/domain/reconstructionVerification.ts, src/config/providerStartupTimeout.ts, src/contracts/toolOutputSchemaPrimitives.ts; capture/out/02-capabilities.json; rea docs/mcp-contracts.md
