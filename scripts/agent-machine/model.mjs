export const REQUEST = {
  id: "req-01",
  text: "Compare our April and May cloud invoices. How much did spending increase?",
};

export const MEMORY = {
  id: "mem-01",
  text: "金额使用美元，给出变化金额与变化百分比。",
};

export const CORPUS = [
  { id: "inv-2026-03", title: "2026 年 3 月云账单", month: "march", total: 11800 },
  { id: "inv-2026-04", title: "2026 年 4 月云账单", month: "april", total: 12400 },
  { id: "inv-2026-05", title: "2026 年 5 月云账单", month: "may", total: 15500 },
  { id: "pol-travel", title: "差旅报销政策", month: null, total: null },
];

export const TRUTH = { from: 12400, to: 15500, diff: 3100, pct: 25 };

export const LIMITS = { turns: 4, attempts: 3, backoff: [500, 1000], timeout: 2000, slots: 8 };

export const COST = {
  intake: 20,
  memory: 30,
  retrieve: 180,
  model: 900,
  schema: 2,
  permit: 1,
  execute: 40,
  timeout: LIMITS.timeout,
  observe: 5,
  verify: 12,
  bypass: 0,
  exit: 5,
};

export const DEFAULTS = { retrieval: true, tools: true, verification: true, fault: "none" };

export const FAULTS = ["none", "timeout-once", "timeout-always", "malformed"];

export function configOf(input = {}) {
  const fault = FAULTS.includes(input.fault) ? input.fault : DEFAULTS.fault;
  const flag = (name) => (typeof input[name] === "boolean" ? input[name] : DEFAULTS[name]);
  return { retrieval: flag("retrieval"), tools: flag("tools"), verification: flag("verification"), fault };
}

const money = (value) => "$" + Math.round(value).toLocaleString("en-US");
const percent = (value) => value.toFixed(1) + "%";

export function retrieve(query, corpus = CORPUS) {
  const words = new Set(query.toLowerCase().match(/[a-z]+/g));
  return corpus.filter((doc) => doc.month && words.has(doc.month) && words.has("invoices"));
}

export function calculate(args) {
  const change = args.to - args.from;
  return { diff: change, pct: Math.round((change / args.from) * 1000) / 10 };
}

export function validate(call) {
  const errors = [];
  if (call.tool !== "calculator.percent_change") errors.push("unknown tool " + call.tool);
  for (const key of ["from", "to"]) {
    const value = call.args ? call.args[key] : undefined;
    if (typeof value !== "number" || !Number.isFinite(value)) errors.push(key + " must be a number, got " + JSON.stringify(value));
  }
  if (!errors.length && call.args.from <= 0) errors.push("from must be greater than 0");
  return { ok: errors.length === 0, errors };
}

function evidenceOf(context) {
  const docs = context.filter((card) => card.kind === "doc");
  const april = docs.find((doc) => doc.month === "april");
  const may = docs.find((doc) => doc.month === "may");
  return { docs, april, may };
}

const lastOf = (context, kind) => [...context].reverse().find((card) => card.kind === kind) || null;

export function decide(context, turn, config) {
  const { april, may } = evidenceOf(context);
  const feedback = lastOf(context, "feedback");
  const result = lastOf(context, "result");
  const fault = lastOf(context, "tool-error");
  if (!april || !may) {
    if (feedback && feedback.code === "unsupported") {
      return {
        kind: "answer",
        mode: "decline",
        text: "找不到四月和五月的账单，无法计算增长。请接入账单文档后再问。",
        claims: [],
        cites: [],
      };
    }
    return {
      kind: "answer",
      mode: "guess",
      text: "云账单通常逐月增加。支出大概增加了 15%。",
      claims: [{ type: "pct", value: 15 }],
      cites: [],
    };
  }
  const cites = [april.id, may.id];
  if (result) {
    return {
      kind: "answer",
      mode: "tool",
      text: `支出从四月的 ${money(april.total)} 增至五月的 ${money(may.total)}，增加 ${money(result.diff)}，增长 ${percent(result.pct)}。`,
      claims: [{ type: "money", value: result.diff }, { type: "pct", value: result.pct }],
      cites,
    };
  }
  const blocked = fault && fault.code !== "schema";
  if (!blocked) {
    const malformed = config.fault === "malformed" && !(fault && fault.code === "schema");
    const args = malformed ? { from: money(april.total), to: money(may.total) } : { from: april.total, to: may.total };
    return { kind: "tool", call: { tool: "calculator.percent_change", args }, cites };
  }
  const diff = may.total - april.total;
  const fixed = feedback && feedback.code === "wrong-base";
  const pct = Math.round((diff / (fixed ? april.total : may.total)) * 1000) / 10;
  return {
    kind: "answer",
    mode: fixed ? "revised" : "mental",
    text: `支出从四月的 ${money(april.total)} 增至五月的 ${money(may.total)}，增加 ${money(diff)}，增长 ${percent(pct)}。`,
    claims: [{ type: "money", value: diff }, { type: "pct", value: pct }],
    cites,
  };
}

export function check(answer, context) {
  const { docs, april, may } = evidenceOf(context);
  const known = new Set(docs.map((doc) => doc.id));
  if (!answer.claims.length) return { ok: true, code: "no-claims", note: "未声明数值，没有缺乏支持的断言。" };
  if (!april || !may) return { ok: false, code: "unsupported", note: "答案给出了数值，但上下文中没有支持它的账单。" };
  const missing = answer.cites.filter((id) => !known.has(id));
  if (missing.length || answer.cites.length < 2) return { ok: false, code: "uncited", note: "答案必须引用所用的两张账单。" };
  const want = calculate({ from: april.total, to: may.total });
  for (const claim of answer.claims) {
    if (claim.type === "money" && claim.value !== want.diff) {
      return { ok: false, code: "wrong-diff", note: `重算结果：${money(may.total)} − ${money(april.total)} = ${money(want.diff)}，与答案 ${money(claim.value)} 不符。`, delta: claim.value - want.diff };
    }
    if (claim.type === "pct" && Math.abs(claim.value - want.pct) > 0.05) {
      return {
        ok: false,
        code: "wrong-base",
        note: `增长率以四月金额为分母：${money(want.diff)} / ${money(april.total)} = ${percent(want.pct)}，与答案 ${percent(claim.value)} 不符。`,
        delta: claim.value - want.pct,
      };
    }
  }
  return { ok: true, code: "match", note: `根据引用账单重算得到 ${money(want.diff)} 和 ${percent(want.pct)}，均与答案一致。` };
}

function card(kind, fields) {
  return { kind, ...fields };
}

export function simulate(input = {}) {
  const config = configOf(input);
  const events = [];
  const context = [];
  let clock = 0;
  let turn = 0;
  let calls = 0;
  let attempts = 0;
  let laps = 0;
  const evidence = [];
  let verdict = null;
  let outcome = null;

  const push = (type, station, cost, fields = {}) => {
    clock += cost;
    events.push({
      index: events.length,
      type,
      station,
      cost,
      clock,
      turn,
      laps,
      calls,
      attempts,
      context: context.map((item) => item.id),
      evidence: evidence.slice(),
      verdict,
      ...fields,
    });
  };

  const add = (item) => {
    context.push(item);
    while (context.length > LIMITS.slots) {
      const drop = context.findIndex((entry) => entry.kind !== "request" && entry.kind !== "doc");
      context.splice(drop < 0 ? 1 : drop, 1);
    }
  };

  add(card("request", { id: REQUEST.id, text: REQUEST.text }));
  push("intake", "intake", COST.intake, { trace: `已接收请求 ${REQUEST.id}`, card: REQUEST.id });

  add(card("memory", { id: MEMORY.id, text: MEMORY.text }));
  push("memory", "memory", COST.memory, { trace: `已加载记忆 ${MEMORY.id}`, card: MEMORY.id });

  if (config.retrieval) {
    const found = retrieve(REQUEST.text);
    for (const doc of found) {
      add(card("doc", { id: doc.id, month: doc.month, total: doc.total, title: doc.title }));
      evidence.push(doc.id);
    }
    push("retrieve", "retrieval", COST.retrieve, { trace: `已检索 ${found.map((doc) => doc.id).join(", ")}`, docs: found.map((doc) => doc.id) });
  } else {
    push("retrieve-off", "retrieval", 0, { trace: "检索已禁用，没有加载文档", docs: [] });
  }

  while (true) {
    if (turn >= LIMITS.turns) {
      outcome = { status: "failed", reason: "step-limit", text: "已停止：agent 达到模型轮次上限 " + LIMITS.turns + " 轮。" };
      push("limit", "controller", 0, { trace: "已达到轮次上限，停止运行" });
      break;
    }
    turn += 1;
    const proposal = decide(context, turn, config);
    if (turn > 1) laps += 1;
    push("model", "model", COST.model, {
      proposal,
      trace: proposal.kind === "tool" ? `第 ${turn} 轮：提议调用 ${proposal.call.tool}(${JSON.stringify(proposal.call.args.from)}, ${JSON.stringify(proposal.call.args.to)})` : `第 ${turn} 轮：起草答案`,
    });

    if (proposal.kind === "tool") {
      calls += 1;
      const schema = validate(proposal.call);
      push("schema", "schema", COST.schema, { proposal, ok: schema.ok, errors: schema.errors, trace: schema.ok ? "schema 检查通过" : "schema 检查失败：" + schema.errors[0] });
      if (!schema.ok) {
        add(card("tool-error", { id: `err-${events.length}`, code: "schema", text: schema.errors.join("; ") }));
        push("observe", "tools", COST.observe, { observation: "schema", trace: "错误返回模型" });
        continue;
      }
      const allowed = config.tools;
      push("permit", "permit", COST.permit, { proposal, ok: allowed, trace: allowed ? "允许使用计算器" : "权限拒绝：不允许使用计算器" });
      if (!allowed) {
        add(card("tool-error", { id: `err-${events.length}`, code: "denied", text: "calculator.percent_change is not allowed in this run" }));
        push("observe", "tools", COST.observe, { observation: "denied", trace: "拒绝原因返回模型" });
        continue;
      }
      let result = null;
      for (let attempt = 1; attempt <= LIMITS.attempts; attempt++) {
        attempts += 1;
        const fails = config.fault === "timeout-always" || (config.fault === "timeout-once" && attempt === 1);
        if (fails) {
          push("timeout", "calculator", COST.timeout, { attempt, trace: `第 ${attempt} 次尝试：${LIMITS.timeout} ms 内没有响应` });
          if (attempt < LIMITS.attempts) push("backoff", "calculator", LIMITS.backoff[attempt - 1], { attempt, trace: `等待 ${LIMITS.backoff[attempt - 1]} ms 后重试` });
          continue;
        }
        result = calculate(proposal.call.args);
        push("execute", "calculator", COST.execute, { attempt, result, trace: `第 ${attempt} 次尝试：${money(result.diff)}，${percent(result.pct)}` });
        break;
      }
      if (result) {
        add(card("result", { id: `res-${events.length}`, diff: result.diff, pct: result.pct }));
        evidence.push("calculator");
        push("observe", "tools", COST.observe, { observation: "result", trace: "结果返回模型" });
      } else {
        add(card("tool-error", { id: `err-${events.length}`, code: "failed", text: `计算器尝试 ${LIMITS.attempts} 次后仍未响应` }));
        push("observe", "tools", COST.observe, { observation: "failed", trace: `工具尝试 ${LIMITS.attempts} 次后失败` });
      }
      continue;
    }

    if (config.verification) {
      verdict = check(proposal, context);
      push("verify", "verifier", COST.verify, { proposal, verdict, trace: verdict.ok ? "已校验：" + verdict.code : "已拒绝：" + verdict.code });
      if (!verdict.ok) {
        add(card("feedback", { id: `fb-${events.length}`, code: verdict.code, text: verdict.note }));
        push("observe", "verifier", COST.observe, { observation: "feedback", trace: "反馈返回模型" });
        continue;
      }
      const status = proposal.mode === "decline" ? "declined" : "verified";
      outcome = { status, proposal, text: proposal.text };
    } else {
      push("bypass", "verifier", COST.bypass, { proposal, trace: "校验已禁用，答案未经检查" });
      outcome = { status: "unchecked", proposal, text: proposal.text };
    }
    break;
  }

  const correct = outcome.proposal ? isCorrect(outcome.proposal) : false;
  push("exit", "exit", COST.exit, { outcome: { ...outcome, correct }, trace: "结束：" + outcome.status });
  return { config, events, outcome: { ...outcome, correct }, totals: { steps: events.length, turns: turn, calls, attempts, laps, clock } };
}

export function isCorrect(proposal) {
  if (proposal.mode === "decline") return null;
  const diff = proposal.claims.find((claim) => claim.type === "money");
  const pct = proposal.claims.find((claim) => claim.type === "pct");
  return Boolean(diff && pct && diff.value === TRUTH.diff && Math.abs(pct.value - TRUTH.pct) < 0.05);
}

export function encode(config) {
  const c = configOf(config);
  const params = new URLSearchParams();
  if (!c.retrieval) params.set("retrieval", "off");
  if (!c.tools) params.set("tools", "off");
  if (!c.verification) params.set("verify", "off");
  if (c.fault !== "none") params.set("fault", c.fault);
  return params.toString();
}

export function decode(search) {
  const params = new URLSearchParams(search);
  return configOf({
    retrieval: params.get("retrieval") !== "off",
    tools: params.get("tools") !== "off",
    verification: params.get("verify") !== "off",
    fault: params.get("fault") || "none",
  });
}
