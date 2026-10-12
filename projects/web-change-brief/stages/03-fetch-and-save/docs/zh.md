# 抓取单页而不丢基线

> 约束真实 HTTP 工作，验证保存快照的完整性。

**类型：** Build  
**语言：** Go  
**阶段：** 第 3 阶段，共 4 阶段  
**预计时间：** 约 2 小时

## 构建内容

失败抓取不能成为下个基线。先抓取验证，再计算写报告，仅显式动作替换先前基线。CLI 每次调用做一次，不创建周期监控。

```figure
pj-web-change-brief-3
```

## 示例推演

返回 HTTP 503 的页面在解析前失败。成功 HTML 大于 2 MB 也失败。跳不同主机需新显式 URL。有效保存基线能经 JSON 往返，改块文本而不更新摘要使 LoadSnapshot 失败。

编码前写下示例返回字段和一个应失败输入。把预期结果放在实现旁，区分契约变化与错误。

## 实现契约

- `FetchHTML(ctx context.Context, rawURL string, client *http.Client) (string, error)`
- `SaveSnapshot(path string, snapshot Snapshot) error`
- `LoadSnapshot(path string) (Snapshot, error)`

只接受无凭据 HTTP(S) URL、状态 200、text/html 或 application/xhtml+xml。读取上限 MaxHTMLBytes+1 检测溢出。应用取消和默认 15 秒客户端超时，最多三请求、同主机重定向（显式端口不变）。选 URL 为 HTTPS 时每跳保持 HTTPS。仍支持显式选定 HTTP URL。经同目录临时文件再重命名保存。加载验证规范 URL 和内容校验和。

保持此前阶段正常工作。在学员工作区实现这些函数，推演示例时不要打开参考方案。

## 提示与失败案例

用 httptest.NewServer 无需互联网测试真实响应。将超时取消与状态处理分开测试。同目录临时文件让重命名局限于同一文件系统。出错也删除临时文件。

## 运行阶段

从仓库根初始化一次，再运行累积测试：

```bash
python3 scripts/project_test.py web-change-brief --init my-web-change-brief
python3 scripts/project_test.py web-change-brief --stage 3 --path my-web-change-brief
```

starter 刻意抛实现错误。之后初始化保留源码，不替换。通过要求每个选定测试运行；跳过测试不是完成证据。

## 检查推理

抓取成功表示看到了客户端 JavaScript 生成内容吗？哪些服务器或限速行为应对运行者保持可见？

## 接入完成产物

独立变更报告、changes.json 与可复用 baseline.json 快照。提取器是刻意受限的可读块扫描器，不是 HTML5 DOM 或浏览器。不执行 JavaScript、不评估 CSS 可见性、不抓链接资源。忽略块顺序，保留重复文本计数。过滤短语可能隐藏有用变化，所以两快照使用相同显式过滤策略。

项目完成后试自己的输入：

```bash
cd my-web-change-brief
go run . --before fixtures/before.html --after fixtures/after.html --url https://example.invalid/makerspace --out ./web-change-output
```

支持 ETag 或 Last-Modified 条件请求，区分内容未变、请求失败、空页。调度留在抓取函数外。

## 主要参考

[官方 API 文档](https://pkg.go.dev/net/http)。实现、示例、fixture 均原创。参考解释底层 API；项目特定策略已在上面说明。
