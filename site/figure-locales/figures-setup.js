(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-setup.js"] = {
  "s0-env-stack": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "THE FOUR-LAYER STACK": "四层环境栈",
      "system, managers, runtimes, libraries assemble in order": "系统、管理器、运行时、库依次组装",
      "1 · system": "1 · 系统",
      "OS, drivers, CUDA / Metal": "操作系统、驱动、CUDA / Metal",
      "2 · package managers": "2 · 包管理器",
      "3 · language runtimes": "3 · 语言运行时",
      "4 · AI libraries": "4 · AI 库",
      "python -c \"import torch\"  ·  ok": "python -c \"import torch\"  ·  成功",
      "each layer stands on the one below it": "每一层都依赖下层",
      "The environment builds bottom-up: the OS and GPU driver first, then package managers, then language runtimes, then the AI libraries that depend on all three. When import torch fails, walk the stack downward, the broken layer is almost never the one that raised the error.": "环境自下而上构建：先有操作系统和 GPU 驱动，再装包管理器，然后是语言运行时，最后才是依赖前三层的 AI 库。import torch 失败时，应沿着栈向下排查，真正出错的层往往不是报错所在的层。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "uv, pnpm, cargo",
        "reason": "包管理器、语言运行时与库的正式名称及版本约束"
      },
      {
        "text": "Python 3.11+, Node 20+, Rust",
        "reason": "包管理器、语言运行时与库的正式名称及版本约束"
      },
      {
        "text": "torch, jax, transformers",
        "reason": "包管理器、语言运行时与库的正式名称及版本约束"
      }
    ]
  },
  "s0-commit-dag": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "COMMIT DAG": "提交有向无环图",
      "main advances while a branch diverges, then merges back": "main 持续前进，分支独立开发后合并",
      "merge commit": "合并提交",
      "experiment on a branch, merge when it works": "在分支上实验，验证成功后合并",
      "Every commit points at its parent, so history is a graph, not a list. A branch is just a diverging path of commits: main keeps moving while the experiment grows on its own line, and the merge commit joins both parents. This is why you can try a risky change without ever touching main.": "每个提交都指向父提交，因此历史是图，而非列表。分支只是提交路径的分叉：main 继续前进，实验在自己的路径上扩展，合并提交再连接两个父提交。所以你可以尝试风险较高的修改，而不碰 main。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "main",
        "reason": "演示中的 Git 分支名称"
      },
      {
        "text": "feature/lr-sweep",
        "reason": "演示中的 Git 分支名称"
      }
    ]
  },
  "s0-gpu-dispatch": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "DISPATCH TO THE ACCELERATOR": "分派到加速器",
      "one lane crawls on CPU, the other streams through the GPU": "一路在 CPU 上缓慢执行，另一路流经 GPU",
      "matmul": "矩阵乘法",
      "batch": "批次",
      "one epoch: ~8 hours": "一轮：约 8 小时",
      "~10 minutes · 48x": "约 10 分钟 · 48x",
      "same jobs, two backends": "相同作业，两种后端",
      "The GPU wins because matmuls are thousands of independent multiply-adds, exactly what its cores parallelize. The same batch trickles through the CPU one chunk at a time but streams through the GPU, which is why a training run that takes 8 hours on CPU takes about 10 minutes on a T4. Verify the lane exists first: nvidia-smi, then torch.cuda.is_available().": "GPU 占优，是因为矩阵乘法由数千次互相独立的乘加组成，正适合 GPU 核心并行执行。同一批数据在 CPU 上逐块缓慢通过，却可以流式经过 GPU；因此 CPU 上需 8 小时的训练，在 T4 上约需 10 分钟。应先确认加速路径可用：运行 nvidia-smi，再检查 torch.cuda.is_available()。"
    },
    "patterns": [],
    "preserve": []
  },
  "s0-secret-inject": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "SECRET INJECTION": "密钥注入",
      "the key is loaded from .env at runtime, never written in code": "运行时从 .env 读取密钥，不写入代码",
      "app.py (in git)": "app.py（纳入 Git）",
      ".env (gitignored)": ".env（Git 忽略）",
      "python process": "Python 进程",
      "200 · json": "200 · JSON 响应",
      "the key exists only in .env and in the runtime header": "密钥仅存在于 .env 与运行时请求头",
      "The code that gets committed only names the variable; the value lives in a gitignored .env file and is injected into the process environment at runtime, then sent as an Authorization header. If the key ever appears in the source, it ships with every clone of the repo, and a leaked key bills to your account.": "提交的代码仅引用变量名；值保存在 Git 忽略的 .env 文件中，运行时注入进程环境，再通过 Authorization 请求头发送。若密钥出现在源码中，每次克隆仓库都会带走它，泄漏后的调用费用则由你的账户承担。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "key = os.environ[...]",
        "reason": "环境变量读取代码、API 域名与 HTTP 认证头示例"
      },
      {
        "text": "api.anthropic",
        "reason": "环境变量读取代码、API 域名与 HTTP 认证头示例"
      },
      {
        "text": ".com",
        "reason": "环境变量读取代码、API 域名与 HTTP 认证头示例"
      },
      {
        "text": "Authorization: Bearer sk-...",
        "reason": "环境变量读取代码、API 域名与 HTTP 认证头示例"
      }
    ]
  },
  "s0-cell-order": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "EXECUTION ORDER": "执行顺序",
      "run counters climb in order, then a re-run poisons the state": "运行序号依次增加，重跑却可能污染状态",
      "ran against old df: stale": "使用旧 df 运行：结果过期",
      "run top to bottom; a re-run above breaks the story below": "从上到下运行；重跑上方单元格会破坏下方状态一致性",
      "The bracket number records when a cell ran, not where it sits. Re-running cell 2 turns [2] into [4], but cell 3 still holds the result of the old order, hidden state the file on disk never shows. When the counters stop reading top to bottom, Restart and Run All is the only honest check.": "方括号内的数字记录单元格何时运行，而非它在文件中的位置。重跑单元格 2 会把 [2] 改为 [4]，但单元格 3 仍保留旧顺序得到的结果，这种隐藏状态在磁盘文件中看不出来。当运行序号不再从上到下递增时，重启并运行全部单元格才是可靠检查。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "df = load(\"train.csv\")",
        "reason": "Notebook 演示中的代码，必须保持原始语义"
      },
      {
        "text": "df = clean(df)",
        "reason": "Notebook 演示中的代码，必须保持原始语义"
      },
      {
        "text": "model.fit(df)",
        "reason": "Notebook 演示中的代码，必须保持原始语义"
      }
    ]
  },
  "s0-env-isolation": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "DEPENDENCY ISOLATION": "依赖隔离",
      "each project keeps its own torch; the global install collides": "各项目单独安装 torch；全局安装会冲突",
      "global site-packages": "全局 site-packages",
      "torch 2.? · both broken": "torch 2.? · 两个项目均损坏",
      "one interpreter per project, packages resolved inside it": "每个项目独立解释器，在其内部解析依赖",
      "Both pins are correct, they just cannot share one interpreter. Installed globally, the second pip install overwrites the first and both projects break. A per-project virtual environment gives each its own site-packages, so torch 2.4 and torch 2.1 coexist on the same machine without ever meeting.": "两个版本约束都正确，只是无法共用一个解释器。全局安装时，第二次 pip install 覆盖第一次安装，两个项目便都会损坏。每个项目使用自己的虚拟环境与 site-packages，可让 torch 2.4 和 torch 2.1 在同一机器上互不干扰地共存。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "project-a",
        "reason": "示例项目路径、Python 环境目录、PyTorch 版本与 CUDA 构建标识"
      },
      {
        "text": "project-b",
        "reason": "示例项目路径、Python 环境目录、PyTorch 版本与 CUDA 构建标识"
      },
      {
        "text": ".venv",
        "reason": "示例项目路径、Python 环境目录、PyTorch 版本与 CUDA 构建标识"
      },
      {
        "text": "torch 2.4 · cu124",
        "reason": "示例项目路径、Python 环境目录、PyTorch 版本与 CUDA 构建标识"
      },
      {
        "text": "torch 2.1 · cu118",
        "reason": "示例项目路径、Python 环境目录、PyTorch 版本与 CUDA 构建标识"
      },
      {
        "text": "torch 2.4",
        "reason": "示例项目路径、Python 环境目录、PyTorch 版本与 CUDA 构建标识"
      },
      {
        "text": "torch 2.1",
        "reason": "示例项目路径、Python 环境目录、PyTorch 版本与 CUDA 构建标识"
      }
    ]
  },
  "s0-image-layers": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "IMAGE LAYERS": "镜像层",
      "the Dockerfile stacks layers once, containers run them anywhere": "Dockerfile 构建一次分层，容器即可到处运行",
      "image": "镜像",
      "your laptop": "你的笔记本",
      "container · identical": "容器 · 完全相同",
      "cloud GPU box": "云端 GPU 机器",
      "one image, byte-identical runtime on every host": "同一镜像，在各主机上提供字节一致的运行时",
      "Each Dockerfile instruction adds a read-only layer: CUDA base, Python, torch, then your code on top. The finished image is the whole stack frozen, so docker run produces the same container on your laptop and on a rented GPU box, and the works-on-my-machine failure mode disappears with it.": "每条 Dockerfile 指令增加一个只读层：CUDA 基础镜像、Python、torch，最后在顶层加入你的代码。完整镜像冻结了整个栈，因此 docker run 在笔记本和租用的 GPU 机器上都产生相同容器，从而消除“在我的机器上能跑”的失败模式。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "FROM cuda:12.4",
        "reason": "镜像构建指令、运行命令与软件版本字面量"
      },
      {
        "text": "python 3.12",
        "reason": "镜像构建指令、运行命令与软件版本字面量"
      },
      {
        "text": "pip: torch 2.3",
        "reason": "镜像构建指令、运行命令与软件版本字面量"
      },
      {
        "text": "COPY train.py",
        "reason": "镜像构建指令、运行命令与软件版本字面量"
      },
      {
        "text": "docker run",
        "reason": "镜像构建指令、运行命令与软件版本字面量"
      }
    ]
  },
  "s0-lsp-roundtrip": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "LSP ROUND TRIP": "LSP 请求往返",
      "every squiggle is a request and a reply, not editor magic": "每条波浪线都来自请求与响应，并非编辑器魔法",
      "editor": "编辑器",
      "language server": "语言服务器",
      "diagnostics": "诊断",
      "\"(\" was never closed": "“(”未闭合",
      "The editor does not understand Python; the language server does. Each edit ships a didChange notification across the wire, the server re-checks the file, and diagnostics come back to be drawn as squiggles and hovers. Install the Python and Pylance extensions and this loop runs on every keystroke; skip them and the editor is a text box.": "编辑器不理解 Python，语言服务器才理解。每次编辑都会在线路上传送 didChange 通知，服务器重新检查文件，再把诊断结果返回，用于绘制波浪线和悬浮信息。安装 Python 与 Pylance 扩展后，每次按键都会运行这条循环；不装扩展，编辑器就只是文本框。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "model.fit(X, y",
        "reason": "未闭合的示例代码、语言服务器产品名与 LSP 通知方法名"
      },
      {
        "text": "pyright",
        "reason": "未闭合的示例代码、语言服务器产品名与 LSP 通知方法名"
      },
      {
        "text": "didChange",
        "reason": "未闭合的示例代码、语言服务器产品名与 LSP 通知方法名"
      }
    ]
  },
  "s0-data-pipeline": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "DATA PIPELINE": "数据流水线",
      "raw file, typed artifact, then seeded splits you can reproduce": "原始文件、带类型产物，再按固定种子生成可复现划分",
      "raw": "原始",
      "typed": "带类型",
      "versioned": "已版本化",
      "splits @ seed 42": "按种子 42 划分",
      "cast + dedupe": "类型转换 + 去重",
      "train": "训练",
      "val": "验证",
      "test": "测试",
      "same seed, same rows, every run": "每次使用同一种子，得到相同行",
      "raw stays untouched; every step is re-runnable": "原始数据不变；每一步均可重跑",
      "The raw CSV is never edited in place: it flows into a typed, compressed Parquet artifact, then into train, val, and test splits cut with a fixed seed. Because each arrow is a script and the seed is pinned, anyone can regenerate the exact rows your metrics were computed on, and that is what makes an experiment comparable.": "原始 CSV 不在原地修改，而是先流入带类型、经过压缩的 Parquet 产物，再按固定种子划分训练集、验证集与测试集。每条箭头都对应脚本，种子也被固定，因此任何人都能重新生成计算指标所用的完全相同行，这才使实验可比较。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "data.parquet",
        "reason": "数据文件名与划分函数调用"
      },
      {
        "text": "split(seed=42)",
        "reason": "数据文件名与划分函数调用"
      }
    ]
  },
  "s0-shell-pipeline": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "PIPES NARROW THE STREAM": "管道逐步收窄数据流",
      "each command reads the last one's output and passes on less": "每条命令读取上一步输出，再传递更少的数据",
      "non-matching lines dropped": "丢弃不匹配的行",
      "every line": "所有行",
      "just the number": "只保留数字",
      "A pipe hands one command's stdout to the next command's stdin, no temp files in between. The log stream enters whole, grep drops every line without \"loss\", and awk keeps only column 8, so a firehose of training output becomes a clean series of numbers you can watch or plot live.": "管道把上一条命令的 stdout 交给下一条命令的 stdin，中间无需临时文件。完整日志流进入后，grep 丢弃不含“loss”的行，awk 只保留第 8 列，于是海量训练输出变成一串干净数字，可实时观察或绘图。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "tail -f train.log",
        "reason": "Shell 管道命令及其参数，必须可直接运行"
      },
      {
        "text": "grep loss",
        "reason": "Shell 管道命令及其参数，必须可直接运行"
      },
      {
        "text": "awk '{print $8}'",
        "reason": "Shell 管道命令及其参数，必须可直接运行"
      }
    ]
  },
  "s0-process-fork": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "PROCESSES FORK": "进程派生",
      "every program on the box descends from pid 1, signals walk back down": "机器上所有程序都源于 pid 1，信号沿树向下传递",
      "fork": "派生",
      "exited (130) · GPU freed": "已退出（130） · GPU 已释放",
      "ps aux shows this tree; kill sends the same signal": "ps aux 显示这棵树；kill 发送同样的信号",
      "On a Linux GPU box everything is a process forked from a parent: init spawns sshd, your login spawns bash, bash spawns the training run. SIGINT from Ctrl-C, or kill against the pid you find with ps aux, ends the leaf and frees its GPU memory, which is how you reclaim a box a dead run is still holding.": "Linux GPU 机器上的所有程序都是父进程派生出的进程：init 启动 sshd，登录会话启动 bash，bash 启动训练。Ctrl-C 发送的 SIGINT，或对 ps aux 找到的 pid 执行 kill，可结束叶进程并释放其 GPU 内存，从而收回被失效训练占用的机器。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "systemd · pid 1",
        "reason": "系统进程名、启动命令、进程编号及 POSIX 信号名称"
      },
      {
        "text": "sshd",
        "reason": "系统进程名、启动命令、进程编号及 POSIX 信号名称"
      },
      {
        "text": "bash",
        "reason": "系统进程名、启动命令、进程编号及 POSIX 信号名称"
      },
      {
        "text": "python train.py",
        "reason": "系统进程名、启动命令、进程编号及 POSIX 信号名称"
      },
      {
        "text": "Ctrl-C · SIGINT",
        "reason": "系统进程名、启动命令、进程编号及 POSIX 信号名称"
      }
    ]
  },
  "s0-flame-hot": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "WHERE THE TIME GOES": "时间花在了哪里",
      "profiling widens the flame over the function actually burning it": "性能剖析用火焰宽度标出真正耗时的函数",
      "data loading": "数据加载",
      "forward": "前向",
      "bwd": "反向",
      "62% of the step is fetching batches": "每步 62% 的时间用于获取批次",
      "fix: num_workers, pin_memory": "修正：num_workers、pin_memory",
      "cProfile, cumulative time per call, drawn as a flame": "cProfile：每次调用的累积时间，以火焰图展示",
      "The GPU math you suspected is not the bottleneck; the profiler shows the step spending most of its wall time inside the DataLoader. Each bar is cumulative time in a call, stacked on its caller, so the widest tower marks the function to fix, here by adding loader workers and pinned memory instead of optimizing the model.": "你怀疑的 GPU 数学计算并非瓶颈；剖析器显示，每步的大部分实际耗时都花在 DataLoader 内部。每个条块表示一次调用的累积时间，并叠放在调用者之上，因此最宽的塔标出了应修正的函数。这里应增加加载工作进程并使用锁页内存，而不是优化模型。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "DataLoader.__next__",
        "reason": "剖析器显示的真实 Python 方法名"
      }
    ]
  }
};
