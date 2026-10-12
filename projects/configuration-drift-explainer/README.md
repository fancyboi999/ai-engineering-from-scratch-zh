# 配置漂移解释器

帮助开发者比较声明的默认值、环境覆盖值和观测到的 JSON 配置。保留优先级与脱敏规则，展示被覆盖的值，把每条解释关联到源文件或变量名。导出漂移报告，让助手无需接收秘密值也能使用。

仅用标准库。四个阶段，约八小时。评分器运行 Go 实现。

## 动手构建

1. [加载具名配置层](stages/01-load-layers/docs/zh.md)
2. [带来源追踪地解析优先级](stages/02-resolve-provenance/docs/zh.md)
3. [比较生效值](stages/03-compare-effective-values/docs/zh.md)
4. [导出脱敏 CI 证据](stages/04-export-ci-evidence/docs/zh.md)

```bash
python3 scripts/project_test.py configuration-drift-explainer --init /tmp/configuration-drift-explainer-work
python3 scripts/project_test.py configuration-drift-explainer --stage 1 --path /tmp/configuration-drift-explainer-work --strict
python3 scripts/project_test.py configuration-drift-explainer --all --solution --strict
```

新的 starter 会失败，直到你完成实现。运行参考方案从不授予学员完成证书。

## 运行你自己的配置

```bash
cd projects/configuration-drift-explainer/solution
go run . --input fixtures/config.json --out /tmp/drift.json
python3 -c 'import json; r=json.load(open("/tmp/drift.json")); print([c["key"] for c in r["changes"] if c["kind"] != "equal"])'
go build -o /tmp/drift-explainer .
/tmp/drift-explainer --input fixtures/config.json --check
```

输入模式：`layers:[{name,values:{key:scalar}}]`、`observed:{key:scalar}`，可选 `sensitive:[key]`。后面的层获胜。这是明确的扁平契约，不合并嵌套对象，也不展开 shell 变量。层名称使用具名来源标识，绝不使用秘密值。

版本 1 的报告记录 equal、changed、missing、unexpected 值以及有序优先级历史。自动脱敏识别 password、secret、token、api-key、credential 键名；`sensitive` 补充精确键名。脱敏覆盖当前和历史值，包括意外的观测键。先分类再脱敏。这种命名启发式无法检测藏在普通名称值里的秘密；显式分类由调用者负责。

构建后的二进制在 `--check` 检测到漂移时返回 2。导出文件创建时仅所有者有权限。编码行为参见 [Go JSON](https://pkg.go.dev/encoding/json)。

## 完成证据

```bash
python3 scripts/project_test.py configuration-drift-explainer --all --path /tmp/configuration-drift-explainer-work --strict --report /tmp/configuration-drift-explainer-result.json
```

本地报告是未签名、自行报告的证据。可编辑图表计算示意值；CLI 才运行实际实现。
