# 公共 API

所有函数都位于 `main.py`。除非另有说明，无效输入会抛出 `ValueError`。CLI 失败时以非零状态退出；保留源输入。

### `snapshot`

```python
def snapshot(source):
```

以只读连接读取已有 SQLite 文件，备份到内存。返回模式定义、表行数、与顺序无关的行内容 SHA-256 哈希和 AUTOINCREMENT 序列。绝不以可写方式打开源文件。

### `rehearse`

```python
def rehearse(source, migration):
```

仅在内存备份上应用 SQL。返回 {before,after,schema_diff,error,applied}；即使出错，after 也记录部分应用脚本的状态。拒绝 ATTACH、DETACH、PRAGMA、创建虚拟表和扩展/文件函数；长语句在两秒进度期限后中断。这是 SQLite 政策，不是操作系统隔离。

### `test_rollback`

```python
def test_rollback(source, migration, rollback):
```

在同一个可丢弃备份上重新应用迁移和声明的回滚。返回迁移证据及 {rollback_error,restored,reversible}。restored 为回滚后快照；reversible 要求正向和回滚脚本成功，且模式、行内容和序列与 before 完全相等。不自动编造回滚 SQL。

### `receipt`

```python
def receipt(source, migration, rollback, invariants):
```

返回 schema_version=1 的演练结果，含 invariant_results 和 release_ready。invariants 为 [{table,min_rows?,max_rows?,same_rows?,preserve_data?}]。缺表会失败。preserve_data 比较完整行哈希，适用于模式未变化的表。发布就绪要求所有不变量通过、正向 SQL 成功并证明精确回滚；这是供人类发布决策使用的证据。

## 文件与集成

输入 JSON 含 database（相对于 JSON 的路径）、migration SQL、rollback SQL 和 invariants。未提供 database 时，演示在输出目录创建原创 SQLite fixture。输出 rehearsal.json、schema-diff.json、review.html。发布门禁读取 rehearsal.json，要求 release_ready=true，同时保留各项不变量和回滚证据供人工审核。
