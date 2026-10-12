# 公开 API

所有函数都位于 `main.py`。除非另有说明，无效输入抛出 `ValueError`。CLI 失败时以非零状态退出；保留原始输入。

### `inventory`

```python
def inventory(folder):
```

返回 folder 下普通文件的排序记录 {path,size,sha256,suffix}。拒绝符号链接；路径为相对根目录的 POSIX 路径。按 64 KiB 分块流式计算 SHA-256。

### `categorize`

```python
def categorize(record):
```

返回 {category,scores,evidence}。识别到的扩展名得 3 分；文件名中的 workshop/handout 单词各给 documents 加 1 分。最高正分获胜，同分按字母顺序决胜；无证据则为 other。

### `plan_moves`

```python
def plan_moves(records, occupied=None):
```

返回 schema_version=1 的 moves 和 duplicate_groups。移动计划保留原始路径/哈希，选择 category/basename；遇到不区分大小写的冲突，在后缀前追加 -2、-3。occupied 包含已有目标路径。不修改文件系统。

### `review_plan`

```python
def review_plan(folder, plan, decisions=None):
```

校验当前源文件字节和可选的 {fingerprint,approved:[source paths]}；返回含 approved 布尔值及 fingerprint 的计划。拒绝缺失/已变更文件、路径遍历和未知/重复批准项。这是文件管理器的集成门禁；它绝不移动文件。

## 文件与集成

输入 JSON 包含相对该 JSON 文件的 folder，以及可选的已有目标路径字符串 occupied。输出：moves.json、duplicates.json、review.html。下载并编辑 decisions.json，保留 fingerprint 并填写包含源路径的 approved 数组，然后用 --decisions decisions.json 重跑。文件管理器导入 review_plan(folder, json.load(open("moves.json")), decisions)，检查目标可用性后仅执行获批移动。
