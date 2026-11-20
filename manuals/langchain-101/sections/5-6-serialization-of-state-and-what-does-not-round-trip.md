# 状态的序列化，以及哪些值无法往返

> checkpointer 用 msgpack 保存状态，所以大多数 Python 值能原样取回，而元组、元组的集合、dict 子类和时区取回后都变了。

你的节点把一个 `Counter` 放进状态，并在下一步往里加数。在同一个线程上，代码正常运行。在恢复后的线程上，它抛出错误，因为从检查点取回的值是一个普通的 `dict`。你在检查点之后读到的状态，是序列化器能重建出来的状态。

读完本节，你能预测哪些值能在检查点之后保留下来，选择能保留的类型，并阻止检查点里的一行去运行代码。

## JsonPlusSerializer {#s-serialization-of-state-and-what-does-not-round-trip-jsonplusserializer}

**序列化器（serializer）：** 为 checkpointer 把状态值转成字节、再转回来的对象。默认的是 `langgraph.checkpoint.serde.jsonplus` 里的 `JsonPlusSerializer`。

**往返（round trip）：** 一个值写入检查点，再读回来。一个值取回时类型相同、值也相等，就是往返成功。

`JsonPlusSerializer` 用 msgpack 写大多数值，并给每个值标上种类，例如 `msgpack`、`bytes` 或 `null`。checkpointers 页面说它使用 ormsgpack 和 JSON，打开之后也允许 pickle 模式 {{docs oss/python/langgraph/checkpointers}}。[第 5.2 节](#s-checkpointers-and-threads)里 SQLite 文件的每一行，种类都是 `msgpack`。消息、Pydantic 模型、dataclass 和枚举这些已知类型带着它们的模块名和类名，所以加载器能再次构建它们。

## 取回后变了的值 {#s-serialization-of-state-and-what-does-not-round-trip-what-comes-back-changed}

**我们测得** 29 个值，环境是 Mac，Apple M1 Max，10 核，64 GiB，`langgraph-checkpoint` 4.3.2，每个值运行一次。每个值先经过 `dumps_typed` 和 `loads_typed`，再经过一个单节点图，在 `SqliteSaver` 上做 `get_state`。两条路径对每个值给出的结果相同。二十个值往返成功：

- `str`、`int`、`float`、`bool`、`None`、`list` 和 `bytes`
- 键为整数的 `dict`，以及整数的 `set` 和 `frozenset`
- `Decimal`、`UUID`、`Path`、`date`、`timedelta`，以及 UTC 的 `datetime`
- 一个 `Enum`、一个 dataclass、一个 Pydantic 模型和一个 `AIMessage`

九个取回后变了，或者没有保存。[图](#fig-5-6)把它们分了类。

```figure
id: fig-5-6
kind: decision
title: 九个值在检查点里取回的样子
claim: 元组和元组的集合取回为列表，dict 子类取回为 dict，时区取回为固定偏移，普通类则无法保存。
caption: 每一行是我们运行里的一个值。先看左边的值，再看 get_state 返回了什么。琥珀色的行类型变了，玫红色的行在任何检查点之前就抛出了错误。来源：capture/lab/summary/serde-mac.json。
```

| 值 | 取回的是什么 | 是否同一个值 |
|---|---|---|
| `(1, 2)` | `[1, 2]`，一个 `list` | 否 |
| `{(1, 2), (3, 4)}` | `[[1, 2], [3, 4]]`，一个 `list` | 否 |
| `frozenset({(1, 2)})` | `[[1, 2]]`，一个 `list` | 否 |
| `defaultdict(list, ...)` | 一个没有默认值的 `dict` | 相等 |
| `Counter("abca")` | 一个 `dict` | 相等 |
| `OrderedDict(...)` | 一个 `dict` | 相等 |
| `Asia/Kolkata` 的 `datetime` | 同一时间，带固定的 `+05:30` 偏移 | 相等 |
| `America/New_York` 的 `fold=1` 的 `datetime` | 固定偏移，`fold` 为 0 | 否 |
| 一个普通类的实例 | `TypeError: Type is not msgpack serializable: Plain` | 未保存 |

元组的集合无法重建，加载器给出了它的原始数据，并记录了一行日志：

```listing
title: 往返的日志行
source: capture/lab/T13-serde-mac/04-round-trip-log.txt
lang: text
note: Point 和 Card 的行被截掉了。
---
Could not reconstruct builtins.set from checkpoint (TypeError); returning its serialized data instead.
Could not reconstruct builtins.frozenset from checkpoint (TypeError); returning its serialized data instead.
Deserializing unregistered type __main__.Color from checkpoint. This will be blocked in a future version. Set LANGGRAPH_STRICT_MSGPACK=true to block now, or add to allowed_msgpack_modules to allow explicitly: [('__main__', 'Color')]
…
```

有三个未关闭的 issue 报告了这些情况。issue #8388 报告元组的集合取回为 `None` {{issue 8388}}。在锁定版本上，它取回为列表的列表。issue #8184 报告 dict 子类，issue #8826 报告时区和 `fold` {{issue 8184}} {{issue 8826}}。两者在锁定版本上都能复现。

取回为固定偏移的 `ZoneInfo` 时间，比较时仍然相等。到了夏令时的下一次切换之后，它的本地时间就错了。

把状态保存在能往返的类型里。把时间存成 UTC 的 `datetime`，把时区名存成字符串。把 `Counter` 或 `defaultdict` 存成 `dict`，在节点里重建它。用列表代替元组，用列表的列表代替元组的集合。给自定义类一个 Pydantic 模型或 dataclass。

## 你自己的类型与严格 msgpack {#s-serialization-of-state-and-what-does-not-round-trip-your-own-types-and-strict-msgpack}

上面的日志里还有第二个警告。你自己模块里的枚举、dataclass 或 Pydantic 模型，是未注册的类型。加载器会构建它，并警告说未来的版本会阻止它。设置 `LANGGRAPH_STRICT_MSGPACK=true` 后，加载器现在就阻止它，并返回原始字段。警告指出了修正办法：把你的模块和类列入 `JsonPlusSerializer` 的 `allowed_msgpack_modules`。

同一条规则也保护你免受被篡改的检查点行的影响。一行指明一个模块和一个类，加载器会导入并构建这个类。

**我们测得**加载器接受什么，环境是 Mac，每种情形运行一次。实验记录里的一个类在被构建时会写一个标记文件。用默认设置，26 种情形里有 5 种构建了这个类。其中两种是需要主动打开的选项 `allowed_json_modules=True` 和 `pickle_fallback=True`，两种是指名了实验类的 msgpack 值。第五种是一行我们改过的 `SqliteSaver` 检查点，它指名了这个类，`get_state` 构建了它。用 `LANGGRAPH_STRICT_MSGPACK=true` 时，只有那两种主动打开的情形构建了这个类，被改过的那一行取回为普通的 dict。

所以在锁定版本上，任何能写检查点行的人，都能让你的进程导入并构建他选定的类。`JsonPlusSerializer` 的文档字符串对此发出了警告 {{code libs/checkpoint/langgraph/checkpoint/serde/jsonplus.py}}。设置 `LANGGRAPH_STRICT_MSGPACK=true`，注册你的模块，并且只把检查点数据库的写权限给运行这个图的服务。[第 8.4 节](#s-security-deserialization-store-isolation-approvals-and-mcp-subprocesses)讲 `load()` 以及这些情形背后的安全通告。

`PostgresSaver` 使用同一个序列化器，我们没有运行它。`EncryptedSerializer`，以及关于它接受明文行的 issue #8938，会在下一版出现，见[第 8.8 节](#s-limits-at-the-pin-and-what-comes-in-the-next-edition)。

```takeaways
- 把状态保存在能往返的类型里：dict、列表、字符串、数字、模型和 dataclass。
- 把时间存成 UTC，并把时区名存成单独的字符串。
- 在元组、元组的集合和 dict 子类进入状态之前先转换它们。
- 设置 LANGGRAPH_STRICT_MSGPACK=true，并把你的模块列入 allowed_msgpack_modules。
- 限制谁能写检查点数据库，因为一行会指明加载时用的类。
```

来源：capture/out/29-checkpoint-sqlite.txt; capture/lab/summary/serde-mac.json, capture/lab/T13-serde-mac/01-serde-default.jsonl, capture/lab/T13-serde-mac/02-serde-strict-msgpack.jsonl, capture/lab/T13-serde-mac/03-round-trip.jsonl, capture/lab/T13-serde-mac/04-round-trip-log.txt, capture/lab/T13-serde-mac/t13_roundtrip.py; libs/checkpoint/langgraph/checkpoint/serde/jsonplus.py and libs/checkpoint/langgraph/checkpoint/serde/_msgpack.py at langgraph 1.2.22; docs.langchain.com at docs commit 04d4d4a (oss/python/langgraph/checkpointers); GitHub issues langchain-ai/langgraph#8388, #8184, #8826, #8938, and advisories GHSA-g48c-2wqr-h844 and GHSA-fjqc-hq36-qh5p.
