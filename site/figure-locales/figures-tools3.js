(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-tools3.js"] = {
  "t3-span-waterfall": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "SPAN WATERFALL": "span 瀑布图",
      "agent, LLM, tool, MCP in one trace": "agent、LLM、工具与 MCP 位于同一轨迹",
      "one trace id": "同一个 trace id",
      "time": "时间",
      "gen_ai.operation.name on every span links the levels": "每个 span 的 gen_ai.operation.name 连接各个层级",
      "One trace id covers the whole turn. The agent span opens first and closes last; inside it, an LLM call, a tool execution, and the MCP dispatch it wraps each get their own span with gen_ai attributes. When a backend cold-starts, the mcp.call bar is the one that stretches, which is exactly the question logs alone cannot answer.": "同一个 trace id 覆盖整个轮次。agent span 最先开启、最后关闭；内部的 LLM 调用、工具执行，以及它包装的 MCP 分派，各有自己的 span 和 gen_ai 属性。后端冷启动时，变长的正是 mcp.call 条块；仅靠日志无法回答这个问题。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "llm.chat",
        "reason": "可观测语义规范中的 span 操作名"
      },
      {
        "text": "tool.execute",
        "reason": "可观测语义规范中的 span 操作名"
      },
      {
        "text": "mcp.call",
        "reason": "可观测语义规范中的 span 操作名"
      }
    ]
  },
  "t3-capstone-chain": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "CAPSTONE CHAIN": "综合项目链路",
      "every Phase 13 piece, one request": "阶段 13 的各个组件，共同处理一次请求",
      "user": "用户",
      "asks": "提问",
      "gateway": "网关",
      "MCP server": "MCP 服务器",
      "discover + tools + task ext": "发现 + 工具 + 任务扩展",
      "writer agent": "写作 agent",
      "A2A, opaque": "A2A，不透明句柄",
      "ui:// report": "ui:// 报告",
      "rendered inline": "内联渲染",
      "OTel trace": "OTel 轨迹",
      "Every stateless MCP request carries version and capabilities. The gateway authenticates and applies policy, the server may return an official task-extension handle that the client polls with tasks/get, and separate work delegates through A2A SendMessage. The final ui:// report and every boundary span remain linked without relying on a protocol session.": "每个无状态 MCP 请求都携带版本与能力信息。网关执行认证和策略检查，服务器可返回官方任务扩展的句柄，供客户端通过 tasks/get 轮询；独立工作经 A2A SendMessage 委派。最终的 ui:// 报告与每条边界 span 保持关联，无需依赖协议会话。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "OAuth + RBAC",
        "reason": "授权协议与 A2A 方法名"
      },
      {
        "text": "A2A SendMessage",
        "reason": "授权协议与 A2A 方法名"
      }
    ]
  },
  "t3-skill-layers": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已关闭",
      "THREE LAYERS": "三个层级",
      "context, know-how, tools": "上下文、操作方法、工具",
      "project conventions, read at start": "项目约定，启动时读取",
      "task know-how, loaded on demand": "任务操作方法，按需加载",
      "the tools the skill invokes": "技能调用的工具",
      "bundle": "技能包",
      "AGENTS.md tells any agent how the project works. SKILL.md packages one workflow as frontmatter plus a body the runtime discloses progressively. MCP supplies the tools the skill calls. Because each layer is a plain file with an open format, the same bundle drops into Claude Code, Cursor, and Codex instead of being copied three times and drifting.": "AGENTS.md 告诉各个 agent 项目如何运作。SKILL.md 用 frontmatter 与正文打包一个工作流，由运行时逐步披露。MCP 提供技能调用的工具。每层都是采用开放格式的普通文件，因此同一个包可用于 Claude Code、Cursor 与 Codex，无需复制三份后逐渐偏离。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "Claude Code",
        "reason": "agent 产品的正式名称"
      },
      {
        "text": "Cursor",
        "reason": "agent 产品的正式名称"
      },
      {
        "text": "Codex",
        "reason": "agent 产品的正式名称"
      }
    ]
  }
};
