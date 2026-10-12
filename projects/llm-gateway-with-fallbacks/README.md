# 带回退的 LLM 网关

构建本地非流式 HTTP 代理，具有真实 provider 回退、每 provider 环境凭据、响应限制和单一总截止时间。用回环服务器验证完整线路。

Go 1.22 或更高版本，仅标准库。四阶段约八小时。需要结构体、切片、回调、错误和基础 JSON 知识；阶段先修要求链接相关课程。连接 provider 前先从离线示例开始。

## 动手构建

1. [验证 provider 端点](stages/01-validate-provider-endpoints/docs/zh.md)
2. [分类故障而非全部重试](stages/02-classify-failures-without-retrying-everything/docs/zh.md)
3. [发送一次有界 HTTP 请求](stages/03-send-one-bounded-http-request/docs/zh.md)
4. [按总尝试预算路由](stages/04-route-with-a-total-attempt-budget/docs/zh.md)

```bash
python3 scripts/project_test.py llm-gateway-with-fallbacks --init /tmp/llm-gateway-with-fallbacks-work
python3 scripts/project_test.py llm-gateway-with-fallbacks --stage 1 --path /tmp/llm-gateway-with-fallbacks-work --strict
python3 scripts/project_test.py llm-gateway-with-fallbacks --all --solution --strict
```

空白 starter 在阶段实现前会明确失败。全部适配器和 fixture 复制进学员工作区。评分器调用工作区函数，包括 CLI 使用的函数。

## 运行实际 HTTP 演示

```bash
cd projects/llm-gateway-with-fallbacks/solution
go run .
```

演示启动三个临时回环 HTTP 服务器：返回 503 的主 provider、返回 chat-completions 响应的备用 provider、网关。真实请求经过代理和两个 provider，输出 `HTTP 200`、`ATTEMPTS 2`、`PROVIDER backup`，再关闭全部服务器。provider 答案是原创 fixture；线路是真实的。

## 连接自己的 provider

把 `fixtures/providers.example.json` 复制到 `/tmp/providers.json`，替换 URL 和模型标识。每 provider 有唯一 `name`、`url`、可选 `model` 覆盖、可选 `key_env` 指向既有环境变量。无密钥本地服务省略 `key_env`。示例使用占位模型名，不假定模型已安装。

```bash
go run . --config /tmp/providers.json --request fixtures/request.json
go run . --config /tmp/providers.json --listen 127.0.0.1:8088
```

首命令发送请求文件，输出 JSON 路由轨迹。第二个运行本地代理直到你停止它。在另一终端运行：

```bash
curl --fail-with-body http://127.0.0.1:8088/v1/chat/completions -H 'Content-Type: application/json' --data-binary @fixtures/request.json
```

已有客户端可使用 `http://127.0.0.1:8088/v1` 为 base URL，禁用流式。丢弃调用者 Authorization 头；各 provider 只收到其配置的环境凭据。不复制任何调用者头。配置密钥缺失在首个上游调用前失败。拒绝查询字符串、URL 凭据和重定向。

## 契约与限制

`max_attempts` 为 1 到 16；每 provider 最多访问一次。`max_response_bytes` 为 1 到 16 MiB。`timeout_ms` 为 1 到 5000，应用于含全部回退尝试的整个路由。入站请求 JSON 限一 MiB，必须是非流式对象。独立 `Attempt` 与 `Route` 在调用者未给截止时间时添加五秒截止时间；更早的截止时间仍优先。自定义传输须遵守 Go context 取消。

2xx 完成，429 和 5xx 允许回退，其余 HTTP 状态停止。响应溢出停止。传输错误可能允许回退，但取消立即停止。策略不重复调用同一 provider、不等 `Retry-After`，也不承诺被取消生成未计费。

成功代理响应保留上游状态与正文，添加 `X-Gateway-Attempts` 和 `X-Gateway-Provider`。失败变成本地 502，取消为 504，不回显上游错误正文。CLI 回执含端点、状态、时长、故障类型。库接口为 `Endpoints`、`ClassifyStatus`、`Attempt`、`Route`、`RouteConfigured`、`GatewayHandler`。

监听服务器仅绑定回环，没有客户端认证、流式、共享限速、持久轨迹存储或高可用承诺。作为本地集成组件使用。真实回环测试覆盖 provider 认证分离、总截止时间、重定向、请求和响应限制、模型重写。评分不需外部账号。

## 完成证据

```bash
python3 scripts/project_test.py llm-gateway-with-fallbacks --all --path /tmp/llm-gateway-with-fallbacks-work --strict --report /tmp/llm-gateway-with-fallbacks-result.json
```

参考通过不授予学员证书。本地报告是未签名、自行报告的证据。浏览器图表根据可编辑输入计算；用于说明算法，不发起模型调用。

[Go HTTP 包](https://pkg.go.dev/net/http)、[Go context](https://pkg.go.dev/context) 和 [JSON 解码](https://pkg.go.dev/encoding/json) 描述这里使用的标准库边界。所有样本场景和练习均为原创。
