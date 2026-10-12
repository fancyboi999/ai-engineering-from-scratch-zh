# 公共 API

所有函数都位于 `main.py`。除非另有说明，无效输入会抛出 `ValueError`。CLI 失败时以非零状态退出；保留源输入。

### `catalog`

```python
def catalog(resources):
```

校验并复制最多 18 项资源 {id,title,minutes,goals:[str],prerequisites:[id]}。ID 唯一，minutes 为正整数。拒绝已知资源构成的环。缺失的前置 ID 保持显式记录，用于后续可行性检查。

### `path_for`

```python
def path_for(index, target, completed=None):
```

返回 {target,steps,missing,minutes,feasible}，前置资源位于目标之前，已完成 ID 从 steps 中排除。completed 可满足目录外的前置要求。未知目标标为缺失，不伪造资源。

### `rank_paths`

```python
def rank_paths(index, goals, budget, completed=None):
```

返回 {best,alternatives,unmet_prerequisites}。精确搜索组合覆盖所请求目标且包含完整前置依赖的路线；先按覆盖的不同目标最多排序，再按分钟最少、ID 排序。预算为非负整数。best 包含 steps,minutes,covered,uncovered；已完成资源贡献目标但不消耗预算。保留前三个不同备选方案。

### `export_path`

```python
def export_path(index, goals, budget, completed=None, decisions=None):
```

返回 schema_version=1 的 {fingerprint,path,alternatives,unmet_prerequisites,remaining_minutes}。path 条目包含原始资源字段、选择理由和完成状态。审核 {fingerprint,completed:[selected IDs]} 仅在所有前置要求已完成或包含在本次完成列表中时才能标记进度。指纹绑定目录、目标、预算和先前完成状态。

## 文件与集成

输入 JSON 含 resources、goals、budget 和可选 completed ID。输出 learning-map.html、path.json、unmet-prerequisites.json。编辑 HTML 中的进度 JSON，下载 decisions.json，再以 --decisions decisions.json 重跑。课程平台按数组顺序导入 path.json 中的 path 条目，保留 id、prerequisites、minutes 和 completed 字段。
