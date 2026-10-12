# 比较精确文本并保留重复项

> 构建稳定快照，统计新增和移除文本出现次数。

**类型：** Build  
**语言：** Go  
**阶段：** 第 2 阶段，共 4 阶段  
**预计时间：** 约 2 小时

## 构建内容

集合会丢重复文本。用各规范块计数，让一条重复通知消失仍算变化。比较刻意忽略块顺序：未改通知在章节间移动不算本项目文本编辑。输出行排序使报告稳定。

```figure
pj-web-change-brief-2
```

## 示例推演

之前为 A、A、B；之后为 A、B、C。报告移除一次 A，添加一次 C，统计两个未变块。仅重排 A、B 不改变报告或内容哈希。

编码前写下示例返回字段和一个应失败输入。把预期结果放在实现旁，区分契约变化与错误。

## 实现契约

- `CanonicalURL(raw string) (string, error)`
- `NewSnapshot(rawURL, input string, ignores []string) (Snapshot, error)`
- `Compare(before, after Snapshot) (Brief, error)`

规范 HTTP(S) URL：拒绝凭据、主机转小写、去片段、空路径补 /。保留查询字符串。仅比较规范 URL 完全相同的快照。对排序块的 JSON 序列化计算 SHA-256。新增移除条目含 text、count；unchanged 统计保留次数。

保持此前阶段正常工作。在学员工作区实现这些函数，推演示例时不要打开参考方案。

## 提示与失败案例

构建两份块计数映射，以最小值算未变次数，正差值算新增移除。JSON 序列化避免含分隔符单块与多块间歧义。

## 运行阶段

从仓库根初始化一次，再运行累积测试：

```bash
python3 scripts/project_test.py web-change-brief --init my-web-change-brief
python3 scripts/project_test.py web-change-brief --stage 2 --path my-web-change-brief
```

starter 刻意抛实现错误。之后初始化保留源码，不替换。通过要求每个选定测试运行；跳过测试不是完成证据。

## 检查推理

内容哈希为何不能证明谁在何时发布页面？忽略顺序时哪些变化刻意不可见？

## 接入完成产物

独立变更报告、changes.json 与可复用 baseline.json 快照。提取器是刻意受限的可读块扫描器，不是 HTML5 DOM 或浏览器。不执行 JavaScript、不评估 CSS 可见性、不抓链接资源。忽略块顺序，保留重复文本计数。过滤短语可能隐藏有用变化，所以两快照使用相同显式过滤策略。

项目完成后试自己的输入：

```bash
cd my-web-change-brief
go run . --before fixtures/before.html --after fixtures/after.html --url https://example.invalid/makerspace --out ./web-change-output
```

用序列算法添加独立顺序变化报告。分开文本新增，避免移动段落变成误导的删除加新增。

## 主要参考

[官方 API 文档](https://pkg.go.dev/net/http)。实现、示例、fixture 均原创。参考解释底层 API；项目特定策略已在上面说明。
