# 对冲请求实验室

帮助客户端开发者评估安全读取的延迟重复请求。只在可配置延迟后发第二次尝试，接受首个有效响应，分别记录取消、迟到完成和重复服务工作。从受控本地端点导出有界 HTTP 客户端及延迟与工作量报告。

仅用标准库。四个阶段，约八小时。评分器运行 Go 实现。

## 动手构建

1. [测量安全读取延迟](stages/01-measure-safe-reads/docs/zh.md)
2. [调度延迟重复尝试](stages/02-schedule-duplicate/docs/zh.md)
3. [验证胜出响应并核算迟到工作](stages/03-validate-and-account/docs/zh.md)
4. [导出延迟与重复工作权衡](stages/04-export-tradeoffs/docs/zh.md)

```bash
python3 scripts/project_test.py hedged-request-lab --init /tmp/hedged-request-lab-work
python3 scripts/project_test.py hedged-request-lab --stage 1 --path /tmp/hedged-request-lab-work --strict
python3 scripts/project_test.py hedged-request-lab --all --solution --strict
```

新的 starter 会失败，直到你完成实现。运行参考方案从不授予学员完成证书。

## 运行受控端点比较

```bash
cd projects/hedged-request-lab/solution
go run . --samples 3 --delay-ms 10 --out /tmp/hedge-report.json
python3 -c 'import json; r=json.load(open("/tmp/hedge-report.json")); print("call ratio",r["hedgedCalls"]/r["baselineCalls"],"server work",r["fixtureWork"])'
```

自动结束的演示运行真实回环 HTTP 端点，主端点 80ms，次端点 5ms。比较基线和对冲的胜出延迟、发起调用数、服务端工作。处理器刻意在客户端取消后继续工作，因此完成计数说明：取消客户端请求不证明节省计算或费用。

对声明为安全的读取复用 `Hedged`，或向 CLI 传 `--primary URL --secondary URL`。每端点必须返回 HTTP 200 和 JSON `{value:"nonempty string"}`。调用者负责端点间数据版本和语义等价。默认客户端禁止重定向；库接受显式提供的 http.Client。

每操作最多两次 GET，响应正文限 64KiB，每操作上限两秒，胜出后观测限 100ms。版本 1 回执区分胜出延迟、尝试次数、取消请求、观测到的取消、迟到观测、未观测客户端尝试。本地百分位是示意观测，不是外部服务性能结论。

[Go context](https://pkg.go.dev/context)、[Go HTTP](https://pkg.go.dev/net/http) 和 [HTTP 安全方法](https://www.rfc-editor.org/rfc/rfc9110.html#name-safe-methods) 定义库边界。

## 完成证据

```bash
python3 scripts/project_test.py hedged-request-lab --all --path /tmp/hedged-request-lab-work --strict --report /tmp/hedged-request-lab-result.json
```

本地报告是未签名、自行报告的证据。可编辑图表计算示意值；CLI 才运行实际实现。
