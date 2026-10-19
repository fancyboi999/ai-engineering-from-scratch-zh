# 审计

审计读取所有文档、图表、示例和引文，每项发现输出一行，最后输出 TOTAL <n> 与各规则计数。TOTAL 0 前不能合并。修正文案、图或记录，不提高限制来过关。

## 课程仓库内

在根目录依次运行：

```bash
node --test site/test_manuals.js
node site/build-manuals.js
node manuals/_shared/figkit.js build manuals/<id>
node scripts/audit_manuals.js --manual <id>
node site/build-manuals.js --print dist/manuals
npx --yes pagedjs-cli@0.4.3 dist/manuals/<id>/print.html -o dist/manuals/aiefs-manual-<id>.pdf
```

- build-manuals.js 校验清单、解析各节，生成 site/manual-<id>.html、site/manuals.html、site/manuals-data.js，这些不提交。
- 本地预览加 --drafts 可列出草稿。
- 写作中审计可加 --skip-capture 跳过记录检查，最终汇报必须披露跳过。
- CI 构建 PDF，随发布附 aiefs-manual-<id>.pdf。

## 规则

仓库外在自有脚本复现相同检查。下表的英文限制不等同于中文分词规则，中文适配以当前构建器为准。

| 规则 | 失败条件 |
|---|---|
| dash | 正文含长短破折号 |
| semicolon | 正文含分号 |
| may | 正文含该英文词 |
| contraction | 正文含英文缩写 |
| lexicon | 命中 prose-rules.md 禁用词 |
| tell | 句子有空泛强调、夸大、不是 X 而是 Y、铺垫开场 |
| long-sentence | 英文句子超过 25 词 |
| long-step | 英文要点超过 20 词 |
| thesis | 无中心论点，或多于一句、超过 30 词 |
| figure-claim | 多于一句、超过 28 词、未以句号结束 |
| long-paragraph | 段落超过六句 |
| outcome | 前两段缺少 When you finish this section, you can，中文适配使用对应成果句 |
| takeaways | 没有或多于一个要点块 |
| sources | 最后块不是 Sources: 开头段落 |
| listing-fence | json、jsonl、http、sse 未使用 listing |
| provenance | 示例行或省略号两侧片段不存在于来源 |
| quote-key | 引用键未在 quoteSources 声明 |
| quote | 至少 24 字符的引文不逐字存在于归档文件 |
| figure-orphan | figures 中 SVG 未被文档或封面使用 |
| figure-drift | SVG 与源脚本生成结果不同 |
| capture-drift | capture.check 非零退出或超时 |

图表另有可读性与 SVG 结构规则，见 blueprint-figure。

## 文本解析方式

- 正文检查前移除行内代码、引文标记、引用文字。保留链接文字，删除目标 URL。
- 在英文句点、感叹号、问号后出现空格，随后是大写字母、数字、引号、括号或 § 时分句。
- e.g.、i.e.、vs.、etc.、Fig. 后不分句。
- 引文检查前删除链接目标、星号、反引号，弯引号改直引号，合并空白。归档来源做相同归一化。

## 构建检查

以下问题会在审计前阻止构建：

- manual.json 不符合 schema，或缺节文件。
- 原始 HTML、水平分隔线、嵌套列表、四级标题、额外引用块。
- 代码围栏缺语言。
- figure 缺字段、类型未知或图不存在。
- listing 或 rule 缺分隔线或正文。
- takeaways 少于两项。
- parts、palette、figure-index、contents 非空。
- rule 引用未声明键，或归档文件缺失。

## 状态

- draft 在 /manual-<id>.html 构建，带 noindex，索引不列出。
- ready 出现在索引，必须有 README.md，并随每次发布附 PDF。
