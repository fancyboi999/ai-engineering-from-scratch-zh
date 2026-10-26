(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-re-37.js"] = {
  "re-37-field-map": {
    "text": {
      "43 dated events. Squares are disassemblers and debuggers, diamonds are decompilers, triangles are frameworks, circles are research, diffing, and compiler-side tools.": "43 个带日期的事件。方形表示反汇编器与调试器，菱形表示反编译器，三角形表示框架，圆形表示研究、差异比较和编译器侧工具。",
      "ElfLoader, MachoLoader, PeLoader; .ldefs picks the language": "ElfLoader、MachoLoader、PeLoader；.ldefs 选择语言",
      "Loader module (LDSC)": "加载器模块（LDSC）",
      "Disassembler; SLEIGH .slaspec to .sla; Disassemble Entry Points, Function Start Search": "反汇编器；SLEIGH 从 .slaspec 编译为 .sla；反汇编入口点与函数起点搜索",
      "Architecture plugin; Recursive Descent, then linear sweep phases": "架构插件；先递归下降，再进行线性扫描阶段",
      "Processor module (ana.cpp, emu.cpp, out.cpp); autoanalysis queues; FLIRT": "处理器模块（ana.cpp、emu.cpp、out.cpp）；自动分析队列；FLIRT",
      "RArch plugin to RAnalOp; aa, aaa, af": "RArch 插件生成 RAnalOp；aa、aaa、af",
      "RzAnalysis plugin; aa, aaa, af": "RzAnalysis 插件；aa、aaa、af",
      "Capstone blocks; CFGFast function start search": "Capstone 基本块；CFGFast 函数起点搜索",
      "Generate Basic Blocks and the CFG; BlockGraph; Decompiler Switch Analysis": "生成基本块与 CFG；BlockGraph；反编译器 switch 分析",
      "Function, BasicBlock; CFG Analysis phase": "Function、BasicBlock；CFG 分析阶段",
      "mbl_graph_t, ready at MMAT_LOCOPT": "mbl_graph_t，在 MMAT_LOCOPT 阶段就绪",
      "CFGFast, CFGEmulated; kb.functions; IRSB": "CFGFast、CFGEmulated；kb.functions；IRSB",
      "Generate Raw P-code; Varnodes in ram, register, const, unique": "生成原始 P-code；Varnode 分布于 ram、register、const、unique 地址空间",
      "Lifted IL to LLIL to Mapped MLIL to MLIL": "从提升后的 IL 依次转换为 LLIL、Mapped MLIL、MLIL",
      "VEX (pyvex.lift, IRSB), then AIL": "先生成 VEX（pyvex.lift、IRSB），再转为 AIL",
      "Heritage, ActionHeritage; MULTIEQUAL, INDIRECT": "Heritage、ActionHeritage；MULTIEQUAL、INDIRECT",
      "no named SSA; use-def data flow in MMAT_GLBOPT1 to 3": "没有单独命名的 SSA；MMAT_GLBOPT1 至 3 阶段使用定义-使用数据流",
      "none; ESIL is built for emulation": "无；ESIL 面向仿真构建",
      "none; RzIL is built for emulation": "无；RzIL 面向仿真构建",
      "ActionDeadCode, ActionInferTypes, Rule pool; prototype from .cspec": "ActionDeadCode、ActionInferTypes、规则池；原型来自 .cspec",
      "MLIL constant propagation, variables and types; analyzeReturns": "MLIL 常量传播、变量与类型分析；analyzeReturns",
      "Transform microcode; MMAT_CALLS, MMAT_GLBOPT, MMAT_LVARS; TIL": "转换微代码；MMAT_CALLS、MMAT_GLBOPT、MMAT_LVARS；TIL",
      "afv, afc, aaft; ESIL emulation": "afv、afc、aaft；ESIL 仿真",
      "CollapseStructure; BlockIf, BlockWhileDo, BlockSwitch, BlockGoto": "CollapseStructure；BlockIf、BlockWhileDo、BlockSwitch、BlockGoto",
      "HLIL_IF, HLIL_WHILE, HLIL_SWITCH; AST at root": "HLIL_IF、HLIL_WHILE、HLIL_SWITCH；根节点上有 AST",
      "Generate ctree; structural analysis; goto regions": "生成 ctree；结构分析；goto 区域",
      "pdc (ESIL plus pseudo); pdd (r2dec); pdg (r2ghidra)": "pdc（ESIL 与伪代码）；pdd（r2dec）；pdg（r2ghidra）",
      "Emit Final C Tokens; PrintC, ActionNameVars, ActionSetCasts": "输出最终 C token；PrintC、ActionNameVars、ActionSetCasts",
      "HLIL rendering; Pseudo C, Pseudo Rust, Pseudo Python": "HLIL 渲染；伪 C、伪 Rust、伪 Python",
      "Beautify ctree; Print ctree; cfunc_t": "美化 ctree；打印 ctree；cfunc_t",
      "text of pdc, pdd, pdg": "pdc、pdd、pdg 的文本输出",
      "pdg text": "pdg 文本",
      "CStructuredCodeGenerator; codegen.text": "CStructuredCodeGenerator；codegen.text"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "Ghidra",
        "reason": "工具/产品专名、命令、API 或演示中的实体标识，按契约保持原样。"
      },
      {
        "text": "rizin",
        "reason": "工具/产品专名、命令、API 或演示中的实体标识，按契约保持原样。"
      },
      {
        "text": "angr",
        "reason": "工具/产品专名、命令、API 或演示中的实体标识，按契约保持原样。"
      },
      {
        "text": "Binary Ninja",
        "reason": "工具/产品专名、命令、API 或演示中的实体标识，按契约保持原样。"
      },
      {
        "text": "IDA / Hex-Rays",
        "reason": "工具/产品专名、命令、API 或演示中的实体标识，按契约保持原样。"
      },
      {
        "text": "BinaryView, BinaryViewType",
        "reason": "工具/产品专名、命令、API 或演示中的实体标识，按契约保持原样。"
      },
      {
        "text": "RBin (rabin2)",
        "reason": "工具/产品专名、命令、API 或演示中的实体标识，按契约保持原样。"
      },
      {
        "text": "RzBin (rz-bin)",
        "reason": "工具/产品专名、命令、API 或演示中的实体标识，按契约保持原样。"
      },
      {
        "text": "CLE (cle.Loader, main_object)",
        "reason": "工具/产品专名、命令、API 或演示中的实体标识，按契约保持原样。"
      },
      {
        "text": "afb, agf, aab",
        "reason": "工具/产品专名、命令、API 或演示中的实体标识，按契约保持原样。"
      },
      {
        "text": "afb, agf, aab (Nucleus)",
        "reason": "工具/产品专名、命令、API 或演示中的实体标识，按契约保持原样。"
      },
      {
        "text": "microcode (minsn_t, mop_t); MMAT_GENERATED",
        "reason": "工具/产品专名、命令、API 或演示中的实体标识，按契约保持原样。"
      },
      {
        "text": "ESIL (asm.esil, ae)",
        "reason": "工具/产品专名、命令、API 或演示中的实体标识，按契约保持原样。"
      },
      {
        "text": "RzIL (aoi, aez)",
        "reason": "工具/产品专名、命令、API 或演示中的实体标识，按契约保持原样。"
      },
      {
        "text": "SSA",
        "reason": "工具/产品专名、命令、API 或演示中的实体标识，按契约保持原样。"
      },
      {
        "text": "LLIL SSA, MLIL SSA, HLIL SSA; HLIL_VAR_PHI",
        "reason": "工具/产品专名、命令、API 或演示中的实体标识，按契约保持原样。"
      },
      {
        "text": "_stage_transform_to_ssa_level0 and level1; SeqNodeDephication",
        "reason": "工具/产品专名、命令、API 或演示中的实体标识，按契约保持原样。"
      },
      {
        "text": "afv, afc, aft",
        "reason": "工具/产品专名、命令、API 或演示中的实体标识，按契约保持原样。"
      },
      {
        "text": "CallingConventionAnalysis, VariableRecoveryFast, Typehoon",
        "reason": "工具/产品专名、命令、API 或演示中的实体标识，按契约保持原样。"
      },
      {
        "text": "pdg (rz-ghidra); jsdec",
        "reason": "工具/产品专名、命令、API 或演示中的实体标识，按契约保持原样。"
      },
      {
        "text": "RegionIdentifier; RecursiveStructurer with SAILRStructurer",
        "reason": "工具/产品专名、命令、API 或演示中的实体标识，按契约保持原样。"
      },
      {
        "text": "CFGFast、CFGEmulated；kb.functions；IRSB",
        "reason": "工具实现的 API、类型与指令标识列表，保持原样。"
      },
      {
        "text": "CStructuredCodeGenerator；codegen.text",
        "reason": "工具实现的 API、类型与指令标识列表，保持原样。"
      },
      {
        "text": "CollapseStructure；BlockIf、BlockWhileDo、BlockSwitch、BlockGoto",
        "reason": "工具实现的 API、类型与指令标识列表，保持原样。"
      },
      {
        "text": "Heritage、ActionHeritage；MULTIEQUAL、INDIRECT",
        "reason": "工具实现的 API、类型与指令标识列表，保持原样。"
      }
    ]
  }
};
