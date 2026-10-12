# 将提取提案与标签分开

> 调用可选视觉端点，索引前要求审核。

**类型：** Build  
**语言：** Python  
**阶段：** 第 3 阶段，共 4 阶段  
**预计时间：** 约 2 小时

## 你要构建什么

模型可提出可见文本，也可把图像分类为标牌或图表。这是不同输出。分类标签没有文本矩形，绝不能成为 OCR 证据。先校验传输和 schema，再要求人工对照图像检查每个提案文本跨度。

```figure
pj-visual-evidence-library-3
```

## 推演示例

provider 返回 regions=[{text: Return tools, bbox: [40,120,200,40]}] 和 labels=[notice] 时，得到一个 reviewed=False 的 model-proposed 区域。notice 留在 classification_labels。提案框越界时拒绝，而不是裁剪到看似有效。

编码前，写下这个示例的返回字段和一个应失败的输入。将预期结果放在实现旁，以便区分契约变化与 bug。

## 实现契约

- `validate_proposal(proposal: dict, width: int, height: int) -> dict`
- `request_vision(path, endpoint, model, width, height, api_key="") -> dict`

返回 regions、classification_labels、status=review-required 和明确警告。区域 ID 确定性分配。拒绝畸形、空、越界区域和非字符串标签。HTTP 适配器通过 data URL 向配置的 chat-completions 端点发送实际图像字节，设置超时并检查响应大小。上传仅支持签名匹配的 PNG/JPEG；SVG fixture 保持离线。

保持之前阶段正常工作。在学习者工作区实现这些函数；推演示例时不要打开参考方案。

## 提示与失败案例

明确 provider URL。测试中检查 JSON 请求，返回含 choices[0].message.content 的受控封装。模拟或本地线路测试通过证明序列化与校验，不证明真实模型准确读字。

## 运行本阶段

在仓库根目录初始化一次，然后运行累积测试：

```bash
python3 scripts/project_test.py visual-evidence-library --init my-visual-evidence-library
python3 scripts/project_test.py visual-evidence-library --stage 3 --path my-visual-evidence-library
```

起始实现故意抛出实现错误。后续初始化保留而非替换源文件。通过结果要求每个选定测试都运行；跳过测试不是完成证据。

## 检查你的推理

收到有效 JSON 后，什么仍未验证？为什么设置 reviewed=True 是人工断言，而非模型置信度阈值？

## 关联最终产物

独立 HTML 证据图库，带高亮矩形和可复用 evidence.json。离线核心索引提供的 OCR 元数据，不读取像素或执行 OCR。附带 SVG 标牌和元数据为本项目编写。查询覆盖率是词法重叠，不是对图像内容的置信度。尺寸和提供文本仍是人工断言。

完成项目后，尝试自己的输入：

```bash
cd my-visual-evidence-library
python3 main.py --manifest ./fixtures/manifest.json --query "return dry seeds" --out ./visual-output
```

在独立本地审核日志保存审核者姓名和时间。在留出的人工标注集上评估字符错误和矩形重叠。

## 主要参考

[官方 API 文档](https://docs.python.org/3/library/xml.etree.elementtree.html)。实现、示例和 fixture 均为原创。参考资料解释底层 API；项目专属政策在上文规定。
