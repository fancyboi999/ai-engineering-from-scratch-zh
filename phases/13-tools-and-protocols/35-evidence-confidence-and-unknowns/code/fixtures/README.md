# 第 35 课夹具

所有文件要么是自行编写编译的程序，要么是对该程序运行工具产生的记录。

| 文件 | 内容 |
|---|---|
| `ledger.c` | 共用夹具源码： `percent_change`, `grade`, `total`, `grade_label`. SHA-256 `4564c3e7e39fe4d10530bb6489722924ad3f34ffd78d8fa203a5e1fe832fdacb`. |
| `ledger-x86_64-O1.o` | x86-64 ELF 可重定位目标。 SHA-256 `9a4a8082ba5e285a732552981a6935e0c5255725664f380e37c44ebfb04d803f`. |
| `harness.c` | 包含 ledger.c 的本机测试程序，每次打印一个函数结果，main.py 用本机编译器构建。 |
| `rea-evidence-percent-change.json` | rea 6.5.0 使用 Ghidra 12.1.4 分析 percent_change 的 analyze_function 证据。 `evidence_id` `ev_e88b10dc0c6400e51bb6f7fdc3eaea8d2c97cc02463f0db3e6afeefc273197cd`. |
| `rea-evidence-grade.json` | rea 6.5.0 分析 grade 的 analyze_function 证据。 `evidence_id` `ev_67b6d3f992eaf49a2e16de084b6ebfdd9884e8c5c7f75e175b7bb20f4f748ce1`. |
| `rea-snapshot.json` | 上述两次运行写出的 rea 快照，含两个 query_ 项及相同两记录的证据包。 |
| `run-evidence.json` | harness.c 本机构建的观察执行记录，导出命令为 `python3 code/main.py --record code/fixtures/run-evidence.json`，日期 2026-10-13（macOS 26.2、arm64、Apple clang 17.0.0）。 |

目标构建命令 (Apple clang 17.0.0, clang-1700.6.3.2, macOS 26.2, 2026-10-13):

```bash
clang -target x86_64-unknown-linux-gnu -O1 -fno-asynchronous-unwind-tables -c ledger.c -o ledger-x86_64-O1.o
```

rea 命令 (rea-agents 6.5.0, Ghidra 12.1.4, OpenJDK 21.0.12.1, `GHIDRA_INSTALL_DIR=/opt/homebrew/Cellar/ghidra/12.1.4/libexec`, `JAVA_HOME=/opt/homebrew/opt/openjdk@21`)，于 2026-10-14 从此目录运行：

```bash
npx -y rea-agents@6.5.0 function "$PWD/ledger-x86_64-O1.o" grade --provider ghidra --format json --snapshot "$PWD/rea-snapshot.json" > rea-evidence-grade.json
npx -y rea-agents@6.5.0 function "$PWD/ledger-x86_64-O1.o" percent_change --provider ghidra --format json --snapshot "$PWD/rea-snapshot.json" > rea-evidence-percent-change.json
```

首命令耗时 8.6 秒，第二 8.5 秒，均重新导入 Ghidra。第三次用同快照运行 grade 耗时 2.1 秒，返回相同记录和 evidence_id。
