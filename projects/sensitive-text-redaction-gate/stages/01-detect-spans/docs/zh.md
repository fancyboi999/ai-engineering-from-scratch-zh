# 检测有界敏感跨度

> 在记录进入模型流水线前移除有界敏感文本模式。

**类型：** Build
**语言：** Python
**前置要求：** 基本 Python 字典和列表
**预计时间：** 约 120 分钟

## 学习目标

- 实现公开函数契约，拒绝不支持的输入。
- 运行工具前预测具体示例结果。
- 用保存的证据解释失败案例。
- 在流水线下一阶段复用输出。

## 你构建的内容

返回 start/end Python 字符偏移及 kind EMAIL、IPV4 或 LITERAL。end 不包含在内。结果按 start、end、kind 排序。绝不返回匹配文本。检测器用 ipaddress 校验点分地址，不接受任意四数字字符串。字面匹配区分大小写，包含重叠匹配。

```text
detect(text, literals=()) -> list[dict]
```

## 推演一个示例

```python
detect('To a@example.test!')
```

预期值：

```text
[{'start': 3, 'end': 17, 'kind': 'EMAIL'}]
```

字符偏移不同于 UTF-8 字节偏移：`🌳 a@example.test` 中的树 emoji 占一个 Python 字符，因此邮件地址起点为 2。扫描前校验文本和字面串限制。尝试 `999.1.1.1`；正则候选仍须通过地址校验。

## 交互实验

```figure
pj-sensitive-text-redaction-gate-1
```

更改机制中的一个输入。预测哪个中间值应改变，再比较计算的回执。图表说明本阶段契约；本地评分器测试你的实际 Python 代码。

## 动手构建

打开学习者工作区的 `main.py`。用显式数据结构实现本阶段函数，保留前阶段契约。CLI 和 HTML 渲染器在初始化时已提供，不能代替你正在编写的实现。阶段测试导入 `PROJECT_WORKSPACE`，因此编辑讲师文件不能完成你的版本。

## 失败案例

文本类型无效、超过一百万字符、空字面串或超过一百个字面串均抛出 ValueError。记录超过 10,000 次匹配时以 ValueError 停止，绝不返回部分脱敏。用完整邮件前缀字符集匹配起始边界，否则纯标点字符串可迫使每个字符都开始新扫描。

## 验证

在仓库根目录执行：

```bash
python3 scripts/project_test.py sensitive-text-redaction-gate --stage 1 --path learning-artifacts/sensitive-text-redaction-gate --strict
```

评分器是累积式的。读取首个失败断言，用最小输入复现并修复负责的函数。它检查常规案例、边界条件、畸形值和独立 fixture。讲师专用等效命令为 `--stage 1 --solution --strict`。

## 使用与扩展

全部四阶段通过后，用自己的 JSONL 运行附带 CLI：

```bash
cd learning-artifacts/sensitive-text-redaction-gate
python3 cli.py samples/input.jsonl --literals samples/literals.json --output demo-output
```

另写一个不同于具体示例的留出案例。解释其结果为什么由契约决定，而非匹配硬编码样本。

明确保留不支持的行为说明。扩展接受的输入格式前，应先增加契约示例和测试，再改实现。
