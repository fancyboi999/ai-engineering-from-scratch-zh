`sample(records:&[Record],budget:usize,policy:&str)->Result<Vec<Record>,String>`。策略只能是 uniform 或 rarity。预算为零或输入为空时返回空向量；预算超过输入时，每条记录返回一次。

将固定记录预算用于常见或稀有模板。
