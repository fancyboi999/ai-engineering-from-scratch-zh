# 发送一次有界 HTTP 请求

> 在字节和时间上约束一次请求。

**类型：** Build
**语言：** Go
**阶段：** 第 3 阶段，共 4 阶段
**前置要求：** 阶段 1、2。理解 Go context 和 `io.Reader` 所有权。
**预计时间：** 约 2 小时

## 构建内容

实现 `Attempt(ctx, client, endpoint, payload, maxBytes)`。复制调用者 HTTP 客户端发送 JSON POST，禁用重定向，始终关闭响应正文。拒绝 nil 客户端、超过一 MiB 请求正文、1 到 16 MiB 外响应限制。

即使调用者传 `context.Background()` 也添加五秒 context 截止时间。更早调用者截止时间仍优先。标准 HTTP 传输在连接与读正文时响应取消。

## 示例推演

响应限制 5、正文 `0123456789` 时最多读六字节。看到六字节证明溢出，返回 `ErrLimit`，不保留整个响应。恰五字节时返回正文和状态。

307 响应含 `Location` 头。返回该响应作终止分类，不向新主机再发请求。调用后原客户端 `CheckRedirect` 字段不变。

```figure
pj-llm-gateway-with-fallbacks-3
```

## 实现契约

```go
func Attempt(ctx context.Context, client *http.Client, endpoint, payload string, maxBytes int64) (Reply, error)
```

用 `io.LimitReader(body, maxBytes+1)` 区分恰好容纳与溢出。仅每请求超时不足以约束最终路由：第四阶段还在全部尝试间共享一个截止时间。自定义 `RoundTripper` 须像标准传输一样遵守 context 取消。

## 运行你的实现

从仓库根目录初始化一次；评分器保留已有工作区文件：

```bash
python3 scripts/project_test.py llm-gateway-with-fallbacks --init /tmp/llm-gateway-with-fallbacks-work
python3 scripts/project_test.py llm-gateway-with-fallbacks --stage 3 --path /tmp/llm-gateway-with-fallbacks-work --strict
```

实现在该工作区的 `stage3.go` 中。提供的适配器调用学员函数，不导入参考方案。阶段测试含独立于 Orchard 演示的案例。

## 检查与扩展

测试恰满正文、大一字节正文、重定向到另一本地测试服务器。重定向服务器请求计数须保持零。全部阶段完成后，在工作区用 `go run .` 运行实际回环演示。

[Go 标准库参考](https://pkg.go.dev/context)。可运行核心只用 Go 标准库。外部模型调用可选，普通评分不运行。
