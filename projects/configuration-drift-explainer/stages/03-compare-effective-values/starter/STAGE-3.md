`Compare(in Input) Report` 返回 `schemaVersion:1`、`drift:boolean` 和排序后的 `changes`。每行包含 `key`、`kind`、`expected`、`observed`、`history`、`redacted`。敏感键不区分大小写匹配 password/secret/token/api-key/credential，或匹配显式 sensitive 列表。

区分相等、变化、缺失和意外的键。
