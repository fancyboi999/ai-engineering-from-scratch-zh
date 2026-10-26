(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-tools2.js"] = {
  "tp-tool-loop": {
    "text": {
      "Motion reduced": "已减少动画",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": []
  },
  "tp-parallel-fanout": {
    "text": {
      "Motion reduced": "已减少动画",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "Bengaluru",
        "reason": "工具/产品专名、命令、API 或演示中的实体标识，按契约保持原样。"
      },
      {
        "text": "Tokyo",
        "reason": "工具/产品专名、命令、API 或演示中的实体标识，按契约保持原样。"
      },
      {
        "text": "Zurich",
        "reason": "工具/产品专名、命令、API 或演示中的实体标识，按契约保持原样。"
      }
    ]
  },
  "tp-schema-routing": {
    "text": {
      "Motion reduced": "已减少动画",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": []
  },
  "tp-client-merge": {
    "text": {
      "Unique names": "名称唯一",
      "Exact search collision": "search 完全重名",
      "Route issues/search": "路由 issues/search",
      "Owning server offline": "所属服务器离线",
      "Prefix on collision": "冲突时添加前缀",
      "Reject duplicate": "拒绝重名",
      "Discover peers": "发现对端",
      "Call server/discover and tools/list for notes and issues.": "对 notes 和 issues 调用 server/discover 与 tools/list。",
      "Merge namespace": "合并命名空间",
      "No duplicate canonical names.": "没有重复的规范名称。",
      "Apply prefix": "添加前缀",
      "Later duplicate receives a deterministic peer prefix.": "后出现的重名项获得确定性的对端前缀。",
      "Route call": "路由调用",
      "issues_search belongs to issues.": "issues_search 属于 issues。",
      "Routed to issues": "已路由到 issues",
      "The canonical name resolves to one recorded peer and the outgoing tools/call uses that peer's local name.": "规范名称解析到一个已登记对端，发出的 tools/call 使用该对端的本地名称。",
      "A collision policy is part of the client contract. Silent overwrite is never an option because canonical names carry approval and audit meaning.": "重名策略属于客户端契约。规范名称承载审批与审计含义，因此绝不能静默覆盖。",
      "Protocol stages": "协议阶段",
      "Discover peers: Call server/discover and tools/list for notes and issues.": "发现对端：对 notes 和 issues 调用 server/discover 与 tools/list。",
      "Merge namespace: No duplicate canonical names.": "合并命名空间：没有重复的规范名称。",
      "Apply prefix: Later duplicate receives a deterministic peer prefix.": "添加前缀：后出现的重名项获得确定性的对端前缀。",
      "Route call: issues_search belongs to issues.": "路由调用：issues_search 属于 issues。"
    },
    "patterns": [],
    "preserve": []
  },
  "tp-transport-handshake": {
    "text": {
      "JSON response": "JSON 响应",
      "Request-scoped SSE": "请求范围内的 SSE",
      "Invalid GET": "无效的 GET",
      "Invalid DELETE": "无效的 DELETE",
      "Course host": "课程宿主",
      "POSTs one tools/list request.": "通过 POST 发送一个 tools/list 请求。",
      "Replica B": "副本 B",
      "Validates version and capabilities on arrival.": "请求到达时校验版本和能力。",
      "Dispatcher": "分派器",
      "Builds a deterministic list result.": "构建确定性的列表结果。",
      "HTTP response": "HTTP 响应",
      "Returns application/json and closes.": "返回 application/json 后关闭响应。",
      "A normal call is one POST and one complete JSON response.": "普通调用由一个 POST 请求和一个完整的 JSON 响应组成。",
      "No connection affinity is required. Another request may reach a different healthy replica.": "无需连接亲和性；另一个请求可以到达不同的健康副本。",
      "Protocol stages": "协议阶段",
      "Course host: POSTs one tools/list request.": "课程宿主：通过 POST 发送一个 tools/list 请求。",
      "Replica B: Validates version and capabilities on arrival.": "副本 B：请求到达时校验版本和能力。",
      "Dispatcher: Builds a deterministic list result.": "分派器：构建确定性的列表结果。",
      "HTTP response: Returns application/json and closes.": "HTTP 响应：返回 application/json 后关闭响应。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "subscriptions/listen",
        "reason": "MCP 方法、协议判别值、媒体类型或语言专名，保持机器契约字面量。"
      },
      {
        "text": "200 · application/json",
        "reason": "MCP 方法、协议判别值、媒体类型或语言专名，保持机器契约字面量。"
      }
    ]
  },
  "tp-task-lifecycle": {
    "text": {
      "tasks/get working": "tasks/get：working",
      "tasks/cancel to cancelled": "tasks/cancel：转为 cancelled",
      "Completion wins cancel race": "完成操作先于取消生效",
      "Illegal terminal transition": "非法终态转换",
      "Durable record": "持久化记录",
      "taskId resolves before any handle is returned.": "返回任何句柄前，taskId 必须能够解析。",
      "Task method": "任务方法",
      "Current snapshot": "当前快照",
      "Transition rule": "状态转换规则",
      "Only an allowed forward transition may commit.": "只有允许的前向状态转换才可提交。",
      "tasks/get completes while the represented durable task remains working.": "tasks/get 请求已完成，但其表示的持久任务仍为 working。",
      "A task id is explicit durable application state. Every task method reauthorizes ownership, and terminal transitions are preserved across replicas and restarts.": "任务 ID 是显式持久化的应用状态。每个任务方法都重新校验所有权；终态转换在副本切换和重启后仍被保留。",
      "Protocol stages": "协议阶段",
      "Durable record: taskId resolves before any handle is returned.": "持久化记录：返回任何句柄前，taskId 必须能够解析。",
      "Task method: tasks/get": "任务方法：tasks/get",
      "Current snapshot: working.": "当前快照：working.",
      "Transition rule: Only an allowed forward transition may commit.": "状态转换规则：只有允许的前向状态转换才可提交。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "tasks/update",
        "reason": "MCP 方法、协议判别值、媒体类型或语言专名，保持机器契约字面量。"
      },
      {
        "text": "completed",
        "reason": "MCP 方法、协议判别值、媒体类型或语言专名，保持机器契约字面量。"
      },
      {
        "text": "failed",
        "reason": "MCP 方法、协议判别值、媒体类型或语言专名，保持机器契约字面量。"
      },
      {
        "text": "tasks/get",
        "reason": "MCP 方法、协议判别值、媒体类型或语言专名，保持机器契约字面量。"
      },
      {
        "text": "working.",
        "reason": "MCP 方法、协议判别值、媒体类型或语言专名，保持机器契约字面量。"
      },
      {
        "text": "working",
        "reason": "MCP 方法、协议判别值、媒体类型或语言专名，保持机器契约字面量。"
      },
      {
        "text": "tasks/get：working",
        "reason": "MCP 方法名和原始任务状态枚举，保持协议含义。"
      }
    ]
  },
  "tp-tool-poisoning": {
    "text": {
      "Pinned descriptor unchanged": "固定的描述符未变",
      "Description drift": "描述发生漂移",
      "Schema widened": "Schema 范围扩大",
      "Unknown qualified tool": "未知的限定工具名",
      "High-risk arguments": "高风险参数",
      "Require exact approved pin": "要求与批准的固定版本完全一致",
      "Quarantine for review": "隔离后等待审查",
      "Trust first seen (unsafe)": "信任首次发现内容（不安全）",
      "Pinned authority": "固定的权限依据",
      "Load the approved canonical descriptor and publisher evidence.": "加载已批准的规范描述符与发布者证据。",
      "Live discovery diff": "实时发现结果差异",
      "Complete descriptor digest is stable.": "完整描述符摘要保持不变。",
      "strict produces execute.": "strict 策略得到 execute。",
      "Typed execution gate": "有类型的执行关卡",
      "Authorized bounded arguments may execute.": "已授权且范围受限的参数可以执行。",
      "The qualified typed verb, approved descriptor pin, validated arguments, authorization, and audit record all agree.": "限定的有类型操作、批准的描述符固定值、校验后的参数、授权与审计记录全部一致。",
      "Stateless transport does not create safety. Reduce authority with stable qualified names, complete descriptor pins, typed verbs, argument validation, explicit refusal, authorization, and audit.": "无状态传输并不自动带来安全。应通过稳定的限定名称、完整描述符固定值、有类型操作、参数校验、显式拒绝、授权和审计限制权限。",
      "Protocol stages": "协议阶段",
      "Pinned authority: Load the approved canonical descriptor and publisher evidence.": "固定的权限依据：加载已批准的规范描述符与发布者证据。",
      "Live discovery diff: Complete descriptor digest is stable.": "实时发现结果差异：完整描述符摘要保持不变。",
      "Approval policy: strict produces execute.": "审批策略：strict 策略得到 execute。",
      "Typed execution gate: Authorized bounded arguments may execute.": "有类型的执行关卡：已授权且范围受限的参数可以执行。"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "execute",
        "reason": "MCP 方法、协议判别值、媒体类型或语言专名，保持机器契约字面量。"
      }
    ]
  },
  "tp-router-failover": {
    "text": {
      "Motion reduced": "已减少动画",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "provider A",
        "reason": "公式、协议标识或技术专名，原样保留。"
      },
      {
        "text": "provider B",
        "reason": "公式、协议标识或技术专名，原样保留。"
      },
      {
        "text": "provider C",
        "reason": "公式、协议标识或技术专名，原样保留。"
      }
    ]
  }
};
