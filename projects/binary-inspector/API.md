# 公开实现契约

`binspect` 包每个阶段一个模块。各函数接收原始文件字节或前序函数返回的值，不直接打印。所有地址与偏移都是 Python 整数。遇到格式错误的表，抛出 `ValueError` 子类 `FormatError`，消息注明偏移或字段。

模板预置 `FormatError`、`unpack(fmt, data, offset)`、名称表及 CLI。各阶段文档给出完整示例和字段规则。

### formats （阶段 1）

```python
def detect_format(data: bytes) -> str
def parse_header(data: bytes) -> dict
def load_commands(data: bytes) -> list[dict]
```

`detect_format` 返回 `"elf64"`、`"coff"`、`"pe"` 或 `"macho64"`。 `parse_header` 返回 `{"format", "arch", "bits", "endian", "kind", "entry", "fields"}`。 `load_commands` 返回 `{"cmd", "name", "offset", "size"}`，每条 Mach-O 加载命令一项。

### layout （阶段 2）

```python
def shannon_entropy(data: bytes) -> float
def sections(data: bytes) -> list[dict]
def segments(data: bytes) -> list[dict]
def section_at_offset(section_list: list[dict], offset: int) -> dict | None
def section_at_address(section_list: list[dict], address: int) -> dict | None
```

节结构为 `{"index", "name", "segment", "type", "addr", "offset", "size", "file_size", "perms", "code", "entropy"}`。 段结构为 `{"name", "addr", "size", "offset", "file_size", "perms", "max_perms", "entropy"}`。 `perms` 由 `r`、`w`、`x`、`-` 中的三个字符组成。

### symbols （阶段 3）

```python
def read_cstring(data: bytes, offset: int, end: int | None = None) -> str
def demangle(name: str) -> str | None
def symbols(data: bytes) -> list[dict]
```

符号结构为 `{"index", "name", "demangled", "value", "size", "kind", "binding", "section", "defined", "table"}`。 未定义 Mach-O 符号另含 `library_ordinal`。

### linkage （阶段 4）

```python
def uleb128(data: bytes, offset: int) -> tuple[int, int]
def relocations(data: bytes) -> list[dict]
def imports(data: bytes) -> list[dict]
def exports(data: bytes) -> list[dict]
def chained_fixups(data: bytes) -> dict
```

重定位结构为 `{"section", "offset", "type", "symbol", "addend"}`。 导入结构为 `{"name", "library", "slots", "hint", "ordinal"}`。 导出结构为 `{"name", "address", "ordinal", "forwarder"}`。 `chained_fixups` 返回 `{"header", "imports", "fixups"}`，各修正项为 `{"offset", "address", "section", "raw", "next", "kind"}`，另含绑定或重定基址字段。

### discovery （阶段 5）

```python
def extract_strings(data: bytes, section_list: list[dict], segment_list=(), min_length: int = 4) -> list[dict]
def function_starts(data: bytes) -> dict
def score_starts(found, truth) -> dict
```

字符串结构为 `{"offset", "text", "encoding", "section", "segment"}`。 `function_starts` 在以下键下返回排序地址列表：`symbols`、`function_starts_table`、`prologues`、`call_targets`、`entry`、`recovered`。 `score_starts` 返回 `{"found", "truth", "true_positives", "false_positives", "missed", "precision", "recall"}`。

### report （阶段 6）

```python
def byte_map(data: bytes, section_list: list[dict], segment_list=(), cells: int = 128) -> list[dict]
def build_report(data: bytes, name: str = "input", truth: bytes | None = None, min_string: int = 4, cells: int = 128) -> dict
def validate_report(report) -> list[str]
def render_html(report: dict) -> str
def diff_reports(old: dict, new: dict) -> dict
def render_diff_text(diff: dict) -> str
```

报告 schema 名为 `binary-inspector/report/v1`，差异 schema 名为 `binary-inspector/diff/v1`。工作区的 JSON Schema 文件为其他工具描述报告结构。

## CLI

```bash
python3 cli.py inspect FILE [--truth UNSTRIPPED] [--json PATH] [--html PATH] [--min-string N] [--cells N]
python3 cli.py diff OLD NEW [--json PATH]
```

成功退出码为 0。文件缺失、不受支持或格式错误时退出码为 2，并向标准错误输出 `error: <message>`。`inspect` 在写出任何内容前先校验报告。

## 集成

在 CI 中对每次发布构建运行 `inspect`，将 JSON 报告与构建产物一起保留。对比上次发布运行 `diff`，检查节增长、符号移动或删除及新增导入。读取报告的脚本先检查 `schema`，拒绝未知版本。
