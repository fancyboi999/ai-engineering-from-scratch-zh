# 公开 API

所有函数都位于 `main.py`。除非另有说明，无效输入抛出 `ValueError`。CLI 失败时以非零状态退出；保留原始输入。

### `validate`

```python
def validate(document):
```

返回深拷贝模型。participants 是非负整数；materials 有唯一 id、name、kind、quantity、unit，共享材料需要正整数 share。Inventory ID 必须存在。显式正转换因子映射 from->to。拒绝不一致转换环。

### `scale`

```python
def scale(model, participants=None):
```

返回 [{id,name,kind,unit,groups,required}]，耗材用 quantity*participants，可重复使用的共享设备用 quantity*ceil(participants/share)。required 为十进制字符串；零参与者时两类需求均为零。

### `shortages`

```python
def shortages(model, participants=None):
```

返回缩放后的行，增加 available、shortage（十进制字符串或 None）和未解决库存项。通过显式互逆转换路径累加兼容库存。某项只要存在无法换算库存，就将可用量和缺口保留为未知；绝不悄悄推断密度或包装大小。

### `export_plan`

```python
def export_plan(model, counts):
```

返回 schema_version=1 的 {participants,packing,scenarios,csv,uncertain_items}。counts 为用于比较的唯一非负整数列表。CSV 含 id、name、required、available、shortage、unit、status；未知数量留空，status=review。

## 文件与集成

输入 JSON 含 participants、materials、inventory、conversions 和可选 compare counts。输出 packing-list.csv、shortages.json、planner.html。滑块支持 0 到 100 人；CLI 支持任意非负整数。下载 decisions.json 保存选定人数，用 --decisions decisions.json 重跑，再通过 csv.DictReader 把 packing-list.csv 导入电子表格。
