export const CONCEPT = {
  carriage: "上下文",
  intake: "请求",
  memory: "记忆",
  retrieval: "检索",
  model: "模型",
  tools: "工具",
  verifier: "校验器",
  exit: "输出",
  printer: "执行轨迹",
  controller: "运行时 · 循环",
};

const lesson = (path, title) => ({ href: `/lesson.html?path=${encodeURIComponent(path)}`, title });

export const INFO = {
  carriage: {
    name: "卡片车架",
    is: "上下文窗口。上面的卡片就是模型能看到的全部内容。",
    does: "车架载着请求、已保存的记忆、检索文档和每个工具结果，沿循环轨道移动。卡架只有八个槽位，上下文容量有限。",
    why: "模型只能看到输入。如果某个事实不在车架上的卡片中，模型就无法使用它。",
    without: "不组装上下文时，每次模型调用都从空白开始，只能凭训练数据作答。",
    code: "messages = [system, memory, *retrieved_docs, user_request, *tool_results]. Count tokens before each call and drop or summarize the oldest observations first.",
    lesson: lesson("phases/11-llm-engineering/05-context-engineering", "上下文工程"),
  },
  intake: {
    name: "请求料斗",
    is: "进入系统的请求。",
    does: "料斗把用户请求作为第一张卡片放上车架。后续步骤都为这张卡片服务。",
    why: "接收请求并决定放入哪些上下文的是运行时。",
    without: "没有请求卡片，模型就没有任务，流程无法开始。",
    code: "request = {id, text, user, received_at}. Validate size and type at the edge, before any model call.",
    lesson: lesson("phases/14-agent-engineering/01-the-agent-loop", "agent 循环"),
  },
  memory: {
    name: "记忆滚筒",
    is: "在多次运行之间保留的持久记忆。",
    does: "滚筒保存先前会话的笔记。这里记着一个偏好：金额用美元，给出变化百分比。复制器把它复制到车架上。",
    why: "记忆不同于检索文档。它是系统从先前运行中学到的用户或任务信息，由运行时保存。",
    without: "回答仍能生成，但每次运行都不认识用户，用户需要反复说明偏好。",
    code: "memory.read(user_id, scope) before the first turn, memory.write(...) after a verified run. Keep it small and reviewable.",
    lesson: lesson("phases/14-agent-engineering/07-memory-virtual-context-memgpt", "agent 记忆：虚拟上下文与记忆分页"),
  },
  retrieval: {
    name: "文件柜与拾取头",
    is: "检索：获取模型训练时没有见过的私有文档。",
    does: "运行时把请求转为查询，打开匹配的抽屉，将四月和五月账单移到车架上。三月账单和差旅政策留在抽屉里。",
    why: "模型权重里没有你的账单。只有把文档放进上下文，模型才能看到。",
    without: "模型拿不到数值，只能猜测或表示无法回答。关闭检索，看看哪种回答最终离开机器。",
    code: "docs = index.search(query, k=2); context += [doc.text with doc.id]. Keep the id so the answer can cite it and the verifier can check it.",
    lesson: lesson("phases/11-llm-engineering/06-rag", "RAG：检索增强生成"),
  },
  model: {
    name: "密封模型外壳",
    is: "模型。内部密封滚筒代表训练时固定下来的知识。",
    does: "读取头下降，读取车架上的卡片，再打印工具调用或答案草稿。它不打开抽屉，也不转动曲柄，只提出下一步。",
    why: "模型理解语言并选择下一步动作。但提议还不是实际操作，也不是已核实的事实，因此需要台面上的其他部件。",
    without: "没有模型就没有提议。本模拟用固定脚本读取卡片，不会在浏览器中运行真实模型。",
    code: "proposal = llm(messages, tools=schemas). The reply is text or a structured tool call. Parse it. Never execute it directly.",
    lesson: lesson("phases/10-llms-from-scratch/13-building-complete-llm-pipeline", "构建完整 LLM 流水线"),
  },
  tools: {
    name: "工具区",
    is: "执行工具，包括 schema 检查尺、权限锁、计算器、计时器和三个重试旗标。",
    does: "拾取头将工具调用纸条依次送过 schema 检查和权限检查，再交给计算器。计算器计算 15,500 − 12,400 = 3,100，以及 3,100 / 12,400 = 25.0%。结果卡片返回车架。",
    why: "模型写出的工具调用是不可信输入。schema 检查拒绝格式错误的参数，权限检查拒绝本次运行不允许的工具。计时器与重试旗标避免慢工具拖住整个流程。",
    without: "关闭工具访问后，模型自己计算。脚本会用五月金额做分母得到 20.0%，这是常见的百分比变化计算错误。",
    code: "validate(args, schema) → check policy(tool, user) → call with timeout → retry with backoff, at most 3 attempts → return result or error as an observation.",
    lesson: lesson("phases/14-agent-engineering/06-tool-use-and-function-calling", "工具使用与函数调用"),
  },
  verifier: {
    name: "校验尺",
    is: "位于模型之外的答案检查。",
    does: "压杆压到答案纸条上。校验器根据引用的账单重算数值。一致时指针保持为零，不一致时偏转。通过后在纸条上打孔。",
    why: "写出答案的模型不适合独自判断答案。确定性的检查可以发现算术错误和证据不足。",
    without: "未检查的答案会直接离开机器。它可能正确，但没有证明。关闭校验，再让工具故障，就能看到错误答案流出。",
    code: "assert diff == may - april; assert abs(pct - diff / april * 100) < 0.05; assert set(cites) <= retrieved_ids. On failure, return the reason to the model as feedback.",
    lesson: lesson("phases/14-agent-engineering/38-verification-gates", "校验闸门"),
  },
  controller: {
    name: "运行时控制器",
    is: "agent 运行时，负责循环、限制和时钟。",
    does: "计数器显示步骤数，象限盘显示已用模型轮次，上限为四轮。圈数计数器记录车架绕行次数，表盘显示模拟时间。",
    why: "循环必须终止。达到轮次上限时，无论模型下一步提议什么，运行时都停止流程。",
    without: "模型可能反复循环，成本也没有上限。生产 agent 需要迭代次数上限和预算。",
    code: "for turn in range(MAX_TURNS): proposal = model(context); ... else: return failure('turn limit'). Track tokens, time and cost per run.",
    lesson: lesson("phases/15-autonomous-systems/13-cost-governors", "操作预算、迭代上限与成本控制"),
  },
  exit: {
    name: "出口锁与输出托盘",
    is: "运行终点。完成、拒答或失败的请求都从这里离开。",
    does: "出口锁把答案纸条从车架翻入滑槽，落到托盘。打孔的纸条通过了校验，未打孔的没有。",
    why: "运行必须以清晰的状态结束：已校验、拒答、未校验或失败。调用方需要知道是哪一种。",
    without: "调用方只拿到文本和含糊的状态，无法区分经过检查的答案与猜测。",
    code: "return {status, answer, citations, trace_id}. Make the status part of the API contract.",
    lesson: lesson("phases/14-agent-engineering/26-failure-modes-agentic", "故障模式：agent 为什么会出错"),
  },
  printer: {
    name: "轨迹打印机",
    is: "执行轨迹。每个事件一行，运行结束后仍保留。",
    does: "打印机在纸带上记录每一步：发生什么、在哪个部件、消耗多少模拟时间。机器下方的列表展示同一份轨迹。",
    why: "agent 给出错误答案时，执行轨迹帮助你定位出错的步骤。",
    without: "只能看到最终答案，无法区分检索未命中、工具超时还是模型错误。",
    code: "Emit one span per step with attributes for the tool, arguments, result, tokens and duration. OpenTelemetry has conventions for this.",
    lesson: lesson("phases/14-agent-engineering/24-agent-observability-platforms", "agent 可观测性"),
  },
};

export const PART_ORDER = ["intake", "memory", "retrieval", "model", "tools", "verifier", "exit", "printer", "controller", "carriage"];

export const TOUR = [
  {
    title: "一个请求，一张工作台",
    text: "左侧进入的卡片就是请求：比较四月与五月的云账单。观察它随车架绕行，每个停靠点各完成一项工作。",
    config: {},
    part: "carriage",
  },
  {
    title: "模型只提出下一步",
    text: "密封外壳代表模型，读取头只能看到车架上的卡片。它打印一张请求调用计算器的纸条，自己不执行工具。",
    part: "model",
  },
  {
    title: "工具先过两道检查",
    text: "计算器转动前，纸条先通过 schema 检查和权限锁。结果作为新卡片返回，车架继续绕行。",
    part: "tools",
  },
  {
    title: "移除文档",
    text: "检索现在被禁用。模型没有账单，于是猜测。校验器找不到支持猜测的证据，将答案退回。第二次回答如实表示无法作答。",
    config: { retrieval: false },
    part: "retrieval",
  },
  {
    title: "关闭校验",
    text: "现在每次工具调用都超时，校验器也被关闭。模型自行计算，却用错了月份作分母，于是 20.0% 离开机器，没有检查拦住它。",
    config: { verification: false, fault: "timeout-always" },
    part: "verifier",
  },
  {
    title: "重新开启校验",
    text: "工具仍然故障，但校验器已开启。它根据账单重算，拒绝 20.0% 并返回原因。模型第二版草稿给出 25.0%，纸条打孔后离开。",
    config: { fault: "timeout-always" },
    part: "controller",
  },
];

export const SCENARIOS = [
  { label: "正常运行", note: "检索、计算、校验。", config: {} },
  { label: "无检索", note: "模型没有账单。", config: { retrieval: false } },
  { label: "无检索、无校验", note: "猜测未经校验就流出。", config: { retrieval: false, verification: false } },
  { label: "工具超时一次", note: "重试一次后恢复。", config: { fault: "timeout-once" } },
  { label: "工具始终超时", note: "模型自行计算，校验器发现错误。", config: { fault: "timeout-always" } },
  { label: "超时且无校验", note: "错误答案流出。", config: { fault: "timeout-always", verification: false } },
  { label: "工具调用格式错误", note: "schema 检查将其拒绝。", config: { fault: "malformed" } },
  { label: "工具访问被拒绝", note: "权限锁阻止调用。", config: { tools: false } },
];
