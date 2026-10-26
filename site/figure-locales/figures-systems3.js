(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-systems3.js"] = {
  "rvq-codec-cascade": {
    "text": {
      "Motion reduced": "已减少动画",
      "RVQ AUDIO CODEC": "RVQ 音频编解码器",
      "semantic codebook 0, acoustic 1..N": "语义码本 0，声学码本 1..N",
      "Instead of one giant codebook, neural audio codecs cascade small ones: the first quantizes the encoder output, each next one quantizes the residual left over. The shrinking bars are that residual getting smaller down the stack. Forcing codebook 0 to carry linguistic content (semantic) and the rest acoustic detail is what makes token-based speech models work.": "神经音频编解码器不使用一个巨大码本，而是级联多个小码本：第一个量化编码器输出，后续码本分别量化上一层的残差。缩短的条形表示残差逐层减小。强制码本 0 承载语言内容（语义），其余码本承载声学细节，正是基于 token 的语音模型能工作的原因。",
      "waveform": "波形",
      "enc": "编码器",
      "CB0  semantic": "CB0  语义",
      "CB1  acoustic": "CB1  声学",
      "CB2  acoustic": "CB2  声学",
      "CB3  acoustic": "CB3  声学",
      "each codebook quantizes the residual of the last": "每个码本量化上一层残差",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^semantic\\ codebook\\ ([-+]?\\d+(?:[.,]\\d+)*),\\ acoustic\\ ([-+]?\\d+(?:[.,]\\d+)*)\\.\\.N$",
        "语义码本 $1，声学码本 $2..N"
      ],
      [
        "^Instead\\ of\\ one\\ giant\\ codebook,\\ neural\\ audio\\ codecs\\ cascade\\ small\\ ones:\\ the\\ first\\ quantizes\\ the\\ encoder\\ output,\\ each\\ next\\ one\\ quantizes\\ the\\ residual\\ left\\ over\\.\\ The\\ shrinking\\ bars\\ are\\ that\\ residual\\ getting\\ smaller\\ down\\ the\\ stack\\.\\ Forcing\\ codebook\\ ([-+]?\\d+(?:[.,]\\d+)*)\\ to\\ carry\\ linguistic\\ content\\ \\(semantic\\)\\ and\\ the\\ rest\\ acoustic\\ detail\\ is\\ what\\ makes\\ token\\-based\\ speech\\ models\\ work\\.$",
        "神经音频编解码器不使用一个巨大码本，而是级联多个小码本：第一个量化编码器输出，后续码本分别量化上一层的残差。缩短的条形表示残差逐层减小。强制码本 $1 承载语言内容（语义），其余码本承载声学细节，正是基于 token 的语音模型能工作的原因。"
      ]
    ],
    "preserve": []
  },
  "inpaint-mask-reinject": {
    "text": {
      "Motion reduced": "已减少动画",
      "INPAINTING": "图像修补",
      "denoise inside the mask, hold the rest": "掩码内去噪，其余保持不变",
      "Inpainting denoises only the masked region while re-injecting the known pixels at every step so the boundary stays consistent. The marching dashes are the mask edge; inside it the noise resolves into new content, while the surrounding context is held fixed and pixel-identical.": "图像修补只在掩码区域去噪，每步重新注入已知像素，使边界保持一致。移动的虚线表示掩码边缘；内部噪声形成新内容，外围上下文固定，像素不变。",
      "kept context (re-injected each step)": "保留的上下文（每步重新注入）",
      "regenerated only here": "只在这里重新生成",
      "denoise": "去噪",
      "inside": "内部",
      "mask": "掩码",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": []
  },
  "video-diffusion-denoise": {
    "text": {
      "Motion reduced": "已减少动画",
      "VIDEO DIFFUSION": "视频扩散",
      "noise → coherent motion": "噪声 → 连贯运动",
      "A 3-D VAE compresses the clip into spatiotemporal patches, and a diffusion transformer denoises them. The grey speckle is the noise the model removes step by step; the blue shape resolving and shifting across frames is the temporal coherence the network has to model — the same object, lighting, and motion held consistent through the strip.": "3-D VAE 将视频压缩为时空图像块，扩散 transformer 对其去噪。灰色斑点是逐步去除的噪声；蓝色形状在各帧逐渐清晰并移动，表示网络必须建模的时间一致性：同一物体、光照和运动贯穿整个序列。",
      "spatiotemporal patches denoise over T steps": "时空图像块经过 T 步去噪",
      "frame 1": "第 1 帧",
      "frame 5": "第 5 帧",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^A\\ ([-+]?\\d+(?:[.,]\\d+)*)\\-D\\ VAE\\ compresses\\ the\\ clip\\ into\\ spatiotemporal\\ patches,\\ and\\ a\\ diffusion\\ transformer\\ denoises\\ them\\.\\ The\\ grey\\ speckle\\ is\\ the\\ noise\\ the\\ model\\ removes\\ step\\ by\\ step;\\ the\\ blue\\ shape\\ resolving\\ and\\ shifting\\ across\\ frames\\ is\\ the\\ temporal\\ coherence\\ the\\ network\\ has\\ to\\ model\\ —\\ the\\ same\\ object,\\ lighting,\\ and\\ motion\\ held\\ consistent\\ through\\ the\\ strip\\.$",
        "$1-D VAE 将视频压缩为时空图像块，扩散 transformer 对其去噪。灰色斑点是逐步去除的噪声；蓝色形状在各帧逐渐清晰并移动，表示网络必须建模的时间一致性：同一物体、光照和运动贯穿整个序列。"
      ],
      [
        "^frame\\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "第 $1 帧"
      ],
      [
        "^frame\\ ([-+]?\\d+(?:[.,]\\d+)*)$",
        "第 $1 帧"
      ]
    ],
    "preserve": []
  },
  "agentic-rag-loop": {
    "text": {
      "Motion reduced": "已减少动画",
      "retrieve": "检索",
      "reason": "推理",
      "AGENTIC RAG": "agent 式 RAG",
      "retrieve → reason → act → repeat": "检索 → 推理 → 行动 → 重复",
      "Basic RAG retrieves once and answers. Agentic RAG loops: retrieve candidates, reason over whether they actually answer the query, then act — rewrite the query, rerank, or retrieve again. The orbiting token is one query cycling the loop until the context is good enough to answer, which is what multi-hop questions need.": "基础 RAG 检索一次后就回答。agent 式 RAG 反复检索候选、判断是否真正回答了查询，再行动：改写查询、重排或重新检索。环绕的 token 表示一个查询循环往复，直到上下文足以支撑回答；多跳问题正需要这种过程。",
      "act / refine": "行动 / 改进",
      "corpus": "语料库",
      "agentic RAG: loop until the answer is grounded": "agent 式 RAG：循环直到答案有据可依",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": []
  },
  "mcp-nxm-collapse": {
    "text": {
      "Motion reduced": "已减少动画",
      "MCP COLLAPSES N×M": "MCP 将 N×M 收敛为统一协议",
      "one protocol, every host ↔ every server": "一个协议，所有宿主 ↔ 所有服务端",
      "Before MCP every host and every server spoke a bespoke protocol, an N×M integration matrix. MCP is one JSON-RPC spec in the middle: write one server and any compliant host discovers and calls its tools, resources, and prompts. Requests flow in, results flow back, through a single wire format.": "MCP 之前，每个宿主和服务端都使用定制协议，形成 N×M 集成矩阵。MCP 在中间提供统一 JSON-RPC 规范：编写一个服务端，任何合规宿主都能发现并调用其工具、资源和 prompt。请求与结果通过同一种线上格式往返。",
      "calendar": "日历",
      "files": "文件",
      "N hosts": "N 个宿主",
      "M servers": "M 个服务端",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "Claude",
        "reason": "产品名"
      },
      {
        "text": "ChatGPT",
        "reason": "产品名"
      },
      {
        "text": "Cursor",
        "reason": "产品名"
      }
    ]
  },
  "masked-diffusion-unmask": {
    "text": {
      "Motion reduced": "已减少动画",
      "SHOW-O UNIFIED": "Show-o 统一模型",
      "text left-to-right · image unmasks in parallel": "文本从左到右，图像并行解除掩码",
      "Text tokens are generated one at a time, left to right, by next-token prediction. Image tokens start fully masked and are recovered in parallel: each step predicts every masked cell at once and keeps the most confident, re-masking the rest. After a handful of waves the whole image is filled in — far fewer steps than autoregressive image decoding.": "文本用下一 token 预测从左到右逐个生成。图像 token 最初全部被掩码，再并行恢复：每一步同时预测所有掩码单元，保留最有把握的项，其余重新掩码。几轮后整张图像填满，步数远少于自回归图像解码。",
      "text:": "文本：",
      "image: parallel masked unmasking": "图像：并行解除掩码",
      "causal NTP": "因果下一 token 预测",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": []
  },
  "any-to-any-stream": {
    "text": {
      "Motion reduced": "已减少动画",
      "ANY-TO-ANY STREAM": "任意模态互转流",
      "four modalities → one shared vocabulary": "四种模态 → 一个共享词表",
      "Text, image, speech, and music are each tokenized into one shared vocabulary, then interleaved into a single sequence that one causal transformer consumes. Because every modality is just tokens, the model can emit any modality as output — the decode stream alternates token types and streams out fast enough for conversation.": "文本、图像、语音和音乐都被分词到同一个共享词表，再交错为单条序列，由一个因果 transformer 处理。所有模态都是 token，因此模型能输出任意模态；解码流交替输出不同 token 类型，速度足以用于会话。",
      "one": "一个",
      "text": "文本",
      "image": "图像",
      "speech": "语音",
      "music": "音乐",
      "any output": "任意输出",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": []
  },
  "a2a-task-lifecycle": {
    "text": {
      "Motion reduced": "已减少动画",
      "A2A TASK LIFECYCLE": "A2A 任务生命周期",
      "submitted → working → completed": "已提交 → 执行中 → 已完成",
      "One agent sends a Task to another and watches only the state transitions: submitted, working, sometimes input-required, then completed. The remote agent's internal reasoning stays opaque — the caller sees state changes and, at the end, an artifact returned as the output.": "一个 agent 向另一个发送 Task，只观察状态变化：submitted、working、有时 input-required，最后 completed。远端 agent 的内部推理不透明；调用方只看到状态变化，以及最后作为输出返回的产物。",
      "client agent": "客户端 agent",
      "remote agent": "远端 agent",
      "Task": "任务",
      "submitted": "已提交",
      "working": "执行中",
      "input-required": "需要输入",
      "completed": "已完成",
      "artifact": "产物",
      "task lifecycle (state stays opaque to caller)": "任务生命周期（调用方看不到内部状态）",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": []
  }
};
