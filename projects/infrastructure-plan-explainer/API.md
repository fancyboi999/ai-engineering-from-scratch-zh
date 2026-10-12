# 公共 API

所有函数都位于 `main.py`。除非另有说明，无效输入会抛出 `ValueError`。CLI 失败时以非零状态退出；保留源输入。

### `load_plan`

```python
def load_plan(document):
```

校验 Terraform JSON 格式主版本为 1，返回脱敏的 {format_version,resources,configuration}。资源 ID 组合 address 与可选 deposed 键。仅保留掩码后的 before/after 和 actions；省略 variables、prior state 和所有其他可能含秘密的原始字段。

### `classify`

```python
def classify(actions):
```

对支持的精确动作序列返回 create,update,delete,replace,read,no-op 或 forget。create/delete 的两种顺序都是替换。未知序列抛出 ValueError。

### `impact_graph`

```python
def impact_graph(plan):
```

返回 {nodes,edges,unresolved}。节点为 {id,address,action}；边 {from,to,reference} 表示 from 依赖 to。按最长资源地址前缀解析表达式引用和 depends_on，包括对计数实例的静态引用。保留未解决资源引用；忽略 var/local/path/count/each/terraform 根。

### `explain`

```python
def explain(plan):
```

返回 schema_version=1 的 {graph,resources,markdown}。Markdown 列出精确地址，带稳定本地锚点和转义代码数据。图边是声明的依赖，不预测 provider 执行顺序或传递停机影响。

## 文件与集成

直接传入保存的 Terraform JSON：terraform show -json saved.plan > input.json，然后 python3 cli.py input.json --output review。输出 change-brief.md、resource-impact.json、review.html。下游加载 resource-impact.json，按 id 将 graph.edges 的 from/to 关联到 resources。解释已有 JSON 文件不需要 Terraform 二进制程序或 provider 凭据。
