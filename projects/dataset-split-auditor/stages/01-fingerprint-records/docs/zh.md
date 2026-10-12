# 为规范化记录生成指纹

第 1 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段建立在先前契约之上。

## 变化内容

随机划分可能让同一示例以不同 ID 同时进入 train 和 test。对内容求哈希前规范化 Unicode、空白和大小写。将 ID 与内容指纹分开，重命名记录仍会碰撞。

规范化是一项明确政策。它检测精确的规范化重复，不检测改写、图片或语义等价代码。输入空间可猜测时，哈希不会让内容匿名。

## 推演一个具体案例

字符串“Ｒetry  NOW”和“retry now”经 NFKC、大小写折叠和空白折叠后相同。记录 ID 可以不同，但内容指纹必须一致。

```figure
pj-dataset-split-auditor-1
```

改变实验输入，在查看指标前计算结果。图表根据这些输入计算；下面的实现测试仍是完成证据的来源。

## 实现契约

按声明的契约实现 `fingerprint`。

使用[公共 API 契约](../../../API.md)和带类型的起始签名。核心函数返回值，让提供的驱动器负责文件输入、参数解析和展示。

在 UTF-8 编码和求哈希前应用规范化。绝不对字典表示求哈希，因为它的顺序和附带元数据会独立于内容变化。

## 验证与检查

从仓库根目录用 `python3 scripts/project_test.py dataset-split-auditor --init learning-artifacts/dataset-split-auditor` 初始化一次。然后累积评分：

```bash
python3 scripts/project_test.py dataset-split-auditor --stage 1 --path learning-artifacts/dataset-split-auditor --strict
```

实现契约前，新工作区应失败。完成全部阶段后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/dataset-split-auditor
python3 cli.py samples/input.json --output split-audit.json --html split-audit.html
```

## 探查失败边界

试试“retry now!”。标点仍有意义，因此这个契约不应声称它匹配“retry now”。




## 参考资料

[主要技术参考](https://scikit-learn.org/stable/common_pitfalls.html)
