# 事故复盘撰写器

把 JSONL 事故日志与审查决定变成 HTML 证据工作台、精确引文检查、有负责人的行动项及绑定来源的批准回执。

等级 2。四个阶段，约八小时。实现语言：Go，仅用标准库。

## 开始前

使用 Go 1.22 或更高版本，评分器需要 Python 3.12 或更高版本。你应熟悉函数、结构体、切片、映射和返回的错误。如果还不熟悉，先完成[环境配置](../../phases/00-setup-and-tooling/01-dev-environment/docs/zh.md)和[数据管理课程](../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。

## 阶段

1. [解析事故事件账本](stages/01-parse-an-incident-event-ledger/docs/zh.md)
2. [构建稳定有界时间线](stages/02-build-a-stable-bounded-timeline/docs/zh.md)
3. [要求每个论断提供证据](stages/03-require-evidence-for-each-claim/docs/zh.md)
4. [发布确定性事故资料包](stages/04-publish-a-deterministic-incident-packet/docs/zh.md)

## 动手构建

```bash
python3 scripts/project_test.py postmortem-writer --init /tmp/postmortem-writer-work
python3 scripts/project_test.py postmortem-writer --stage 1 --path /tmp/postmortem-writer-work
python3 scripts/project_test.py postmortem-writer --all --solution --strict
```

## 运行产物

```bash
cd projects/postmortem-writer/solution
go run .
```

`--events FILE --review FILE --out DIRECTORY` 生成 index.html、packet.json、packet.txt。用 `--events ../examples/events.jsonl --review ../examples/review.json --out /tmp/incident-packet` 运行提供的文件。无参数时 CLI 输出小型原创 fixture。证据检查建立来源追踪；因果判断与审查者身份仍是人的责任。

学员 starter 已提供 CLI 和集成适配器。实现四个阶段函数；适配器组合调用的正是这些函数，无法绕过未完成的部分。完成核心阶段后阅读 integration.go，了解文件边界、回执和渲染。

演示用离线 fixture 运行真实的参考实现，然后退出。每阶段至少有五个独立测试，覆盖边界和被拒绝的输入。预期行为由阶段测试定义；实现从不读取留出的测试文件。评分器在初始化时保留你的代码，缺少运行时时如实报告运行未完成。

## 完成证据

```bash
python3 scripts/project_test.py postmortem-writer --all --path /tmp/postmortem-writer-work --strict --report /tmp/postmortem-writer-result.json
```

只有完整的学员报告才能证明本地完成。参考运行不授予证书。报告是未签名的本地证据，本项目不认证生产就绪程度。

## 来源

[官方参考](https://sre.google/workbook/postmortem-culture/)。所有实现和练习均为原创。fixture 数字是示例，不是外部基准结论或真实服务保证。
