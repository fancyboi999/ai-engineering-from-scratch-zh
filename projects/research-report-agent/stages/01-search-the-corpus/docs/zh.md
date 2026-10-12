# 搜索语料库

> 检索决定系统其余部分能用哪些证据。

**类型：** Build
**语言：** Rust, Python
**阶段：** 1 / 7（starter）
**预计时间：** 约 5 小时

## 构建内容

实现 `search/main.rs`：一个只用标准库的 Rust 引擎，加载 Markdown 文档，构建 BM25 索引，每行处理一个 JSON 请求。Python 的 `report_agent/search.py` 编译并调用该引擎，不实现第二套排序算法。

```figure
pj-rra-bm25
```

Rust 适合索引工作：所有权让索引生命周期明确，原生循环高效处理词项计数。Python 保持为小型编排层。只有双方契约明确，且测试执行真实进程时，语言边界才有用。

## 解析语料库

每个文档以三行头部、一个空行和原创说明正文开始：

```text
title: A user-space kernel intercepts system calls
source_url: https://www.kernel.org/doc/html/latest/userspace-api/seccomp_filter.html
published: 2026-09-28

A user-space kernel implements an application kernel between a sandboxed process and the host.
```

fixture 语料库包含 12 篇关于隔离概念的原创笔记。来源链接指向支持内容的官方规范或文档；这些是教学 fixture，不是复制的产品文档。头字段缺失是错误。将正文与元数据分开，加载前排序文件路径，避免测试依赖目录枚举顺序。

## 构建索引

对标题和正文分词，将 ASCII 字母转小写，保留数字，删除提供的停用词。统计每个词项在每个文档中出现多少次，以及出现在多少个文档中。文档频率计文档，不计出现次数。

```text
idf(t) = log(1 + (N - df(t) + 0.5) / (df(t) + 0.5))
score(t,d) = idf(t) * tf(t,d) * (k1+1)
             / (tf(t,d) + k1 * (1-b + b*len(d)/avglen))
```

`k1=1.5` 时，词频越高，重复单词的增益越小。`b=0.75` 时，对长文档做长度校正。`interceptor` 等稀有词项比 `kernel` 贡献更大。累加查询词项贡献，按分数降序、文档 id 升序排列。空查询或未知单词不返回结果。

## 定义进程契约

请求包含操作和类型化字段。引擎刷新每行响应，在 stdin 到达 EOF 时退出。诊断写入 stderr，让 stdout 保持为可解析 JSON。

```json
{"query":"daemon socket","k":3}
```

```json
{"cmd":"tokenize","text":"The kernel, VM!"}
```

第二个请求精确返回 `{"tokens":["kernel","vm"]}`。协议还支持 `idf`、`docs`、`doc` 和 `score`。无效 JSON 或错误字段类型返回 `error` 对象。提供的编解码器按 [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259) 处理字符串和转义，包括 Unicode 代理对。小数结果上限无效；零是合法的空结果请求。

实现 `engine_binary()`，返回指向名为 `search` 的编译可执行文件的 `pathlib.Path`。每个进程仅编译一次，在新建的私有临时目录中完成，前缀为 `rra-private-build-`，权限为 `0700`；进程内复用路径，并注册退出清理。绝不信任可预测的共享可执行文件缓存。

每个索引将输入文档写入私有临时目录。使用带参数列表的 `subprocess.run`，设置超时并明确检查返回码。绝不把问题放入 shell 命令。

## 你的任务

starter 提供用于 JSON 解析/转义的 `wire.rs` 和 stdin 循环。实现语料库解析器、分词器、`Index` 和 `handle_line`。补齐 Python 语料库加载器和适配器，保留现有的 `engine_binary`、`BM25Index`、`search`、`score` 和 `idf` API。后续 Python 句子评分复用同一分词规则，文档排序仍在 Rust 中。

```bash
python3 scripts/project_test.py research-report-agent --init my-report-agent
python3 scripts/project_test.py research-report-agent --stage 1 --path my-report-agent
rustc --edition 2021 -O my-report-agent/search/main.rs -o /tmp/rra-search
printf '%s\n' '{"query":"daemon socket","k":3}' | /tmp/rra-search projects/research-report-agent/fixtures/corpus
```

## 预期结果

全新工作区应失败，并明确提示实现第 1 阶段。完成的工作区通过 7 个 Rust 测试和 12 个 Python 集成测试。查询将 `03-daemon-socket-escape` 排第一，分数为正；精确分数取决于 fixture 文本。原生测试覆盖格式错误的 JSON、Unicode 往返、稀有词项权重和确定性平局。

## 自测

为什么文档频率对每个文档中的重复词项只计一次？如果 stdout 在 JSON 响应前有构建日志，会发生什么？哪些查询会因相关笔记使用同义词而被关键词搜索漏掉？

## 进一步探索

测量完这条基线后再添加嵌入索引并融合排序。保持线格式不变，让规划器和写作器能使用任一后端。

## Orchard 案例推演

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/zh.md)。

从检索开始，不要把它变成 JSON 解析器作业。starter 提供 wire.rs 和 stdin 管道。你实现语料库验证、分词、BM25 索引和 Python 进程适配器。Rust 构建到每进程私有目录。

```text
N=2, df(orchard)=2 -> idf=log(1.2)=0.1823
df(expiration)=1 -> idf=log(2)=0.6931
稀有词项 expiration 获得更高权重
```

## 构建并检查

分别追踪一个词项计数和一个文档频率计数。除非选择可选的编解码器扩展，否则将传输代码留在 wire.rs 中。

在学习者工作区实现本阶段。CLI 辅助程序是提供的适配器，导入你的函数，不以参考方案替代。

```bash
python3 scripts/project_test.py research-report-agent --init learning-artifacts/research-report-agent
python3 scripts/project_test.py research-report-agent --stage 1 --path learning-artifacts/research-report-agent
```

预测上面的中间状态，再运行本阶段。全新桩实现会失败；参考方案通过不能证明学习者工作区已完成。

## 下一步探查

为什么重复词项增加词频，却不增加文档频率？
