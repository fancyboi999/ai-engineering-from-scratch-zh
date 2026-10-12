# 校验图像路径和文本矩形

> 索引之前保留文本断言的来源位置。

**类型：** Build  
**语言：** Python  
**阶段：** 第 1 阶段，共 4 阶段  
**预计时间：** 约 2 小时

## 你要构建什么

搜索结果的可信度取决于证据记录。资源有 ID、本地路径、宽、高和区域。区域有自己的 ID、文本、矩形 [x,y,width,height] 和来源。清单是一组人工提供或模型提取后经审核的断言。

```figure
pj-visual-evidence-library-1
```

## 推演示例

600×320 标牌的 [45,130,510,45] 结束于 x=555、y=175，因此在图内。[590,130,30,45] 越过右边缘，必须失败。负宽度不能表示镜像框。

编码前，写下这个示例的返回字段和一个应失败的输入。将预期结果放在实现旁，以便区分契约变化与 bug。

## 实现契约

- `validate_manifest(manifest: dict, root: Path) -> list[dict]`

要求资源 ID 唯一，各资源内部区域 ID 唯一。尺寸为 1 到 20000 的整数。矩形含四个有限非布尔数，宽高正，边缘不越界。在 root 内解析每个路径，包括符号链接。要求图像存在、格式受支持且不超过 5 MB。模型提案区域在索引前必须 reviewed=True。

保持之前阶段正常工作。在学习者工作区实现这些函数；推演示例时不要打开参考方案。

## 提示与失败案例

检查包含关系前解析根目录与候选路径。比较 x+w、y+h 和声明边界。明确拒绝 bool，尽管 Python 视它为整数。解析路径只作内部字段，不作为可移植报告数据。

## 运行本阶段

在仓库根目录初始化一次，然后运行累积测试：

```bash
python3 scripts/project_test.py visual-evidence-library --init my-visual-evidence-library
python3 scripts/project_test.py visual-evidence-library --stage 1 --path my-visual-evidence-library
```

起始实现故意抛出实现错误。后续初始化保留而非替换源文件。通过结果要求每个选定测试都运行；跳过测试不是完成证据。

## 检查你的推理

哪些检查证明结构有效，哪些声明仍需要查看真实图像？为什么几何有效不证明文本正确？

## 关联最终产物

独立 HTML 证据图库，带高亮矩形和可复用 evidence.json。离线核心索引提供的 OCR 元数据，不读取像素或执行 OCR。附带 SVG 标牌和元数据为本项目编写。查询覆盖率是词法重叠，不是对图像内容的置信度。尺寸和提供文本仍是人工断言。

完成项目后，尝试自己的输入：

```bash
cd my-visual-evidence-library
python3 main.py --manifest ./fixtures/manifest.json --query "return dry seeds" --out ./visual-output
```

为一种图像格式增加尺寸读取器，对照实际与声明尺寸。不要替换“提供文本”的来源标签。

## 主要参考

[官方 API 文档](https://docs.python.org/3/library/xml.etree.elementtree.html)。实现、示例和 fixture 均为原创。参考资料解释底层 API；项目专属政策在上文规定。
