# 公共 API 契约

定义小型版本化数据契约，检查字段类型和边界，找出重复组内的每一行，将接受记录与隔离记录分开导出。CLI 退出码控制摄取门禁，源行报告解释失败原因。

## 校验明确的质量契约

```text
validate_contract(contract) -> dict
```

要求 version=1 且 fields 为非空对象。每个字段声明 type 为 string、integer、number 或 boolean；可选 required 为布尔值。数值 min/max 必须有限且有序。enum 为声明类型的非空列表。unique 包含互不相同的已声明字段名。min_rows/max_rows 为非负整数。未知规则按失败关闭处理。

拒绝不支持的版本、未知键、缺少字段、上下界倒置、不兼容枚举和指向不存在列的唯一性规则。

## 检查每条记录，不做强制转换

```text
row_issues(row, contract) -> list[dict]
```

使用已校验的契约。返回有序 {field,rule} 字典。缺失必需字段产生 required；标量类型错误产生 type；数值越界产生 min 或 max；不允许的枚举值产生 enum。未知字段产生 extra，除非 allow_extra=true。非对象行产生 {field:"",rule:"object"}。

布尔 true 不通过 integer 和 number 字段。非有限浮点数不通过 number 字段。契约保留原记录，绝不编造缺失值。

## 找出重复组中的全部行

```text
duplicate_rows(rows, contract) -> list[dict]
```

对每个 unique 列，将有效类型值索引到从 1 开始的输入行号。仅为至少包含两行的组输出 {field,rows}。缺字段和类型错误的值留给行校验。报告所有碰撞成员，包括第一次出现的记录。

不要尝试对无效数组或对象求哈希。两个缺失可选值不证明键重复。这里选择的是按列唯一性规则，不是组合唯一性。

## 导出分区并执行数据集门禁

```text
evaluate(rows, contract) -> dict; render_html(report) -> str
```

返回 schema_version=1、passed、counts、dataset_issues、duplicates、accepted 和 quarantine。隔离记录带有 row_number、record 和 issues。为重复组中的每行添加 unique 问题。仅当没有隔离行和整个数据集的问题时，数据集才通过。CLI --check 对规则失败使用 exit1，对无效输入使用 exit2。

输出分区是证据，不是自动丢弃记录的许可。多个独立输出文件不构成原子事务；下游应等命令成功完成后再加载。

## 边界

版本 1 契约为原创教学格式，不是 JSON Schema 或 Open Data Contract Standard。支持扁平 JSON 对象、四种标量类型、必需字段、数值边界、枚举、单列唯一性和行数边界。缺失的可选唯一字段不会碰撞。重复检测内存与批次大小成正比；API 将输入限制为十万行。不检查语义真实性或跨表外键。隔离区含原始记录，必须保存在适当的本地位置。
