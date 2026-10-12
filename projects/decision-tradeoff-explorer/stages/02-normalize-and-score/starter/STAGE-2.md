`normalize(c:Criterion,v:number):number`；`score(data,weights={}):Row[]` 按分数降序再按 ID 排序。行包含 `{id,label,score,missing,violations,normalized}`。权重覆盖值是原始非负大小；无效或全零权重抛出错误。

归一化单位，不掩盖缺失值或硬约束。
