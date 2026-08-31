# MCP Registry 供应链：准入、漂移与回滚

> Registry 条目只能说明发布者声明了什么。生产准入要证明你获取了什么、观察到了什么、批准了什么，以及能安全恢复到什么。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 13 · 17（网关和 Registry）、阶段 13 · 18（生产认证）
**预计时间：** 约 90 分钟

## 学习目标

- 区分 Registry 发布、包来源、运行时发现与本地审批。
- 在不信任记录自身名称的前提下验证 MCP 服务器命名空间。
- 固定不可变的发布、执行源、来源和实时描述符证据。
- 在准入后发现 Registry 状态变更和运行时漂移。
- 不改写历史，将路由回滚到先前已准入的版本。
- 维护一份能解释每项决策、防篡改留痕的准入账本。

## 问题背景

你在 Registry 中发现了 `com.example/inventory`。它的描述看起来没问题，包也存在，服务器还能响应 `server/discover`。

这并不是一个事实，而是一串来自不同权威方的事实：

1. 通过某个命名空间认证的发布者提交了一条记录。
2. 包 Registry 提供了一个具有特定身份和摘要的制品。
3. 正在运行的端点报告了协议版本、能力、工具和诊断用服务器信息。
4. 你的组织决定允许这一组精确的组合。

把这些事实压缩成“它在 Registry 里，所以可以信任”，会制造供应链盲区。有效的发布仍可能已被弃用；如果不固定摘要，包标签可能会指向意外制品；服务器可能在审查后新增破坏性工具；回滚还可能悄悄选中一个从未通过准入的版本。

解决方法是在每个边界都保留证据的准入控制器。

## Registry 是索引，不是你的审批系统

官方 MCP Registry 存储服务器元数据。其 `server.json` 记录会为服务器命名版本，并声明一个或多个包或远程端点。发布规则还包括命名空间认证、包所有权检查、受限 Registry 规则，以及范围有限的发布者元数据位置。

这些控制回答的是发布问题；你的生产策略仍需回答部署问题：

| 边界 | 问题 | 证据所有者 |
|---|---|---|
| 命名空间 | 发布者是否获准使用这个名称？ | Registry 认证加上你已验证的命名空间输入 |
| 记录 | 发布者为此版本声明了什么？ | 不可变的 `server.json` 摘要 |
| 执行源 | 哪个包或远程端点将被执行？ | 声明的源字段、已验证的所有权结果、传输方式和受信摘要 |
| 运行时 | 端点现在暴露了什么？ | `server/discover` 和工具描述符 |
| 准入 | 你的策略是否批准了这一精确集合？ | 本地 pin 和账本条目 |
| 运行 | 它是否仍然安全，又能由什么替代？ | 漂移检查、状态同步、健康状况和回滚路由 |

Registry 架构版本与 MCP 协议版本彼此独立。一条记录可以采用已发布的 `2025-12-11` 服务器架构，而实时服务器支持 MCP `2026-07-28`。绝不能从其中一个推断另一个。

```figure
mcp-registry-admission
```

## 一次准入决策中的七项控制

### 1. 命名空间验证

官方 Registry 名称使用经过认证的命名空间。已验证的域名可以映射为反转后的域名前缀。例如，对 `example.com` 的控制权可以建立 `com.example/*`。

不要接受字符串前缀检查：

```python
server_name.startswith("com.example")
```

这同样会接受 `com.exampleevil/tool`。应在 `/` 处分割名称，要求 slug 非空，并精确比较命名空间段。更重要的是，要将经过验证的命名空间从认证结果传给准入逻辑，不要从不可信记录中推导信任。

基于 GitHub 的命名空间和基于域名的命名空间采用不同的认证路径。把两条路径统一成一个准入输入：精确、已验证的命名空间字符串。

### 2. 来源关联

对于包记录，声明与获取的制品必须通过明确字段关联：

- 包 Registry 类型
- 包标识符
- 包版本
- 已验证的所有权结果
- 下载制品的摘要

还要验证声明的包传输方式。只含远程端点的记录有效，不能因为缺少包而拒绝。对于远程源，要将声明的 URL 与传输类型关联到独立验证的端点所有权，以及受信连接或部署证据的摘要。

本课代码支持两种源类型，并将选定源与 Registry 源、服务器名称、Registry 版本、记录摘要和证据摘要一同哈希。得到的来源摘要是完整证据集的紧凑指针，不能取代对证据本身的保留。

绝不要只接受待验证制品自己提供的摘要。应在受信获取边界计算它，或者从包服务获取，但前提是你验证该服务给出的校验结果。

### 3. 固定决策，而不只是版本

Registry 版本是唯一的发布标识符，已发布的元数据不可变。要修改记录，必须发布新版本。Registry 建议使用语义化版本，但既不强制，也不接受版本范围。

这意味着 `^1.4` 不是准入 pin，“latest” 也不是。一个有用的 pin 包含：

```json
{
  "server": "com.example/inventory",
  "version": "1.0.0",
  "recordDigest": "...",
  "source": {"kind": "package", "registryType": "pypi"},
  "sourceDigest": "...",
  "toolsetDigest": "...",
  "provenanceDigest": "...",
  "registryStatus": "active"
}
```

固定多个层次后，你就能识别究竟是哪道边界发生了变化。同一 Registry 版本下的记录摘要变化，是 Registry 完整性失败；相同包坐标或远程部署下的源摘要变化，是执行源完整性失败；工具集摘要变化则是运行时漂移。

### 4. 实时漂移检测

准入应观察实际将接收流量的服务器。调用 `server/discover`，经由你的受信路径列出或以其他方式获取暴露的工具描述符，并验证：

- `supportedVersions` 包含 `2026-07-28`
- 本地所需能力全部存在
- 每个工具描述符都具备所需的身份和架构表面
- 后续检查时，归一化的描述符摘要与已准入 pin 相匹配

可选结果值 `_meta["io.modelcontextprotocol/serverInfo"]` 是自报的展示、日志和调试上下文。将其记录为诊断证据，但绝不能用它建立命名空间、包所有权、端点所有权、准入或任何其他安全决策。位于 `_meta` 之外的直接 `serverInfo` 别名并不是契约字段，也不应提升为诊断证据。

只归一化顺序没有语义的字段。本示例按稳定名称排序工具列表后再哈希，因此无害的列表顺序变化不会造成漂移；但它不会丢弃描述符字段。新增工具、变更架构、变更描述或新增注解都会改变 pin。

示例会把格式错误的描述符和任何描述符摘要变化都视为漂移：隔离 pin、移除其活动路由，并阻止该版本作为回滚目标。生产策略可以只通过新的审查允许编辑性变更，因为描述会影响模型对工具的选择。“仅是外观”的元数据也会改变 agent 行为。

### 5. Registry 状态是实时状态

Registry API 会在每条服务器记录旁附加响应级 `_meta` 对象。Registry 管理字段位于 `_meta["io.modelcontextprotocol.registry/official"]` 下。应将响应的 `_meta` 对象传给准入逻辑，并读取 `_meta["io.modelcontextprotocol.registry/official"].status`。直接使用 `_meta.status` 并不符合官方线缆形状。不要把响应元数据和发布记录自身的 `_meta` 混淆。状态可以是：

- `active`：默认返回，符合本地自动准入条件
- `deprecated`：仍可发现并带有警告，但不再适合作为安全的自动选择
- `deleted`：默认隐藏，但其历史记录仍可通过 deleted 或增量视图获取

准入后要同步状态。如果活动版本变成 `deprecated` 或 `deleted`，应隔离其 pin 并停止把新工作路由给它。保留证据；从默认列表中删除不等于可以抹掉审计轨迹。

发布者提供的自定义元数据只能位于发布记录中的 `_meta.io.modelcontextprotocol.registry/publisher-provided` 下。Registry 管理的响应元数据与此分离，不要让发布者自行设置官方状态。

### 6. 回滚意味着恢复路由

不可变发布不会在回滚时被编辑。回滚应选择一个先前已准入、当前仍符合条件的 pin，并修改活动路由。

安全的目标必须：

1. 有完整的准入记录。
2. 其 Registry 状态按你的策略仍为活动状态。
3. 未因运行时或安全证据被隔离。
4. 仍解析到已固定的包和实时描述符集合。
5. 通过当前健康检查。

示例只关注前三项。真实的协调器应在激活前重新获取包，并重新检查实时端点。

### 7. 追加准入账本

准入数据库告诉你什么处于活动状态，账本则解释原因。

每个示例条目包含序号、时间、事件、服务器、版本、结果、原因、证据、前一条目哈希和自身哈希。修改旧结果会破坏该条目及其后每一个链接的验证。

这能防篡改留痕，却不是神奇的防篡改机制。应把定期账本头锚定在独立信任域，例如签名发布元数据或一次写入存储；限制谁能追加；不要把授权 token、包凭据、工具参数和私有端点数据写入证据。

## 动手构建

可运行的控制器位于 `code/main.py`，只使用 Python 标准库。

先运行这个有限的演示：

```bash
cd phases/13-tools-and-protocols/30-mcp-registry-supply-chain-and-drift
python3 code/main.py
```

演示会执行五项操作：

1. 以匹配的命名空间、包来源、协议、能力和工具准入 `1.0.0`。
2. 准入 `1.1.0` 并将其设为活动版本。
3. 在运行时发现意外的删除工具。
4. 发现 `1.1.0` 的 Registry 状态变为 `deprecated`。
5. 将路由恢复到仍已准入的 `1.0.0` pin。

预期结构：

```json
{
  "admitted": [true, true],
  "driftAllowed": false,
  "rollbackAllowed": true,
  "activeVersion": "1.0.0",
  "ledgerValid": true
}
```

按以下顺序阅读实现：

1. `namespace_for_domain()` 和 `namespace_matches()` 建立精确的命名权威。
2. `digest()` 和 `normalized_tools()` 生成确定性证据。
3. `RegistryAdmissionController.admit()` 关联发布、来源、运行时和策略。
4. `check_live()` 将新的观察结果与 pin 比较。
5. `observe_registry_status()` 隔离 Registry 状态已改变的版本。
6. `rollback()` 只激活先前已准入且符合条件的目标。
7. `AdmissionLedger.verify()` 检测已记录历史的改动。

## 实际使用

将控制器放在发现和路由之间：

```text
Registry sync -> artifact verifier -> live discovery -> admission controller -> route table
                                               |                 |
                                               v                 v
                                          evidence store    admission ledger
```

为这些工作使用不同身份。Registry 同步工作者需要元数据读取权限，制品验证器需要获取包的权限，路由协调器则需要激活已批准 pin 的权限。它们中没有任何一个需要拥有全部凭据。

要明确发布状态。“Approved” 表示证据已通过策略；“Active” 表示路由当前选中了它；“Quarantined” 表示它不能接收新工作；“Superseded” 表示另一个已准入版本正处于活动状态。不要用一个 Boolean 编码这四种含义。

在服务器暴露于 `tools/list` 之前运行准入。否则，客户端可能在发布和策略评估之间的空档发现工具。

## 交互实验

你将逐次观察一个边界如何失败。

### 实验 A：命名空间碰撞

从代码目录打开 Python shell：

```bash
cd phases/13-tools-and-protocols/30-mcp-registry-supply-chain-and-drift/code
python3 -q
```

随后运行：

```python
from main import namespace_matches
namespace_matches("com.example/inventory", "com.example")
namespace_matches("com.exampleevil/inventory", "com.example")
```

第一个结果是 `True`，第二个是 `False`。在本地把精确比较替换为 `startswith`，观察第二个名称为何跨越了边界。继续前恢复精确比较。

### 实验 B：描述符漂移

```python
from main import *
times = iter(f"2026-08-21T12:00:{n:02d}+00:00" for n in range(10))
c = RegistryAdmissionController(clock=lambda: next(times))
meta = {OFFICIAL_META_KEY: {"status": "active"}}
c.admit(sample_record("1.0.0"), meta, "com.example", evidence_for("1.0.0"), sample_live("1.0.0"))
c.check_live("com.example/inventory", "1.0.0", sample_live("1.0.0", True))
```

检查原因和路由状态。包和 Registry 记录都没有变化，运行时工具表面却发生了变化，因此控制器隔离并停用了 pin。这就是为什么供应链控制必须在安装之后持续进行。

### 实验 C：状态与回滚

准入 `1.1.0`，将它标记为已弃用，并尝试两个回滚目标：

```python
c.admit(sample_record("1.1.0"), meta, "com.example", evidence_for("1.1.0"), sample_live("1.1.0"))
c.observe_registry_status("com.example/inventory", "1.1.0", "deprecated")
c.rollback("com.example/inventory", "1.1.0", "unsafe retry")
c.rollback("com.example/inventory", "1.0.0", "restore known release")
c.ledger.verify()
```

被隔离的目标会被拒绝，较早的活动 pin 会被接受，账本仍然有效。

## 实践实验

为控制器扩展一个双人审批闸门。

要求：

- 将审批保存为已签名的证据引用，而不是 pin 中可变的名称。
- 对包含 `destructiveHint: true` 工具的工具集，要求两位不同的审查者身份。
- 拒绝重复的审查者身份。
- 审批不完整时，仍在账本中保留原始准入尝试。
- 为零个、一个、重复以及两个不同审批添加测试。
- 不记录签名、凭据或完整的私有工具参数。

成功意味着：在两个身份都批准精确的记录、包和工具集摘要之前，破坏性工具不能成为活动工具。

## 交付产物

本课交付 `outputs/skill-mcp-registry-admission.md`。审查新的 Registry 版本或调查漂移时，可将其作为扁平、可复用的操作手册。它定义了输入、拒绝规则、证据包、状态协调和回滚证明，不依赖示例中的类名。

## 验证

运行演示和确定性测试套件：

```bash
cd phases/13-tools-and-protocols/30-mcp-registry-supply-chain-and-drift
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

验证应证明：

- 精确命名空间边界会拒绝相似前缀
- 只有官方带命名空间的 Registry 状态能使版本符合条件
- 未验证或不匹配的包和远程证据会被拒绝
- 发布者元数据不能伪装成 Registry 管理的元数据
- 工具顺序会被归一化，但不会掩盖描述符变更
- 格式错误的包和工具结构会安全地拒绝
- `serverInfo` 始终只是诊断信息，绝不提供准入权威
- 描述符漂移会隔离、停用 pin，并阻止回滚到该 pin
- 状态变化会隔离活动 pin
- 回滚不能选择已隔离或未知版本
- 可以检测到账本篡改

## 生产故障模式

| 故障 | 原因 | 必需响应 |
|---|---|---|
| 名称看似有效，但命名空间从未通过认证 | 策略信任了记录文本 | 拒绝，直到受信命名空间验证器提供精确前缀 |
| 相同包坐标返回了新字节 | 上游可变或分发被攻陷 | 停止激活，保留两个摘要，并调查获取边界 |
| “Latest” 未经审查即变化 | 浮动选择绕过了 pin | 只解析精确的已准入版本和摘要 |
| 审批后出现新工具 | 运行时漂移或部署不同 | 隔离路由并捕获新的描述符观察结果 |
| 已弃用版本仍处于活动状态 | 状态同步缺失或延迟 | 定期并在激活前协调状态 |
| 已删除记录从默认同步中消失 | 客户端只请求活动记录 | 使用支持增量或已删除记录的协调方式，并保留本地历史 |
| 回滚目标从未通过准入 | 路由控制与审批状态脱节 | 拒绝回滚，并为该目标运行新的准入 |
| 攻击者改写全部条目后账本仍在本地通过验证 | 哈希链没有外部锚点 | 将已签名的账本头发布到独立信任域 |
| 证据包含 bearer token 或工具参数 | 日志复制了完整请求 | 收集时即脱敏，只存储最小证明 |

## 运行规则

发布回答“这个身份能否发布这个名称？”，准入回答“我们是否会执行这个精确制品并暴露这种精确行为？”。让这两个决策保持分离，固定每一次关联，让回滚根据证据而不是记忆做选择。

## 延伸阅读

- [官方 Registry server.json 要求](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/official-registry-requirements.md)
- [官方 Registry OpenAPI 契约](https://registry.modelcontextprotocol.io/openapi.yaml)
- [MCP 2026-07-28 服务器发现](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
