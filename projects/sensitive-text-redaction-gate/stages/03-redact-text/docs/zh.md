# 替换跨度，不泄露源值

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

组合 detect 和 merge_spans。从左向右遍历，追加未触及文本和字面标记 [REDACTED]，最后追加剩余后缀。返回 text、spans 和 redacted_characters。每个回执包含 index、start、end 和 kinds。偏移始终对应原始字符串。

```text
redact(text, literals=()) -> dict
```

## 推演一个示例

```python
redact('banana', ['ana'])['text']
```

预期值：

```text
'b[REDACTED]'
```

原始游标与输出长度分开：替换标记可能比删除文本长。累加原始区间长度得到 redacted_characters。无匹配记录不变，跨度为零。保留选定跨度之外的 emoji 和重音符号。

## 交互实验

```figure
pj-sensitive-text-redaction-gate-3
```

更改机制中的一个输入。预测哪个中间值应改变，再比较计算的回执。图表说明本阶段契约；本地评分器测试你的实际 Python 代码。

## 动手构建

打开学习者工作区的 `main.py`。用显式数据结构实现本阶段函数，保留前阶段契约。CLI 和 HTML 渲染器在初始化时已提供，不能代替你正在编写的实现。阶段测试导入 `PROJECT_WORKSPACE`，因此编辑讲师文件不能完成你的版本。

## 失败案例

不要将短私密值的哈希放入公开回执：这些哈希仍可支持字典猜测。异常或回执都不要包含源子串。

## 验证

在仓库根目录执行：

```bash
python3 scripts/project_test.py sensitive-text-redaction-gate --stage 3 --path learning-artifacts/sensitive-text-redaction-gate --strict
```

评分器是累积式的。读取首个失败断言，用最小输入复现并修复负责的函数。它检查常规案例、边界条件、畸形值和独立 fixture。讲师专用等效命令为 `--stage 3 --solution --strict`。

## 使用与扩展

全部四阶段通过后，用自己的 JSONL 运行附带 CLI：

```bash
cd learning-artifacts/sensitive-text-redaction-gate
python3 cli.py samples/input.jsonl --literals samples/literals.json --output demo-output
```

另写一个不同于具体示例的留出案例。解释其结果为什么由契约决定，而非匹配硬编码样本。

明确保留不支持的行为说明。扩展接受的输入格式前，应先增加契约示例和测试，再改实现。
