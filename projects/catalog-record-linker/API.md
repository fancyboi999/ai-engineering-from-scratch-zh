# 公共 API

所有函数都位于 `main.py`。除非另有说明，无效输入会抛出 `ValueError`。CLI 失败时以非零状态退出；保留源输入。

### `import_catalog`

```python
def import_catalog(text, source):
```

解析 CSV，要求 id 非空且唯一、title 非空；creator 和额外字段可选。返回包含 source 和 source_id 键的记录，保留原始字段。拒绝列数不齐的行、重复表头和空来源名称。

### `candidates`

```python
def candidates(left, right, threshold=0.25):
```

按分数降序返回候选配对 {left,right,score,title_score,creator_score}；title 的 Jaccard 相似度权重为 0.8，creator 为 0.2。纳入分数 >= threshold 的配对；同分时按来源 ID 排序。阈值必须为 [0,1] 内的有限值。

### `reconcile`

```python
def reconcile(left, right, decisions):
```

返回合并实体，包含 sources（完整原始记录）、fields 和未解决的 conflicts。决定格式为 [{left,right,match:bool,values:{field:chosen string}}]。要求被接受的关联为一对一、ID 已知、每个配对的决定唯一。未匹配记录仍单独保留。

### `export_catalog`

```python
def export_catalog(left, right, review=None):
```

返回 schema_version=1 的 {fingerprint,entities,crosswalk,ready}；crosswalk 是包含 source_id,entity_id 的 CSV。可选审核数据 {fingerprint,pairs:[decisions]} 绑定源记录。ready 表示每项被接受的合并都已解决字段冲突，不代表所有候选都经过审核。

## 文件与集成

输入含 left_csv、right_csv 和可选 threshold。输出为 crosswalk.csv、merged-catalog.json、review.html。下载 decisions.json，在 pairs 中添加 {left,right,match,values} 条目，然后传入 --decisions decisions.json。指纹会拒绝针对不同源输入的审核。
