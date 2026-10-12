# 视觉证据库

用可检查的坐标证据，查找截图和图表中的文本。

你将构建独立 HTML 证据图库，带高亮矩形和可复用 evidence.json。输入：JSON 清单，指定本地 SVG、PNG 或 JPEG 资源、声明尺寸和显式提供的文本矩形。

## 开始之前

Python 3.10 或更新版本。必需核心使用标准库，离线运行。Python 无需 OCR 框架，就能明确展示文件校验、Unicode token 搜索、HTTP 载荷和 SVG 解析。

- 能处理嵌套 Python 字典和列表。
- 理解图像像素中的 x/y 坐标及宽/高。
- 理解提供的标签与独立观察证据之间的区别。

## 动手构建

```bash
python3 scripts/project_test.py visual-evidence-library --init my-visual-evidence-library
python3 scripts/project_test.py visual-evidence-library --stage 1 --path my-visual-evidence-library
python3 scripts/project_test.py visual-evidence-library --all --solution --strict
```

第一条命令创建刻意未完成的工作区。后续阶段扩展同一个源文件；测试包含新的留出输入。参考方案通过仅验证示例，不会为学习者赢得证书。

## 实际使用

```bash
cd projects/visual-evidence-library/solution
python3 main.py --manifest ./fixtures/manifest.json --query "return dry seeds" --out ./visual-output
```

在本地打开生成的 index.html。将 HTML 和 JSON 复制进你的工作流程，或从 main 导入具名函数。附带演示在原创 fixture 上运行同一实现：

```bash
python3 demo.py
```

## 阶段

1. [校验图像路径和文本矩形](stages/01-validate-evidence/docs/zh.md)
2. [排序匹配并保留矩形](stages/02-search-text-regions/docs/zh.md)
3. [将提取提案与标签分开](stages/03-review-vision-proposals/docs/zh.md)
4. [导出可指认的证据](stages/04-export-the-gallery/docs/zh.md)

## 结果能说明什么

离线核心索引提供的 OCR 元数据，不读取像素或执行 OCR。附带 SVG 标牌和元数据为本项目编写。查询覆盖率是词法重叠，不是对图像内容的置信度。尺寸和提供文本仍是人工断言。

可选：python3 main.py --vision-image YOUR_IMAGE.png --provider-url http://127.0.0.1:1234/v1/chat/completions --model YOUR_VISION_MODEL --width 600 --height 320 --out ./proposals。需要认证时由 VISION_API_KEY 提供。适配器上传选定 PNG/JPEG，写出未审核区域。检查实际图像、文本与坐标，明确设置 reviewed=true 后，才可将模型提案区域加入清单。

provider 测试使用受控响应或回环 HTTP。它们验证请求和响应契约，不验证模型质量或在线服务可用性。本项目不配置账户连接、外发邮件、周期任务或云部署。

## 改成你自己的版本

用自己工作流程中的小规模导出替换编写的 fixture，运行前写下预期结果。保留另一组示例用于评估。有用的前后对照应展示输入、可检查的中间证据和可移植输出；不能用受欢迎程度代替测量结果。

## 主要参考

[官方 API 文档](https://docs.python.org/3/library/xml.etree.elementtree.html)。所有项目代码、课程正文和 fixture 均为原创。
