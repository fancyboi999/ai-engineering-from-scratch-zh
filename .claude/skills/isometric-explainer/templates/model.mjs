export const REQUESTS = ["user:7", "user:9", "user:7"];

export const COST = { intake: 5, lookup: 2, fetch: 120, store: 3, exit: 5 };

export const DEFAULTS = { cache: true };

export function configOf(input = {}) {
  return { cache: typeof input.cache === "boolean" ? input.cache : DEFAULTS.cache };
}

export function simulate(input = {}) {
  const config = configOf(input);
  const stored = [];
  const events = [];
  let clock = 0;
  let hits = 0;
  let fetches = 0;

  const push = (type, station, cost, fields) => {
    clock += cost;
    events.push({ index: events.length, type, station, cost, clock, hits, fetches, stored: stored.slice(), ...fields });
  };

  REQUESTS.forEach((key, n) => {
    push("intake", "intake", COST.intake, { key, trace: `请求 ${n + 1}：${key}` });
    if (config.cache) {
      const hit = stored.includes(key);
      if (hit) hits += 1;
      push("lookup", "cache", COST.lookup, { key, hit, trace: hit ? `缓存命中：${key}` : `缓存未命中：${key}` });
      if (hit) {
        push("exit", "exit", COST.exit, { key, source: "cache", trace: `从缓存提供 ${key}` });
        return;
      }
    } else {
      push("bypass", "cache", 0, { key, trace: "缓存已关闭" });
    }
    fetches += 1;
    push("fetch", "origin", COST.fetch, { key, trace: `源站读取：${key}` });
    if (config.cache) {
      stored.push(key);
      push("store", "cache", COST.store, { key, trace: `已存储 ${key}` });
    }
    push("exit", "exit", COST.exit, { key, source: "origin", trace: `从源站提供 ${key}` });
  });

  return { config, events, totals: { steps: events.length, hits, fetches, clock } };
}

export function encode(config) {
  const c = configOf(config);
  const params = new URLSearchParams();
  if (!c.cache) params.set("cache", "off");
  return params.toString();
}

export function decode(search) {
  const params = new URLSearchParams(search);
  return configOf({ cache: params.get("cache") !== "off" });
}
