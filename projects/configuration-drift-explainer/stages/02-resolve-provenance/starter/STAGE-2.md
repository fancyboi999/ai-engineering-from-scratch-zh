`Resolve(layers []Layer) map[string]Effective`，其中类型为 `Effective{Value any, History []Source}` 和 `Source{Layer string, Value any}`。空层生成空映射。

选择最后声明的值，同时保留每个被覆盖的设置。
