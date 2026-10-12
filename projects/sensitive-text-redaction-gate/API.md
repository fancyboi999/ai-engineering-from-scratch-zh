# 公开 API 契约

检测 ASCII 邮件模式、有效 IPv4 地址和显式字面标识符。合并重叠跨度，替换其并集，不在回执中泄露原值；导出脱敏 JSONL 和可检查的 HTML 台账。

## 检测有界敏感跨度

```text
detect(text, literals=()) -> list[dict]
```

返回 start/end Python 字符偏移及 kind EMAIL、IPV4 或 LITERAL。end 不包含在内。结果按 start、end、kind 排序。绝不返回匹配文本。检测器用 ipaddress 校验点分地址，不接受任意四数字字符串。字面匹配区分大小写，包含重叠匹配。

文本类型无效、超过一百万字符、空字面串或超过一百个字面串均抛出 ValueError。一条记录超过 10,000 次匹配时，也在返回部分结果前抛出 ValueError。起始边界检查完整的允许邮件前缀字符集，避免纯标点输入触发重复扫描。

## 合并完整重叠并集

```text
merge_spans(spans, text_length) -> list[dict]
```

校验每个跨度并对副本排序。相交跨度成为一个并集，kinds 排序去重。相邻跨度仍独立。不要删除小型嵌套匹配而意外暴露更大匹配的剩余部分。

拒绝布尔偏移、负起点、空跨度、超过 text_length 的终点和不支持的 kinds。绝不修改调用方跨度。

## 替换跨度，不泄露源值

```text
redact(text, literals=()) -> dict
```

组合 detect 和 merge_spans。从左向右遍历，追加未触及文本和字面标记 [REDACTED]，最后追加剩余后缀。返回 text、spans 和 redacted_characters。每个回执包含 index、start、end 和 kinds。偏移始终对应原始字符串。

不要将短私密值的哈希放入公开回执：这些哈希仍可支持字典猜测。异常或回执都不要包含源子串。

## 导出脱敏记录和有界证据

```text
process(records, literals=()) -> dict; render_html(report) -> str
```

接受最多一万条恰含 id 和 text 的记录。ID 必须匹配 [A-Za-z0-9_-]{1,64} 且唯一。返回 schema_version=1、records、ledger、totals 和 scope。附带 CLI 写出 JSONL 和不含原始输入文本的回执。HTML 转义脱敏内容，允许审核者展开偏移台账。

拒绝额外元数据，不能悄悄将未扫描字段复制进输出。调用方有责任提供非敏感 ID；语法校验不能证明 ID 是公开的。

## 边界

这是有界、基于模式的脱敏器，不是通用 PII 检测器，也不保证匿名化。它识别 ASCII 邮件语法、有效点分 IPv4 地址和区分大小写的字面串。姓名、电话、IPv6、混淆地址和编码秘密可能残留。ID 必须非敏感。分享前审核剩余文本。HTML 只含脱敏文本和偏移回执，绝不包含原值或配置的字面字典。
