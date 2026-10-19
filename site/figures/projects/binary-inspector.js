(function () {
  "use strict";
  const hex = (n) => "0x" + n.toString(16);
  const log2 = (x) => Math.log(x) / Math.LN2;
  const round4 = (x) => Math.round(x * 10000) / 10000;

  const headerLab = {
    controls: [
      {
        key: "magic", label: "起始字节", type: "select", value: "elf",
        options: [
          { value: "elf", label: "7f 45 4c 46 (ELF)" },
          { value: "mz", label: "4d 5a（MZ，PE 映像）" },
          { value: "macho64", label: "cf fa ed fe (Mach-O 64)" },
          { value: "macho32", label: "ce fa ed fe (Mach-O 32)" },
          { value: "fat", label: "ca fe ba be（通用格式）" },
          { value: "coff", label: "64 86（COFF 机器类型 x86-64）" },
          { value: "text", label: "69 6e 74 20（C 源文本）" },
        ],
      },
      { key: "size", label: "文件大小（字节）", type: "range", value: 2152, min: 0, max: 4096, step: 1 },
      { key: "eiclass", label: "ELF EI_CLASS（1 = 32 位，2 = 64 位）", type: "range", value: 2, min: 1, max: 2, step: 1 },
      { key: "eidata", label: "ELF EI_DATA（1 = 小端，2 = 大端）", type: "range", value: 1, min: 1, max: 2, step: 1 },
      { key: "lfanew", label: "PE e_lfanew", type: "range", value: 64, min: 0, max: 4096, step: 4 },
      { key: "optional", label: "COFF SizeOfOptionalHeader", type: "range", value: 0, min: 0, max: 240, step: 16 },
      { key: "sections", label: "COFF NumberOfSections", type: "range", value: 10, min: 0, max: 120, step: 1 },
    ],
    calculate(v) {
      const rows = [];
      const check = (label, ok, detail) => {
        rows.push([label, ok ? "pass" : "fail", detail]);
        return ok;
      };
      let result = null;
      if (!check("至少 4 字节", v.size >= 4, v.size + " 字节")) result = "FormatError：文件过短";
      else if (v.magic === "elf") {
        if (!check("EI_CLASS 为 2", v.eiclass === 2, "EI_CLASS " + v.eiclass)) result = "FormatError：仅支持 ELF64";
        else if (!check("EI_DATA 为 1", v.eidata === 1, "EI_DATA " + v.eidata)) result = "FormatError：仅支持小端 ELF";
        else if (!check("容得下 64 字节文件头", v.size >= 64, "需要 64")) result = "FormatError：文件头截断";
        else result = "elf64";
      } else if (v.magic === "mz") {
        const end = v.lfanew + 4;
        if (!check("容得下 e_lfanew 字段", v.size >= 0x40, "需要 0x40 字节")) result = "FormatError：在 0x3c 截断";
        else if (!check("PE\\0\\0 位于文件内", end <= v.size, "签名位置 " + hex(v.lfanew) + ", ends " + hex(end))) result = "FormatError：以下位置没有 PE 签名：" + hex(v.lfanew);
        else result = "pe";
      } else if (v.magic === "macho64") result = check("magic 0xfeedfacf", true, "小端字") && "macho64";
      else if (v.magic === "macho32") { check("magic 0xfeedface", false, "32-bit Mach-O"); result = "FormatError：不支持 32 位 Mach-O"; }
      else if (v.magic === "fat") { check("fat 头", false, "多个架构"); result = "FormatError：通用 Mach-O，请提取一个切片"; }
      else {
        const machine = v.magic === "coff";
        const fits = check("20 字节文件头", v.size >= 20, v.size + " 字节");
        const known = fits && check("机器类型属于 COFF_MACHINES", machine, machine ? "0x8664" : "0x6e69");
        const object = known && check("SizeOfOptionalHeader 为 0", v.optional === 0, String(v.optional));
        const count = object && check("1 到 96 个节", v.sections >= 1 && v.sections <= 96, String(v.sections));
        result = count ? "coff" : "FormatError：未知格式";
      }
      const ok = !String(result).startsWith("FormatError");
      return {
        summary: ok ? "detect_format 返回 \"" + result + "\"." : result + ".",
        metrics: [
          { label: "结果", value: result },
          { label: "通过的检查", value: rows.filter((r) => r[1] === "pass").length + " / " + rows.length },
        ],
        bars: [{ label: "文件头可用字节", value: Math.min(v.size, 4096), max: 4096 }],
        columns: ["检查", "结果", "值"],
        rows,
      };
    },
  };

  const entropyLab = {
    controls: [
      { key: "length", label: "区域长度（字节）", type: "range", value: 768, min: 0, max: 4096, step: 1 },
      { key: "distinct", label: "不同字节值数量", type: "range", value: 120, min: 1, max: 256, step: 1 },
      { key: "share", label: "最常见值的占比（%）", type: "range", value: 12, min: 0, max: 100, step: 1 },
      { key: "zerofill", label: "零填充节（无文件字节）", type: "checkbox", value: false },
      { key: "alloc", label: "ELF SHF_ALLOC", type: "checkbox", value: true },
      { key: "write", label: "ELF SHF_WRITE", type: "checkbox", value: false },
      { key: "exec", label: "ELF SHF_EXECINSTR", type: "checkbox", value: true },
    ],
    calculate(v) {
      const k = Math.max(1, Math.round(v.distinct));
      let s = v.share / 100;
      if (k === 1) s = 1;
      s = Math.max(s, 1 / k);
      const rest = k > 1 ? (1 - s) / (k - 1) : 0;
      let h = 0;
      if (s > 0) h += s * log2(1 / s);
      if (rest > 0) h += (k - 1) * rest * log2(1 / rest);
      const fileBytes = v.zerofill ? 0 : v.length;
      const entropy = fileBytes ? round4(h) : 0;
      const perms = v.alloc ? (v.alloc ? "r" : "-") + (v.write ? "w" : "-") + (v.exec ? "x" : "-") : "---";
      const flags = (v.write ? 1 : 0) | (v.alloc ? 2 : 0) | (v.exec ? 4 : 0);
      return {
        summary: "sh_flags " + hex(flags) + " 得到 \"" + perms + "\"。以下文件字节数对应的熵：" + fileBytes + " 字节，熵为 " + entropy + " 位/字节。",
        metrics: [
          { label: "最常见值的 p", value: round4(s) },
          { label: "其他各值的 p", value: round4(rest) },
          { label: "file_size", value: fileBytes },
          { label: "perms", value: perms },
        ],
        bars: [
          { label: "熵（位/字节）", value: entropy, max: 8 },
          { label: "上界 log2(不同值数)", value: round4(log2(k)), max: 8 },
        ],
        columns: ["项", "数量", "p", "p log2(1/p)"],
        rows: [
          ["最常见值", 1, round4(s), round4(s > 0 ? s * log2(1 / s) : 0)],
          ["其他值", k - 1, round4(rest), round4(rest > 0 ? rest * log2(1 / rest) : 0)],
        ],
      };
    },
  };

  const BUILTINS = { v: "void", b: "bool", c: "char", a: "signed char", h: "unsigned char", s: "short", t: "unsigned short", i: "int", j: "unsigned int", l: "long", m: "unsigned long", x: "long long", y: "unsigned long long", f: "float", d: "double", e: "long double", w: "wchar_t", z: "..." };

  function demangleTrace(name) {
    const steps = [];
    const subs = [];
    let text = name.startsWith("__Z") ? name.slice(1) : name;
    if (!text.startsWith("_Z")) return { result: null, steps: [["start", "没有 _Z 前缀", "未修饰"]], subs };
    text = text.slice(2);
    let pos = 0;
    const peek = (n = 1) => text.slice(pos, pos + n);
    const fail = (why) => { throw new Error(why); };
    const take = (n = 1) => { if (pos + n > text.length) fail("意外结束"); const s = text.slice(pos, pos + n); pos += n; return s; };
    const sourceName = () => {
      const start = pos;
      while (/[0-9]/.test(peek())) pos += 1;
      if (start === pos) fail("此处应有长度");
      const length = Number(text.slice(start, pos));
      if (!length || pos + length > text.length) fail("源名称无效");
      const value = take(length);
      steps.push([text.slice(start, pos), "源名称", value]);
      return value;
    };
    const addSub = (parts) => {
      const key = parts.join("::");
      if (!subs.includes(key)) {
        subs.push(key);
        steps.push(["", "记录 " + (subs.length === 1 ? "S_" : "S" + (subs.length - 2).toString(36).toUpperCase() + "_"), key]);
      }
    };
    const substitution = () => {
      const start = pos;
      take();
      if (peek() === "t") { take(); steps.push(["St", "std", "std"]); return ["std"]; }
      let index = 0;
      if (peek() === "_") take();
      else {
        let digits = "";
        while (peek() && peek() !== "_") digits += take();
        take();
        index = parseInt(digits, 36) + 1;
      }
      if (!(index < subs.length)) fail("替换项越界");
      steps.push([text.slice(start, pos), "替换项 " + index, subs[index]]);
      return subs[index].split("::");
    };
    const nested = (isFunction) => {
      take();
      let isConst = false;
      if (peek() === "K") { take(); isConst = true; steps.push(["K", "const 成员", ""]); }
      let parts = [];
      while (peek() !== "E") {
        if (!peek()) fail("嵌套名称未终止");
        if (peek() === "S") parts = substitution().slice();
        else if (/[0-9]/.test(peek())) parts.push(sourceName());
        else if (peek() === "C" || peek() === "D") {
          const code = take(2);
          if (!"123".includes(code[1]) || !parts.length) fail("不支持的构造函数形式");
          parts.push((code[0] === "D" ? "~" : "") + parts[parts.length - 1]);
        } else fail("不支持的嵌套组件");
        if (peek() !== "E" || !isFunction) addSub(parts);
      }
      take();
      return { parts, isConst };
    };
    const type = () => {
      const code = peek();
      if (BUILTINS[code]) { take(); steps.push([code, "内建类型", BUILTINS[code]]); return BUILTINS[code]; }
      if ("PROK".includes(code) && code) {
        take();
        const inner = type();
        const out = { P: inner + "*", R: inner + "&", O: inner + "&&", K: inner + " const" }[code];
        steps.push([code, "限定符", out]);
        addSub([out]);
        return out;
      }
      if (code === "N") return nested(false).parts.join("::");
      if (code === "S") {
        const value = substitution();
        if (value.length === 1 && value[0] === "std") { const n = "std::" + sourceName(); addSub([n]); return n; }
        return value.join("::");
      }
      if (/[0-9]/.test(code)) { const n = sourceName(); addSub([n]); return n; }
      fail("不支持的类型代码 " + JSON.stringify(code));
    };
    try {
      let parts;
      let isConst = false;
      if (peek() === "N") ({ parts, isConst } = nested(true));
      else if (peek(2) === "St") { take(2); parts = ["std", sourceName()]; }
      else if (/[0-9]/.test(peek())) parts = [sourceName()];
      else fail("不支持的名称");
      if (pos === text.length) return { result: parts.join("::"), steps, subs };
      let params = [];
      while (pos < text.length) params.push(type());
      if (params.length === 1 && params[0] === "void") params = [];
      return { result: parts.join("::") + "(" + params.join(", ") + ")" + (isConst ? " const" : ""), steps, subs };
    } catch (error) {
      steps.push(["", "停止", error.message]);
      return { result: null, steps, subs };
    }
  }

  const demangleLab = {
    controls: [
      { key: "name", label: "修饰后的名称", type: "text", value: "_ZN5tally5resetEPNS_7CounterE" },
      {
        key: "example", label: "或选择测试名称", type: "select", value: "typed",
        options: [
          { value: "typed", label: "使用文本框" },
          { value: "_ZNK5tally7Counter5totalEv", label: "_ZNK5tally7Counter5totalEv" },
          { value: "_ZN5tally5scaleEdi", label: "_ZN5tally5scaleEdi" },
          { value: "_Z1fRKiS_", label: "_Z1fRKiS_" },
          { value: "_Z3fooIiEvT_", label: "_Z3fooIiEvT_（模板，超出子集）" },
        ],
      },
    ],
    calculate(v) {
      const name = v.example === "typed" ? String(v.name || "").trim() : v.example;
      const traced = demangleTrace(name);
      return {
        summary: traced.result === null ? "demangle(\"" + name + "\") returns None." : "demangle 返回 \"" + traced.result + "\".",
        metrics: [
          { label: "读取的 token 数", value: traced.steps.length },
          { label: "已记录替换项", value: traced.subs.length },
        ],
        bars: [{ label: "替换表大小", value: traced.subs.length, max: 8 }],
        columns: ["输入", "规则", "值"],
        rows: traced.steps.slice(0, 24),
      };
    },
  };

  const fixupLab = {
    controls: [
      { key: "word", label: "修正字（十六进制）", type: "text", value: "0x001000000000098d" },
      {
        key: "format", label: "指针格式", type: "select", value: "6",
        options: [
          { value: "6", label: "6, DYLD_CHAINED_PTR_64_OFFSET" },
          { value: "2", label: "2, DYLD_CHAINED_PTR_64" },
        ],
      },
      { key: "offset", label: "该字的文件偏移", type: "range", value: 16416, min: 16384, max: 32760, step: 8 },
      { key: "imports", label: "导入表条目数", type: "range", value: 4, min: 0, max: 16, step: 1 },
    ],
    calculate(v) {
      let raw;
      try {
        raw = BigInt(String(v.word).trim());
      } catch (error) {
        return { summary: "输入十六进制字，例如 0x8010000000000000。", metrics: [], bars: [] };
      }
      if (raw < 0n || raw >= 1n << 64n) return { summary: "修正字为 64 位。", metrics: [], bars: [] };
      const bits = (shift, width) => Number((raw >> BigInt(shift)) & ((1n << BigInt(width)) - 1n));
      const bind = bits(63, 1) === 1;
      const next = bits(51, 12);
      const pageEnd = 16384 + 16384 * Math.floor((v.offset - 16384) / 16384) + 16384;
      const nextOffset = next ? v.offset + next * 4 : null;
      const leaves = nextOffset !== null && nextOffset + 8 > pageEnd;
      const rows = [["第 63 位 bind", bits(63, 1), bind ? "bind" : "rebase"], ["第 51 到 62 位 next", next, next ? "+" + next * 4 + " 字节" : "链末尾"]];
      let summary;
      const metrics = [{ label: "类型", value: bind ? "bind" : "rebase" }];
      if (bind) {
        const ordinal = bits(0, 24);
        const addend = bits(24, 8);
        rows.push(["第 0 到 23 位 ordinal", ordinal, ordinal < v.imports ? "导入 " + ordinal : "超出表范围"]);
        rows.push(["第 24 到 31 位 addend", addend, ""]);
        metrics.push({ label: "导入序号", value: ordinal });
        summary = ordinal < v.imports ? "绑定到导入 " + ordinal + "." : "FormatError：绑定序号 " + ordinal + "，共有 " + v.imports + " 个导入。";
      } else {
        let target = BigInt(bits(0, 36)) | (BigInt(bits(36, 8)) << 56n);
        if (v.format === "6") target += 0x100000000n;
        rows.push(["第 0 到 35 位 target", hex(bits(0, 36)), v.format === "6" ? "虚拟内存偏移，加 0x100000000" : "虚拟内存地址"]);
        rows.push(["第 36 到 43 位 high8", bits(36, 8), "指针最高字节"]);
        metrics.push({ label: "目标", value: "0x" + target.toString(16) });
        summary = "重定基址：dyld 写入 0x" + target.toString(16) + " 加上地址滑移量。";
      }
      if (leaves) summary = "FormatError：下一修正位置 " + hex(nextOffset) + " 越出页面。";
      metrics.push({ label: "下一偏移", value: nextOffset === null ? "none" : hex(nextOffset) });
      return {
        summary,
        metrics,
        bars: [{ label: "next（4 字节步长）", value: next, max: 4095 }],
        columns: ["字段", "值", "含义"],
        rows,
      };
    },
  };

  const TRUTH = {
    O2: ["0x1000005e8", "0x100000740", "0x100000848", "0x100000868", "0x100000890", "0x1000008b4"],
    O0: ["0x1000005e8", "0x10000075c", "0x1000007d8", "0x100000800", "0x100000878", "0x1000008d0"],
  };
  const METHODS = {
    O2: { table: [0, 1, 2, 3, 4, 5], calls: [1, 2, 3, 4, 5], entry: [0], prologues: [0] },
    O0: { table: [0, 1, 2, 3, 4, 5], calls: [1, 2, 3, 4, 5], entry: [0], prologues: [0, 1, 2, 3, 4, 5] },
  };
  const startsLab = {
    controls: [
      { key: "build", label: "构建", type: "select", value: "O2", options: [{ value: "O2", label: "-O2 已剥离" }, { value: "O0", label: "-O0 已剥离" }] },
      { key: "table", label: "LC_FUNCTION_STARTS", type: "checkbox", value: false },
      { key: "calls", label: "调用目标", type: "checkbox", value: true },
      { key: "entry", label: "入口点", type: "checkbox", value: true },
      { key: "prologues", label: "序言扫描", type: "checkbox", value: true },
      { key: "noise", label: "函数内部的序言匹配", type: "range", value: 0, min: 0, max: 6, step: 1 },
    ],
    calculate(v) {
      const methods = METHODS[v.build];
      const found = new Set();
      const rows = [];
      ["table", "calls", "entry", "prologues"].forEach((name) => {
        if (!v[name]) return;
        methods[name].forEach((i) => found.add(i));
        rows.push([name, methods[name].length, methods[name].map((i) => TRUTH[v.build][i]).join(" ")]);
      });
      const falsePositives = v.prologues ? v.noise : 0;
      if (falsePositives) rows.push(["序言噪声", falsePositives, "函数内部地址"]);
      const tp = found.size;
      const reported = tp + falsePositives;
      const precision = reported ? round4(tp / reported) : 0;
      const recall = round4(tp / 6);
      return {
        summary: "所选方法的并集：" + tp + " / 6 个真实入口，" + falsePositives + " 个假阳性。",
        metrics: [
          { label: "真阳性", value: tp },
          { label: "假阳性", value: falsePositives },
          { label: "精确率", value: precision },
          { label: "召回率", value: recall },
        ],
        bars: [
          { label: "精确率", value: precision, max: 1 },
          { label: "召回率", value: recall, max: 1 },
        ],
        columns: ["方法", "找到数量", "地址"],
        rows,
      };
    },
  };

  const mapLab = {
    controls: [
      { key: "size", label: "文件大小（字节）", type: "range", value: 50264, min: 1, max: 65536, step: 1 },
      { key: "cells", label: "单元数", type: "range", value: 128, min: 1, max: 256, step: 1 },
      { key: "start", label: "节的文件偏移（__text）", type: "range", value: 1512, min: 0, max: 65536, step: 8 },
      { key: "length", label: "节的文件大小", type: "range", value: 768, min: 0, max: 8192, step: 8 },
    ],
    calculate(v) {
      const cells = Math.min(v.cells, v.size) || 1;
      const sectionEnd = v.start + v.length;
      const rows = [];
      let owned = 0;
      let headers = 0;
      for (let i = 0; i < cells; i += 1) {
        const a = Math.floor((i * v.size) / cells);
        const b = Math.floor(((i + 1) * v.size) / cells);
        const overlap = v.length ? Math.max(0, Math.min(b, sectionEnd) - Math.max(a, v.start)) : 0;
        const region = overlap > 0 ? "__text" : b <= v.start ? "headers" : "段或未映射";
        if (overlap > 0) owned += 1;
        if (region === "headers") headers += 1;
        const near = overlap > 0 || (a < v.start + 1 && b > v.start - 2 * (v.size / cells)) || i < 2;
        if (near && rows.length < 12) rows.push([i, a + " 到 " + b, overlap, region]);
      }
      return {
        summary: "单元宽度约 " + Math.round(v.size / cells) + " 字节。该节占据 " + owned + " 个单元；" + headers + " 个单元位于其前。",
        metrics: [
          { label: "绘制单元数", value: cells },
          { label: "标为 __text 的单元", value: owned },
          { label: "标为 headers 的单元", value: headers },
        ],
        bars: [{ label: "该节所占单元", value: owned, max: cells }],
        columns: ["单元", "字节范围", "重叠", "区域"],
        rows,
      };
    },
  };

  const figures = [
    {
      title: "识别格式并解析文件头",
      steps: [
        { label: "读取魔数", detail: "7f 45 4c 46 为 ELF，MZ 通过 e_lfanew 指向 PE 签名，cf fa ed fe 为 Mach-O 64。COFF 目标文件无魔数，以机器字段和 SizeOfOptionalHeader 0 判定。" },
        { label: "检查变体", detail: "ELF 要求 EI_CLASS 2、EI_DATA 1。PE 可选头要求魔数 0x20b。Mach-O 32 和通用文件失败时说明原因。" },
        { label: "解析为统一结构", detail: "parse_header 返回 format、arch、kind、entry 及原始字段。LC_MAIN 的 entryoff 0x5e8 加 __TEXT 0x100000000 得到入口 0x1000005e8。" },
      ],
      caption: "每次读取经过 unpack；记录越过末尾时抛出含偏移的 FormatError。",
      lab: headerLab,
    },
    {
      title: "节、段、权限与熵",
      steps: [
        { label: "读取节表", detail: "ELF 节头长 64 字节，COFF 和 PE 条目长 40 字节，Mach-O 各 LC_SEGMENT_64 内的 section_64 记录长 80 字节。" },
        { label: "转换权限位", detail: "ELF 使用 SHF_ALLOC、SHF_WRITE、SHF_EXECINSTR。COFF 和 PE 使用 MEM_READ、MEM_WRITE、MEM_EXECUTE。Mach-O 使用所属段的 initprot。" },
        { label: "度量文件字节", detail: "熵是各字节值 p log2(1/p) 之和，仅计算文件中的字节。NOBITS、未初始化和零填充区域报告 0。" },
      ],
      caption: "tally report v3 为 3.3736 位/字节。arm64 构建的 __TEXT,__text 为 5.8595。",
      lab: entropyLab,
    },
    {
      title: "符号、字符串表与名称还原",
      steps: [
        { label: "读取记录", detail: "Elf64_Sym 为 24 字节，COFF 符号为 18 字节加辅助记录，nlist_64 为 16 字节。" },
        { label: "解析名称", detail: "名称是字符串表内的偏移。read_cstring 拒绝越表偏移及没有 NUL 的名称。" },
        { label: "还原子集名称", detail: "嵌套名称记录替换项 S_、S0_、S1_。_ZN5tally5resetEPNS_7CounterE 还原为 tally::reset(tally::Counter*)。" },
      ],
      caption: "超出规定子集的名称返回 None，解码器从不抛异常。",
      lab: demangleLab,
    },
    {
      title: "导入、导出、重定位与链式修正",
      steps: [
        { label: "查找链", detail: "LC_DYLD_CHAINED_FIXUPS 给出头部、各段起点及各页页内起点。" },
        { label: "逐字解码", detail: "第 63 位选择绑定或重定基址。第 51 到 62 位以 4 字节步长给出下一字距离，零表示链结束。" },
        { label: "确定槽的名称", detail: "绑定序号索引导入表：库序号、弱绑定位及名称偏移。重定基址目标加 __TEXT 基址得到指针值。" },
      ],
      caption: "0x100004018 处的字 0x8010000000000003 绑定 libSystem 的 _puts。",
      lab: fixupLab,
    },
    {
      title: "字符串归属与函数入口恢复",
      steps: [
        { label: "运行五种方法", detail: "符号、LC_FUNCTION_STARTS、序言模式、bl 与 call 目标、入口点分别产生地址列表。" },
        { label: "获取真值", detail: "未剥离构建的函数符号就是真值：tally 可执行文件有六个入口。" },
        { label: "为各方法评分", detail: "精确率是真实入口数除以报告入口数，召回率是真实入口数除以总数六。" },
      ],
      caption: "-O2 下序言扫描找到 1/6，因为五个叶函数不构建栈帧。",
      lab: startsLab,
    },
    {
      title: "JSON 报告、HTML 字节图与构建差异",
      steps: [
        { label: "切分文件", detail: "单元 i 覆盖 i × size // cells 到 (i + 1) × size // cells，每个字节恰好覆盖一次。" },
        { label: "标注各单元", detail: "重叠最多的节获胜。首节之前标为 headers，否则取段，再否则取 unmapped。" },
        { label: "按熵着色", detail: "不透明度为 0.25 + 0.75 × entropy / 8，因此填充较淡、代码较亮。" },
      ],
      caption: "-O0 与 -O2 差异显示 __TEXT,__text 从 848 减到 768 字节，main 之后每个函数都移动了。",
      lab: mapLab,
    },
  ];

  window.AIFSProjectFigures.register("pj-binary-inspector-1", figures[0]);
  window.AIFSProjectFigures.register("pj-binary-inspector-2", figures[1]);
  window.AIFSProjectFigures.register("pj-binary-inspector-3", figures[2]);
  window.AIFSProjectFigures.register("pj-binary-inspector-4", figures[3]);
  window.AIFSProjectFigures.register("pj-binary-inspector-5", figures[4]);
  window.AIFSProjectFigures.register("pj-binary-inspector-6", figures[5]);
})();
