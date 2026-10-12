# 排序匹配并保留矩形

> 用透明词法查询覆盖率搜索区域文本。

**类型：** Build  
**语言：** Python  
**阶段：** 第 2 阶段，共 4 阶段  
**预计时间：** 约 2 小时

## 你要构建什么

独立索引每个区域文本。查询可匹配多个图像或同一图像的多个区域。保留区域标识，防止标题匹配看起来来自下面的段落。分数计数一个区域中找到的唯一查询 token。

```figure
pj-visual-evidence-library-2
```

## 推演示例

查询 return dry seeds 有三个唯一 token。区域 Return dry seeds in paper envelopes 全部匹配，得分 1。另一标牌 Return tools to the blue shelf 只匹配 return，得分 1/3。seed 不自动匹配 seeds；这是可见词法基线。

编码前，写下这个示例的返回字段和一个应失败的输入。将预期结果放在实现旁，以便区分契约变化与 bug。

## 实现契约

- `terms(text: str) -> set[str]`
- `search(assets, query: str, limit: int = 20) -> list[dict]`

对 Unicode 文本做大小写折叠并按单词字符分词。空查询无匹配。limit 为 1 到 100 的整数。返回 asset_id、region_id、原文本、bbox、matched_terms、score 和 origin。按分数降序再按资源 ID 和区域 ID 排序。重复查询词不增加分母。

保持之前阶段正常工作。在学习者工作区实现这些函数；推演示例时不要打开参考方案。

## 提示与失败案例

覆盖率用集合，展示保留原文本。测试重音词和同分。JSON 分数保持数值，仅在视图格式化百分比。

## 运行本阶段

在仓库根目录初始化一次，然后运行累积测试：

```bash
python3 scripts/project_test.py visual-evidence-library --init my-visual-evidence-library
python3 scripts/project_test.py visual-evidence-library --stage 2 --path my-visual-evidence-library
```

起始实现故意抛出实现错误。后续初始化保留而非替换源文件。通过结果要求每个选定测试都运行；跳过测试不是完成证据。

## 检查你的推理

为什么 100% 查询分数不证明区域含问题答案？短语匹配会怎样改变契约？

## 关联最终产物

独立 HTML 证据图库，带高亮矩形和可复用 evidence.json。离线核心索引提供的 OCR 元数据，不读取像素或执行 OCR。附带 SVG 标牌和元数据为本项目编写。查询覆盖率是词法重叠，不是对图像内容的置信度。尺寸和提供文本仍是人工断言。

完成项目后，尝试自己的输入：

```bash
cd my-visual-evidence-library
python3 main.py --manifest ./fixtures/manifest.json --query "return dry seeds" --out ./visual-output
```

添加独立可选同义词表，在人工标注查询上测量精确率。展示扩展词，让用户能解释意外匹配。

## 主要参考

[官方 API 文档](https://docs.python.org/3/library/xml.etree.elementtree.html)。实现、示例和 fixture 均为原创。参考资料解释底层 API；项目专属政策在上文规定。
