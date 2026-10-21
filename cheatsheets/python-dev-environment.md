---
id: python-dev-environment
title: AI Python 开发环境
code: PD
subtitle: 安装 uv，每项目一个虚拟环境，通过锁文件固定依赖，检查学习路线，配置 VS Code，避免无声的 Python bug。
hue: 210
sources: phases/00-setup-and-tooling/01-dev-environment, phases/00-setup-and-tooling/06-python-environments, phases/00-setup-and-tooling/08-editor-setup, phases/00-setup-and-tooling/13-python-for-ai-engineering
source_hash: a4349266b65a23dc
---

## 四层技术栈
type: architecture
from: phases/00-setup-and-tooling/01-dev-environment/docs/zh.md

```arch
node | sys | 1,1 | 1. 系统基础 | OS、shell、git、编辑器、GPU 驱动 | process
node | pkg | 2,1 | 2. 包管理器 | uv、pnpm、cargo、juliaup | store
node | run | 3,1 | 3. 语言运行时 | Python 3.11+、Node 20+、Rust、Julia | process
node | lib | 4,1 | 4. AI/ML 库 | PyTorch、JAX、transformers | model
edge | sys | pkg | 先安装
edge | pkg | run |
edge | run | lib |
```

## 安装工具链
type: command-table
from: phases/00-setup-and-tooling/01-dev-environment/docs/zh.md
span: 2

| 命令 | 作用 |
|---|---|
| `xcode-select --install` | macOS 构建工具和 git |
| `sudo apt install -y build-essential git curl wget unzip` | Ubuntu 或 Debian 基础工具 |
| `wsl --install -d Ubuntu-24.04` | Windows：使用 WSL2 |
| `curl -LsSf https://astral.sh/uv/install.sh \| sh` | 安装 uv |
| `uv python install 3.12` | 安装 Python 3.12 |
| 先 `fnm install 22`，再 `fnm use 22` | TypeScript 课程使用的 Node.js 22 |
| `npm install -g pnpm` | 安装 pnpm |

## 创建环境
type: task-table
from: phases/00-setup-and-tooling/06-python-environments/docs/zh.md
span: 2

| 任务 | 代码 |
|---|---|
| uv venv（推荐） | 先 `uv venv`，再 `source .venv/bin/activate` |
| 带 pyproject.toml 的新项目 | 先 `uv init my-ai-project`，再 `uv add torch numpy matplotlib` |
| 内置 venv | `python3 -m venv .venv` |
| Windows 激活 | `.venv\Scripts\activate` |
| Conda 环境 | 先 `conda create -n myproject python=3.12`，再 `conda activate myproject` |
| 安装额外依赖组 | `uv pip install -e ".[torch,llm]"` |
| 创建锁文件 | `uv pip compile pyproject.toml -o requirements.lock` |
| 从锁文件安装 | `uv pip install -r requirements.lock` |

## 带 extras 的 pyproject.toml
type: annotated-code
lang: toml
from: phases/00-setup-and-tooling/06-python-environments/docs/zh.md

```toml
[project]
name = "ai-engineering-from-scratch"
version = "0.1.0"
requires-python = ">=3.11"            # 课程最低版本
dependencies = [
    "numpy>=1.26",
    "matplotlib>=3.8",
    "jupyter>=1.0",
    "scikit-learn>=1.4",
]
[project.optional-dependencies]
torch = ["torch>=2.3", "torchvision>=0.18"]   # uv pip install -e ".[torch]"
llm = ["anthropic>=0.39", "openai>=1.50"]     # uv pip install -e ".[llm]"
```

## 检查学习路线
type: command-table
from: phases/00-setup-and-tooling/01-dev-environment/docs/zh.md, phases/00-setup-and-tooling/01-dev-environment/code/verify.py, phases/00-setup-and-tooling/06-python-environments/docs/zh.md, phases/00-setup-and-tooling/06-python-environments/code/env_setup.sh

| 命令 | 作用 |
|---|---|
| `verify.py --route beginner` | 默认路线，需要 python 和 git |
| `--route ml-foundations` | 还需要 numpy |
| `--route agent-skills` | 需要 python、git、node 和 npx |
| `--route llm-engineering`、`agents`、`mcp`、`certification` | 需要 python 和 git |
| `--show-later` | 也检查可选及后续工具 |
| `[PASS]`、`[FAIL]`、`[LATER]` | 各探测的状态。出现 FAIL 时退出码为 1 |
| `bash .../code/env_setup.sh` | 在仓库根目录创建并验证 `.venv` |

## 安装 PyTorch 并检查 GPU
type: annotated-code
lang: bash
from: phases/00-setup-and-tooling/01-dev-environment/docs/zh.md, phases/00-setup-and-tooling/06-python-environments/docs/zh.md

```bash
nvidia-smi                                    # 驱动支持的 CUDA 版本
uv pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
uv pip install torch torchvision torchaudio   # macOS：支持 MPS 的普通版本
python -c "import torch; print(torch.version.cuda)"   # PyTorch CUDA 版本
python -c "import torch; print(torch.__version__)"    # 安装成功
which python                                  # 必须显示 .venv/bin/python
```

## VS Code 设置
type: defaults
from: phases/00-setup-and-tooling/08-editor-setup/docs/zh.md, phases/00-setup-and-tooling/08-editor-setup/code/vscode/settings.json

| 设置 | 默认值 | 说明 |
|---|---|---|
| `python.analysis.typeCheckingMode` | `"basic"` | 运行前捕获参数类型错误 |
| `editor.formatOnSave` | `true` | 每次保存由 Black 格式化 |
| `black-formatter.args` | `["--line-length", "88"]` | Black 在 88 字符处换行 |
| `editor.rulers` | `[88, 120]` | 120 标记过长文档字符串 |
| `notebook.output.scrolling` | `true` | 长训练输出保持紧凑 |
| `files.autoSave` | `"afterDelay"` | `files.autoSaveDelay` 为 1000 |
| `terminal.integrated.scrollback` | 10000 | 终端保留行数 |
| `ruff.lint.run` | `"onSave"` | Ruff 在每次保存时检查 |

## 故障排查
type: troubleshooting
from: phases/00-setup-and-tooling/01-dev-environment/docs/zh.md, phases/00-setup-and-tooling/06-python-environments/docs/zh.md, phases/00-setup-and-tooling/08-editor-setup/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 运行时缺少包 | 虚拟环境未激活 | 执行 `source .venv/bin/activate` |
| `which python` 显示 `/usr/bin/python` | 使用全局安装 | 激活后重新安装 |
| Conda 环境损坏 | 混用 `pip install` 与 conda | 先装 Conda 包，最后装 pip 包 |
| 未使用 GPU | PyTorch CUDA 高于驱动 CUDA | PyTorch CUDA 必须 <= 驱动 CUDA |
| Mac 上 Torch 安装失败 | 使用了 `--index-url .../cuXXX` wheel | 安装普通版本 |
| `Not installing fnm due to missing dependencies.` | 没有 `unzip` | 执行 `sudo apt install -y unzip` |
| `Cannot install under Rosetta 2` | 终端运行架构为 `i386` | 执行 `arch -arm64 brew install fnm` |
| macOS 找不到 `code` | shell 命令不在 PATH 中 | 执行 "Install 'code' command in PATH" |

## 无声的 Python bug
type: annotated-code
lang: python
from: phases/00-setup-and-tooling/13-python-for-ai-engineering/docs/zh.md, phases/00-setup-and-tooling/13-python-for-ai-engineering/code/main.py

```python
independent = list(weights)                  # 赋值不会复制
grid = [[0] * 3 for _ in range(2)]           # 不要用 [[0] * 3] * 2
def add_good(item, bucket=None): ...         # 不要用 bucket=[]
hidden: list[int] = field(default_factory=lambda: [64, 32])
random.Random(seed).shuffle(order)           # 私有生成器
sum(x * y for x, y in zip(a, b, strict=True))  # 长度不匹配时抛出 ValueError
for epoch in range(2):
    sizes = [len(b) for b in batches(range(10), 4)]  # 每个 epoch 创建新生成器
raise ValueError(f"label must be an integer, got {text!r}") from None
if __name__ == "__main__":                   # 测试导入时不运行演示
```

## 问答
type: qa
from: phases/00-setup-and-tooling/06-python-environments/docs/zh.md, phases/00-setup-and-tooling/13-python-for-ai-engineering/docs/zh.md, phases/00-setup-and-tooling/01-dev-environment/docs/zh.md

- **全课程共用一个环境？** 不同阶段需要相互冲突的依赖。应按阶段管理环境。
- **何时使用 conda？** 需要不安装到系统的 CUDA 工具包，或在共享集群上时。
- **提交 `.venv` 吗？** 不。将 `.venv/` 加入 `.gitignore`。提交 `pyproject.toml` 和锁文件。
- **Mac 上没有 CUDA？** 正常。MPS 是 Apple GPU 后端。
- **`(3, 2)` 与 `(3,)` 为何失败？** 末尾的 2 和 3 不同。使用 `keepdims=True`。

## 提示
type: tips
from: phases/00-setup-and-tooling/01-dev-environment/docs/zh.md, phases/00-setup-and-tooling/06-python-environments/docs/zh.md, phases/00-setup-and-tooling/13-python-for-ai-engineering/docs/zh.md

- 从仓库根目录运行每条课程命令。
- 先修复预检中第一个失败项，再看下一项。
- 课程需要时再安装后续工具。
- 每次打开文件都指定 `encoding="utf-8"`。CSV 文件使用 `newline=""`。
- 标准化前先划分数据。只在训练集上拟合统计量。

## 编辑器与 SSH 命令
type: command-table
from: phases/00-setup-and-tooling/08-editor-setup/docs/zh.md

| 命令 | 作用 |
|---|---|
| `code --install-extension <id>` | 按 ID 安装一个扩展 |
| `code --list-extensions` | 列出已安装扩展的 ID |
| `ssh-keygen -t ed25519 -C "<email>"` | 创建 SSH 密钥 |
| `ssh-copy-id user@your-gpu-box-ip` | 免密登录 GPU 主机 |
| `Remote-SSH: Connect to Host` | 像本地一样打开远程目录 |
| `watch -n 1 nvidia-smi` | 在分屏终端监视 GPU |
