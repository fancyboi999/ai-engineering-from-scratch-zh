# 导出脱敏记录和有界证据

> 在记录进入模型流水线前移除有界敏感文本模式。

**类型：** Build
**语言：** Python
**前置要求：** 前面的项目阶段
**预计时间：** 约 120 分钟

## 学习目标

- 实现公开函数契约，拒绝不支持的输入。
- 运行工具前预测具体示例结果。
- 用保存的证据解释失败案例。
- 在流水线下一阶段复用输出。

## 你构建的内容

接受最多一万条恰含 id 和 text 的记录。ID 必须匹配 [A-Za-z0-9_-]{1,64} 且唯一。返回 schema_version=1、records、ledger、totals 和 scope。附带 CLI 写出 JSONL 和不含原始输入文本的回执。HTML 转义脱敏内容，允许审核者展开偏移台账。

```text
process(records, literals=()) -> dict; render_html(report) -> str
```

## 推演一个示例

```python
process([{'id': 'case-1', 'text': 'a@example.test'}])['totals']['spans']
```

预期值：

```text
1
```

最终测试用留出的地址调用 CLI，在第二个消费者中载入 redacted.jsonl，并断言不再有受支持检测器可命中的内容。还检查每个导出文件是否含原始地址。畸形 JSONL 必须失败且不回显内容。

## 交互实验

```figure
pj-sensitive-text-redaction-gate-4
```

更改机制中的一个输入。预测哪个中间值应改变，再比较计算的回执。图表说明本阶段契约；本地评分器测试你的实际 Python 代码。

## 动手构建

打开学习者工作区的 `main.py`。用显式数据结构实现本阶段函数，保留前阶段契约。CLI 和 HTML 渲染器在初始化时已提供，不能代替你正在编写的实现。阶段测试导入 `PROJECT_WORKSPACE`，因此编辑讲师文件不能完成你的版本。

## 失败案例

拒绝额外元数据，不能悄悄将未扫描字段复制进输出。调用方有责任提供非敏感 ID；语法校验不能证明 ID 是公开的。

## 验证

在仓库根目录执行：

```bash
python3 scripts/project_test.py sensitive-text-redaction-gate --stage 4 --path learning-artifacts/sensitive-text-redaction-gate --strict
```

评分器是累积式的。读取首个失败断言，用最小输入复现并修复负责的函数。它检查常规案例、边界条件、畸形值和独立 fixture。讲师专用等效命令为 `--stage 4 --solution --strict`。

## 使用与扩展

最终阶段从工作区运行 CLI，检查每份导出产物：

```bash
cd learning-artifacts/sensitive-text-redaction-gate
python3 cli.py samples/input.jsonl --literals samples/literals.json --output demo-output
```

三条编写的笔记产生四个替换跨度：两个邮件地址、一个 IPv4 地址和一个显式案例标识符。第三条笔记保持不变。导出的 JSONL 可直接由数据集或 prompt 预处理步骤读取；将 receipt.json 放在旁边，展示确切支持范围。

这是有界、基于模式的脱敏器，不是通用 PII 检测器，也不保证匿名化。它识别 ASCII 邮件语法、有效点分 IPv4 地址和区分大小写的字面串。姓名、电话、IPv6、混淆地址和编码秘密可能残留。ID 必须非敏感。分享前审核剩余文本。HTML 只含脱敏文本和偏移回执，绝不包含原值或配置的字面字典。
