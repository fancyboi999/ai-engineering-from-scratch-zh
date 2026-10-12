# 导出可指认的证据

> 渲染可移植图库，带精确区域覆盖层和 JSON 结果。

**类型：** Build  
**语言：** Python  
**阶段：** 第 4 阶段，共 4 阶段  
**预计时间：** 约 2 小时

## 你要构建什么

最终报告应让结果一眼可检查。嵌入图像并在上方画矩形。将像素坐标换成百分比，使页面窄于源图时覆盖层仍对齐。JSON 保留原始像素框供下游工具使用。

```figure
pj-visual-evidence-library-4
```

## 推演示例

种子标牌宽 600 像素。x=45 的框起点为显示图像宽度的 7.5%；宽 510 对应 85%。调整浏览器大小改变显示像素，但保留同一图像区域。

编码前，写下这个示例的返回字段和一个应失败的输入。将预期结果放在实现旁，以便区分契约变化与 bug。

## 实现契约

- `image_data(asset: dict) -> str`
- `export_library(assets, query: str, out: Path) -> dict`

写出 index.html 和 evidence.json。包含 query、method、matches 和可移植资源元数据，不含解析后的文件系统路径。转义全部文本字段。嵌入图像数据，让 HTML 可独立携带。SVG 只允许文档规定的小型形状/文本子集，去掉不支持属性；拒绝 scripts 或 foreignObject 等不支持元素。不要把提取文本当 HTML 渲染。

保持之前阶段正常工作。在学习者工作区实现这些函数；推演示例时不要打开参考方案。

## 提示与失败案例

在 width:100% 图像周围用定位包装容器及绝对定位覆盖层。分别比较 left=x/width 与 top=y/height。测试应解码嵌入 SVG 并验证没有事件处理属性。

## 运行本阶段

在仓库根目录初始化一次，然后运行累积测试：

```bash
python3 scripts/project_test.py visual-evidence-library --init my-visual-evidence-library
python3 scripts/project_test.py visual-evidence-library --stage 4 --path my-visual-evidence-library
```

起始实现故意抛出实现错误。后续初始化保留而非替换源文件。通过结果要求每个选定测试都运行；跳过测试不是完成证据。

## 检查你的推理

读者在报告中能验证什么，哪些信息仍依赖输入清单？矩形若用屏幕坐标而不是源图坐标，会破坏什么？

## 关联最终产物

独立 HTML 证据图库，带高亮矩形和可复用 evidence.json。离线核心索引提供的 OCR 元数据，不读取像素或执行 OCR。附带 SVG 标牌和元数据为本项目编写。查询覆盖率是词法重叠，不是对图像内容的置信度。尺寸和提供文本仍是人工断言。

完成项目后，尝试自己的输入：

```bash
cd my-visual-evidence-library
python3 main.py --manifest ./fixtures/manifest.json --query "return dry seeds" --out ./visual-output
```

添加在本地读取嵌入索引的查询表单。模型提取放在查看器之外，打开已保存报告就不会发起上传。

## 主要参考

[官方 API 文档](https://docs.python.org/3/library/xml.etree.elementtree.html)。实现、示例和 fixture 均为原创。参考资料解释底层 API；项目专属政策在上文规定。
