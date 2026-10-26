---
id: git-shell-linux
title: AI 工作中的 Git、Shell 与 Linux
code: GS
subtitle: 提交和分支、管道和日志筛选、用 tmux 保持运行、向 GPU 主机传文件，并修复 Linux 错误。
hue: 25
sources: phases/00-setup-and-tooling/02-git-and-collaboration, phases/00-setup-and-tooling/10-terminal-and-shell, phases/00-setup-and-tooling/11-linux-for-ai
source_hash: ffd292cbd745bb5f
---

## Git 如何移动你的工作
type: architecture
from: phases/00-setup-and-tooling/02-git-and-collaboration/docs/zh.md

```arch
node | wd | 1,1 | 工作目录 | 你的文件 | client
node | sa | 2,1 | 暂存区 | 下一次提交 | queue
node | lr | 3,1 | 本地仓库 | 提交 | store
node | r | 4,1 | 远端（GitHub） | 你的 fork | store
edge | wd | sa | git add
edge | sa | lr | git commit
edge | lr | r | git push
edge | r | lr | git fetch
edge | lr | wd | git pull
```

## Git 任务
type: task-table
from: phases/00-setup-and-tooling/02-git-and-collaboration/docs/zh.md
span: 2

| 任务 | 代码 |
|---|---|
| 设置身份 | `git config --global user.name "Your Name"` |
| 保存工作 | `git add file.py`，然后 `git commit -m "<message>"` |
| 备份工作 | `git push origin main` |
| 为实验建分支 | `git checkout -b experiment/new-optimizer` |
| 合并回来 | `git checkout main`，然后 `git merge experiment/new-optimizer` |
| 在自己的 fork 中工作 | `git checkout -b my-progress`，然后 `git push -u origin my-progress` |
| 查看一个阶段的历史 | `git log --oneline -- phases/00-setup-and-tooling` |
| 查看一次提交的文件 | `git show --stat <hash>` |

## 管道与重定向
type: command-table
from: phases/00-setup-and-tooling/10-terminal-and-shell/docs/zh.md

| 命令 | 作用 |
|---|---|
| `>` | 将 stdout 写入文件（覆盖） |
| `>>` | 将 stdout 追加到文件 |
| `2>` | 将 stderr 写入文件 |
| `2>&1` | 将 stderr 发送到 stdout 的目标 |
| `\|` | 将 stdout 作为下一条命令的 stdin |
| `python train.py > train_full.log 2>&1` | 将两个输出流写入同一文件 |
| `python train.py 2>&1 \| tee train.log` | 记录并显示输出 |

## 筛选训练日志
type: annotated-code
lang: bash
from: phases/00-setup-and-tooling/10-terminal-and-shell/docs/zh.md

```bash
cat train.log | grep "loss" | wc -l                   # 统计 loss 行数
grep "loss:" train.log | awk '{print $NF}' > losses.txt  # 只取最后一个字段
tail -f train.log | grep --line-buffered "ERROR"      # 实时错误
grep "final_accuracy" results/*.log | sort -t= -k2 -n -r  # 最佳运行排最前
diff <(grep "accuracy" exp1.log) <(grep "accuracy" exp2.log)
find . -name "*.py" | xargs wc -l | tail -1           # 项目规模
env | grep -i cuda                                    # 运行前检查
```

## tmux 会话
type: task-table
from: phases/00-setup-and-tooling/10-terminal-and-shell/docs/zh.md, phases/00-setup-and-tooling/11-linux-for-ai/docs/zh.md

| 任务 | 代码 |
|---|---|
| 启动命名会话 | `tmux new -s training` |
| 水平分屏 | `Ctrl+B`，然后按 `"` |
| 垂直分屏 | `Ctrl+B`，然后按 `%` |
| 切换窗格 | `Ctrl+B`，然后按方向键 |
| 分离，会话继续运行 | `Ctrl+B`，然后按 `d` |
| 重新连接 | `tmux attach -t training` |
| 列出会话 | `tmux ls` |
| 终止会话 | `tmux kill-session -t training` |

## Linux 文件、权限与软件包
type: command-table
from: phases/00-setup-and-tooling/11-linux-for-ai/docs/zh.md
span: 2

| 命令 | 作用 |
|---|---|
| `mkdir -p a/b/c` | 创建嵌套目录 |
| `rm -rf my-dir/` | 删除目录。无法撤销 |
| `find . -name "*.ckpt" -size +1G` | 查找大于 1GB 的检查点 |
| `grep -r "learning_rate" .` | 搜索此处的所有文件 |
| `chmod +x train.sh` | 使脚本可执行 |
| `chmod 755 deploy.sh` | 所有者有全部权限，其他人可读和执行 |
| `sudo apt update && sudo apt install -y build-essential git curl wget tmux htop unzip python3-venv` | 新 GPU 主机的软件包 |
| `sudo systemctl status nginx` | 检查服务。也支持 `start`、`stop`、`restart`、`enable` |

## 在远程 GPU 主机上工作
type: annotated-code
lang: bash
from: phases/00-setup-and-tooling/10-terminal-and-shell/docs/zh.md, phases/00-setup-and-tooling/11-linux-for-ai/docs/zh.md

```bash
ssh -i ~/.ssh/my_gpu_key user@gpu-box-ip       # 使用密钥连接
scp model.pt user@gpu-box-ip:~/models/          # 复制到远程
scp user@gpu-box-ip:~/results/metrics.json ./   # 从远程复制
rsync -avz --progress ./data/ user@remote:/data/  # 只传输变更字节
ssh -L 8888:localhost:8888 user@gpu-box-ip      # 在 localhost:8888 访问远程 Jupyter
# ~/.ssh/config：Host gpu、HostName、User、IdentityFile
ssh -G gpu                                      # 打印 SSH 实际使用的设置
ssh gpu                                         # 用短名称连接
```

## 故障排查
type: troubleshooting
from: phases/00-setup-and-tooling/11-linux-for-ai/docs/zh.md, phases/00-setup-and-tooling/10-terminal-and-shell/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| "Permission denied" | 权限位问题 | `chmod +x` 或 `sudo` |
| 合上笔记本后运行终止 | SSH 会话结束 | 在 tmux 中运行 |
| `sed -i 's/a/b/' file` 在 macOS 失败 | macOS sed 要求 `-i` 后有 `''` | `sed -i '' 's/a/b/' file` |
| Bash 脚本异常 | Windows `\r\n` 换行符 | 运行 `dos2unix` |
| 仅在 Linux 找不到文件 | 文件系统区分大小写 | `Model.py` 与 `model.py` 不同 |
| 找不到 `pbcopy` | SSH 中不可用 | 使用 `cat` 或 `less` |
| WSL2 中没有 CUDA | 在 WSL 中装了 Linux 驱动 | 安装 Windows NVIDIA 驱动 |
| 磁盘已满 | 模型与数据集占用 | 先 `du -sh *`，再清理缓存 |

## 课程别名
type: concepts
from: phases/00-setup-and-tooling/10-terminal-and-shell/code/shell_aliases.sh, phases/00-setup-and-tooling/10-terminal-and-shell/docs/zh.md

- **加载别名**：`source phases/00-setup-and-tooling/10-terminal-and-shell/code/shell_aliases.sh`
- **`gpu`、`gpumem`、`gpuprocs`**：以 CSV 显示 GPU 状态、显存与进程。
- **`ae`、`uvvenv`**：激活 `.venv`，或用 uv 创建后激活。
- **`watchloss`、`taillog <pattern>`**：持续跟踪 `logs/*.log` 中的模式。
- **`trainenv <name>`**：包含 `nvidia-smi` 与 `htop` 窗格的 tmux 会话。
- **`syncto <host> <remote_path>`**：用 rsync 上传。`syncfrom` 下载。
- **`bigmodels`、`memhogs`**：最大的模型文件及占内存最多的进程。

## 问答
type: qa
from: phases/00-setup-and-tooling/10-terminal-and-shell/docs/zh.md, phases/00-setup-and-tooling/11-linux-for-ai/docs/zh.md, phases/00-setup-and-tooling/02-git-and-collaboration/docs/zh.md

- **`&`、`nohup` 还是 tmux？** `nohup` 和 tmux 能在终端关闭后继续运行。只有 tmux 支持重新连接。
- **`rsync` 还是 `scp`？** 大文件用 `rsync`。它能续传，只发送变更字节。
- **为何 fork 课程仓库？** 只有维护者能推送。你的 fork 对应 `origin`。
- **需要 rebase 或 submodule 吗？** 本课程不需要。
- **以 root 运行吗？** 不要。仅在需要时使用 `sudo`。

## 提示
type: tips
from: phases/00-setup-and-tooling/02-git-and-collaboration/docs/zh.md, phases/00-setup-and-tooling/10-terminal-and-shell/docs/zh.md, phases/00-setup-and-tooling/11-linux-for-ai/docs/zh.md

- 将 `*.pt`、`*.pth` 和 `*.safetensors` 加入 `.gitignore`。
- 每次安装前运行 `sudo apt update`。
- 超过几分钟的任务使用 tmux。
- `rm -rf` 前再次检查路径。
- macOS 默认使用 `~/.zshrc`。多数 Linux 服务器使用 `~/.bashrc`。

## 运行、监控与释放磁盘
type: command-table
from: phases/00-setup-and-tooling/10-terminal-and-shell/docs/zh.md, phases/00-setup-and-tooling/11-linux-for-ai/docs/zh.md
span: 2

| 命令 | 作用 |
|---|---|
| `watch -n1 nvidia-smi` | 每秒查看 GPU 使用情况 |
| `nvidia-smi --query-compute-apps=pid,name,used_memory --format=csv` | GPU 上的进程 |
| `htop` | `F6` 排序、`F5` 树状视图、`F9` 终止、`/` 搜索 |
| `nohup python train.py > train.log 2>&1 &` | 终端关闭后仍运行的后台任务 |
| `df -h` | 所有磁盘的使用情况 |
| `du -sh ~/.cache` | pip 与 huggingface 模型缓存于此 |
| `du -h --max-depth=1 / 2>/dev/null \| sort -hr \| head -20` | 占空间最多的项目 |
| `pip cache purge` 和 `sudo apt clean` | 清理缓存 |
