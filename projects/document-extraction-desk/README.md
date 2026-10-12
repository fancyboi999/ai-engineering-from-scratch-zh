# 文档抽取审核台

从文本文档抽取结构化字段，检查精确来源片段，导出前批准有歧义的值。

最终得到本地 HTML 审核台，可下载绑定来源的批准决定和已批准 JSON 值映射。

## 运行完成的工具

从仓库根目录运行：

```bash
cd projects/document-extraction-desk/solution
python3 cli.py sample.txt --schema schema.json --output output/review.html
```

样本为本项目原创。通过相同 CLI 换成自己的输入。基线无需模型密钥。启用可选外部适配器前，先阅读命令帮助。

## 自己动手构建

先学习[开发环境设置](../../phases/00-setup-and-tooling/01-dev-environment/docs/zh.md)和[数据管理](../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。开始前应能读取 JSON 对象、调用函数、运行终端命令并理解失败测试。

```bash
python3 scripts/project_test.py document-extraction-desk --init my-document-extraction-desk
python3 scripts/project_test.py document-extraction-desk --stage 1 --path my-document-extraction-desk --strict
python3 scripts/project_test.py document-extraction-desk --all --path my-document-extraction-desk --strict --report completion.json
```

新工作区在函数实现前会故意失败。CLI、输入文件和公共类型已提供，无需复制参考入口即可完成。按顺序学习各阶段：

1. [抽取值前先定义字段](stages/01-define-fields/docs/zh.md)
2. [抽取候选，不丢失证据](stages/02-retain-source-spans/docs/zh.md)
3. [将批准绑定到一个文档版本](stages/03-review-and-approve/docs/zh.md)
4. [展示证据并导出审核后的值](stages/04-export-review-desk/docs/zh.md)

## 复用产物

CLI 和可导入函数使用普通本地文件，返回结构化输出。与其他程序集成时保留输入身份及明确的失败元数据。HTML 输出不含第三方脚本；检查其中包含的源数据后即可分享。

## 验证与范围

```bash
python3 scripts/project_test.py document-extraction-desk --all --solution --strict
```

核心读取 UTF-8 文本和明确标注的字段，不声称支持 OCR 或 PDF 解析。外部 OCR 或模型适配器可通过 --proposals 提供提案，但每条引用与偏移都会检查。来源正确不等于字段含义正确。

评分校验提供的确定性契约。学习者证书是自我声明的完成记录，不代表真实 provider 验证或专业认证。将工具视为已集成前，先阅读 JSON 回执并至少测试一份新输入。

主要参考：[Python 正则表达式匹配偏移](https://docs.python.org/3/library/re.html#match-objects)。
