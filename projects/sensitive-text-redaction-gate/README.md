# 敏感文本脱敏门禁

检测 ASCII 邮件模式、有效 IPv4 地址和显式字面标识符。合并重叠跨度，替换其并集，不在回执中泄露原值；导出脱敏 JSONL 和可检查的 HTML 台账。

Python 3.12 或更新版本。不需要模型凭据或第三方依赖。

## 构建你的版本

在仓库根目录执行：

```bash
python3 scripts/project_test.py sensitive-text-redaction-gate --init learning-artifacts/sensitive-text-redaction-gate
python3 scripts/project_test.py sensitive-text-redaction-gate --stage 1 --path learning-artifacts/sensitive-text-redaction-gate --strict
```

首次运行会刻意失败，直到你实现第一阶段。附带 CLI 和 HTML 渲染器是调用你函数的脚手架。逐阶段实现，不要用参考方案替换工作区。

```bash
python3 scripts/project_test.py sensitive-text-redaction-gate --all --path learning-artifacts/sensitive-text-redaction-gate --strict --report completion.json
cd learning-artifacts/sensitive-text-redaction-gate
python3 cli.py samples/input.jsonl --literals samples/literals.json --output demo-output
```

## 运行参考方案

```bash
python3 scripts/project_test.py sensitive-text-redaction-gate --all --solution --strict
cd projects/sensitive-text-redaction-gate/solution
python3 cli.py samples/input.jsonl --literals samples/literals.json --output demo-output
```

在本地打开 `demo-output/review.html`。用自己的 JSONL 替换样本输入路径，即可用于演示之外。[API 契约](API.md)定义接受的输入和输出形状。

## 预期结果与集成

三条编写的笔记产生四个替换跨度：两个邮件地址、一个 IPv4 地址和一个显式案例标识符。第三条笔记保持不变。导出的 JSONL 可直接由数据集或 prompt 预处理步骤读取；将 receipt.json 放在旁边，展示确切支持范围。

导出产物为 `redacted.jsonl, receipt.json and review.html`。附带 fixture 是编写的示例。测试级留出案例使用不同值和畸形输入；演示成功本身不构成完成。

## 范围

这是有界、基于模式的脱敏器，不是通用 PII 检测器，也不保证匿名化。它识别 ASCII 邮件语法、有效点分 IPv4 地址和区分大小写的字面串。姓名、电话、IPv6、混淆地址和编码秘密可能残留。ID 必须非敏感。分享前审核剩余文本。HTML 只含脱敏文本和偏移回执，绝不包含原值或配置的字面字典。

## 阶段

1. [检测有界敏感跨度](stages/01-detect-spans/docs/zh.md)
2. [合并完整重叠并集](stages/02-merge-overlaps/docs/zh.md)
3. [替换跨度，不泄露源值](stages/03-redact-text/docs/zh.md)
4. [导出脱敏记录和有界证据](stages/04-export-safe-records/docs/zh.md)

## 主要参考资料

- [Python 正则表达式](https://docs.python.org/3/library/re.html)
- [Python IP 地址校验](https://docs.python.org/3/library/ipaddress.html)
