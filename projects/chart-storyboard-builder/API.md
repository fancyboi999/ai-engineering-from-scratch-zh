# 公共 API

所有函数都位于 `main.py`。除非另有说明，无效输入会抛出 `ValueError`。CLI 失败时以非零状态退出；保留源输入。

### `parse_table`

```python
def parse_table(text, roles):
```

返回 {rows,roles,missing}；roles 要求 group,value,unit 字符串，用于指定 CSV 列和显示单位。行保留原始值以及 group 和 number（浮点数，空值为 None）。拒绝重复表头、列数不齐的行、空分组和非有限数值。

### `aggregate`

```python
def aggregate(table, reducer='sum', periods=None, grammar='bar'):
```

返回图表规格 {schema_version,grammar,reducer,unit,points,axis,source_rows,missing_values}。聚合器为 sum,mean,count（统计非空值）。提供的唯一 periods 定义顺序，将缺失分组显式标为 null。拒绝遗漏已观察分组的配置。坐标轴始终包含零。

### `annotate`

```python
def annotate(spec, requests):
```

返回带 annotations [{group,value,text}] 的规格副本。请求 {group,text} 必须指向非缺失数据点；生成文字会附上精确的绘图数值和单位。拒绝重复或未知分组。

### `render_svg`

```python
def render_svg(spec):
```

渲染独立、无障碍的 SVG，包含 title、desc、明确的零基线、数值、单位和缺失点标签。折线在缺失点处断开。所有输入文本都经过 XML 转义；不使用 JavaScript 或外部资源。

## 文件与集成

输入 JSON 含 csv、roles、可选 periods 和 charts [{grammar,reducer,annotations}]。输出 chart-N.svg、chart-specs.json、storyboard.html。下游使用方加载 chart-specs.json，逐一选择 charts 条目并调用 render_svg(spec)，无需输入 CSV 即可重现可移植图表。
