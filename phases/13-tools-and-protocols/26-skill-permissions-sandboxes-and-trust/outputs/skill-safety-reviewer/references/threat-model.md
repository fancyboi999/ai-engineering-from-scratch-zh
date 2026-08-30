# 威胁模型

独立审查这些边界：

- 权限：指令不能改写宿主权限。
- 文件系统：解析目标并将其保持在 workspace 根目录内；拒绝通过 symlink 逃逸。
- 命令：接受 argv 数组，拒绝 shell 元字符和破坏性可执行文件，并要求可执行文件 allowlist。
- 网络：要求 HTTPS 和精确的 origin allowlist。规范化有效 port，因此 `https://api.example.test` 与 `https://api.example.test:443` 匹配，而端口 `8443` 需要自己的条目。不要接受 URL userinfo 中的凭证。
- 外部内容：将检索到的文本视为数据，绝不将其视为策略或批准。
- Secrets：不记录值的前提下检测疑似携带 secret 的 payload。
- 破坏性操作：根据宿主策略拒绝，或要求已有记录的人工批准。

`allow` 裁决仅表示模拟请求符合给定策略。此 bundle 不执行任何操作。
