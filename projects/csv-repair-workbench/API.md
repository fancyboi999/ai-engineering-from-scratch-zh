# 公共 API

所有函数都位于 `main.py`。除非另有说明，无效输入会抛出 `ValueError`。CLI 失败时以非零状态退出；保留源输入。

### `profile`

```python
def profile(text):
```

将 CSV 文本解析为 {columns, rows, profile}；profile 把每列映射到 {missing, unique}。拒绝空或重复表头和列数不齐的行。精确保留单元格。

### `propose`

```python
def propose(table, aliases=None, date_columns=None):
```

返回 schema_version=1 的配方，依次包含 trim、alias、date 规则。aliases 将列名映射到精确的去空白拼写->标准拼写。日期接受 ISO 或无歧义的 DD/MM/YYYY；有歧义日期等待审核。

### `preview`

```python
def preview(table, recipe):
```

返回 {rows,changes,pending,fingerprint}；行号为从 1 开始的 CSV 数据行。变化记录指定 row,column,before,after；有歧义或无效日期保持原值并出现在 pending 中。绝不修改输入。

### `repair`

```python
def repair(table, recipe, decisions=None):
```

返回 {csv,recipe,changes,pending,fingerprint}。可选 {fingerprint,cells:[{row,column,value}]} 仅解决待处理单元格，拒绝过期指纹、重复编辑和非 ISO 替换日期。未解决单元格保持原样。

## 文件与集成

JSON 输入含 csv 文本、aliases 和 date_columns。输出 cleaned.csv、recipe.json、receipt.json 和 review.html。从 HTML 下载 decisions.json，在 cells 中添加 {row,column,value} 条目，用 --decisions decisions.json 重跑同一命令。通过 --recipe recipe.json 在另一份兼容表格上重放导出的配方。下游使用方用 csv.DictReader 读取 cleaned.csv。
