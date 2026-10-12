# 按总尝试预算路由

> 路由调用者正文，同时保护凭据隐私。

**类型：** Build
**语言：** Go
**阶段：** 第 4 阶段，共 4 阶段
**前置要求：** 阶段 1 至 3。添加用量记账前阅读 [token 计数器与成本计量器](../../../../token-counter-and-cost-meter/README.md)。
**预计时间：** 约 2 小时

## 构建内容

实现 `Route`，遍历验证端点一次，调用 `Attempt` 前计入尝试，记录状态、毫秒时长和故障类型。成功、终止状态、响应溢出、取消或调用上限时停止。即使调用者无截止时间，也给整个路由五秒上限。

提供的 `RouteConfigured` 将你的路由与更严格操作者设置组合：1 到 5000 毫秒、响应上限、具名 provider。其传输从 `key_env` 创建 provider 专属 Authorization 头，可重写 `model`。`GatewayHandler` 只复制 JSON 正文；调用者头绝不成为 provider 凭据。传输重写模型时，Body、GetBody、ContentLength 必须描述相同字节。复用连接上零字节写失败后，Go 可能重放请求；重放须保留配置模型。重定向仍禁用。

## 示例推演

主端点用 35 ms 返回 503。总截止时间 65 ms 下，备用约得 30 ms，不是再得 65 ms。共享 context 到期时返回 `State=cancelled`、已做尝试和 context 错误。

成功代理请求响应带 `X-Gateway-Attempts: 2` 和 `X-Gateway-Provider: backup`。正文是实际备用响应。错误使用本地 502，取消为 504，不回显 provider 错误正文。CLI 输出更完整轨迹供操作者检查。

```figure
pj-llm-gateway-with-fallbacks-4
```

## 实现契约

```go
func Route(ctx context.Context, client *http.Client, providers []string, payload string, maxAttempts int, maxBytes int64) (Outcome, error)
```

失败尝试后立即检查 `ctx.Err()`，包括最后 provider。否则超时可能误标普通耗尽。配置环境变量缺失应在任何 provider 收到请求前失败。集成测试用独立本地服务器观察两个凭据头。

## 运行你的实现

从仓库根目录初始化一次；评分器保留已有工作区文件：

```bash
python3 scripts/project_test.py llm-gateway-with-fallbacks --init /tmp/llm-gateway-with-fallbacks-work
python3 scripts/project_test.py llm-gateway-with-fallbacks --stage 4 --path /tmp/llm-gateway-with-fallbacks-work --strict
```

实现在该工作区的 `stage4.go` 中。提供的适配器调用学员函数，不导入参考方案。阶段测试含独立于 Orchard 演示的案例。

## 检查与扩展

在完成工作区运行 `go run .`：在临时回环端口启动主、备用、代理，一次请求后关闭。自己的端点需复制 `fixtures/providers.example.json`、替换模型名，再用 `go run . --config /tmp/providers.json --request fixtures/request.json` 或 `--listen 127.0.0.1:8088`。服务器是本地、非流式、未认证的，不是公开部署模板。

[Go 标准库参考](https://pkg.go.dev/context)。可运行核心只用 Go 标准库。外部模型调用可选，普通评分不运行。
