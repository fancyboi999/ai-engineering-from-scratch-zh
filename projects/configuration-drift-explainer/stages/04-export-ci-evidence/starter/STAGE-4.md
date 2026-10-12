`Export(in Input) ([]byte,error)` 仅序列化 `Compare(in)`。CLI：`go run . --input PATH --out PATH [--check]`。Go run 会包装子进程退出码，因此检查精确退出码 2 时要构建二进制。

生成助手无需接收秘密值也能使用的报告。
