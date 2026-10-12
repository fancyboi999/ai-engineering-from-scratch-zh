# 比较页面前提取文本

> 将 HTML 扫描成规范可读块，排除已知噪声区域。

**类型：** Build  
**语言：** Go  
**阶段：** 第 1 阶段，共 4 阶段  
**预计时间：** 约 2 小时

## 构建内容

原始 HTML 差异多是时间戳、导航、标记。先提取可读文本块序列。此项目扫描标签边界，遵守带引号属性，丢评论，忽略 head、script、style、nav、footer、noscript 区域。段落、标题、列表项和结构容器形成块边界。

```figure
pj-web-change-brief-1
```

## 示例推演

对 <nav>Visits 12</nav><p>Bring a mug &amp; a spoon.</p> 返回一块：Bring a mug & a spoon。访问计数变化不应改变结果。段落内 inline strong 标签应保留相邻文本，不创建另一个块。

编码前写下示例返回字段和一个应失败输入。把预期结果放在实现旁，区分契约变化与错误。

## 实现契约

- `ExtractBlocks(input string, ignorePhrases []string) ([]string, error)`

规范实体与空白，省略空块。可选非空短语不区分大小写移除整个匹配块。拒绝超过 2,000,000 字节输入、未闭合标签/评论/忽略区域和超过 10,000 块。明确扫描器支持子集：不是完整浏览器解析器，不能推断视觉可见性。

保持此前阶段正常工作。在学员工作区实现这些函数，推演示例时不要打开参考方案。

## 提示与失败案例

寻找标签闭合尖括号时跟踪引号是否打开。只在块边界清空累积文本。追加文本前跳过忽略区域。空标签必须报错或安全无操作，绝不能索引 panic。

## 运行阶段

从仓库根初始化一次，再运行累积测试：

```bash
python3 scripts/project_test.py web-change-brief --init my-web-change-brief
python3 scripts/project_test.py web-change-brief --stage 1 --path my-web-change-brief
```

starter 刻意抛实现错误。之后初始化保留源码，不替换。通过要求每个选定测试运行；跳过测试不是完成证据。

## 检查推理

页面作者会把什么有用文本放页脚？移除整个短语匹配块为何需显式策略？

## 接入完成产物

独立变更报告、changes.json 与可复用 baseline.json 快照。提取器是刻意受限的可读块扫描器，不是 HTML5 DOM 或浏览器。不执行 JavaScript、不评估 CSS 可见性、不抓链接资源。忽略块顺序，保留重复文本计数。过滤短语可能隐藏有用变化，所以两快照使用相同显式过滤策略。

项目完成后试自己的输入：

```bash
cd my-web-change-brief
go run . --before fixtures/before.html --after fixtures/after.html --url https://example.invalid/makerspace --out ./web-change-output
```

添加有文档说明的站点提取规则和待监控真实 HTML 的 fixture。保持解析失败可见，不返回空的成功快照。

## 主要参考

[官方 API 文档](https://pkg.go.dev/net/http)。实现、示例、fixture 均原创。参考解释底层 API；项目特定策略已在上面说明。
