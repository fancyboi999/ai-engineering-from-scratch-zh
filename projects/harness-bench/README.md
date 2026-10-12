# Harness 基准测试

针对同一有序案例与模型配置比较基线、错误重试和证据策略。统计实际调用，拒绝不可比回执，重放有限记录或调用配置的 HTTP 模型。

Go 1.22 或更高版本，仅标准库。四阶段约八小时。需要结构体、切片、回调、错误和基础 JSON 知识；阶段先修要求链接相关课程。连接 provider 前先从离线示例开始。

## 动手构建

1. [加载未见的基准案例](stages/01-load-unseen-benchmark-cases/docs/zh.md)
2. [精确定义正确答案](stages/02-define-exactly-what-a-correct-answer-means/docs/zh.md)
3. [在调用预算内运行 harness](stages/03-run-a-harness-under-a-call-budget/docs/zh.md)
4. [用相同分母比较运行](stages/04-compare-runs-on-equal-denominators/docs/zh.md)

```bash
python3 scripts/project_test.py harness-bench --init /tmp/harness-bench-work
python3 scripts/project_test.py harness-bench --stage 1 --path /tmp/harness-bench-work --strict
python3 scripts/project_test.py harness-bench --all --solution --strict
```

空白 starter 在阶段实现前会明确失败。全部适配器和 fixture 复制进学员工作区。评分器调用工作区函数，包括 CLI 使用的函数。

## 运行自己的比较

```bash
cd projects/harness-bench/solution
go run . --cases fixtures/orchard-cases.json --recording fixtures/orchard-recording.json --budget 4 --out /tmp/orchard-runs.json
```

原创 Orchard 场景暴露三种故障：过时的到期知识、瞬时恢复错误，以及不存在的价格。同一响应记录使 baseline 三次调用得 1/3，error-retry 四次得 2/3，evidence 三次得 3/3。这些刻意构造的答案用于教学策略行为，不是模型性能证据。

创建含 `ID`、`Prompt`、`Expected` 和可选 `Evidence` 字符串数组的 JSON 数组。文件限一 MiB、1000 案例。评分忽略大小写和空白，保留标点、数字、单位。不判断语义等价，也不规范组合 Unicode 重音。

记录声明 `kind`（`authored_fixture` 或 `recorded_provider`）、`model`、生成 `settings`、`responses`：精确 prompt 映射到有限的 `{answer, error?}` 数组。每策略以新游标读取同一记录。缺 prompt 或数组耗尽产生计数错误。证据请求追加 `\n\nEvidence:\n` 与按换行连接的证据。示例记录包含这些精确请求。

```bash
go run . --cases fixtures/orchard-cases.json --endpoint http://127.0.0.1:11434/v1/chat/completions --model YOUR_LOCAL_MODEL --budget 4 --timeout 30s --out /tmp/live-runs.json
```

远程 HTTPS 服务需提供完整 chat-completions 端点和 `--key-env YOUR_PROVIDER_KEY_VARIABLE`。密钥须已在环境中，不写入回执。`--temperature` 默认 0，`--max-tokens` 默认 128。HTTP 请求在每策略截止时间内再限十秒；响应正文限一 MiB。拒绝重定向和含查询的端点。外部 provider 可能对每次尝试收费。

## 阅读回执

JSON 包含模型配置、数据集与配置 SHA-256 摘要，以及每次调用的 prompt、答案、错误标记和分数。数据集序列化忽略 JSON 空白和键顺序，保留执行顺序。模型配置含端点或记录摘要、模型标识、生成设置。排行榜要求回执和调用预算匹配，因此等大小的替换数据集不能悄悄混入比较。

`Attempted` 统计案例；`Calls` 统计实际模型调用；`Errors` 统计最终失败案例。未尝试案例仍在 `Total` 中。错误重试从不检查预期答案。只在响应后应用精确评分。

库入口是 `Cases`、`Correct`、`EvaluatePolicy`、`Leaderboard`。`Evaluate` 保留简单基线回调 API，使用旧模型标签；需要配置证据的调用者应使用带显式回执的 `EvaluatePolicy`。手工构造、无回执的旧结果为兼容保留仅按计数排名。回执是未签名本地证据，不证明远程模型身份或受控统计实验。真实策略顺序运行；估计方差时重复并轮换顺序。

## 完成证据

```bash
python3 scripts/project_test.py harness-bench --all --path /tmp/harness-bench-work --strict --report /tmp/harness-bench-result.json
```

参考通过不授予学员证书。本地报告是未签名、自行报告的证据。浏览器图表根据可编辑输入计算；用于说明算法，不发起模型调用。

[Go HTTP 包](https://pkg.go.dev/net/http)、[Go context](https://pkg.go.dev/context) 和 [JSON 解码](https://pkg.go.dev/encoding/json) 描述这里使用的标准库边界。所有样本场景和练习均为原创。
