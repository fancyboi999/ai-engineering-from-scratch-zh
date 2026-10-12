# 本地模型评估工具

可复现的本地模型录制与对比产物，展示覆盖率和置信度误差。

Python 3.10+；JSON、比率、排序、百分位数和基础 HTTP。实时录制器还需要已运行的回环 OpenAI 兼容模型服务器。核心使用标准库。评分器检查你选择的工作区，不从参考实现填补缺失行为。

## 构建并运行你自己的版本

从仓库根目录初始化一次。新的起始代码会故意失败。

```bash
python3 scripts/project_test.py local-model-eval-harness --init learning-artifacts/local-model-eval-harness
python3 scripts/project_test.py local-model-eval-harness --stage 1 --path learning-artifacts/local-model-eval-harness --strict
```

实现每个阶段，再运行累积评分器和提供的输入驱动器：

```bash
python3 scripts/project_test.py local-model-eval-harness --all --path learning-artifacts/local-model-eval-harness --strict
cd learning-artifacts/local-model-eval-harness
python3 cli.py samples/input.json --output scorecard.json --html reliability.html
```

驱动器和离线样本是提供的脚手架。它导入的是你的实现。公共输入类型和函数签名在起始代码与 [API 契约](API.md) 中。

## 单独检查参考实现

从仓库根目录运行：

```bash
python3 scripts/project_test.py local-model-eval-harness --all --solution --strict
cd projects/local-model-eval-harness/solution
python3 cli.py samples/input.json --output scorecard.json --html reliability.html
```

## 观察变化

提供的三个预测准确率为 2/3，覆盖完整。显式合成录制的 p95 为 200 ms。record.py 测量实际回环调用耗时并捕获执行清单。

编辑样本副本并重跑命令。将输入保存在输出旁，方便他人复现结果；提供的样本是原创教学数据。

## 集成与限制

record.py 写出 cli.py 使用的同一 {manifest,source,labels,records} 契约。--baseline 仅比较标签指纹相同的记录；--min-accuracy 提供本地 CI 门禁。

除非适配器定义其他方法，报告的 confidence 是模型自报。ECE 随分箱和样本数变化。不下载或启动模型，样本也不是硬件基准。

录制已运行的本地服务器时，从完成的工作区运行：

```bash
python3 record.py samples/cases.json --endpoint http://127.0.0.1:11434/v1/chat/completions --model YOUR_INSTALLED_MODEL --revision YOUR_MODEL_REVISION --hardware YOUR_HARDWARE --output measured.json
python3 cli.py measured.json --baseline samples/input.json --output compared.json
```

对比命令有意拒绝不同数据集标签。评估模型变化时，应与同一案例的先前录制比较。

## 阶段

1. [校验预测记录](stages/01-validate-predictions/docs/zh.md)
2. [测量规范化精确答案准确率](stages/02-measure-accuracy/docs/zh.md)
3. [测量置信度校准](stages/03-measure-calibration/docs/zh.md)
4. [同时发布准确率和延迟](stages/04-publish-scorecard/docs/zh.md)


## 主要参考资料

[机制与 API 参考](https://docs.python.org/3/library/statistics.html)

## 读取可移植录制

用 `--predictions predictions.jsonl --labels labels.jsonl --manifest manifest.json` 替代单一输入文件。预测行含 id、answer、confidence 和 latency_ms。标签行含 id 和 expected；清单含 model、model_revision、prompt_revision、hardware 和 confidence_method。

添加 `--dataset-audit /path/split-audit.json`，要求数据集划分审计器的可用回执及匹配 test ID。返回的 dataset_audit_sha256 记录使用了哪份审计。标签与预测可独立变化，因此两项检查都重要。
