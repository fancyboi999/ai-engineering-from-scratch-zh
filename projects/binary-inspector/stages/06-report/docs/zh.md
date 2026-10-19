# JSON 报告、HTML 字节图与构建差异

第 6 阶段，共 6 阶段。将阶段 1 到 5 组合为三个产物：带版本的 JSON 报告、独立 HTML 页面、两个构建的差异。第 [32](../../../../../phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/docs/zh.md) 和 [40](../../../../../phases/13-tools-and-protocols/40-linking-loading-and-stripped-binaries/docs/zh.md) 课在实验中手工比较构建，本阶段将比较变成一条命令。

## 构建内容

在 `report` 模块中实现六个函数：

- `byte_map(data, section_list, segment_list=(), cells=128)` 将文件等分为切片并标注。
- `build_report(data, name="input", truth=None, min_string=4, cells=128)` 返回完整报告。
- `validate_report(report)` 返回问题列表，有效报告返回空列表。
- `render_html(report)` 返回独立 HTML 页面。
- `diff_reports(old, new)` 比较两份报告。
- `render_diff_text(diff)` 将差异输出为文本行。

预置 CLI 调用它们：

```bash
python3 cli.py inspect FILE [--truth UNSTRIPPED] [--json PATH] [--html PATH] [--min-string N] [--cells N]
python3 cli.py diff OLD NEW [--json PATH]
```

成功退出码为 0；文件不可读或不受支持时退出码为 2，并向标准错误输出 `error: ...`。

## 为什么重要

只输出到终端的报告无法用于 CI 或评审讨论。JSON 报告带 schema 名称，后续脚本可以拒绝不理解的报告。HTML 页面展示字节位置。字节图让大块零填充段、高熵数据和变大的代码节一眼可见。页面中所有字符串都来自二进制，必须全部转义。即便是自己编译的二进制，其中内容也不应直接信任。

## 具体案例

剥离后的 arm64 构建为 50,264 字节。使用 128 个单元时，单元 *i* 覆盖 `[i × 50264 // 128, (i + 1) × 50264 // 128)`：

| 单元 | 范围 | 区域 | 熵 |
|---|---|---|---|
| 0 | 0 到 392 | `headers` | 2.1376 |
| 3 | 1178 到 1570 | `__text` | 3.4159 |
| 5 | 1963 到 2356 | `__text` | 5.9288 |
| 6 | 2356 到 2748 | `__cstring` | 2.4591 |
| 7 | 2748 到 3141 | `__TEXT` | 0.0 |
| 127 | 49871 到 50264 | `__LINKEDIT` | 5.9962 |

区域规则：重叠字节最多的节获胜。单元 3 与 `__text`（从 1512 开始）重叠 58 字节，不与其他节重叠，因此标为 `__text`。未与节重叠、且在首节之前或恰好在首节起点结束的单元为 `headers`。否则以重叠最多的段命名；没有段时为 `unmapped`。单元 7 是 `__TEXT` 末尾的零填充。所有长度之和等于文件大小，各单元首端紧接前一单元末端。

HTML 为每个单元绘制一个方块。色相来自区域名，不透明度为 `0.25 + 0.75 × entropy / 8`，因此单元 7 较淡，单元 5 较亮。

`-O0` 和 `-O2` 构建的差异：

```text
tally-arm64-O0 -> tally-arm64-O2
section __TEXT,__text: 848 -> 768 (-80)
section __TEXT,__unwind_info: 104 -> 96 (-8)
symbol _tally_sum: 0x10000075c -> 0x100000740
...
recovered function starts: 6 -> 6
```

优化器删除了 80 字节代码，所以 `main` 后的所有函数都移动了。导入列表未变。未剥离与剥离构建的差异列出八个删除的导出：strip 将可执行文件的导出 trie 缩减为仅含 `__mh_execute_header`。

```figure
pj-binary-inspector-6
```

在实验中设置文件大小、单元数量和节范围。实验计算各单元范围、重叠量与规则选出的区域。

## 实现契约

`byte_map(...) -> list[dict]`：`cells` 小于 1 时抛出 `ValueError`。使用 `min(cells, len(data))` 个单元，最少 1 个。各项为 `{"index", "offset", "length", "region", "entropy"}`。

`build_report(...) -> dict` 恰含以下顶层键：

| 键 | 值 |
|---|---|
| `schema` | `"binary-inspector/report/v1"`（`REPORT_SCHEMA`） |
| `file` | `{"name", "size", "sha256"}` |
| `header` | `parse_header` |
| `sections`、`segments` | 阶段 2 |
| `symbols` | 阶段 3 |
| `imports`、`exports`、`relocations` | 阶段 4 |
| `fixups` | `chained_fixups` 的 `fixups` 列表 |
| `strings` | 阶段 5，使用 `min_string` |
| `function_starts` | 阶段 5。提供 `truth` 字节时，增加 `truth`（真值文件的 `symbols` 方法）和 `scores`（每种方法调用一次 `score_starts`）。 |
| `byte_map` | 使用 `cells` |
| `summary` | 计数：`format`、`arch`、`kind`、`sections`、`segments`、`symbols`、`defined_functions`、`imports`、`exports`、`relocations`、`fixups`、`strings`、`recovered_starts`、`file_entropy` |

报告必须能直接通过 `json.dumps`，不使用自定义编码器。工作区预置 JSON Schema 为其他工具说明同一结构。

`validate_report(report) -> list[str]`：非字典返回 `["report must be an object"]`。否则用消息 `missing key <key>`、`<key> must be <type>` 检查 `REPORT_FIELDS` 的各键，用 `<key>[<i>] missing <field>` 检查 `ITEM_FIELDS` 中各列表项，并检查 `file` 的三个字段和 `header` 中的 `format`、`arch`、`kind`。

`render_html(report) -> str`：以 `<!doctype html>` 开始。包含摘要和字节图，每个单元恰好对应一个 `class="cell"` 元素。为节、段、函数入口及评分、符号、导入、导出、重定位、修正和字符串分别增加表格。用 `html.escape` 转义每个值。不加载外部脚本、样式或字体。

`diff_reports(old, new) -> dict`：任一报告未通过 `validate_report` 时抛出 `ValueError`。返回：

```python
{"schema": "binary-inspector/diff/v1", "old": {...}, "new": {...}, "identical": bool,
 "header_changes": {key: [old, new]},
 "sections": {"added", "removed", "changed": [{"name", "old_size", "new_size", "delta", "old_entropy", "new_entropy"}]},
 "symbols": {"added", "removed", "moved": [{"name", "old", "new"}]},
 "imports": {"added", "removed"}, "exports": {"added", "removed"}, "strings": {"added", "removed"},
 "function_starts": {"old", "new"}}
```

Mach-O 节命名为 `segment,section`。同名节大小相加，因为 COFF 目标文件有六个名为 `.rdata` 的节。只比较已定义符号，不含节符号和文件符号。

`render_diff_text(diff) -> str`：首行为 `old -> new`，随后为 `section NAME: OLD -> NEW (+/-DELTA)`、`symbol NAME: 0xOLD -> 0xNEW`、`+ kind name` 和 `- kind name` 行，最后为 `recovered function starts: OLD -> NEW`。

## 验证与检查

```bash
python3 scripts/project_test.py binary-inspector --all --path learning-artifacts/binary-inspector --strict
cd learning-artifacts/binary-inspector
python3 cli.py inspect fixtures/tally-arm64-O2.stripped --truth fixtures/tally-arm64-O2 --json report.json --html report.html
python3 cli.py diff fixtures/tally-arm64-O0 fixtures/tally-arm64-O2 --json diff.json
```

集成测试用你的 CLI 检查留出程序，校验其写出的 JSON，并检查输入 C 源文件时的退出码。

## 探索失败边界

- 将可执行文件副本中的 `unknown bucket` 替换为 `<script>x</b>&`，然后渲染页面。页面必须显示文本且不执行任何内容。
- 请求比文件字节数更多的单元。每个单元仍必须至少有一个字节。
- 向 `diff_reports` 传入缺键报告。必须拒绝报告并指出第一个问题。
- 比较两个字节完全相同的文件。`identical` 应为真，所有列表为空。

## 扩展

- 为 CI 增加 `--fail-on` 规则，如“禁止可写且可执行的节”或“禁止新增导入”。
- 将差异渲染为并排显示两张字节图的 HTML。
- 增加可选运行器：安装 `llvm-objdump -h` 时对照节表，未安装时跳过。

## 参考资料

- [JSON Schema 2020-12](https://json-schema.org/draft/2020-12/json-schema-core)
- [Python html.escape](https://docs.python.org/3/library/html.html#html.escape) and [json](https://docs.python.org/3/library/json.html)
- [OWASP Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
