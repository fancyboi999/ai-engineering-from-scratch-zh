# 从 Git 生成变更日志

读取真实的 Git 修订范围，保留迁移页脚和 revert 引用，再导出可复现的 Markdown 及来源回执。

等级 2。四个阶段，约八小时。实现语言：Go，仅用标准库。

## 开始前

使用 Go 1.22 或更高版本，评分器需要 Python 3.12 或更高版本。你应熟悉函数、结构体、切片、映射和返回的错误。如果还不熟悉，先完成[环境配置](../../phases/00-setup-and-tooling/01-dev-environment/docs/zh.md)和[数据管理课程](../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。

## 阶段

1. [读取不可变的 Git 导出](stages/01-read-an-immutable-git-export/docs/zh.md)
2. [分类约定式提交标题](stages/02-classify-conventional-subjects/docs/zh.md)
3. [按稳定顺序分组提交](stages/03-group-commits-with-stable-ordering/docs/zh.md)
4. [渲染有界的发布说明](stages/04-render-bounded-release-notes/docs/zh.md)

## 动手构建

```bash
python3 scripts/project_test.py changelog-writer-from-git --init /tmp/changelog-writer-from-git-work
python3 scripts/project_test.py changelog-writer-from-git --stage 1 --path /tmp/changelog-writer-from-git-work
python3 scripts/project_test.py changelog-writer-from-git --all --solution --strict
```

## 运行产物

```bash
cd projects/changelog-writer-from-git/solution
go run .
```

`--repo PATH --from REV --to REV` 读取不可变的 Git 范围。也可以用 `--input FILE` 接收 `git log --format=%H%x00%s%x00%b%x00 FROM..TO` 的输出。添加 `--output release.md --receipt release.json` 可生成可复用产物。不传参数时使用原创的双提交 fixture。支持的仓库配置使用 SHA-1 提交 ID；SHA-256 仓库需要扩展哈希格式。

学员 starter 已提供 CLI 和集成适配器。实现四个阶段函数；适配器组合调用的正是这些函数，无法绕过未完成的部分。完成核心阶段后阅读 integration.go，了解文件边界、回执和渲染。

演示用离线 fixture 运行真实的参考实现，然后退出。每阶段至少有五个独立测试，覆盖边界和被拒绝的输入。预期行为由阶段测试定义；实现从不读取留出的测试文件。评分器在初始化时保留你的代码，缺少运行时时如实报告运行未完成。

## 完成证据

```bash
python3 scripts/project_test.py changelog-writer-from-git --all --path /tmp/changelog-writer-from-git-work --strict --report /tmp/changelog-writer-from-git-result.json
```

只有完整的学员报告才能证明本地完成。参考运行不授予证书。报告是未签名的本地证据，本项目不认证生产就绪程度。

## 来源

[官方参考](https://git-scm.com/docs/pretty-formats)。所有实现和练习均为原创。fixture 中的数字只是示例，不是外部基准测试结论或真实服务保证。
