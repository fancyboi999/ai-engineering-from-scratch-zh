# 第 36 课夹具

所有文件为自有内容，ledger.c 复制自 `manuals/reverse-engineering-101/capture/fixtures/ledger.c`。

本目录及 candidates/ 的全部 x86-64 目标采用：

```bash
clang -target x86_64-unknown-linux-gnu -O1 -fno-asynchronous-unwind-tables -c <source>.c
```

| 文件 | 内容 |
|---|---|
| `ledger.c` | 原始源码： `percent_change`, `grade`, `total`, `grade_label` |
| `ledger-x86_64-O1.o` | 原始目标，SHA-256 `9a4a8082ba5e285a732552981a6935e0c5255725664f380e37c44ebfb04d803f` |
| `candidates/*.c` | percent_change、grade 的八种重建，每文件一函数 |
| `candidates/*.o` | 各重建按上述命令编译 |
| `runs/agent-run.json` | main.py --live 记录的一次 rea 6.5.0/Ghidra 12.1.4 agent 循环 |
| `runs/leg-one-*.json` | main.py --save-runs 记录的一次运行比较各行 |

测试读取提交的目标和运行记录，无 clang、rea、Ghidra 也能运行。
