# 工具调用防火墙

证明具体授权并执行了哪项操作的批准回执。

调用者应用提供身份；模型只提供建议操作。紧凑 Rust 封装含稳定请求 ID、角色、工具、相对参数，不含含糊分隔符或控制字符。

## 从学员工作区开始

[工具模式设计](../../phases/13-tools-and-protocols/05-tool-schema-design/docs/zh.md)、[安全与秘密审计](../../phases/17-infrastructure-and-production/25-security-secrets-audit/docs/zh.md)。语言基础：[Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)。

安装 Rust（`rustc`）与 Python 3.10+。核心用 Rust 标准库；Python 适配器编译到私有临时目录。

```bash
python3 scripts/project_test.py tool-call-firewall --init learning-artifacts/tool-call-firewall
python3 scripts/project_test.py tool-call-firewall --stage 1 --path learning-artifacts/tool-call-firewall
```

## 构建路线

1. [验证无歧义调用封装](stages/01-validate-an-unambiguous-call-envelope/docs/zh.md)
2. [评估角色与路径策略](stages/02-evaluate-role-and-path-policy/docs/zh.md)
3. [一次性消费绑定请求的批准](stages/03-consume-a-request-bound-approval-once/docs/zh.md)
4. [记录有界审计证据](stages/04-record-bounded-audit-evidence/docs/zh.md)

## 用自己的输入运行

阶段完成后，这些命令在原创 Orchard 示例上运行你的工作区代码。把样本路径替换为自己的文件。

```bash
rustc --edition=2021 learning-artifacts/tool-call-firewall/cli.rs -o learning-artifacts/tool-call-firewall/firewall
learning-artifacts/tool-call-firewall/firewall projects/tool-call-firewall/examples/workspace reader r1 read notes.md
```

先检查完整参考方案时，将同命令中的 `learning-artifacts/tool-call-firewall` 替换为 `projects/tool-call-firewall/solution`。JSON 结果使用 `schema_version: 1`；路径和参数示例明确，便于其他工具消费。

## 集成边界

原生 CLI 要求调用应用提供可信角色。读写经 dispatch，验证规范路径包含关系，将写入绑定精确内容。批准在单次调用内于内存一次性使用。代码是文件工具强制约束示例，不是持久跨进程权威或操作系统沙箱。

```bash
python3 scripts/project_test.py tool-call-firewall --all --solution --strict
python3 scripts/project_test.py tool-call-firewall --all --path learning-artifacts/tool-call-firewall --strict
```

首命令检查参考方案，第二检查你的实现。发布的示例和测试是回归证据，不是生产认证或未见基准测试。

## 主要参考资料

- [官方参考](https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices)
