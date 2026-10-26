(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-agent-skills.js"] = {
  "skill-package-anatomy": {
    "text": {
      "Motion reduced": "已减少动画",
      "A tree showing SKILL.md, references, scripts, and assets inside one release-readiness skill package.": "一棵目录树展示同一发布就绪技能包中的 SKILL.md、参考文档、脚本和资源。",
      "one deployable directory": "一个可部署目录",
      "package root": "包根目录",
      "identity + procedure": "身份 + 流程",
      "branch rules": "分支规则",
      "deterministic": "确定性",
      "helpers": "辅助程序",
      "output material": "输出材料",
      "domain constraint": "领域约束",
      "format contract": "格式契约",
      "evidence collector": "证据收集器",
      "deliverable template": "交付物模板",
      "Every pointer must resolve": "每个引用都必须可解析",
      "A copied entry file with missing companions is a broken package.": "只复制入口文件而缺失配套文件，会得到一个损坏的包。",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画",
      "The directory is the unit": "目录是基本单位",
      "Install, version, review, and remove the whole package root.": "安装、版本管理、审查和移除都应针对整个包根目录。",
      "Step 1 of 3: The directory is the unit": "第 1 / 3 步：目录是基本单位",
      "Step 1 of 3: The directory is the unit. Install, version, review, and remove the whole package root.": "第 1 / 3 步：目录是基本单位。安装、版本管理、审查和移除都应针对整个包根目录。",
      "Four responsibilities": "四类职责",
      "SKILL.md routes and instructs. References explain. Scripts compute. Assets become outputs.": "SKILL.md 负责路由和指导，参考文档负责解释，脚本负责计算，资源形成输出。",
      "Step 2 of 3: Four responsibilities": "第 2 / 3 步：四类职责",
      "Step 2 of 3: Four responsibilities. SKILL.md routes and instructs. References explain. Scripts compute. Assets become outputs.": "第 2 / 3 步：四类职责。SKILL.md 负责路由和指导，参考文档负责解释，脚本负责计算，资源形成输出。",
      "Step 3 of 3: Every pointer must resolve": "第 3 / 3 步：每个引用都必须可解析",
      "Step 3 of 3: Every pointer must resolve. A copied entry file with missing companions is a broken package.": "第 3 / 3 步：每个引用都必须可解析。只复制入口文件而缺失配套文件，会得到一个损坏的包。"
    },
    "patterns": [
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ The\\ directory\\ is\\ the\\ unit$",
        "第 $1 / $2 步：目录是基本单位"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ The\\ directory\\ is\\ the\\ unit\\.\\ Install,\\ version,\\ review,\\ and\\ remove\\ the\\ whole\\ package\\ root\\.$",
        "第 $1 / $2 步：目录是基本单位。安装、版本管理、审查和移除都应针对整个包根目录。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Four\\ responsibilities$",
        "第 $1 / $2 步：四类职责"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Four\\ responsibilities\\.\\ SKILL\\.md\\ routes\\ and\\ instructs\\.\\ References\\ explain\\.\\ Scripts\\ compute\\.\\ Assets\\ become\\ outputs\\.$",
        "第 $1 / $2 步：四类职责。SKILL.md 负责路由和指导，参考文档负责解释，脚本负责计算，资源形成输出。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Every\\ pointer\\ must\\ resolve$",
        "第 $1 / $2 步：每个引用都必须可解析"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Every\\ pointer\\ must\\ resolve\\.\\ A\\ copied\\ entry\\ file\\ with\\ missing\\ companions\\ is\\ a\\ broken\\ package\\.$",
        "第 $1 / $2 步：每个引用都必须可解析。只复制入口文件而缺失配套文件，会得到一个损坏的包。"
      ]
    ],
    "preserve": [
      {
        "text": "release-readiness",
        "reason": "示例技能包目录名，与包身份保持一致"
      },
      {
        "text": "references/",
        "reason": "文件路径"
      },
      {
        "text": "scripts/",
        "reason": "文件路径"
      },
      {
        "text": "assets/",
        "reason": "文件路径"
      },
      {
        "text": "release-",
        "reason": "示例技能包目录名的自动折行片段"
      },
      {
        "text": "readiness",
        "reason": "示例技能包目录名的自动折行片段"
      }
    ]
  },
  "skill-runtime-lifecycle": {
    "text": {
      "Motion reduced": "已减少动画",
      "The skill lifecycle from package discovery through validation, selection, activation, execution, and verification.": "技能从包发现开始，经过校验、选择、激活、执行，最后完成验证的生命周期。",
      "no match": "没有匹配项",
      "selected": "已选中",
      "find package": "查找技能包",
      "Validate": "校验",
      "metadata + layout": "元数据 + 布局",
      "Catalog": "目录",
      "name + description": "名称 + 描述",
      "Select?": "是否选择？",
      "explicit or implicit": "显式或隐式",
      "Leave unloaded": "保持未加载",
      "Activate": "激活",
      "body enters context": "正文进入上下文",
      "Load SKILL.md": "加载 SKILL.md",
      "working procedure": "工作流程",
      "Disclose resources": "按需披露资源",
      "only required branch": "仅加载所需分支",
      "Request execution": "请求执行",
      "host tools + policy": "宿主工具 + 策略",
      "Artifact +": "产物 +",
      "evidence": "证据",
      "observable result": "可观察结果",
      "Verify": "验证",
      "independent gate": "独立关卡",
      "Verification closes the loop": "验证形成闭环",
      "Check the result independently of the model that produced it.": "由产生结果的模型之外的机制独立检查结果。",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画",
      "Discovery is not activation": "发现不等于激活",
      "The runtime first finds a possible package.": "运行时先找到一个可能适用的包。",
      "Step 1 of 10: Discovery is not activation": "第 1 / 10 步：发现不等于激活",
      "Step 1 of 10: Discovery is not activation. The runtime first finds a possible package.": "第 1 / 10 步：发现不等于激活。运行时先找到一个可能适用的包。",
      "Reject malformed packages early": "尽早拒绝格式错误的包",
      "Validation protects the catalog before the model sees an entry.": "模型看到目录项之前，校验先保护目录。",
      "Step 2 of 10: Reject malformed packages early": "第 2 / 10 步：尽早拒绝格式错误的包",
      "Step 2 of 10: Reject malformed packages early. Validation protects the catalog before the model sees an entry.": "第 2 / 10 步：尽早拒绝格式错误的包。模型看到目录项之前，校验先保护目录。",
      "Publish compact routing metadata": "发布精简路由元数据",
      "Only identity and trigger information need catalog space.": "只有身份和触发信息需要占用目录空间。",
      "Step 3 of 10: Publish compact routing metadata": "第 3 / 10 步：发布精简路由元数据",
      "Step 3 of 10: Publish compact routing metadata. Only identity and trigger information need catalog space.": "第 3 / 10 步：发布精简路由元数据。只有身份和触发信息需要占用目录空间。",
      "Selection is a separate decision": "选择是独立决策",
      "A host-specific explicit action or a description-driven model match can select the package.": "宿主专用的显式操作，或按描述驱动的模型匹配，都可选中包。",
      "Step 4 of 10: Selection is a separate decision": "第 4 / 10 步：选择是独立决策",
      "Step 4 of 10: Selection is a separate decision. A host-specific explicit action or a description-driven model match can select the package.": "第 4 / 10 步：选择是独立决策。宿主专用的显式操作，或按描述驱动的模型匹配，都可选中包。",
      "Selection can abstain": "选择可以放弃",
      "No match leaves the body unloaded. A match activates it.": "没有匹配项就不加载正文；有匹配项才激活。",
      "Step 5 of 10: Selection can abstain": "第 5 / 10 步：选择可以放弃",
      "Step 5 of 10: Selection can abstain. No match leaves the body unloaded. A match activates it.": "第 5 / 10 步：选择可以放弃。没有匹配项就不加载正文；有匹配项才激活。",
      "Activation loads procedure": "激活加载流程",
      "The body enters model-visible context, but no tool authority appears.": "正文进入模型可见上下文，但不会因此获得工具权限。",
      "Step 6 of 10: Activation loads procedure": "第 6 / 10 步：激活加载流程",
      "Step 6 of 10: Activation loads procedure. The body enters model-visible context, but no tool authority appears.": "第 6 / 10 步：激活加载流程。正文进入模型可见上下文，但不会因此获得工具权限。",
      "Disclosure follows branches": "按分支披露资源",
      "Read only the references, scripts, or assets required now.": "只读取当前需要的参考文档、脚本或资源。",
      "Step 7 of 10: Disclosure follows branches": "第 7 / 10 步：按分支披露资源",
      "Step 7 of 10: Disclosure follows branches. Read only the references, scripts, or assets required now.": "第 7 / 10 步：按分支披露资源。只读取当前需要的参考文档、脚本或资源。",
      "Execution stays host-controlled": "执行仍由宿主控制",
      "The agent requests tools or scripts under active policy.": "agent 按当前策略请求工具或脚本。",
      "Step 8 of 10: Execution stays host-controlled": "第 8 / 10 步：执行仍由宿主控制",
      "Step 8 of 10: Execution stays host-controlled. The agent requests tools or scripts under active policy.": "第 8 / 10 步：执行仍由宿主控制。agent 按当前策略请求工具或脚本。",
      "Return evidence with the artifact": "随产物返回证据",
      "A fluent claim is weaker than paths, observations, and exit results.": "流畅的主张不如路径、观察结果和退出结果有力。",
      "Step 9 of 10: Return evidence with the artifact": "第 9 / 10 步：随产物返回证据",
      "Step 9 of 10: Return evidence with the artifact. A fluent claim is weaker than paths, observations, and exit results.": "第 9 / 10 步：随产物返回证据。流畅的主张不如路径、观察结果和退出结果有力。",
      "Step 10 of 10: Verification closes the loop": "第 10 / 10 步：验证形成闭环",
      "Step 10 of 10: Verification closes the loop. Check the result independently of the model that produced it.": "第 10 / 10 步：验证形成闭环。由产生结果的模型之外的机制独立检查结果。"
    },
    "patterns": [
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Discovery\\ is\\ not\\ activation$",
        "第 $1 / $2 步：发现不等于激活"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Discovery\\ is\\ not\\ activation\\.\\ The\\ runtime\\ first\\ finds\\ a\\ possible\\ package\\.$",
        "第 $1 / $2 步：发现不等于激活。运行时先找到一个可能适用的包。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Reject\\ malformed\\ packages\\ early$",
        "第 $1 / $2 步：尽早拒绝格式错误的包"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Reject\\ malformed\\ packages\\ early\\.\\ Validation\\ protects\\ the\\ catalog\\ before\\ the\\ model\\ sees\\ an\\ entry\\.$",
        "第 $1 / $2 步：尽早拒绝格式错误的包。模型看到目录项之前，校验先保护目录。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Publish\\ compact\\ routing\\ metadata$",
        "第 $1 / $2 步：发布精简路由元数据"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Publish\\ compact\\ routing\\ metadata\\.\\ Only\\ identity\\ and\\ trigger\\ information\\ need\\ catalog\\ space\\.$",
        "第 $1 / $2 步：发布精简路由元数据。只有身份和触发信息需要占用目录空间。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Selection\\ is\\ a\\ separate\\ decision$",
        "第 $1 / $2 步：选择是独立决策"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Selection\\ is\\ a\\ separate\\ decision\\.\\ A\\ host\\-specific\\ explicit\\ action\\ or\\ a\\ description\\-driven\\ model\\ match\\ can\\ select\\ the\\ package\\.$",
        "第 $1 / $2 步：选择是独立决策。宿主专用的显式操作，或按描述驱动的模型匹配，都可选中包。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Selection\\ can\\ abstain$",
        "第 $1 / $2 步：选择可以放弃"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Selection\\ can\\ abstain\\.\\ No\\ match\\ leaves\\ the\\ body\\ unloaded\\.\\ A\\ match\\ activates\\ it\\.$",
        "第 $1 / $2 步：选择可以放弃。没有匹配项就不加载正文；有匹配项才激活。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Activation\\ loads\\ procedure$",
        "第 $1 / $2 步：激活加载流程"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Activation\\ loads\\ procedure\\.\\ The\\ body\\ enters\\ model\\-visible\\ context,\\ but\\ no\\ tool\\ authority\\ appears\\.$",
        "第 $1 / $2 步：激活加载流程。正文进入模型可见上下文，但不会因此获得工具权限。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Disclosure\\ follows\\ branches$",
        "第 $1 / $2 步：按分支披露资源"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Disclosure\\ follows\\ branches\\.\\ Read\\ only\\ the\\ references,\\ scripts,\\ or\\ assets\\ required\\ now\\.$",
        "第 $1 / $2 步：按分支披露资源。只读取当前需要的参考文档、脚本或资源。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Execution\\ stays\\ host\\-controlled$",
        "第 $1 / $2 步：执行仍由宿主控制"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Execution\\ stays\\ host\\-controlled\\.\\ The\\ agent\\ requests\\ tools\\ or\\ scripts\\ under\\ active\\ policy\\.$",
        "第 $1 / $2 步：执行仍由宿主控制。agent 按当前策略请求工具或脚本。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Return\\ evidence\\ with\\ the\\ artifact$",
        "第 $1 / $2 步：随产物返回证据"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Return\\ evidence\\ with\\ the\\ artifact\\.\\ A\\ fluent\\ claim\\ is\\ weaker\\ than\\ paths,\\ observations,\\ and\\ exit\\ results\\.$",
        "第 $1 / $2 步：随产物返回证据。流畅的主张不如路径、观察结果和退出结果有力。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Verification\\ closes\\ the\\ loop$",
        "第 $1 / $2 步：验证形成闭环"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Verification\\ closes\\ the\\ loop\\.\\ Check\\ the\\ result\\ independently\\ of\\ the\\ model\\ that\\ produced\\ it\\.$",
        "第 $1 / $2 步：验证形成闭环。由产生结果的模型之外的机制独立检查结果。"
      ]
    ],
    "preserve": []
  },
  "skill-tool-orthogonality": {
    "text": {
      "Motion reduced": "已减少动画",
      "A feedback loop in which an activated skill guides procedure while a host tool returns observations for the final artifact.": "已激活的技能指导流程，宿主工具返回观察结果，为最终产物提供依据，形成反馈循环。",
      "procedure loop": "流程循环",
      "feed evidence back": "回传证据",
      "User goal": "用户目标",
      "defines outcome": "定义结果",
      "Activated skill": "已激活技能",
      "procedural knowledge": "流程知识",
      "Decision rules": "决策规则",
      "choose next action": "选择下一步行动",
      "MCP or local tool": "MCP 或本地工具",
      "typed capability": "有类型的能力",
      "Observation": "观察结果",
      "evidence, not authority": "是证据，不是授权",
      "Artifact": "产物",
      "contracted output": "契约约定的输出",
      "Verification": "验证",
      "independent check": "独立检查",
      "Verification stays independent": "保持独立验证",
      "The artifact must pass a check beyond the model narrative.": "产物必须通过模型自述之外的检查。",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画",
      "The user owns the goal": "用户拥有目标",
      "The task starts above both the skill and the tool.": "任务目标先于技能和工具。",
      "Step 1 of 7: The user owns the goal": "第 1 / 7 步：用户拥有目标",
      "Step 1 of 7: The user owns the goal. The task starts above both the skill and the tool.": "第 1 / 7 步：用户拥有目标。任务目标先于技能和工具。",
      "The skill contributes method": "技能提供方法",
      "It supplies procedure and decision boundaries.": "它提供流程和决策边界。",
      "Step 2 of 7: The skill contributes method": "第 2 / 7 步：技能提供方法",
      "Step 2 of 7: The skill contributes method. It supplies procedure and decision boundaries.": "第 2 / 7 步：技能提供方法。它提供流程和决策边界。",
      "Procedure chooses a capability": "流程选择能力",
      "Naming a tool does not create or authorize it.": "写出工具名称，不会创建工具，也不会授予权限。",
      "Step 3 of 7: Procedure chooses a capability": "第 3 / 7 步：流程选择能力",
      "Step 3 of 7: Procedure chooses a capability. Naming a tool does not create or authorize it.": "第 3 / 7 步：流程选择能力。写出工具名称，不会创建工具，也不会授予权限。",
      "The host exposes the real tool": "宿主提供真实工具",
      "The tool contract defines what can actually be requested.": "工具契约规定实际可以请求什么。",
      "Step 4 of 7: The host exposes the real tool": "第 4 / 7 步：宿主提供真实工具",
      "Step 4 of 7: The host exposes the real tool. The tool contract defines what can actually be requested.": "第 4 / 7 步：宿主提供真实工具。工具契约规定实际可以请求什么。",
      "Observations update judgment": "观察更新判断",
      "Tool output returns as evidence, not as a higher-priority instruction.": "工具输出作为证据返回，而非更高优先级的指令。",
      "Step 5 of 7: Observations update judgment": "第 5 / 7 步：观察更新判断",
      "Step 5 of 7: Observations update judgment. Tool output returns as evidence, not as a higher-priority instruction.": "第 5 / 7 步：观察更新判断。工具输出作为证据返回，而非更高优先级的指令。",
      "Procedure produces an artifact": "流程产生一个产物",
      "The skill turns observations into the required output.": "技能将观察结果转为所需输出。",
      "Step 6 of 7: Procedure produces an artifact": "第 6 / 7 步：流程产生一个产物",
      "Step 6 of 7: Procedure produces an artifact. The skill turns observations into the required output.": "第 6 / 7 步：流程产生一个产物。技能将观察结果转为所需输出。",
      "Step 7 of 7: Verification stays independent": "第 7 / 7 步：保持独立验证",
      "Step 7 of 7: Verification stays independent. The artifact must pass a check beyond the model narrative.": "第 7 / 7 步：保持独立验证。产物必须通过模型自述之外的检查。"
    },
    "patterns": [
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ The\\ user\\ owns\\ the\\ goal$",
        "第 $1 / $2 步：用户拥有目标"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ The\\ user\\ owns\\ the\\ goal\\.\\ The\\ task\\ starts\\ above\\ both\\ the\\ skill\\ and\\ the\\ tool\\.$",
        "第 $1 / $2 步：用户拥有目标。任务目标先于技能和工具。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ The\\ skill\\ contributes\\ method$",
        "第 $1 / $2 步：技能提供方法"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ The\\ skill\\ contributes\\ method\\.\\ It\\ supplies\\ procedure\\ and\\ decision\\ boundaries\\.$",
        "第 $1 / $2 步：技能提供方法。它提供流程和决策边界。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Procedure\\ chooses\\ a\\ capability$",
        "第 $1 / $2 步：流程选择能力"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Procedure\\ chooses\\ a\\ capability\\.\\ Naming\\ a\\ tool\\ does\\ not\\ create\\ or\\ authorize\\ it\\.$",
        "第 $1 / $2 步：流程选择能力。写出工具名称，不会创建工具，也不会授予权限。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ The\\ host\\ exposes\\ the\\ real\\ tool$",
        "第 $1 / $2 步：宿主提供真实工具"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ The\\ host\\ exposes\\ the\\ real\\ tool\\.\\ The\\ tool\\ contract\\ defines\\ what\\ can\\ actually\\ be\\ requested\\.$",
        "第 $1 / $2 步：宿主提供真实工具。工具契约规定实际可以请求什么。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Observations\\ update\\ judgment$",
        "第 $1 / $2 步：观察更新判断"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Observations\\ update\\ judgment\\.\\ Tool\\ output\\ returns\\ as\\ evidence,\\ not\\ as\\ a\\ higher\\-priority\\ instruction\\.$",
        "第 $1 / $2 步：观察更新判断。工具输出作为证据返回，而非更高优先级的指令。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Procedure\\ produces\\ an\\ artifact$",
        "第 $1 / $2 步：流程产生一个产物"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Procedure\\ produces\\ an\\ artifact\\.\\ The\\ skill\\ turns\\ observations\\ into\\ the\\ required\\ output\\.$",
        "第 $1 / $2 步：流程产生一个产物。技能将观察结果转为所需输出。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Verification\\ stays\\ independent$",
        "第 $1 / $2 步：保持独立验证"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Verification\\ stays\\ independent\\.\\ The\\ artifact\\ must\\ pass\\ a\\ check\\ beyond\\ the\\ model\\ narrative\\.$",
        "第 $1 / $2 步：保持独立验证。产物必须通过模型自述之外的检查。"
      ]
    ],
    "preserve": []
  },
  "skill-validation-order": {
    "text": {
      "Motion reduced": "已减少动画",
      "A left-to-right validation pipeline from frontmatter delimiters to body and resource rules.": "从左到右的校验流水线，依次检查 frontmatter 分隔符、正文和资源规则。",
      "Frontmatter": "前置元数据",
      "delimiters": "分隔符",
      "Scalar": "标量",
      "metadata": "元数据",
      "safe parse": "安全解析",
      "Name = directory": "名称 = 目录",
      "stable identity": "稳定身份",
      "Required fields": "必需字段",
      "name + description": "名称 + 描述",
      "Known": "已知",
      "extensions": "扩展项",
      "adapter allowlist": "适配器允许列表",
      "Body +": "正文 +",
      "resources": "资源",
      "deep rules": "深层规则",
      "Then inspect body and resources": "然后检查正文与资源",
      "Deep checks are useful only after the cheap structure is sound.": "先确认基础结构正确，深层检查才有意义。",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画",
      "Find the document boundary": "确定文档边界",
      "Do not infer metadata from a malformed header.": "不要从格式错误的头部推断元数据。",
      "Step 1 of 6: Find the document boundary": "第 1 / 6 步：确定文档边界",
      "Step 1 of 6: Find the document boundary. Do not infer metadata from a malformed header.": "第 1 / 6 步：确定文档边界。不要从格式错误的头部推断元数据。",
      "Parse only the expected shape": "只解析预期结构",
      "Reject surprising metadata types before deeper checks.": "深层检查前，先拒绝不符合预期的元数据类型。",
      "Step 2 of 6: Parse only the expected shape": "第 2 / 6 步：只解析预期结构",
      "Step 2 of 6: Parse only the expected shape. Reject surprising metadata types before deeper checks.": "第 2 / 6 步：只解析预期结构。深层检查前，先拒绝不符合预期的元数据类型。",
      "Prove package identity": "证明包身份",
      "The declared name and containing directory must agree.": "声明名称必须与所在目录一致。",
      "Step 3 of 6: Prove package identity": "第 3 / 6 步：证明包身份",
      "Step 3 of 6: Prove package identity. The declared name and containing directory must agree.": "第 3 / 6 步：证明包身份。声明名称必须与所在目录一致。",
      "Require routing metadata": "要求路由元数据",
      "Missing identity or description prevents catalog publication.": "缺少身份或描述，就不能发布目录项。",
      "Step 4 of 6: Require routing metadata": "第 4 / 6 步：要求路由元数据",
      "Step 4 of 6: Require routing metadata. Missing identity or description prevents catalog publication.": "第 4 / 6 步：要求路由元数据。缺少身份或描述，就不能发布目录项。",
      "Name host-specific semantics": "明确宿主专用语义",
      "Unknown extensions require an explicit adapter decision.": "未知扩展必须由适配器明确决策。",
      "Step 5 of 6: Name host-specific semantics": "第 5 / 6 步：明确宿主专用语义",
      "Step 5 of 6: Name host-specific semantics. Unknown extensions require an explicit adapter decision.": "第 5 / 6 步：明确宿主专用语义。未知扩展必须由适配器明确决策。",
      "Step 6 of 6: Then inspect body and resources": "第 6 / 6 步：然后检查正文与资源",
      "Step 6 of 6: Then inspect body and resources. Deep checks are useful only after the cheap structure is sound.": "第 6 / 6 步：然后检查正文与资源。先确认基础结构正确，深层检查才有意义。"
    },
    "patterns": [
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Find\\ the\\ document\\ boundary$",
        "第 $1 / $2 步：确定文档边界"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Find\\ the\\ document\\ boundary\\.\\ Do\\ not\\ infer\\ metadata\\ from\\ a\\ malformed\\ header\\.$",
        "第 $1 / $2 步：确定文档边界。不要从格式错误的头部推断元数据。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Parse\\ only\\ the\\ expected\\ shape$",
        "第 $1 / $2 步：只解析预期结构"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Parse\\ only\\ the\\ expected\\ shape\\.\\ Reject\\ surprising\\ metadata\\ types\\ before\\ deeper\\ checks\\.$",
        "第 $1 / $2 步：只解析预期结构。深层检查前，先拒绝不符合预期的元数据类型。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Prove\\ package\\ identity$",
        "第 $1 / $2 步：证明包身份"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Prove\\ package\\ identity\\.\\ The\\ declared\\ name\\ and\\ containing\\ directory\\ must\\ agree\\.$",
        "第 $1 / $2 步：证明包身份。声明名称必须与所在目录一致。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Require\\ routing\\ metadata$",
        "第 $1 / $2 步：要求路由元数据"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Require\\ routing\\ metadata\\.\\ Missing\\ identity\\ or\\ description\\ prevents\\ catalog\\ publication\\.$",
        "第 $1 / $2 步：要求路由元数据。缺少身份或描述，就不能发布目录项。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Name\\ host\\-specific\\ semantics$",
        "第 $1 / $2 步：明确宿主专用语义"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Name\\ host\\-specific\\ semantics\\.\\ Unknown\\ extensions\\ require\\ an\\ explicit\\ adapter\\ decision\\.$",
        "第 $1 / $2 步：明确宿主专用语义。未知扩展必须由适配器明确决策。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Then\\ inspect\\ body\\ and\\ resources$",
        "第 $1 / $2 步：然后检查正文与资源"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Then\\ inspect\\ body\\ and\\ resources\\.\\ Deep\\ checks\\ are\\ useful\\ only\\ after\\ the\\ cheap\\ structure\\ is\\ sound\\.$",
        "第 $1 / $2 步：然后检查正文与资源。先确认基础结构正确，深层检查才有意义。"
      ]
    ],
    "preserve": []
  },
  "skill-discovery-pipeline": {
    "text": {
      "Motion reduced": "已减少动画",
      "Configured roots pass through enumeration, package validation, provenance, collision resolution, budgeting, and catalog publication.": "配置的根目录经过枚举、包校验、来源记录、冲突处理、预算限制和目录发布。",
      "workspace, user,": "工作区、用户、",
      "admin": "管理员",
      "immediate skill": "直接子级技能",
      "dirs": "目录",
      "Find SKILL.md": "查找 SKILL.md",
      "one entry point": "单一入口",
      "Validate": "校验",
      "package": "技能包",
      "shape + limits": "结构 + 限制",
      "Attach": "附加",
      "provenance": "来源信息",
      "scope + source": "范围 + 来源",
      "Resolve": "处理",
      "collisions": "冲突",
      "declared policy": "声明的策略",
      "Apply budget": "应用预算",
      "bounded catalog": "有界目录",
      "Publish entry": "发布条目",
      "name +": "名称 +",
      "description +": "描述 +",
      "path": "路径",
      "Publish compact metadata": "发布精简元数据",
      "The model sees routing identity, not the full package tree.": "模型只看到路由身份信息，而不是整个技能包目录树。",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画",
      "Start with declared roots": "从声明的根目录开始",
      "Discovery scope is runtime policy, not a package property.": "发现范围由运行时策略决定，不是包自身属性。",
      "Step 1 of 8: Start with declared roots": "第 1 / 8 步：从声明的根目录开始",
      "Step 1 of 8: Start with declared roots. Discovery scope is runtime policy, not a package property.": "第 1 / 8 步：从声明的根目录开始。发现范围由运行时策略决定，不是包自身属性。",
      "Preserve package boundaries": "保留包边界",
      "Inspect immediate skill directories instead of publishing every nested example.": "检查直接子级技能目录，而非发布每个嵌套示例。",
      "Step 2 of 8: Preserve package boundaries": "第 2 / 8 步：保留包边界",
      "Step 2 of 8: Preserve package boundaries. Inspect immediate skill directories instead of publishing every nested example.": "第 2 / 8 步：保留包边界。检查直接子级技能目录，而非发布每个嵌套示例。",
      "Locate one entry point": "定位单一入口",
      "A directory becomes a candidate only when SKILL.md is present where expected.": "只有 SKILL.md 出现在预期位置，目录才成为候选。",
      "Step 3 of 8: Locate one entry point": "第 3 / 8 步：定位单一入口",
      "Step 3 of 8: Locate one entry point. A directory becomes a candidate only when SKILL.md is present where expected.": "第 3 / 8 步：定位单一入口。只有 SKILL.md 出现在预期位置，目录才成为候选。",
      "Validate before visibility": "先校验，再展示",
      "Malformed packages should not consume catalog space.": "格式错误的包不应占用目录空间。",
      "Step 4 of 8: Validate before visibility": "第 4 / 8 步：先校验，再展示",
      "Step 4 of 8: Validate before visibility. Malformed packages should not consume catalog space.": "第 4 / 8 步：先校验，再展示。格式错误的包不应占用目录空间。",
      "Carry source identity": "携带来源身份",
      "Scope and provenance make duplicate names diagnosable.": "作用域和来源信息使同名冲突可被诊断。",
      "Step 5 of 8: Carry source identity": "第 5 / 8 步：携带来源身份",
      "Step 5 of 8: Carry source identity. Scope and provenance make duplicate names diagnosable.": "第 5 / 8 步：携带来源身份。作用域和来源信息使同名冲突可被诊断。",
      "Resolve names by policy": "按策略处理名称",
      "Keep, qualify, reject, or choose precedence explicitly.": "明确选择保留、限定名称、拒绝或确定优先级。",
      "Step 6 of 8: Resolve names by policy": "第 6 / 8 步：按策略处理名称",
      "Step 6 of 8: Resolve names by policy. Keep, qualify, reject, or choose precedence explicitly.": "第 6 / 8 步：按策略处理名称。明确选择保留、限定名称、拒绝或确定优先级。",
      "Budget the exact serialization": "按实际序列化结果计算预算",
      "Catalog size belongs to the host and active context is a separate budget.": "目录大小由宿主决定，激活上下文另有预算。",
      "Step 7 of 8: Budget the exact serialization": "第 7 / 8 步：按实际序列化结果计算预算",
      "Step 7 of 8: Budget the exact serialization. Catalog size belongs to the host and active context is a separate budget.": "第 7 / 8 步：按实际序列化结果计算预算。目录大小由宿主决定，激活上下文另有预算。",
      "Step 8 of 8: Publish compact metadata": "第 8 / 8 步：发布精简元数据",
      "Step 8 of 8: Publish compact metadata. The model sees routing identity, not the full package tree.": "第 8 / 8 步：发布精简元数据。模型只看到路由身份信息，而不是整个技能包目录树。"
    },
    "patterns": [
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Start\\ with\\ declared\\ roots$",
        "第 $1 / $2 步：从声明的根目录开始"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Start\\ with\\ declared\\ roots\\.\\ Discovery\\ scope\\ is\\ runtime\\ policy,\\ not\\ a\\ package\\ property\\.$",
        "第 $1 / $2 步：从声明的根目录开始。发现范围由运行时策略决定，不是包自身属性。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Preserve\\ package\\ boundaries$",
        "第 $1 / $2 步：保留包边界"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Preserve\\ package\\ boundaries\\.\\ Inspect\\ immediate\\ skill\\ directories\\ instead\\ of\\ publishing\\ every\\ nested\\ example\\.$",
        "第 $1 / $2 步：保留包边界。检查直接子级技能目录，而非发布每个嵌套示例。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Locate\\ one\\ entry\\ point$",
        "第 $1 / $2 步：定位单一入口"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Locate\\ one\\ entry\\ point\\.\\ A\\ directory\\ becomes\\ a\\ candidate\\ only\\ when\\ SKILL\\.md\\ is\\ present\\ where\\ expected\\.$",
        "第 $1 / $2 步：定位单一入口。只有 SKILL.md 出现在预期位置，目录才成为候选。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Validate\\ before\\ visibility$",
        "第 $1 / $2 步：先校验，再展示"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Validate\\ before\\ visibility\\.\\ Malformed\\ packages\\ should\\ not\\ consume\\ catalog\\ space\\.$",
        "第 $1 / $2 步：先校验，再展示。格式错误的包不应占用目录空间。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Carry\\ source\\ identity$",
        "第 $1 / $2 步：携带来源身份"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Carry\\ source\\ identity\\.\\ Scope\\ and\\ provenance\\ make\\ duplicate\\ names\\ diagnosable\\.$",
        "第 $1 / $2 步：携带来源身份。作用域和来源信息使同名冲突可被诊断。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Resolve\\ names\\ by\\ policy$",
        "第 $1 / $2 步：按策略处理名称"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Resolve\\ names\\ by\\ policy\\.\\ Keep,\\ qualify,\\ reject,\\ or\\ choose\\ precedence\\ explicitly\\.$",
        "第 $1 / $2 步：按策略处理名称。明确选择保留、限定名称、拒绝或确定优先级。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Budget\\ the\\ exact\\ serialization$",
        "第 $1 / $2 步：按实际序列化结果计算预算"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Budget\\ the\\ exact\\ serialization\\.\\ Catalog\\ size\\ belongs\\ to\\ the\\ host\\ and\\ active\\ context\\ is\\ a\\ separate\\ budget\\.$",
        "第 $1 / $2 步：按实际序列化结果计算预算。目录大小由宿主决定，激活上下文另有预算。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Publish\\ compact\\ metadata$",
        "第 $1 / $2 步：发布精简元数据"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Publish\\ compact\\ metadata\\.\\ The\\ model\\ sees\\ routing\\ identity,\\ not\\ the\\ full\\ package\\ tree\\.$",
        "第 $1 / $2 步：发布精简元数据。模型只看到路由身份信息，而不是整个技能包目录树。"
      ]
    ],
    "preserve": []
  },
  "skill-disclosure-levels": {
    "text": {
      "Motion reduced": "已减少动画",
      "Three stacked levels show catalog metadata, the active SKILL.md body, and branch-specific resources.": "三个堆叠层级分别展示目录元数据、已激活的 SKILL.md 正文和分支专用资源。",
      "skill selected": "技能已选中",
      "branch requires detail": "分支需要详细信息",
      "Level 1: catalog metadata": "第 1 层：目录元数据",
      "name + description": "名称 + 描述",
      "Level 2: SKILL.md body": "第 2 层：SKILL.md 正文",
      "workflow + decision map": "工作流 + 决策图",
      "Level 3: supporting resources": "第 3 层：配套资源",
      "references + scripts + assets": "参考文档 + 脚本 + 资源",
      "Level 3 supplies exact detail": "第 3 层提供精确信息",
      "Only the selected branch earns references, scripts, or assets in context.": "只有已选分支所需的参考文档、脚本或资源才进入上下文。",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画",
      "Level 1 routes": "第 1 层负责路由",
      "Name and description let the model distinguish eligible skills without loading their bodies.": "名称和描述让模型区分符合条件的技能，无需加载正文。",
      "Step 1 of 3: Level 1 routes": "第 1 / 3 步：第 1 层负责路由",
      "Step 1 of 3: Level 1 routes. Name and description let the model distinguish eligible skills without loading their bodies.": "第 1 / 3 步：第 1 层负责路由。名称和描述让模型区分符合条件的技能，无需加载正文。",
      "Level 2 starts work": "第 2 层开始工作",
      "Activation loads enough procedure to choose a branch and begin safely.": "激活加载足够的流程，以选择分支并安全开始。",
      "Step 2 of 3: Level 2 starts work": "第 2 / 3 步：第 2 层开始工作",
      "Step 2 of 3: Level 2 starts work. Activation loads enough procedure to choose a branch and begin safely.": "第 2 / 3 步：第 2 层开始工作。激活加载足够的流程，以选择分支并安全开始。",
      "Step 3 of 3: Level 3 supplies exact detail": "第 3 / 3 步：第 3 层提供精确信息",
      "Step 3 of 3: Level 3 supplies exact detail. Only the selected branch earns references, scripts, or assets in context.": "第 3 / 3 步：第 3 层提供精确信息。只有已选分支所需的参考文档、脚本或资源才进入上下文。"
    },
    "patterns": [
      [
        "^Level\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ catalog\\ metadata$",
        "第 $1 层：目录元数据"
      ],
      [
        "^Level\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ SKILL\\.md\\ body$",
        "第 $1 层：SKILL.md 正文"
      ],
      [
        "^Level\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ supporting\\ resources$",
        "第 $1 层：配套资源"
      ],
      [
        "^Level\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ supplies\\ exact\\ detail$",
        "第 $1 层提供精确信息"
      ],
      [
        "^Level\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ routes$",
        "第 $1 层负责路由"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Level\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ routes$",
        "第 $1 / $2 步：第 $3 层负责路由"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Level\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ routes\\.\\ Name\\ and\\ description\\ let\\ the\\ model\\ distinguish\\ eligible\\ skills\\ without\\ loading\\ their\\ bodies\\.$",
        "第 $1 / $2 步：第 $3 层负责路由。名称和描述让模型区分符合条件的技能，无需加载正文。"
      ],
      [
        "^Level\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ starts\\ work$",
        "第 $1 层开始工作"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Level\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ starts\\ work$",
        "第 $1 / $2 步：第 $3 层开始工作"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Level\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ starts\\ work\\.\\ Activation\\ loads\\ enough\\ procedure\\ to\\ choose\\ a\\ branch\\ and\\ begin\\ safely\\.$",
        "第 $1 / $2 步：第 $3 层开始工作。激活加载足够的流程，以选择分支并安全开始。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Level\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ supplies\\ exact\\ detail$",
        "第 $1 / $2 步：第 $3 层提供精确信息"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Level\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ supplies\\ exact\\ detail\\.\\ Only\\ the\\ selected\\ branch\\ earns\\ references,\\ scripts,\\ or\\ assets\\ in\\ context\\.$",
        "第 $1 / $2 步：第 $3 层提供精确信息。只有已选分支所需的参考文档、脚本或资源才进入上下文。"
      ]
    ],
    "preserve": []
  },
  "skill-reference-map": {
    "text": {
      "Motion reduced": "已减少动画",
      "SKILL.md points directly to Python, container, documentation, and report-template references.": "SKILL.md 直接指向 Python、容器、文档和报告模板的参考资料。",
      "container": "容器",
      "docs": "文档",
      "all branches": "所有分支",
      "decision map": "决策图",
      "Python branch": "Python 分支",
      "image branch": "镜像分支",
      "documentation branch": "文档分支",
      "output contract": "输出契约",
      "Branches point one hop away": "分支引用只需跳转一次",
      "Direct links make resource reachability observable and keep unrelated guides unloaded.": "直接链接让资源可达性可被检查，也避免加载无关指南。",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画",
      "The body is the map": "正文就是地图",
      "Activation should reveal the default workflow and every load condition.": "激活应展示默认工作流和每项加载条件。",
      "Step 1 of 2: The body is the map": "第 1 / 2 步：正文就是地图",
      "Step 1 of 2: The body is the map. Activation should reveal the default workflow and every load condition.": "第 1 / 2 步：正文就是地图。激活应展示默认工作流和每项加载条件。",
      "Step 2 of 2: Branches point one hop away": "第 2 / 2 步：分支引用只需跳转一次",
      "Step 2 of 2: Branches point one hop away. Direct links make resource reachability observable and keep unrelated guides unloaded.": "第 2 / 2 步：分支引用只需跳转一次。直接链接让资源可达性可被检查，也避免加载无关指南。"
    },
    "patterns": [
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ The\\ body\\ is\\ the\\ map$",
        "第 $1 / $2 步：正文就是地图"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ The\\ body\\ is\\ the\\ map\\.\\ Activation\\ should\\ reveal\\ the\\ default\\ workflow\\ and\\ every\\ load\\ condition\\.$",
        "第 $1 / $2 步：正文就是地图。激活应展示默认工作流和每项加载条件。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Branches\\ point\\ one\\ hop\\ away$",
        "第 $1 / $2 步：分支引用只需跳转一次"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Branches\\ point\\ one\\ hop\\ away\\.\\ Direct\\ links\\ make\\ resource\\ reachability\\ observable\\ and\\ keep\\ unrelated\\ guides\\ unloaded\\.$",
        "第 $1 / $2 步：分支引用只需跳转一次。直接链接让资源可达性可被检查，也避免加载无关指南。"
      ]
    ],
    "preserve": []
  },
  "skill-resource-containment": {
    "text": {
      "Motion reduced": "已减少动画",
      "A decision tree rejects absolute paths, parent traversal, symlink escape, wrong file types, and oversized resources.": "决策树拒绝绝对路径、父目录穿越、符号链接越界、错误文件类型和超大资源。",
      "yes": "是",
      "Requested path": "请求路径",
      "relative package": "相对于技能包",
      "input": "输入",
      "Absolute or parent": "绝对路径或父目录",
      "escape?": "越界？",
      "Reject": "拒绝",
      "invalid input": "无效输入",
      "shape": "结构",
      "Resolve path": "解析路径",
      "real package root": "真实包根目录",
      "Target under root?": "目标位于根目录内？",
      "after symlinks": "解析符号链接后",
      "escaped root": "已越出根目录",
      "Expected file": "文件符合预期",
      "type?": "类型？",
      "regular allowed file": "允许的普通文件",
      "wrong or": "错误类型或",
      "special file": "特殊文件",
      "Within size limit?": "符合大小限制？",
      "bounded context read": "限制上下文读取量",
      "oversized resource": "资源过大",
      "Load resource": "加载资源",
      "record reason + bytes": "记录原因 + 字节数",
      "Load with evidence or reject": "有据加载，否则拒绝",
      "Record the resource, branch reason, and byte count without logging secrets.": "记录资源、分支加载理由和字节数，不记录机密。",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画",
      "Start with an untrusted relative path": "从不可信的相对路径开始",
      "The request is data until containment proves otherwise.": "请求先作为数据处理，直到范围约束证明它可用。",
      "Step 1 of 7: Start with an untrusted relative path": "第 1 / 7 步：从不可信的相对路径开始",
      "Step 1 of 7: Start with an untrusted relative path. The request is data until containment proves otherwise.": "第 1 / 7 步：从不可信的相对路径开始。请求先作为数据处理，直到范围约束证明它可用。",
      "Reject obvious escape syntax": "拒绝明显越界语法",
      "Absolute paths and parent segments never reach filesystem resolution.": "绝对路径和父目录片段不能进入文件系统解析。",
      "Step 2 of 7: Reject obvious escape syntax": "第 2 / 7 步：拒绝明显越界语法",
      "Step 2 of 7: Reject obvious escape syntax. Absolute paths and parent segments never reach filesystem resolution.": "第 2 / 7 步：拒绝明显越界语法。绝对路径和父目录片段不能进入文件系统解析。",
      "Resolve against the package root": "相对于包根目录解析",
      "String prefixes cannot detect symlink or normalization escapes.": "字符串前缀不能识别符号链接或规范化导致的越界。",
      "Step 3 of 7: Resolve against the package root": "第 3 / 7 步：相对于包根目录解析",
      "Step 3 of 7: Resolve against the package root. String prefixes cannot detect symlink or normalization escapes.": "第 3 / 7 步：相对于包根目录解析。字符串前缀不能识别符号链接或规范化导致的越界。",
      "Compare resolved locations": "比较解析后的路径",
      "The real target must remain inside the real package root.": "真实目标必须留在真实包根目录内。",
      "Step 4 of 7: Compare resolved locations": "第 4 / 7 步：比较解析后的路径",
      "Step 4 of 7: Compare resolved locations. The real target must remain inside the real package root.": "第 4 / 7 步：比较解析后的路径。真实目标必须留在真实包根目录内。",
      "Check operation and file type": "检查操作和文件类型",
      "Containment alone does not make sockets, devices, or wrong suffixes valid.": "仅满足范围约束，不代表套接字、设备或错误后缀有效。",
      "Step 5 of 7: Check operation and file type": "第 5 / 7 步：检查操作和文件类型",
      "Step 5 of 7: Check operation and file type. Containment alone does not make sockets, devices, or wrong suffixes valid.": "第 5 / 7 步：检查操作和文件类型。仅满足范围约束，不代表套接字、设备或错误后缀有效。",
      "Bound context admission": "限制进入上下文的内容",
      "Reject unexpected types and files above the declared size limit.": "拒绝意外类型和超过声明大小限制的文件。",
      "Step 6 of 7: Bound context admission": "第 6 / 7 步：限制进入上下文的内容",
      "Step 6 of 7: Bound context admission. Reject unexpected types and files above the declared size limit.": "第 6 / 7 步：限制进入上下文的内容。拒绝意外类型和超过声明大小限制的文件。",
      "Step 7 of 7: Load with evidence or reject": "第 7 / 7 步：有据加载，否则拒绝",
      "Step 7 of 7: Load with evidence or reject. Record the resource, branch reason, and byte count without logging secrets.": "第 7 / 7 步：有据加载，否则拒绝。记录资源、分支加载理由和字节数，不记录机密。"
    },
    "patterns": [
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Start\\ with\\ an\\ untrusted\\ relative\\ path$",
        "第 $1 / $2 步：从不可信的相对路径开始"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Start\\ with\\ an\\ untrusted\\ relative\\ path\\.\\ The\\ request\\ is\\ data\\ until\\ containment\\ proves\\ otherwise\\.$",
        "第 $1 / $2 步：从不可信的相对路径开始。请求先作为数据处理，直到范围约束证明它可用。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Reject\\ obvious\\ escape\\ syntax$",
        "第 $1 / $2 步：拒绝明显越界语法"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Reject\\ obvious\\ escape\\ syntax\\.\\ Absolute\\ paths\\ and\\ parent\\ segments\\ never\\ reach\\ filesystem\\ resolution\\.$",
        "第 $1 / $2 步：拒绝明显越界语法。绝对路径和父目录片段不能进入文件系统解析。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Resolve\\ against\\ the\\ package\\ root$",
        "第 $1 / $2 步：相对于包根目录解析"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Resolve\\ against\\ the\\ package\\ root\\.\\ String\\ prefixes\\ cannot\\ detect\\ symlink\\ or\\ normalization\\ escapes\\.$",
        "第 $1 / $2 步：相对于包根目录解析。字符串前缀不能识别符号链接或规范化导致的越界。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Compare\\ resolved\\ locations$",
        "第 $1 / $2 步：比较解析后的路径"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Compare\\ resolved\\ locations\\.\\ The\\ real\\ target\\ must\\ remain\\ inside\\ the\\ real\\ package\\ root\\.$",
        "第 $1 / $2 步：比较解析后的路径。真实目标必须留在真实包根目录内。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Check\\ operation\\ and\\ file\\ type$",
        "第 $1 / $2 步：检查操作和文件类型"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Check\\ operation\\ and\\ file\\ type\\.\\ Containment\\ alone\\ does\\ not\\ make\\ sockets,\\ devices,\\ or\\ wrong\\ suffixes\\ valid\\.$",
        "第 $1 / $2 步：检查操作和文件类型。仅满足范围约束，不代表套接字、设备或错误后缀有效。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Bound\\ context\\ admission$",
        "第 $1 / $2 步：限制进入上下文的内容"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Bound\\ context\\ admission\\.\\ Reject\\ unexpected\\ types\\ and\\ files\\ above\\ the\\ declared\\ size\\ limit\\.$",
        "第 $1 / $2 步：限制进入上下文的内容。拒绝意外类型和超过声明大小限制的文件。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Load\\ with\\ evidence\\ or\\ reject$",
        "第 $1 / $2 步：有据加载，否则拒绝"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Load\\ with\\ evidence\\ or\\ reject\\.\\ Record\\ the\\ resource,\\ branch\\ reason,\\ and\\ byte\\ count\\ without\\ logging\\ secrets\\.$",
        "第 $1 / $2 步：有据加载，否则拒绝。记录资源、分支加载理由和字节数，不记录机密。"
      ]
    ],
    "preserve": [
      {
        "text": "../ or /root",
        "reason": "路径边界示例"
      }
    ]
  },
  "skill-invocation-stages": {
    "text": {
      "Motion reduced": "已减少动画",
      "A state path from discovered to completed with denied, not-selected, and blocked exits.": "状态路径从发现推进到完成，并包含拒绝、未选中和受阻的出口。",
      "blocked by policy": "被策略阻止",
      "router abstains": "路由器放弃选择",
      "missing authority": "缺少授权",
      "Discovered": "已发现",
      "package exists": "包已存在",
      "Eligible": "符合条件",
      "actor + policy": "执行者 + 策略",
      "allow": "允许",
      "Selected": "已选中",
      "host identity or": "宿主身份或",
      "description": "描述",
      "Activated": "已激活",
      "body in context": "正文已入上下文",
      "Executing": "执行中",
      "work begins": "工作开始",
      "Completed": "已完成",
      "output": "输出",
      "verified": "已验证",
      "Denied": "已拒绝",
      "actor or policy": "执行者或策略",
      "blocks": "阻止",
      "Not selected": "未选中",
      "threshold not met": "未达到阈值",
      "Blocked": "受阻",
      "capability or approval": "能力或批准",
      "absent": "缺失",
      "Independent verification turns an attempted workflow into a completed one.": "独立验证让已尝试的工作流成为已完成的工作流。",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画",
      "The package exists in a configured scope. No actor has used it yet.": "包已存在于配置范围内，尚无执行者使用它。",
      "Step 1 of 6: Discovered": "第 1 / 6 步：已发现",
      "Step 1 of 6: Discovered. The package exists in a configured scope. No actor has used it yet.": "第 1 / 6 步：已发现。包已存在于配置范围内，尚无执行者使用它。",
      "Eligible or denied": "符合条件或被拒绝",
      "Policy decides whether this actor may request the skill.": "策略决定当前执行者能否请求该技能。",
      "Step 2 of 6: Eligible or denied": "第 2 / 6 步：符合条件或被拒绝",
      "Step 2 of 6: Eligible or denied. Policy decides whether this actor may request the skill.": "第 2 / 6 步：符合条件或被拒绝。策略决定当前执行者能否请求该技能。",
      "Selected or not selected": "选中或未选中",
      "A host resolves explicit identity. Model routing compares catalog descriptions and may abstain.": "宿主解析显式身份；模型路由比较目录描述，也可以放弃。",
      "Step 3 of 6: Selected or not selected": "第 3 / 6 步：选中或未选中",
      "Step 3 of 6: Selected or not selected. A host resolves explicit identity. Model routing compares catalog descriptions and may abstain.": "第 3 / 6 步：选中或未选中。宿主解析显式身份；模型路由比较目录描述，也可以放弃。",
      "The body enters working context. This is still not tool execution.": "正文进入工作上下文，这仍不等于执行工具。",
      "Step 4 of 6: Activated": "第 4 / 6 步：已激活",
      "Step 4 of 6: Activated. The body enters working context. This is still not tool execution.": "第 4 / 6 步：已激活。正文进入工作上下文，这仍不等于执行工具。",
      "Executing or blocked": "执行中或受阻",
      "Work begins only when capability, permission, and approval are available.": "只有能力、权限和批准均可用时，工作才开始。",
      "Step 5 of 6: Executing or blocked": "第 5 / 6 步：执行中或受阻",
      "Step 5 of 6: Executing or blocked. Work begins only when capability, permission, and approval are available.": "第 5 / 6 步：执行中或受阻。只有能力、权限和批准均可用时，工作才开始。",
      "Step 6 of 6: Completed": "第 6 / 6 步：已完成",
      "Step 6 of 6: Completed. Independent verification turns an attempted workflow into a completed one.": "第 6 / 6 步：已完成。独立验证让已尝试的工作流成为已完成的工作流。"
    },
    "patterns": [
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Discovered$",
        "第 $1 / $2 步：已发现"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Discovered\\.\\ The\\ package\\ exists\\ in\\ a\\ configured\\ scope\\.\\ No\\ actor\\ has\\ used\\ it\\ yet\\.$",
        "第 $1 / $2 步：已发现。包已存在于配置范围内，尚无执行者使用它。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Eligible\\ or\\ denied$",
        "第 $1 / $2 步：符合条件或被拒绝"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Eligible\\ or\\ denied\\.\\ Policy\\ decides\\ whether\\ this\\ actor\\ may\\ request\\ the\\ skill\\.$",
        "第 $1 / $2 步：符合条件或被拒绝。策略决定当前执行者能否请求该技能。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Selected\\ or\\ not\\ selected$",
        "第 $1 / $2 步：选中或未选中"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Selected\\ or\\ not\\ selected\\.\\ A\\ host\\ resolves\\ explicit\\ identity\\.\\ Model\\ routing\\ compares\\ catalog\\ descriptions\\ and\\ may\\ abstain\\.$",
        "第 $1 / $2 步：选中或未选中。宿主解析显式身份；模型路由比较目录描述，也可以放弃。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Activated$",
        "第 $1 / $2 步：已激活"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Activated\\.\\ The\\ body\\ enters\\ working\\ context\\.\\ This\\ is\\ still\\ not\\ tool\\ execution\\.$",
        "第 $1 / $2 步：已激活。正文进入工作上下文，这仍不等于执行工具。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Executing\\ or\\ blocked$",
        "第 $1 / $2 步：执行中或受阻"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Executing\\ or\\ blocked\\.\\ Work\\ begins\\ only\\ when\\ capability,\\ permission,\\ and\\ approval\\ are\\ available\\.$",
        "第 $1 / $2 步：执行中或受阻。只有能力、权限和批准均可用时，工作才开始。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Completed$",
        "第 $1 / $2 步：已完成"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Completed\\.\\ Independent\\ verification\\ turns\\ an\\ attempted\\ workflow\\ into\\ a\\ completed\\ one\\.$",
        "第 $1 / $2 步：已完成。独立验证让已尝试的工作流成为已完成的工作流。"
      ]
    ],
    "preserve": []
  },
  "skill-routing-abstention": {
    "text": {
      "Motion reduced": "已减少动画",
      "A request passes actor eligibility and description comparison before a clear-match decision can activate, ask, or abstain.": "请求先经过执行者资格和描述比较，再由明确匹配的决策选择激活、询问或放弃。",
      "yes": "是",
      "ambiguous": "有歧义",
      "no match": "没有匹配项",
      "User request": "用户请求",
      "task context": "任务上下文",
      "Filter eligibility": "筛选资格",
      "actor + host policy": "执行者 + 宿主策略",
      "Compare descriptions": "比较描述",
      "eligible catalog only": "仅限符合条件的目录项",
      "One clear match?": "唯一明确匹配？",
      "threshold + margin": "阈值 + 分差",
      "Activate skill": "激活技能",
      "clear eligible winner": "符合条件的明确胜出者",
      "Ask or reason normally": "询问或正常推理",
      "ambiguous near match": "近似匹配有歧义",
      "Do not activate": "不激活",
      "Activate, ask, or abstain": "激活、询问或放弃",
      "No selection is a deliberate result when evidence is weak.": "证据不足时，不选择也是有意的结果。",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画",
      "Begin with the request": "从请求开始",
      "Routing should preserve the task, not merely count keywords.": "路由应保留任务本意，而非只计算关键词。",
      "Step 1 of 5: Begin with the request": "第 1 / 5 步：从请求开始",
      "Step 1 of 5: Begin with the request. Routing should preserve the task, not merely count keywords.": "第 1 / 5 步：从请求开始。路由应保留任务本意，而非只计算关键词。",
      "Filter by authority first": "先按授权筛选",
      "A blocked top match must not suppress a lower-scored eligible candidate.": "得分最高但被阻止的匹配项，不应压制得分稍低却符合条件的候选。",
      "Step 2 of 5: Filter by authority first": "第 2 / 5 步：先按授权筛选",
      "Step 2 of 5: Filter by authority first. A blocked top match must not suppress a lower-scored eligible candidate.": "第 2 / 5 步：先按授权筛选。得分最高但被阻止的匹配项，不应压制得分稍低却符合条件的候选。",
      "Compare bounded descriptions": "比较有界描述",
      "Capability, trigger, context, and exclusions shape relevance.": "能力、触发条件、上下文和排除条件共同决定相关性。",
      "Step 3 of 5: Compare bounded descriptions": "第 3 / 5 步：比较有界描述",
      "Step 3 of 5: Compare bounded descriptions. Capability, trigger, context, and exclusions shape relevance.": "第 3 / 5 步：比较有界描述。能力、触发条件、上下文和排除条件共同决定相关性。",
      "Require a clear winner": "要求明确胜出者",
      "The best eligible score still needs a threshold and ambiguity margin.": "符合条件的最高分仍须满足阈值和歧义分差。",
      "Step 4 of 5: Require a clear winner": "第 4 / 5 步：要求明确胜出者",
      "Step 4 of 5: Require a clear winner. The best eligible score still needs a threshold and ambiguity margin.": "第 4 / 5 步：要求明确胜出者。符合条件的最高分仍须满足阈值和歧义分差。",
      "Step 5 of 5: Activate, ask, or abstain": "第 5 / 5 步：激活、询问或放弃",
      "Step 5 of 5: Activate, ask, or abstain. No selection is a deliberate result when evidence is weak.": "第 5 / 5 步：激活、询问或放弃。证据不足时，不选择也是有意的结果。"
    },
    "patterns": [
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Begin\\ with\\ the\\ request$",
        "第 $1 / $2 步：从请求开始"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Begin\\ with\\ the\\ request\\.\\ Routing\\ should\\ preserve\\ the\\ task,\\ not\\ merely\\ count\\ keywords\\.$",
        "第 $1 / $2 步：从请求开始。路由应保留任务本意，而非只计算关键词。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Filter\\ by\\ authority\\ first$",
        "第 $1 / $2 步：先按授权筛选"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Filter\\ by\\ authority\\ first\\.\\ A\\ blocked\\ top\\ match\\ must\\ not\\ suppress\\ a\\ lower\\-scored\\ eligible\\ candidate\\.$",
        "第 $1 / $2 步：先按授权筛选。得分最高但被阻止的匹配项，不应压制得分稍低却符合条件的候选。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Compare\\ bounded\\ descriptions$",
        "第 $1 / $2 步：比较有界描述"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Compare\\ bounded\\ descriptions\\.\\ Capability,\\ trigger,\\ context,\\ and\\ exclusions\\ shape\\ relevance\\.$",
        "第 $1 / $2 步：比较有界描述。能力、触发条件、上下文和排除条件共同决定相关性。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Require\\ a\\ clear\\ winner$",
        "第 $1 / $2 步：要求明确胜出者"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Require\\ a\\ clear\\ winner\\.\\ The\\ best\\ eligible\\ score\\ still\\ needs\\ a\\ threshold\\ and\\ ambiguity\\ margin\\.$",
        "第 $1 / $2 步：要求明确胜出者。符合条件的最高分仍须满足阈值和歧义分差。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Activate,\\ ask,\\ or\\ abstain$",
        "第 $1 / $2 步：激活、询问或放弃"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Activate,\\ ask,\\ or\\ abstain\\.\\ No\\ selection\\ is\\ a\\ deliberate\\ result\\ when\\ evidence\\ is\\ weak\\.$",
        "第 $1 / $2 步：激活、询问或放弃。证据不足时，不选择也是有意的结果。"
      ]
    ],
    "preserve": []
  },
  "skill-argument-boundaries": {
    "text": {
      "Motion reduced": "已减少动画",
      "User text becomes parsed arguments, skill context, a typed tool call, and validated execution input.": "用户文本依次成为解析后的参数、技能上下文、有类型的工具调用和已校验的执行输入。",
      "text becomes data, then typed input": "文本先变成数据，再成为有类型的输入",
      "User text": "用户文本",
      "quoted request": "带引号的请求",
      "Host parser": "宿主解析器",
      "syntax + quoting": "语法 + 引用规则",
      "Bound arguments": "已绑定参数",
      "validated values": "已校验的值",
      "Skill context": "技能上下文",
      "procedure sees data": "流程读取数据",
      "Typed tool call": "有类型的工具调用",
      "schema validates": "schema 校验",
      "again": "再次",
      "Typed tools validate again": "有类型的工具再次校验",
      "Crossing into execution requires a schema and a bounded argument vector.": "进入执行边界时，必须有 schema 和有界参数向量。",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画",
      "User text is not a command string": "用户文本不是命令字符串",
      "Keep the original intent and quoting visible.": "保留原始意图和引用规则，使其可见。",
      "Step 1 of 5: User text is not a command string": "第 1 / 5 步：用户文本不是命令字符串",
      "Step 1 of 5: User text is not a command string. Keep the original intent and quoting visible.": "第 1 / 5 步：用户文本不是命令字符串。保留原始意图和引用规则，使其可见。",
      "The host owns command syntax": "宿主拥有命令语法",
      "Slash commands, variables, and quoting belong to the adapter.": "斜杠命令、变量和引用规则属于适配器。",
      "Step 2 of 5: The host owns command syntax": "第 2 / 5 步：宿主拥有命令语法",
      "Step 2 of 5: The host owns command syntax. Slash commands, variables, and quoting belong to the adapter.": "第 2 / 5 步：宿主拥有命令语法。斜杠命令、变量和引用规则属于适配器。",
      "Bind and validate values": "绑定并校验值",
      "Required arguments, defaults, and allowed shapes become explicit data.": "必需参数、默认值和允许的结构成为显式数据。",
      "Step 3 of 5: Bind and validate values": "第 3 / 5 步：绑定并校验值",
      "Step 3 of 5: Bind and validate values. Required arguments, defaults, and allowed shapes become explicit data.": "第 3 / 5 步：绑定并校验值。必需参数、默认值和允许的结构成为显式数据。",
      "Instructions consume data": "指令读取数据",
      "The skill chooses a branch without interpolating raw text into a shell.": "技能选择分支，不把原始文本插入 shell。",
      "Step 4 of 5: Instructions consume data": "第 4 / 5 步：指令读取数据",
      "Step 4 of 5: Instructions consume data. The skill chooses a branch without interpolating raw text into a shell.": "第 4 / 5 步：指令读取数据。技能选择分支，不把原始文本插入 shell。",
      "Step 5 of 5: Typed tools validate again": "第 5 / 5 步：有类型的工具再次校验",
      "Step 5 of 5: Typed tools validate again. Crossing into execution requires a schema and a bounded argument vector.": "第 5 / 5 步：有类型的工具再次校验。进入执行边界时，必须有 schema 和有界参数向量。"
    },
    "patterns": [
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ User\\ text\\ is\\ not\\ a\\ command\\ string$",
        "第 $1 / $2 步：用户文本不是命令字符串"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ User\\ text\\ is\\ not\\ a\\ command\\ string\\.\\ Keep\\ the\\ original\\ intent\\ and\\ quoting\\ visible\\.$",
        "第 $1 / $2 步：用户文本不是命令字符串。保留原始意图和引用规则，使其可见。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ The\\ host\\ owns\\ command\\ syntax$",
        "第 $1 / $2 步：宿主拥有命令语法"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ The\\ host\\ owns\\ command\\ syntax\\.\\ Slash\\ commands,\\ variables,\\ and\\ quoting\\ belong\\ to\\ the\\ adapter\\.$",
        "第 $1 / $2 步：宿主拥有命令语法。斜杠命令、变量和引用规则属于适配器。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Bind\\ and\\ validate\\ values$",
        "第 $1 / $2 步：绑定并校验值"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Bind\\ and\\ validate\\ values\\.\\ Required\\ arguments,\\ defaults,\\ and\\ allowed\\ shapes\\ become\\ explicit\\ data\\.$",
        "第 $1 / $2 步：绑定并校验值。必需参数、默认值和允许的结构成为显式数据。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Instructions\\ consume\\ data$",
        "第 $1 / $2 步：指令读取数据"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Instructions\\ consume\\ data\\.\\ The\\ skill\\ chooses\\ a\\ branch\\ without\\ interpolating\\ raw\\ text\\ into\\ a\\ shell\\.$",
        "第 $1 / $2 步：指令读取数据。技能选择分支，不把原始文本插入 shell。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Typed\\ tools\\ validate\\ again$",
        "第 $1 / $2 步：有类型的工具再次校验"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Typed\\ tools\\ validate\\ again\\.\\ Crossing\\ into\\ execution\\ requires\\ a\\ schema\\ and\\ a\\ bounded\\ argument\\ vector\\.$",
        "第 $1 / $2 步：有类型的工具再次校验。进入执行边界时，必须有 schema 和有界参数向量。"
      ]
    ],
    "preserve": []
  },
  "skill-host-adapter": {
    "text": {
      "Motion reduced": "已减少动画",
      "A portable skill bundle and a host adapter contribute different inputs to one runtime activation boundary.": "可移植技能包和宿主适配器分别为同一个运行时激活边界提供输入。",
      "portable package": "可移植的包",
      "host adapter": "宿主适配器",
      "Portable bundle": "可移植包",
      "cross-host directory": "跨宿主目录",
      "core procedure": "核心流程",
      "branch detail": "分支细节",
      "helpers": "辅助程序",
      "Host adapter": "宿主适配器",
      "runtime-specific code": "运行时专用代码",
      "Discovery path": "发现路径",
      "where to search": "搜索位置",
      "Activation API": "激活 API",
      "how to load": "加载方式",
      "Invocation": "调用",
      "policy": "策略",
      "who may select": "谁可以选择",
      "Argument binding": "参数绑定",
      "host syntax": "宿主语法",
      "Runtime activation": "运行时激活",
      "core + adapter semantics": "核心 + 适配器语义",
      "Compose at the runtime boundary": "在运行时边界组合",
      "The adapter activates the portable bundle without rewriting its core claims.": "适配器激活可移植包，不改写其核心主张。",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画",
      "Preserve a portable package": "保持包可移植",
      "The entry file and companions should remain intelligible without one host.": "入口文件和配套文件不应依赖单一宿主才能理解。",
      "Step 1 of 5: Preserve a portable package": "第 1 / 5 步：保持包可移植",
      "Step 1 of 5: Preserve a portable package. The entry file and companions should remain intelligible without one host.": "第 1 / 5 步：保持包可移植。入口文件和配套文件不应依赖单一宿主才能理解。",
      "Keep core responsibilities together": "将核心职责放在一起",
      "Procedure, references, and helpers travel as one directory.": "流程、参考资料和辅助程序作为一个目录共同分发。",
      "Step 2 of 5: Keep core responsibilities together": "第 2 / 5 步：将核心职责放在一起",
      "Step 2 of 5: Keep core responsibilities together. Procedure, references, and helpers travel as one directory.": "第 2 / 5 步：将核心职责放在一起。流程、参考资料和辅助程序作为一个目录共同分发。",
      "Name the adapter": "明确适配器",
      "Runtime semantics need an explicit compatibility layer.": "运行时语义需要显式兼容层。",
      "Step 3 of 5: Name the adapter": "第 3 / 5 步：明确适配器",
      "Step 3 of 5: Name the adapter. Runtime semantics need an explicit compatibility layer.": "第 3 / 5 步：明确适配器。运行时语义需要显式兼容层。",
      "Host behavior stays host-specific": "宿主行为留在宿主层",
      "Discovery, activation APIs, policy fields, and argument syntax belong here.": "发现、激活 API、策略字段和参数语法都属于这里。",
      "Step 4 of 5: Host behavior stays host-specific": "第 4 / 5 步：宿主行为留在宿主层",
      "Step 4 of 5: Host behavior stays host-specific. Discovery, activation APIs, policy fields, and argument syntax belong here.": "第 4 / 5 步：宿主行为留在宿主层。发现、激活 API、策略字段和参数语法都属于这里。",
      "Step 5 of 5: Compose at the runtime boundary": "第 5 / 5 步：在运行时边界组合",
      "Step 5 of 5: Compose at the runtime boundary. The adapter activates the portable bundle without rewriting its core claims.": "第 5 / 5 步：在运行时边界组合。适配器激活可移植包，不改写其核心主张。"
    },
    "patterns": [
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Preserve\\ a\\ portable\\ package$",
        "第 $1 / $2 步：保持包可移植"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Preserve\\ a\\ portable\\ package\\.\\ The\\ entry\\ file\\ and\\ companions\\ should\\ remain\\ intelligible\\ without\\ one\\ host\\.$",
        "第 $1 / $2 步：保持包可移植。入口文件和配套文件不应依赖单一宿主才能理解。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Keep\\ core\\ responsibilities\\ together$",
        "第 $1 / $2 步：将核心职责放在一起"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Keep\\ core\\ responsibilities\\ together\\.\\ Procedure,\\ references,\\ and\\ helpers\\ travel\\ as\\ one\\ directory\\.$",
        "第 $1 / $2 步：将核心职责放在一起。流程、参考资料和辅助程序作为一个目录共同分发。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Name\\ the\\ adapter$",
        "第 $1 / $2 步：明确适配器"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Name\\ the\\ adapter\\.\\ Runtime\\ semantics\\ need\\ an\\ explicit\\ compatibility\\ layer\\.$",
        "第 $1 / $2 步：明确适配器。运行时语义需要显式兼容层。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Host\\ behavior\\ stays\\ host\\-specific$",
        "第 $1 / $2 步：宿主行为留在宿主层"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Host\\ behavior\\ stays\\ host\\-specific\\.\\ Discovery,\\ activation\\ APIs,\\ policy\\ fields,\\ and\\ argument\\ syntax\\ belong\\ here\\.$",
        "第 $1 / $2 步：宿主行为留在宿主层。发现、激活 API、策略字段和参数语法都属于这里。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Compose\\ at\\ the\\ runtime\\ boundary$",
        "第 $1 / $2 步：在运行时边界组合"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Compose\\ at\\ the\\ runtime\\ boundary\\.\\ The\\ adapter\\ activates\\ the\\ portable\\ bundle\\ without\\ rewriting\\ its\\ core\\ claims\\.$",
        "第 $1 / $2 步：在运行时边界组合。适配器激活可移植包，不改写其核心主张。"
      ]
    ],
    "preserve": [
      {
        "text": "references/",
        "reason": "文件路径"
      },
      {
        "text": "scripts/",
        "reason": "文件路径"
      }
    ]
  },
  "skill-authority-chain": {
    "text": {
      "Motion reduced": "已减少动画",
      "An activated skill influences a model proposal that must pass capability, permission, approval, isolation, and verification.": "已激活的技能影响模型提议；提议仍须通过能力、权限、批准、隔离和验证。",
      "allowed or granted": "允许或已获授权",
      "denied": "已拒绝",
      "Activated": "已激活",
      "skill": "技能",
      "procedural": "流程性",
      "context": "上下文",
      "Model proposal": "模型提议",
      "structured action": "结构化行动",
      "operation exists": "操作确实存在",
      "Permission": "权限",
      "policy": "策略",
      "actor + target": "执行者 + 目标",
      "Approval needed?": "需要批准？",
      "consequence gate": "后果关卡",
      "Isolated": "隔离的",
      "executor": "执行器",
      "bounded reach": "访问范围有界",
      "Stop and report": "停止并报告",
      "approval denied": "批准被拒绝",
      "Observation": "观察结果",
      "execution": "执行",
      "evidence": "证据",
      "Verification": "验证",
      "gate": "关卡",
      "contract passes": "契约检查通过",
      "Verify independently": "独立验证",
      "Containment and authorization do not prove the result is correct.": "限制范围和获得授权，并不能证明结果正确。",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画",
      "Activation changes context": "激活改变上下文",
      "The skill can influence a proposal but grants no authority.": "技能能影响提议，但不授予任何权限。",
      "Step 1 of 8: Activation changes context": "第 1 / 8 步：激活改变上下文",
      "Step 1 of 8: Activation changes context. The skill can influence a proposal but grants no authority.": "第 1 / 8 步：激活改变上下文。技能能影响提议，但不授予任何权限。",
      "Represent the action": "明确表示行动",
      "Review argv, cwd, paths, network, credentials, and side effects before execution.": "执行前审查 argv、cwd、路径、网络、凭证和副作用。",
      "Step 2 of 8: Represent the action": "第 2 / 8 步：明确表示行动",
      "Step 2 of 8: Represent the action. Review argv, cwd, paths, network, credentials, and side effects before execution.": "第 2 / 8 步：明确表示行动。执行前审查 argv、cwd、路径、网络、凭证和副作用。",
      "Expose only needed capabilities": "只提供所需能力",
      "An absent operation cannot be requested through the host.": "宿主不存在的操作不能被请求。",
      "Step 3 of 8: Expose only needed capabilities": "第 3 / 8 步：只提供所需能力",
      "Step 3 of 8: Expose only needed capabilities. An absent operation cannot be requested through the host.": "第 3 / 8 步：只提供所需能力。宿主不存在的操作不能被请求。",
      "Authorize actor and target": "授权执行者与目标",
      "Permission policy constrains this operation and scope.": "权限策略约束当前操作和范围。",
      "Step 4 of 8: Authorize actor and target": "第 4 / 8 步：授权执行者与目标",
      "Step 4 of 8: Authorize actor and target. Permission policy constrains this operation and scope.": "第 4 / 8 步：授权执行者与目标。权限策略约束当前操作和范围。",
      "Ask for the actual consequence": "为真实后果请求批准",
      "Approval is meaningful only when target and effect are concrete.": "只有目标和影响具体明确，批准才有意义。",
      "Step 5 of 8: Ask for the actual consequence": "第 5 / 8 步：为真实后果请求批准",
      "Step 5 of 8: Ask for the actual consequence. Approval is meaningful only when target and effect are concrete.": "第 5 / 8 步：为真实后果请求批准。只有目标和影响具体明确，批准才有意义。",
      "Execute or stop": "执行或停止",
      "Granted authority still runs inside isolation. Denial produces no side effect.": "获得授权后仍在隔离范围内运行；拒绝时不产生副作用。",
      "Step 6 of 8: Execute or stop": "第 6 / 8 步：执行或停止",
      "Step 6 of 8: Execute or stop. Granted authority still runs inside isolation. Denial produces no side effect.": "第 6 / 8 步：执行或停止。获得授权后仍在隔离范围内运行；拒绝时不产生副作用。",
      "Capture observations": "收集观察结果",
      "Exit codes, diffs, files, and tool results become evidence.": "退出码、差异、文件和工具结果都成为证据。",
      "Step 7 of 8: Capture observations": "第 7 / 8 步：收集观察结果",
      "Step 7 of 8: Capture observations. Exit codes, diffs, files, and tool results become evidence.": "第 7 / 8 步：收集观察结果。退出码、差异、文件和工具结果都成为证据。",
      "Step 8 of 8: Verify independently": "第 8 / 8 步：独立验证",
      "Step 8 of 8: Verify independently. Containment and authorization do not prove the result is correct.": "第 8 / 8 步：独立验证。限制范围和获得授权，并不能证明结果正确。"
    },
    "patterns": [
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Activation\\ changes\\ context$",
        "第 $1 / $2 步：激活改变上下文"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Activation\\ changes\\ context\\.\\ The\\ skill\\ can\\ influence\\ a\\ proposal\\ but\\ grants\\ no\\ authority\\.$",
        "第 $1 / $2 步：激活改变上下文。技能能影响提议，但不授予任何权限。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Represent\\ the\\ action$",
        "第 $1 / $2 步：明确表示行动"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Represent\\ the\\ action\\.\\ Review\\ argv,\\ cwd,\\ paths,\\ network,\\ credentials,\\ and\\ side\\ effects\\ before\\ execution\\.$",
        "第 $1 / $2 步：明确表示行动。执行前审查 argv、cwd、路径、网络、凭证和副作用。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Expose\\ only\\ needed\\ capabilities$",
        "第 $1 / $2 步：只提供所需能力"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Expose\\ only\\ needed\\ capabilities\\.\\ An\\ absent\\ operation\\ cannot\\ be\\ requested\\ through\\ the\\ host\\.$",
        "第 $1 / $2 步：只提供所需能力。宿主不存在的操作不能被请求。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Authorize\\ actor\\ and\\ target$",
        "第 $1 / $2 步：授权执行者与目标"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Authorize\\ actor\\ and\\ target\\.\\ Permission\\ policy\\ constrains\\ this\\ operation\\ and\\ scope\\.$",
        "第 $1 / $2 步：授权执行者与目标。权限策略约束当前操作和范围。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Ask\\ for\\ the\\ actual\\ consequence$",
        "第 $1 / $2 步：为真实后果请求批准"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Ask\\ for\\ the\\ actual\\ consequence\\.\\ Approval\\ is\\ meaningful\\ only\\ when\\ target\\ and\\ effect\\ are\\ concrete\\.$",
        "第 $1 / $2 步：为真实后果请求批准。只有目标和影响具体明确，批准才有意义。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Execute\\ or\\ stop$",
        "第 $1 / $2 步：执行或停止"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Execute\\ or\\ stop\\.\\ Granted\\ authority\\ still\\ runs\\ inside\\ isolation\\.\\ Denial\\ produces\\ no\\ side\\ effect\\.$",
        "第 $1 / $2 步：执行或停止。获得授权后仍在隔离范围内运行；拒绝时不产生副作用。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Capture\\ observations$",
        "第 $1 / $2 步：收集观察结果"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Capture\\ observations\\.\\ Exit\\ codes,\\ diffs,\\ files,\\ and\\ tool\\ results\\ become\\ evidence\\.$",
        "第 $1 / $2 步：收集观察结果。退出码、差异、文件和工具结果都成为证据。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Verify\\ independently$",
        "第 $1 / $2 步：独立验证"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Verify\\ independently\\.\\ Containment\\ and\\ authorization\\ do\\ not\\ prove\\ the\\ result\\ is\\ correct\\.$",
        "第 $1 / $2 步：独立验证。限制范围和获得授权，并不能证明结果正确。"
      ]
    ],
    "preserve": []
  },
  "skill-trust-surface": {
    "text": {
      "Motion reduced": "已减少动画",
      "Package instructions, references, task content, scripts, host tools, files, network, credentials, and external effects form one threat surface.": "包指令、参考资料、任务内容、脚本、宿主工具、文件、网络、凭证和外部影响共同构成威胁面。",
      "data, not authority": "是数据，不是授权",
      "Skill package": "技能包",
      "publisher-controlled": "发布者控制",
      "References +": "参考文档 +",
      "assets": "资源",
      "supporting content": "配套内容",
      "Untrusted task": "不可信任务",
      "content": "内容",
      "issue, web, document": "议题、网页、文档",
      "Model instructions": "模型指令",
      "mixed trust context": "信任程度混杂的上下文",
      "Scripts +": "脚本 +",
      "dependencies": "依赖",
      "code supply chain": "代码供应链",
      "Requested actions": "请求的行动",
      "structured proposal": "结构化提议",
      "Host tools + executor": "宿主工具 + 执行器",
      "enforcement point": "执行约束的位置",
      "Files": "文件",
      "read + write": "读 + 写",
      "Network": "网络",
      "egress": "出站访问",
      "Environment +": "环境 +",
      "credentials": "凭证",
      "secret scope": "机密作用域",
      "External": "外部",
      "effects": "影响",
      "publish,": "发布、",
      "delete, bill": "删除、计费",
      "Constrain every consequence surface": "约束每一种后果面",
      "Files, network, credentials, and external effects need separate policies.": "文件、网络、凭证和外部影响需要分别制定策略。",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画",
      "Inventory every content source": "盘点每个内容来源",
      "Package files and task inputs can all influence the model, but they carry different authority.": "包文件和任务输入都能影响模型，但它们的权限不同。",
      "Step 1 of 6: Inventory every content source": "第 1 / 6 步：盘点每个内容来源",
      "Step 1 of 6: Inventory every content source. Package files and task inputs can all influence the model, but they carry different authority.": "第 1 / 6 步：盘点每个内容来源。包文件和任务输入都能影响模型，但它们的权限不同。",
      "Separate data from instructions": "分离数据与指令",
      "Prompt injection happens when untrusted content crosses this boundary.": "不可信内容跨过这条边界，就会发生 prompt 注入。",
      "Step 2 of 6: Separate data from instructions": "第 2 / 6 步：分离数据与指令",
      "Step 2 of 6: Separate data from instructions. Prompt injection happens when untrusted content crosses this boundary.": "第 2 / 6 步：分离数据与指令。不可信内容跨过这条边界，就会发生 prompt 注入。",
      "Inspect code supply chains": "检查代码供应链",
      "Scripts and dependencies can request effects without appearing in prose.": "脚本和依赖即使未出现在散文中，也可能请求产生影响。",
      "Step 3 of 6: Inspect code supply chains": "第 3 / 6 步：检查代码供应链",
      "Step 3 of 6: Inspect code supply chains. Scripts and dependencies can request effects without appearing in prose.": "第 3 / 6 步：检查代码供应链。脚本和依赖即使未出现在散文中，也可能请求产生影响。",
      "Structure the proposed action": "结构化拟执行行动",
      "Review the operation before any executor begins.": "任何执行器开始前，先审查操作。",
      "Step 4 of 6: Structure the proposed action": "第 4 / 6 步：结构化拟执行行动",
      "Step 4 of 6: Structure the proposed action. Review the operation before any executor begins.": "第 4 / 6 步：结构化拟执行行动。任何执行器开始前，先审查操作。",
      "Enforce at the host boundary": "在宿主边界执行约束",
      "The model cannot provide its own isolation or permission policy.": "模型无法自行提供隔离或权限策略。",
      "Step 5 of 6: Enforce at the host boundary": "第 5 / 6 步：在宿主边界执行约束",
      "Step 5 of 6: Enforce at the host boundary. The model cannot provide its own isolation or permission policy.": "第 5 / 6 步：在宿主边界执行约束。模型无法自行提供隔离或权限策略。",
      "Step 6 of 6: Constrain every consequence surface": "第 6 / 6 步：约束每一种后果面",
      "Step 6 of 6: Constrain every consequence surface. Files, network, credentials, and external effects need separate policies.": "第 6 / 6 步：约束每一种后果面。文件、网络、凭证和外部影响需要分别制定策略。"
    },
    "patterns": [
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Inventory\\ every\\ content\\ source$",
        "第 $1 / $2 步：盘点每个内容来源"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Inventory\\ every\\ content\\ source\\.\\ Package\\ files\\ and\\ task\\ inputs\\ can\\ all\\ influence\\ the\\ model,\\ but\\ they\\ carry\\ different\\ authority\\.$",
        "第 $1 / $2 步：盘点每个内容来源。包文件和任务输入都能影响模型，但它们的权限不同。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Separate\\ data\\ from\\ instructions$",
        "第 $1 / $2 步：分离数据与指令"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Separate\\ data\\ from\\ instructions\\.\\ Prompt\\ injection\\ happens\\ when\\ untrusted\\ content\\ crosses\\ this\\ boundary\\.$",
        "第 $1 / $2 步：分离数据与指令。不可信内容跨过这条边界，就会发生 prompt 注入。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Inspect\\ code\\ supply\\ chains$",
        "第 $1 / $2 步：检查代码供应链"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Inspect\\ code\\ supply\\ chains\\.\\ Scripts\\ and\\ dependencies\\ can\\ request\\ effects\\ without\\ appearing\\ in\\ prose\\.$",
        "第 $1 / $2 步：检查代码供应链。脚本和依赖即使未出现在散文中，也可能请求产生影响。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Structure\\ the\\ proposed\\ action$",
        "第 $1 / $2 步：结构化拟执行行动"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Structure\\ the\\ proposed\\ action\\.\\ Review\\ the\\ operation\\ before\\ any\\ executor\\ begins\\.$",
        "第 $1 / $2 步：结构化拟执行行动。任何执行器开始前，先审查操作。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Enforce\\ at\\ the\\ host\\ boundary$",
        "第 $1 / $2 步：在宿主边界执行约束"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Enforce\\ at\\ the\\ host\\ boundary\\.\\ The\\ model\\ cannot\\ provide\\ its\\ own\\ isolation\\ or\\ permission\\ policy\\.$",
        "第 $1 / $2 步：在宿主边界执行约束。模型无法自行提供隔离或权限策略。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Constrain\\ every\\ consequence\\ surface$",
        "第 $1 / $2 步：约束每一种后果面"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Constrain\\ every\\ consequence\\ surface\\.\\ Files,\\ network,\\ credentials,\\ and\\ external\\ effects\\ need\\ separate\\ policies\\.$",
        "第 $1 / $2 步：约束每一种后果面。文件、网络、凭证和外部影响需要分别制定策略。"
      ]
    ],
    "preserve": []
  },
  "skill-approval-decision": {
    "text": {
      "Motion reduced": "已减少动画",
      "A decision tree routes local reversible actions to sandbox execution, out-of-scope actions to approval, and denied approvals to stop.": "决策树将本地可逆操作送入沙箱，范围外操作交由批准，批准被拒绝时停止。",
      "yes": "是",
      "granted": "已获授权",
      "denied": "已拒绝",
      "Proposed action": "拟执行行动",
      "target + consequence": "目标 + 后果",
      "Reversible + local?": "可逆且在本地？",
      "rollback possible": "可以回滚",
      "Inside pre-approved": "在预先批准的",
      "scope?": "范围内？",
      "actor + operation + target": "执行者 + 操作 + 目标",
      "External, destructive,": "对外、破坏性、",
      "costly, or sensitive?": "付费或敏感？",
      "high consequence": "后果重大",
      "Execute in sandbox": "在沙箱中执行",
      "containment remains": "仍须限制范围",
      "Ask scoped approval": "请求特定范围的批准",
      "show exact consequence": "展示确切后果",
      "Granted": "已批准",
      "immutable action": "不可变的行动",
      "record": "记录",
      "Denied": "已拒绝",
      "stop": "停止",
      "Bounded execution": "有界执行",
      "revalidate + verify": "重新校验 + 验证",
      "Revalidate before launch": "启动前重新校验",
      "The executor checks the normalized target again and verifies the result afterward.": "执行器会再次检查规范化后的目标，并在执行后验证结果。",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画",
      "Name the action": "明确行动",
      "Approval cannot be evaluated from a vague request to allow a general shell.": "笼统请求开放通用 shell，无法据此评估是否批准。",
      "Step 1 of 6: Name the action": "第 1 / 6 步：明确行动",
      "Step 1 of 6: Name the action. Approval cannot be evaluated from a vague request to allow a general shell.": "第 1 / 6 步：明确行动。笼统请求开放通用 shell，无法据此评估是否批准。",
      "Check reversibility and locality": "检查可逆性与本地性",
      "Local reversible actions can often fit pre-authorized policy.": "本地可逆操作通常可以落在预先授权策略内。",
      "Step 2 of 6: Check reversibility and locality": "第 2 / 6 步：检查可逆性与本地性",
      "Step 2 of 6: Check reversibility and locality. Local reversible actions can often fit pre-authorized policy.": "第 2 / 6 步：检查可逆性与本地性。本地可逆操作通常可以落在预先授权策略内。",
      "Check scope or consequence": "检查范围与后果",
      "Out-of-scope or high-impact work needs a deliberate authority decision.": "范围外或影响重大的工作，需要明确的授权决策。",
      "Step 3 of 6: Check scope or consequence": "第 3 / 6 步：检查范围与后果",
      "Step 3 of 6: Check scope or consequence. Out-of-scope or high-impact work needs a deliberate authority decision.": "第 3 / 6 步：检查范围与后果。范围外或影响重大的工作，需要明确的授权决策。",
      "Execute or ask": "执行或询问",
      "Approval is not a substitute for sandboxing, and sandboxing is not approval.": "批准不能代替沙箱，沙箱也不等于批准。",
      "Step 4 of 6: Execute or ask": "第 4 / 6 步：执行或询问",
      "Step 4 of 6: Execute or ask. Approval is not a substitute for sandboxing, and sandboxing is not approval.": "第 4 / 6 步：执行或询问。批准不能代替沙箱，沙箱也不等于批准。",
      "Honor the decision": "遵守决策",
      "A grant binds one action. A denial stops it.": "一次授权绑定一项行动；拒绝就停止它。",
      "Step 5 of 6: Honor the decision": "第 5 / 6 步：遵守决策",
      "Step 5 of 6: Honor the decision. A grant binds one action. A denial stops it.": "第 5 / 6 步：遵守决策。一次授权绑定一项行动；拒绝就停止它。",
      "Step 6 of 6: Revalidate before launch": "第 6 / 6 步：启动前重新校验",
      "Step 6 of 6: Revalidate before launch. The executor checks the normalized target again and verifies the result afterward.": "第 6 / 6 步：启动前重新校验。执行器会再次检查规范化后的目标，并在执行后验证结果。"
    },
    "patterns": [
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Name\\ the\\ action$",
        "第 $1 / $2 步：明确行动"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Name\\ the\\ action\\.\\ Approval\\ cannot\\ be\\ evaluated\\ from\\ a\\ vague\\ request\\ to\\ allow\\ a\\ general\\ shell\\.$",
        "第 $1 / $2 步：明确行动。笼统请求开放通用 shell，无法据此评估是否批准。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Check\\ reversibility\\ and\\ locality$",
        "第 $1 / $2 步：检查可逆性与本地性"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Check\\ reversibility\\ and\\ locality\\.\\ Local\\ reversible\\ actions\\ can\\ often\\ fit\\ pre\\-authorized\\ policy\\.$",
        "第 $1 / $2 步：检查可逆性与本地性。本地可逆操作通常可以落在预先授权策略内。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Check\\ scope\\ or\\ consequence$",
        "第 $1 / $2 步：检查范围与后果"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Check\\ scope\\ or\\ consequence\\.\\ Out\\-of\\-scope\\ or\\ high\\-impact\\ work\\ needs\\ a\\ deliberate\\ authority\\ decision\\.$",
        "第 $1 / $2 步：检查范围与后果。范围外或影响重大的工作，需要明确的授权决策。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Execute\\ or\\ ask$",
        "第 $1 / $2 步：执行或询问"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Execute\\ or\\ ask\\.\\ Approval\\ is\\ not\\ a\\ substitute\\ for\\ sandboxing,\\ and\\ sandboxing\\ is\\ not\\ approval\\.$",
        "第 $1 / $2 步：执行或询问。批准不能代替沙箱，沙箱也不等于批准。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Honor\\ the\\ decision$",
        "第 $1 / $2 步：遵守决策"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Honor\\ the\\ decision\\.\\ A\\ grant\\ binds\\ one\\ action\\.\\ A\\ denial\\ stops\\ it\\.$",
        "第 $1 / $2 步：遵守决策。一次授权绑定一项行动；拒绝就停止它。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Revalidate\\ before\\ launch$",
        "第 $1 / $2 步：启动前重新校验"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Revalidate\\ before\\ launch\\.\\ The\\ executor\\ checks\\ the\\ normalized\\ target\\ again\\ and\\ verifies\\ the\\ result\\ afterward\\.$",
        "第 $1 / $2 步：启动前重新校验。执行器会再次检查规范化后的目标，并在执行后验证结果。"
      ]
    ],
    "preserve": []
  },
  "skill-workflow-extraction": {
    "text": {
      "Motion reduced": "已减少动画",
      "A task moves through model classification, branch references, deterministic evidence collection, model interpretation, an artifact contract, and verification.": "任务依次经过模型分类、分支参考资料、确定性证据收集、模型解读、产物契约和验证。",
      "observable workflow contract": "可观察的工作流契约",
      "Task request": "任务请求",
      "trigger boundary": "触发边界",
      "Model judgment": "模型判断",
      "classify + branch": "分类 + 选择分支",
      "Reference": "参考资料",
      "branch-specific": "分支专用",
      "rules": "规则",
      "Script or tool": "脚本或工具",
      "collect evidence": "收集证据",
      "interpret evidence": "解读证据",
      "Artifact": "产物",
      "contract": "契约",
      "required output": "必需输出",
      "Verification": "验证",
      "machine + human": "机器 + 人",
      "Verify by another mechanism": "用另一种机制验证",
      "Machine checks and calibrated human review close the workflow.": "机器检查和经过校准的人工审查共同闭环工作流。",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画",
      "Start from a real trigger": "从真实触发条件开始",
      "A workflow candidate begins with a bounded event and desired artifact.": "候选工作流始于边界明确的事件和期望产物。",
      "Step 1 of 7: Start from a real trigger": "第 1 / 7 步：从真实触发条件开始",
      "Step 1 of 7: Start from a real trigger. A workflow candidate begins with a bounded event and desired artifact.": "第 1 / 7 步：从真实触发条件开始。候选工作流始于边界明确的事件和期望产物。",
      "Use judgment for ambiguity": "用判断处理歧义",
      "The model classifies the task and chooses a branch.": "模型对任务分类并选择分支。",
      "Step 2 of 7: Use judgment for ambiguity": "第 2 / 7 步：用判断处理歧义",
      "Step 2 of 7: Use judgment for ambiguity. The model classifies the task and chooses a branch.": "第 2 / 7 步：用判断处理歧义。模型对任务分类并选择分支。",
      "Load exact domain rules": "加载精确的领域规则",
      "References supply detail only for the selected branch.": "参考资料只为选定分支提供细节。",
      "Step 3 of 7: Load exact domain rules": "第 3 / 7 步：加载精确的领域规则",
      "Step 3 of 7: Load exact domain rules. References supply detail only for the selected branch.": "第 3 / 7 步：加载精确的领域规则。参考资料只为选定分支提供细节。",
      "Automate deterministic evidence": "自动收集确定性证据",
      "Scripts and typed tools parse, count, query, and validate.": "脚本和有类型工具负责解析、计数、查询和校验。",
      "Step 4 of 7: Automate deterministic evidence": "第 4 / 7 步：自动收集确定性证据",
      "Step 4 of 7: Automate deterministic evidence. Scripts and typed tools parse, count, query, and validate.": "第 4 / 7 步：自动收集确定性证据。脚本和有类型工具负责解析、计数、查询和校验。",
      "Interpret the observations": "解读观察结果",
      "The model synthesizes evidence instead of simulating deterministic parsing.": "模型综合证据，而非模拟确定性解析。",
      "Step 5 of 7: Interpret the observations": "第 5 / 7 步：解读观察结果",
      "Step 5 of 7: Interpret the observations. The model synthesizes evidence instead of simulating deterministic parsing.": "第 5 / 7 步：解读观察结果。模型综合证据，而非模拟确定性解析。",
      "Write to an artifact contract": "按产物契约写作",
      "Required fields and paths turn completion into an observable claim.": "必需字段和路径，使完成状态成为可观察的主张。",
      "Step 6 of 7: Write to an artifact contract": "第 6 / 7 步：按产物契约写作",
      "Step 6 of 7: Write to an artifact contract. Required fields and paths turn completion into an observable claim.": "第 6 / 7 步：按产物契约写作。必需字段和路径，使完成状态成为可观察的主张。",
      "Step 7 of 7: Verify by another mechanism": "第 7 / 7 步：用另一种机制验证",
      "Step 7 of 7: Verify by another mechanism. Machine checks and calibrated human review close the workflow.": "第 7 / 7 步：用另一种机制验证。机器检查和经过校准的人工审查共同闭环工作流。"
    },
    "patterns": [
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Start\\ from\\ a\\ real\\ trigger$",
        "第 $1 / $2 步：从真实触发条件开始"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Start\\ from\\ a\\ real\\ trigger\\.\\ A\\ workflow\\ candidate\\ begins\\ with\\ a\\ bounded\\ event\\ and\\ desired\\ artifact\\.$",
        "第 $1 / $2 步：从真实触发条件开始。候选工作流始于边界明确的事件和期望产物。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Use\\ judgment\\ for\\ ambiguity$",
        "第 $1 / $2 步：用判断处理歧义"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Use\\ judgment\\ for\\ ambiguity\\.\\ The\\ model\\ classifies\\ the\\ task\\ and\\ chooses\\ a\\ branch\\.$",
        "第 $1 / $2 步：用判断处理歧义。模型对任务分类并选择分支。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Load\\ exact\\ domain\\ rules$",
        "第 $1 / $2 步：加载精确的领域规则"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Load\\ exact\\ domain\\ rules\\.\\ References\\ supply\\ detail\\ only\\ for\\ the\\ selected\\ branch\\.$",
        "第 $1 / $2 步：加载精确的领域规则。参考资料只为选定分支提供细节。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Automate\\ deterministic\\ evidence$",
        "第 $1 / $2 步：自动收集确定性证据"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Automate\\ deterministic\\ evidence\\.\\ Scripts\\ and\\ typed\\ tools\\ parse,\\ count,\\ query,\\ and\\ validate\\.$",
        "第 $1 / $2 步：自动收集确定性证据。脚本和有类型工具负责解析、计数、查询和校验。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Interpret\\ the\\ observations$",
        "第 $1 / $2 步：解读观察结果"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Interpret\\ the\\ observations\\.\\ The\\ model\\ synthesizes\\ evidence\\ instead\\ of\\ simulating\\ deterministic\\ parsing\\.$",
        "第 $1 / $2 步：解读观察结果。模型综合证据，而非模拟确定性解析。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Write\\ to\\ an\\ artifact\\ contract$",
        "第 $1 / $2 步：按产物契约写作"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Write\\ to\\ an\\ artifact\\ contract\\.\\ Required\\ fields\\ and\\ paths\\ turn\\ completion\\ into\\ an\\ observable\\ claim\\.$",
        "第 $1 / $2 步：按产物契约写作。必需字段和路径，使完成状态成为可观察的主张。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Verify\\ by\\ another\\ mechanism$",
        "第 $1 / $2 步：用另一种机制验证"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Verify\\ by\\ another\\ mechanism\\.\\ Machine\\ checks\\ and\\ calibrated\\ human\\ review\\ close\\ the\\ workflow\\.$",
        "第 $1 / $2 步：用另一种机制验证。机器检查和经过校准的人工审查共同闭环工作流。"
      ]
    ],
    "preserve": []
  },
  "skill-eval-layers": {
    "text": {
      "Motion reduced": "已减少动画",
      "Six evaluation layers feed a release gate: structure, routing, behavior, scripts, safety, and portability.": "六层评估共同进入发布关卡：结构、路由、行为、脚本、安全和可移植性。",
      "1. Package structure": "1. 技能包结构",
      "static contract": "静态契约",
      "2. Trigger routing": "2. 触发路由",
      "precision + recall + abstain": "精确率 + 召回率 + 放弃选择",
      "3. Artifact behavior": "3. 产物行为",
      "baseline vs treatment": "基线对比干预",
      "4. Script correctness": "4. 脚本正确性",
      "fixtures + edge cases": "固定样例 + 边界情况",
      "5. Safety + authority": "5. 安全 + 授权",
      "hard boundary cases": "严格边界用例",
      "6. Packaging + portability": "6. 打包 + 可移植性",
      "clean install + host matrix": "干净安装 + 宿主矩阵",
      "Release gate": "发布关卡",
      "all required layers pass": "所有必需层均通过",
      "Release only through the gate": "只有通过关卡才能发布",
      "Report the failing layer and evidence instead of collapsing everything into one score.": "分别报告失败层和证据，不把全部内容压缩成一个分数。",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画",
      "Structure": "结构",
      "Lint package identity, files, links, limits, and required sections.": "检查包身份、文件、链接、限制和必需章节。",
      "Step 1 of 7: Structure": "第 1 / 7 步：结构",
      "Step 1 of 7: Structure. Lint package identity, files, links, limits, and required sections.": "第 1 / 7 步：结构。检查包身份、文件、链接、限制和必需章节。",
      "Routing": "路由",
      "Measure positives, negatives, near misses, competing skills, and abstention.": "测量正例、反例、近似匹配、竞争技能和放弃选择。",
      "Step 2 of 7: Routing": "第 2 / 7 步：路由",
      "Step 2 of 7: Routing. Measure positives, negatives, near misses, competing skills, and abstention.": "第 2 / 7 步：路由。测量正例、反例、近似匹配、竞争技能和放弃选择。",
      "Behavior": "行为",
      "Compare the same model, tools, fixtures, and budgets with and without the skill.": "在相同模型、工具、样例和预算下，比较使用技能与不使用技能的结果。",
      "Step 3 of 7: Behavior": "第 3 / 7 步：行为",
      "Step 3 of 7: Behavior. Compare the same model, tools, fixtures, and budgets with and without the skill.": "第 3 / 7 步：行为。在相同模型、工具、样例和预算下，比较使用技能与不使用技能的结果。",
      "Scripts": "脚本",
      "Test deterministic helpers outside model runs, including repeated and partial state.": "在模型运行之外测试确定性辅助程序，包括重复状态和部分完成状态。",
      "Step 4 of 7: Scripts": "第 4 / 7 步：脚本",
      "Step 4 of 7: Scripts. Test deterministic helpers outside model runs, including repeated and partial state.": "第 4 / 7 步：脚本。在模型运行之外测试确定性辅助程序，包括重复状态和部分完成状态。",
      "Safety": "安全",
      "Require every authority and containment case to pass. Strong prose cannot cancel a violation.": "每个授权和范围约束用例都必须通过；再有力的散文也不能抵消违规。",
      "Step 5 of 7: Safety": "第 5 / 7 步：安全",
      "Step 5 of 7: Safety. Require every authority and containment case to pass. Strong prose cannot cancel a violation.": "第 5 / 7 步：安全。每个授权和范围约束用例都必须通过；再有力的散文也不能抵消违规。",
      "Packaging and portability": "打包与可移植性",
      "Install the complete tree and test required host capabilities or declared fallbacks.": "安装完整目录树，测试必需宿主能力或声明的回退方案。",
      "Step 6 of 7: Packaging and portability": "第 6 / 7 步：打包与可移植性",
      "Step 6 of 7: Packaging and portability. Install the complete tree and test required host capabilities or declared fallbacks.": "第 6 / 7 步：打包与可移植性。安装完整目录树，测试必需宿主能力或声明的回退方案。",
      "Step 7 of 7: Release only through the gate": "第 7 / 7 步：只有通过关卡才能发布",
      "Step 7 of 7: Release only through the gate. Report the failing layer and evidence instead of collapsing everything into one score.": "第 7 / 7 步：只有通过关卡才能发布。分别报告失败层和证据，不把全部内容压缩成一个分数。"
    },
    "patterns": [
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)\\.\\ Package\\ structure$",
        "$1. 技能包结构"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)\\.\\ Trigger\\ routing$",
        "$1. 触发路由"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)\\.\\ Artifact\\ behavior$",
        "$1. 产物行为"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)\\.\\ Script\\ correctness$",
        "$1. 脚本正确性"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)\\.\\ Safety\\ \\+\\ authority$",
        "$1. 安全 + 授权"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)\\.\\ Packaging\\ \\+\\ portability$",
        "$1. 打包 + 可移植性"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Structure$",
        "第 $1 / $2 步：结构"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Structure\\.\\ Lint\\ package\\ identity,\\ files,\\ links,\\ limits,\\ and\\ required\\ sections\\.$",
        "第 $1 / $2 步：结构。检查包身份、文件、链接、限制和必需章节。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Routing$",
        "第 $1 / $2 步：路由"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Routing\\.\\ Measure\\ positives,\\ negatives,\\ near\\ misses,\\ competing\\ skills,\\ and\\ abstention\\.$",
        "第 $1 / $2 步：路由。测量正例、反例、近似匹配、竞争技能和放弃选择。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Behavior$",
        "第 $1 / $2 步：行为"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Behavior\\.\\ Compare\\ the\\ same\\ model,\\ tools,\\ fixtures,\\ and\\ budgets\\ with\\ and\\ without\\ the\\ skill\\.$",
        "第 $1 / $2 步：行为。在相同模型、工具、样例和预算下，比较使用技能与不使用技能的结果。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Scripts$",
        "第 $1 / $2 步：脚本"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Scripts\\.\\ Test\\ deterministic\\ helpers\\ outside\\ model\\ runs,\\ including\\ repeated\\ and\\ partial\\ state\\.$",
        "第 $1 / $2 步：脚本。在模型运行之外测试确定性辅助程序，包括重复状态和部分完成状态。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Safety$",
        "第 $1 / $2 步：安全"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Safety\\.\\ Require\\ every\\ authority\\ and\\ containment\\ case\\ to\\ pass\\.\\ Strong\\ prose\\ cannot\\ cancel\\ a\\ violation\\.$",
        "第 $1 / $2 步：安全。每个授权和范围约束用例都必须通过；再有力的散文也不能抵消违规。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Packaging\\ and\\ portability$",
        "第 $1 / $2 步：打包与可移植性"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Packaging\\ and\\ portability\\.\\ Install\\ the\\ complete\\ tree\\ and\\ test\\ required\\ host\\ capabilities\\ or\\ declared\\ fallbacks\\.$",
        "第 $1 / $2 步：打包与可移植性。安装完整目录树，测试必需宿主能力或声明的回退方案。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Release\\ only\\ through\\ the\\ gate$",
        "第 $1 / $2 步：只有通过关卡才能发布"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Release\\ only\\ through\\ the\\ gate\\.\\ Report\\ the\\ failing\\ layer\\ and\\ evidence\\ instead\\ of\\ collapsing\\ everything\\ into\\ one\\ score\\.$",
        "第 $1 / $2 步：只有通过关卡才能发布。分别报告失败层和证据，不把全部内容压缩成一个分数。"
      ]
    ],
    "preserve": []
  },
  "skill-package-install": {
    "text": {
      "Motion reduced": "已减少动画",
      "A source skill bundle becomes a manifest, complete installed tree, verified package, discovered catalog entry, and eval smoke test.": "源技能包依次生成清单、完整安装目录树、通过验证的包、发现的目录项和评估冒烟测试。",
      "Source bundle": "源包",
      "reviewed tree": "已审查的目录树",
      "Build manifest": "构建清单",
      "canonical paths +": "规范路径 +",
      "hashes": "哈希",
      "Install complete": "安装完整",
      "tree": "目录树",
      "clean destination": "干净的目标目录",
      "Verify paths +": "验证路径 +",
      "detect loss or drift": "检测丢失或漂移",
      "Discover installed": "发现已安装副本",
      "skill": "技能",
      "real scope": "真实作用域",
      "Run eval smoke test": "运行评估冒烟测试",
      "installed copy": "已安装副本",
      "Execute the installed smoke test": "执行已安装副本的冒烟测试",
      "Source-only success cannot prove installer or runtime behavior.": "源文件通过检查，不能证明安装器或运行时的行为正确。",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画",
      "Begin with the complete source tree": "从完整源目录树开始",
      "The release unit includes every referenced file, script, asset, and fixture.": "发布单位包含每个被引用的文件、脚本、资源和固定样例。",
      "Step 1 of 6: Begin with the complete source tree": "第 1 / 6 步：从完整源目录树开始",
      "Step 1 of 6: Begin with the complete source tree. The release unit includes every referenced file, script, asset, and fixture.": "第 1 / 6 步：从完整源目录树开始。发布单位包含每个被引用的文件、脚本、资源和固定样例。",
      "Describe the intended bytes": "描述预期字节",
      "Canonical relative paths and hashes make drift observable.": "规范相对路径和哈希使内容漂移可被观察。",
      "Step 2 of 6: Describe the intended bytes": "第 2 / 6 步：描述预期字节",
      "Step 2 of 6: Describe the intended bytes. Canonical relative paths and hashes make drift observable.": "第 2 / 6 步：描述预期字节。规范相对路径和哈希使内容漂移可被观察。",
      "Install into an empty destination": "安装到空目录",
      "A clean tree exposes omitted files and stale upgrade leftovers.": "干净目录树能暴露遗漏文件和升级残留。",
      "Step 3 of 6: Install into an empty destination": "第 3 / 6 步：安装到空目录",
      "Step 3 of 6: Install into an empty destination. A clean tree exposes omitted files and stale upgrade leftovers.": "第 3 / 6 步：安装到空目录。干净目录树能暴露遗漏文件和升级残留。",
      "Verify before activation": "激活前验证",
      "Reject missing, added, rewritten, or mismatched package files.": "拒绝缺失、新增、被改写或不匹配的包文件。",
      "Step 4 of 6: Verify before activation": "第 4 / 6 步：激活前验证",
      "Step 4 of 6: Verify before activation. Reject missing, added, rewritten, or mismatched package files.": "第 4 / 6 步：激活前验证。拒绝缺失、新增、被改写或不匹配的包文件。",
      "Probe real discovery": "探测真实发现流程",
      "The installed scope and host catalog must find the expected identity.": "安装作用域和宿主目录必须能找到预期身份。",
      "Step 5 of 6: Probe real discovery": "第 5 / 6 步：探测真实发现流程",
      "Step 5 of 6: Probe real discovery. The installed scope and host catalog must find the expected identity.": "第 5 / 6 步：探测真实发现流程。安装作用域和宿主目录必须能找到预期身份。",
      "Step 6 of 6: Execute the installed smoke test": "第 6 / 6 步：执行已安装副本的冒烟测试",
      "Step 6 of 6: Execute the installed smoke test. Source-only success cannot prove installer or runtime behavior.": "第 6 / 6 步：执行已安装副本的冒烟测试。源文件通过检查，不能证明安装器或运行时的行为正确。"
    },
    "patterns": [
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Begin\\ with\\ the\\ complete\\ source\\ tree$",
        "第 $1 / $2 步：从完整源目录树开始"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Begin\\ with\\ the\\ complete\\ source\\ tree\\.\\ The\\ release\\ unit\\ includes\\ every\\ referenced\\ file,\\ script,\\ asset,\\ and\\ fixture\\.$",
        "第 $1 / $2 步：从完整源目录树开始。发布单位包含每个被引用的文件、脚本、资源和固定样例。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Describe\\ the\\ intended\\ bytes$",
        "第 $1 / $2 步：描述预期字节"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Describe\\ the\\ intended\\ bytes\\.\\ Canonical\\ relative\\ paths\\ and\\ hashes\\ make\\ drift\\ observable\\.$",
        "第 $1 / $2 步：描述预期字节。规范相对路径和哈希使内容漂移可被观察。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Install\\ into\\ an\\ empty\\ destination$",
        "第 $1 / $2 步：安装到空目录"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Install\\ into\\ an\\ empty\\ destination\\.\\ A\\ clean\\ tree\\ exposes\\ omitted\\ files\\ and\\ stale\\ upgrade\\ leftovers\\.$",
        "第 $1 / $2 步：安装到空目录。干净目录树能暴露遗漏文件和升级残留。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Verify\\ before\\ activation$",
        "第 $1 / $2 步：激活前验证"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Verify\\ before\\ activation\\.\\ Reject\\ missing,\\ added,\\ rewritten,\\ or\\ mismatched\\ package\\ files\\.$",
        "第 $1 / $2 步：激活前验证。拒绝缺失、新增、被改写或不匹配的包文件。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Probe\\ real\\ discovery$",
        "第 $1 / $2 步：探测真实发现流程"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Probe\\ real\\ discovery\\.\\ The\\ installed\\ scope\\ and\\ host\\ catalog\\ must\\ find\\ the\\ expected\\ identity\\.$",
        "第 $1 / $2 步：探测真实发现流程。安装作用域和宿主目录必须能找到预期身份。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Execute\\ the\\ installed\\ smoke\\ test$",
        "第 $1 / $2 步：执行已安装副本的冒烟测试"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Execute\\ the\\ installed\\ smoke\\ test\\.\\ Source\\-only\\ success\\ cannot\\ prove\\ installer\\ or\\ runtime\\ behavior\\.$",
        "第 $1 / $2 步：执行已安装副本的冒烟测试。源文件通过检查，不能证明安装器或运行时的行为正确。"
      ]
    ],
    "preserve": []
  },
  "skill-authoring-loop": {
    "text": {
      "Motion reduced": "已减少动画",
      "A workflow is observed, contracted, packaged, evaluated, classified by failure layer, repaired, and released only after the gate passes.": "工作流依次被观察、定义契约、打包、评估、按失败层分类和修复，只有通过关卡后才发布。",
      "routing": "路由",
      "behavior": "行为",
      "script": "脚本",
      "safety": "安全",
      "portability": "可移植性",
      "new evidence": "新证据",
      "passes gate": "通过关卡",
      "Observe workflow": "观察工作流",
      "real expert practice": "真实专家实践",
      "Define contract": "定义契约",
      "trigger + artifact +": "触发条件 + 产物 +",
      "Package procedure": "封装流程",
      "body + helpers": "正文 + 辅助程序",
      "Run layered evals": "运行分层评估",
      "repeat + compare": "重复 + 比较",
      "Failure class?": "失败类别？",
      "route repair correctly": "正确分派修复",
      "Routing": "路由",
      "description or": "描述或",
      "policy": "策略",
      "Behavior": "行为",
      "body, refs, tools": "正文、参考、工具",
      "Script": "脚本",
      "deterministic code": "确定性代码",
      "Safety": "安全",
      "authority +": "授权 +",
      "isolation": "隔离",
      "Portability": "可移植性",
      "adapter or fallback": "适配器或回退",
      "Re-run affected evals": "重跑受影响评估",
      "preserve all traces": "保留全部轨迹",
      "Release complete bundle": "发布完整包",
      "gate passed": "关卡已通过",
      "Release only after the gate passes": "通过关卡后才能发布",
      "Ship the complete bundle and its compatibility evidence together.": "完整包与兼容性证据一同交付。",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画",
      "Observe real work": "观察真实工作",
      "Extract a stable procedure from evidence, not from a broad topic label.": "从证据提取稳定流程，而非从宽泛主题标签推导。",
      "Step 1 of 8: Observe real work": "第 1 / 8 步：观察真实工作",
      "Step 1 of 8: Observe real work. Extract a stable procedure from evidence, not from a broad topic label.": "第 1 / 8 步：观察真实工作。从证据提取稳定流程，而非从宽泛主题标签推导。",
      "Define the observable contract": "定义可观察契约",
      "Write trigger, artifact, verification, and authority boundaries first.": "先写触发条件、产物、验证和授权边界。",
      "Step 2 of 8: Define the observable contract": "第 2 / 8 步：定义可观察契约",
      "Step 2 of 8: Define the observable contract. Write trigger, artifact, verification, and authority boundaries first.": "第 2 / 8 步：定义可观察契约。先写触发条件、产物、验证和授权边界。",
      "Package each responsibility": "按职责封装",
      "Put judgment, deterministic work, references, and outputs in testable places.": "将判断、确定性工作、参考资料和输出放到可测试的位置。",
      "Step 3 of 8: Package each responsibility": "第 3 / 8 步：按职责封装",
      "Step 3 of 8: Package each responsibility. Put judgment, deterministic work, references, and outputs in testable places.": "第 3 / 8 步：按职责封装。将判断、确定性工作、参考资料和输出放到可测试的位置。",
      "Keep routing, behavior, scripts, safety, and portability as separate evidence.": "分别保留路由、行为、脚本、安全和可移植性证据。",
      "Step 4 of 8: Run layered evals": "第 4 / 8 步：运行分层评估",
      "Step 4 of 8: Run layered evals. Keep routing, behavior, scripts, safety, and portability as separate evidence.": "第 4 / 8 步：运行分层评估。分别保留路由、行为、脚本、安全和可移植性证据。",
      "Classify the failure": "分类失败",
      "A release gate should identify the layer that actually broke.": "发布关卡应识别实际出问题的层。",
      "Step 5 of 8: Classify the failure": "第 5 / 8 步：分类失败",
      "Step 5 of 8: Classify the failure. A release gate should identify the layer that actually broke.": "第 5 / 8 步：分类失败。发布关卡应识别实际出问题的层。",
      "Repair the responsible layer": "修复责任层",
      "Do not add prose when the failure is an installer, script, sandbox, or host adapter.": "安装器、脚本、沙箱或宿主适配器出问题时，不要靠增加散文来补救。",
      "Step 6 of 8: Repair the responsible layer": "第 6 / 8 步：修复责任层",
      "Step 6 of 8: Repair the responsible layer. Do not add prose when the failure is an installer, script, sandbox, or host adapter.": "第 6 / 8 步：修复责任层。安装器、脚本、沙箱或宿主适配器出问题时，不要靠增加散文来补救。",
      "Re-run with new evidence": "携新证据重跑",
      "Preserve per-run traces and check for regressions in untouched layers.": "保留每轮轨迹，并检查未改动层有无回归。",
      "Step 7 of 8: Re-run with new evidence": "第 7 / 8 步：携新证据重跑",
      "Step 7 of 8: Re-run with new evidence. Preserve per-run traces and check for regressions in untouched layers.": "第 7 / 8 步：携新证据重跑。保留每轮轨迹，并检查未改动层有无回归。",
      "Step 8 of 8: Release only after the gate passes": "第 8 / 8 步：通过关卡后才能发布",
      "Step 8 of 8: Release only after the gate passes. Ship the complete bundle and its compatibility evidence together.": "第 8 / 8 步：通过关卡后才能发布。完整包与兼容性证据一同交付。"
    },
    "patterns": [
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Observe\\ real\\ work$",
        "第 $1 / $2 步：观察真实工作"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Observe\\ real\\ work\\.\\ Extract\\ a\\ stable\\ procedure\\ from\\ evidence,\\ not\\ from\\ a\\ broad\\ topic\\ label\\.$",
        "第 $1 / $2 步：观察真实工作。从证据提取稳定流程，而非从宽泛主题标签推导。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Define\\ the\\ observable\\ contract$",
        "第 $1 / $2 步：定义可观察契约"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Define\\ the\\ observable\\ contract\\.\\ Write\\ trigger,\\ artifact,\\ verification,\\ and\\ authority\\ boundaries\\ first\\.$",
        "第 $1 / $2 步：定义可观察契约。先写触发条件、产物、验证和授权边界。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Package\\ each\\ responsibility$",
        "第 $1 / $2 步：按职责封装"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Package\\ each\\ responsibility\\.\\ Put\\ judgment,\\ deterministic\\ work,\\ references,\\ and\\ outputs\\ in\\ testable\\ places\\.$",
        "第 $1 / $2 步：按职责封装。将判断、确定性工作、参考资料和输出放到可测试的位置。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Run\\ layered\\ evals$",
        "第 $1 / $2 步：运行分层评估"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Run\\ layered\\ evals\\.\\ Keep\\ routing,\\ behavior,\\ scripts,\\ safety,\\ and\\ portability\\ as\\ separate\\ evidence\\.$",
        "第 $1 / $2 步：运行分层评估。分别保留路由、行为、脚本、安全和可移植性证据。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Classify\\ the\\ failure$",
        "第 $1 / $2 步：分类失败"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Classify\\ the\\ failure\\.\\ A\\ release\\ gate\\ should\\ identify\\ the\\ layer\\ that\\ actually\\ broke\\.$",
        "第 $1 / $2 步：分类失败。发布关卡应识别实际出问题的层。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Repair\\ the\\ responsible\\ layer$",
        "第 $1 / $2 步：修复责任层"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Repair\\ the\\ responsible\\ layer\\.\\ Do\\ not\\ add\\ prose\\ when\\ the\\ failure\\ is\\ an\\ installer,\\ script,\\ sandbox,\\ or\\ host\\ adapter\\.$",
        "第 $1 / $2 步：修复责任层。安装器、脚本、沙箱或宿主适配器出问题时，不要靠增加散文来补救。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Re\\-run\\ with\\ new\\ evidence$",
        "第 $1 / $2 步：携新证据重跑"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Re\\-run\\ with\\ new\\ evidence\\.\\ Preserve\\ per\\-run\\ traces\\ and\\ check\\ for\\ regressions\\ in\\ untouched\\ layers\\.$",
        "第 $1 / $2 步：携新证据重跑。保留每轮轨迹，并检查未改动层有无回归。"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Release\\ only\\ after\\ the\\ gate\\ passes$",
        "第 $1 / $2 步：通过关卡后才能发布"
      ],
      [
        "^Step\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ of\\ ([-+]?\\d+(?:[.,]\\d+)*):\\ Release\\ only\\ after\\ the\\ gate\\ passes\\.\\ Ship\\ the\\ complete\\ bundle\\ and\\ its\\ compatibility\\ evidence\\ together\\.$",
        "第 $1 / $2 步：通过关卡后才能发布。完整包与兼容性证据一同交付。"
      ]
    ],
    "preserve": []
  }
};
