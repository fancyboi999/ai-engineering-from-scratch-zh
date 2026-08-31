/* figures-manifest.js - lazy loader for the Chinese-only lesson figure modules.
   Keep module files unchanged: this manifest is the sole mapping from a
   data-figure name to its optional renderer bundle. */
(function () {
  'use strict';

  var current = document.currentScript;
  // Pre-rendered lesson pages live under /lessons/**, so relative src values
  // must resolve from this loader's own URL, not from location.pathname.
  var baseUrl = current && current.src
    ? current.src.replace(/[^/?#]+(?:[?#].*)?$/, '')
    : '/';
  var i18nSrc = 'figures-i18n-zh.js?v=20260831b';

  var MODULES = [
  {
    "src": "figures-agents2.js?v=20260801a",
    "figures": [
      "rewoo-plan",
      "tree-of-thoughts",
      "self-refine",
      "memory-blocks",
      "voyager-skills",
      "langgraph-state",
      "multi-agent-debate",
      "orchestration-pattern"
    ]
  },
  {
    "src": "figures-agents3.js?v=20260801a",
    "figures": [
      "htn-tree-expand",
      "workflow-chain",
      "actor-mailbox",
      "debate-converge",
      "computer-use-cursor",
      "voice-pipeline",
      "injection-hijack",
      "failure-cascade"
    ]
  },
  {
    "src": "figures-agents4.js?v=20260801a",
    "figures": [
      "ae-memory-fusion",
      "ae-crew-vs-flow",
      "ae-agent-handoff",
      "ae-subagent-isolation",
      "ae-swebench-gate",
      "ae-agent-human-gap",
      "ae-genai-span-tree",
      "ae-eval-three-layers"
    ]
  },
  {
    "src": "figures-alignment2.js?v=20260801a",
    "figures": [
      "ppo-clip",
      "reward-model",
      "constitutional-ai",
      "actor-critic",
      "interpretability-probe",
      "sae-features",
      "jailbreak-defense",
      "scalable-oversight"
    ]
  },
  {
    "src": "figures-alignment3.js?v=20260801a",
    "figures": [
      "al-instruct-pipeline",
      "al-sycophancy-amplifier",
      "al-sleeper-trigger",
      "al-scheming-probe",
      "al-faking-gap",
      "al-control-protocol",
      "al-pair-loop",
      "al-ascii-cloak",
      "al-injection-vector",
      "al-guard-stack",
      "al-wmdp-yellow-zone",
      "al-asl-ladder"
    ]
  },
  {
    "src": "figures-alignment4.js?v=20260801a",
    "figures": [
      "an-welfare-endchat",
      "an-bias-two-harms",
      "an-fairness-trilemma",
      "an-dp-clip-noise",
      "an-watermark-greenlist",
      "an-eu-act-timeline",
      "an-echoleak-chain",
      "an-card-scopes",
      "an-provenance-oneway",
      "an-moderation-layers",
      "an-uplift-asymmetry"
    ]
  },
  {
    "src": "figures-autonomous2.js?v=20260801a",
    "figures": [
      "alphaevolve-loop",
      "dgm-archive",
      "aar-forum",
      "bounded-gates",
      "injection-boundary",
      "cost-governor-stack",
      "circuit-breaker",
      "checkpoint-replay"
    ]
  },
  {
    "src": "figures-autoswarm5.js?v=20260801a",
    "figures": [
      "a5-scaffold-delta",
      "a5-guard-sieve",
      "a5-rsp-ladder",
      "a5-tracked-vs-research",
      "a5-horizon-fit",
      "a5-four-risks",
      "a5-primitive-radar",
      "a5-og-narrator",
      "a5-memory-reflection",
      "a5-retry-cascade",
      "a5-bench-gap",
      "a5-orchestrator-scale"
    ]
  },
  {
    "src": "figures-capstone-a.js?v=20260801a",
    "figures": [
      "cap-bpe-merge",
      "cap-sliding-window",
      "cap-multihead-attention",
      "cap-training-loop",
      "cap-classifier-head-swap",
      "cap-dpo-preference",
      "cap-corpus-downloader",
      "cap-cosine-warmup"
    ]
  },
  {
    "src": "figures-capstone-b.js?v=20260801a",
    "figures": [
      "grad-clip-monitor",
      "rrf-fusion",
      "rerank-funnel",
      "rag-pipeline-flow",
      "sandbox-runner",
      "eval-grid",
      "injection-gate",
      "safety-checkpoints"
    ]
  },
  {
    "src": "figures-capstone-c.js?v=20260801a",
    "figures": [
      "cc-embedding-lookup",
      "cc-transformer-block",
      "cc-gpt-assembly",
      "cc-weight-remap",
      "cc-sft-loss-mask",
      "cc-hdf5-corpus",
      "cc-grad-accumulation",
      "cc-atomic-checkpoint"
    ]
  },
  {
    "src": "figures-capstone-d.js?v=20260801a",
    "figures": [
      "cd-hyde-vector",
      "cd-bleu-overlap",
      "cd-reliability-diagram",
      "cd-zero-shard",
      "cd-pipeline-bubble",
      "cd-attack-taxonomy",
      "cd-output-router",
      "cd-constitution-loop"
    ]
  },
  {
    "src": "figures-capstone-e.js?v=20260801a",
    "figures": [
      "ce-agent-loop",
      "ce-hybrid-retrieval",
      "ce-voice-latency",
      "ce-late-interaction",
      "ce-experiment-tree",
      "ce-rootcause-walk",
      "ce-finetune-stages",
      "ce-migration-funnel",
      "ce-team-handoff",
      "ce-otel-drift"
    ]
  },
  {
    "src": "figures-capstone-f.js?v=20260801a",
    "figures": [
      "cf-scene-index",
      "cf-mcp-gate",
      "cf-spec-decode",
      "cf-safety-stack",
      "cf-issue-to-pr",
      "cf-tutor-loop",
      "cf-loop-contract",
      "cf-registry-validate",
      "cf-jsonrpc-frames",
      "cf-dispatch-retry"
    ]
  },
  {
    "src": "figures-capstone-g.js?v=20260801a",
    "figures": [
      "cg-plan-replan",
      "cg-gate-chain",
      "cg-path-jail",
      "cg-harness-weave",
      "cg-eval-quadrant",
      "cg-allreduce-ring",
      "cg-novelty-ramp",
      "cg-citation-hops",
      "cg-runner-limits",
      "cg-paired-verdict"
    ]
  },
  {
    "src": "figures-capstone-h.js?v=20260801a",
    "figures": [
      "ch-paper-skeleton",
      "ch-critic-converge",
      "ch-ucb-scheduler",
      "ch-research-pipeline",
      "ch-patch-tokenizer",
      "ch-cls-funnel",
      "ch-projection-bridge",
      "ch-crossattn-fan",
      "ch-infonce-diagonal",
      "ch-recall-window"
    ]
  },
  {
    "src": "figures-capstone-i.js?v=20260801a",
    "figures": [
      "ci-chunk-boundaries",
      "ci-rag-metric-ladder",
      "ci-task-spec-gate",
      "ci-leaderboard-ci",
      "ci-ring-allreduce",
      "ci-ddp-grad-sync",
      "ci-sharded-checkpoint",
      "ci-distributed-assembly",
      "ci-refusal-quadrant"
    ]
  },
  {
    "src": "figures-cv2.js?v=20260801a",
    "figures": [
      "object-detection-nms",
      "segmentation-flood",
      "cv-gan-image",
      "cv-diffusion-image",
      "nerf-rays",
      "clip-contrastive",
      "metric-embedding",
      "depth-sweep"
    ]
  },
  {
    "src": "figures-cv3.js?v=20260801a",
    "figures": [
      "cv3-roialign-sampling",
      "cv3-latent-compression",
      "cv3-ctc-collapse",
      "cv3-pose-heatmap",
      "cv3-gaussian-splat",
      "cv3-rectified-flow",
      "cv3-open-vocab",
      "cv3-track-assoc"
    ]
  },
  {
    "src": "figures-foundations2.js?v=20260801a",
    "figures": [
      "data-augmentation",
      "transfer-learning",
      "batchnorm-inference",
      "ctc-collapse",
      "mfcc-pipeline",
      "autoencoder-bottleneck",
      "normalizing-flow",
      "score-matching"
    ]
  },
  {
    "src": "figures-foundations3.js?v=20260801a",
    "figures": [
      "f3-bootstrap-resample",
      "f3-learning-boundary",
      "f3-ensemble-average",
      "f3-pipeline-flow",
      "f3-series-decompose",
      "f3-anomaly-fence",
      "f3-feature-prune",
      "f3-dqn-stability",
      "f3-marl-orbit",
      "f3-reality-gap",
      "f3-selfplay-ladder"
    ]
  },
  {
    "src": "figures-genai3.js?v=20260801a",
    "figures": [
      "gx-var-next-scale",
      "gx-fid-distributions",
      "gx-patchgan",
      "gx-stylegan-mapping",
      "gx-hybrid-retrieval",
      "gx-matryoshka",
      "gx-entity-linking",
      "gx-niah-decay"
    ]
  },
  {
    "src": "figures-infra2.js?v=20260801a",
    "figures": [
      "cache-aware-router",
      "cold-start-pipeline",
      "model-cascade-router",
      "prefill-decode-split",
      "batch-lane-triage",
      "semantic-cache-hit",
      "edge-bandwidth-pipe",
      "load-pattern-waves"
    ]
  },
  {
    "src": "figures-infra4.js?v=20260801a",
    "figures": [
      "i4-platform-lanes",
      "i4-otel-glue",
      "i4-canary-ramp",
      "i4-incident-agents",
      "i4-chaos-guard",
      "i4-vault-rotation",
      "i4-control-matrix",
      "i4-spend-ladder"
    ]
  },
  {
    "src": "figures-llmeng.js?v=20260801a",
    "figures": [
      "few-shot-curve",
      "cot-decomposition",
      "constrained-decoding",
      "prompt-cache-hit",
      "semantic-cache",
      "function-call-args",
      "llm-judge-rubric",
      "lost-in-the-middle"
    ]
  },
  {
    "src": "figures-llms3.js?v=20260801a",
    "figures": [
      "expert-routing",
      "encoder-decoder",
      "rnn-vs-parallel",
      "draft-verify-tokens",
      "multi-token-predict",
      "self-critique-loop",
      "loss-masking",
      "activation-recompute"
    ]
  },
  {
    "src": "figures-llmstack5.js?v=20260801a",
    "figures": [
      "l5-data-pipeline",
      "l5-spec-decode-eagle",
      "l5-prod-app-paths",
      "l5-state-graph-ledger",
      "l5-framework-fit",
      "l5-vlm-recipe-knobs",
      "l5-onevision-budget",
      "l5-native-pretrain",
      "l5-emu3-next-token",
      "l5-janus-decouple",
      "l5-thinker-talker"
    ]
  },
  {
    "src": "figures-misc2.js?v=20260801a",
    "figures": [
      "mx-propose-then-commit",
      "mx-priority-tiers",
      "mx-research-loop",
      "mx-speculative-tree",
      "mx-gateway-fallback",
      "mx-sequential-test",
      "mx-schema-funnel",
      "mx-tool-call-loop"
    ]
  },
  {
    "src": "figures-multimodal.js?v=20260801a",
    "figures": [
      "contrastive-matrix",
      "cross-attention-fusion",
      "modality-projection",
      "cfg-guidance-scale",
      "vq-codebook",
      "video-temporal-patches",
      "audio-text-ctc"
    ]
  },
  {
    "src": "figures-multimodal2.js?v=20260801a",
    "figures": [
      "mm-patch-n-pack",
      "mm-llava-projector",
      "mm-mrope-axes",
      "mm-video-token-budget",
      "mm-action-tokens",
      "mm-doc-layout",
      "mm-maxsim",
      "mm-agent-loop"
    ]
  },
  {
    "src": "figures-nlp3.js?v=20260801a",
    "figures": [
      "pos-tagger",
      "dependency-arcs",
      "qa-span",
      "summarize-collapse",
      "topic-drift",
      "coref-links",
      "nli-router",
      "relation-triples",
      "constrained-decoder"
    ]
  },
  {
    "src": "figures-nlp5.js?v=20260801a",
    "figures": [
      "n5-subword-merge",
      "n5-crosslingual-bridge",
      "n5-chunk-cuts",
      "n5-judge-gauge",
      "n5-slot-tracker",
      "n5-patch-stream",
      "n5-mel-decode",
      "n5-block-stack"
    ]
  },
  {
    "src": "figures-setup.js?v=20260801a",
    "figures": [
      "s0-env-stack",
      "s0-commit-dag",
      "s0-gpu-dispatch",
      "s0-secret-inject",
      "s0-cell-order",
      "s0-env-isolation",
      "s0-image-layers",
      "s0-lsp-roundtrip",
      "s0-data-pipeline",
      "s0-shell-pipeline",
      "s0-process-fork",
      "s0-flame-hot"
    ]
  },
  {
    "src": "figures-speech2.js?v=20260801a",
    "figures": [
      "sp-asr-attention",
      "sp-eer-crossover",
      "sp-tts-stack",
      "sp-codec-tokens",
      "sp-vad-cascade",
      "sp-fullduplex",
      "sp-wer-align",
      "sp-voice-factorize"
    ]
  },
  {
    "src": "figures-swarms2.js?v=20260801a",
    "figures": [
      "swarm-consensus-wave",
      "swarm-auction",
      "swarm-stigmergy",
      "swarm-hierarchy-token",
      "swarm-message-bus",
      "swarm-roles",
      "swarm-blackboard",
      "swarm-speaker"
    ]
  },
  {
    "src": "figures-swarms3.js?v=20260801a",
    "figures": [
      "sw-contract-net",
      "sw-work-stealing",
      "sw-handoff-routing",
      "sw-agent-card-discovery",
      "sw-debate-topology",
      "sw-theory-of-mind",
      "sw-ctde",
      "sw-checkpoint-replay"
    ]
  },
  {
    "src": "figures-systems3.js?v=20260801a",
    "figures": [
      "masked-diffusion-unmask",
      "any-to-any-stream",
      "video-diffusion-denoise",
      "inpaint-mask-reinject",
      "agentic-rag-loop",
      "mcp-nxm-collapse",
      "a2a-task-lifecycle",
      "rvq-codec-cascade"
    ]
  },
  {
    "src": "figures-tools2.js?v=20260801a",
    "figures": [
      "tp-tool-loop",
      "tp-parallel-fanout",
      "tp-schema-routing",
      "tp-client-merge",
      "tp-transport-handshake",
      "tp-task-lifecycle",
      "tp-router-failover",
      "tp-tool-poisoning"
    ]
  },
  {
    "src": "figures-tools3.js?v=20260801a",
    "figures": [
      "t3-dispatch-loop",
      "t3-primitive-sort",
      "t3-sampling-flip",
      "t3-roots-boundary",
      "t3-ui-sandbox",
      "t3-scope-stepup",
      "t3-gateway-funnel",
      "t3-jwks-rotate",
      "t3-span-waterfall",
      "t3-skill-layers",
      "t3-capstone-chain"
    ]
  },
  {
    "src": "figures-visaudio4.js?v=20260801a",
    "figures": [
      "v4-video-temporal",
      "v4-vision-pipeline",
      "v4-vlm-projector",
      "v4-world-rollout",
      "v4-alm-tokens",
      "v4-voice-latency",
      "v4-audio-watermark",
      "v4-controlnet-zero",
      "v4-3d-multiview"
    ]
  },
  {
    "src": "figures-workbench.js?v=20260801a",
    "figures": [
      "wb-runtime-spawn",
      "wb-trace-ingest",
      "wb-runtime-shapes",
      "wb-seven-surfaces",
      "wb-three-files",
      "wb-rule-checkoff",
      "wb-state-persist",
      "wb-init-probes",
      "wb-scope-bounce",
      "wb-feedback-loop",
      "wb-gate-sequence",
      "wb-builder-marker",
      "wb-handoff-packet",
      "wb-ab-runs",
      "wb-pack-install"
    ]
  },
  {
    "src": "figures-agent-skills.js?v=20260830a",
    "figures": [
      "skill-package-anatomy",
      "skill-runtime-lifecycle",
      "skill-tool-orthogonality",
      "skill-validation-order",
      "skill-discovery-pipeline",
      "skill-disclosure-levels",
      "skill-reference-map",
      "skill-resource-containment",
      "skill-invocation-stages",
      "skill-routing-abstention",
      "skill-argument-boundaries",
      "skill-host-adapter",
      "skill-authority-chain",
      "skill-trust-surface",
      "skill-approval-decision",
      "skill-workflow-extraction",
      "skill-eval-layers",
      "skill-package-install",
      "skill-authoring-loop"
    ]
  },
  {
    "src": "figures-mcp.js?v=20260830a",
    "figures": [
      "mcp-tool-call",
      "t3-dispatch-loop",
      "tp-client-merge",
      "tp-transport-handshake",
      "t3-primitive-sort",
      "t3-sampling-flip",
      "t3-roots-boundary",
      "tp-task-lifecycle",
      "t3-ui-sandbox",
      "tp-tool-poisoning",
      "t3-scope-stepup",
      "t3-gateway-funnel",
      "t3-jwks-rotate",
      "mcp-contract-pipeline",
      "mcp-reliability-race",
      "mcp-registry-admission",
      "mcp-conformance-operations"
    ]
  }
];

  var FIGURE_TO_MODULE = Object.create(null);
  for (var i = 0; i < MODULES.length; i++) {
    var module = MODULES[i];
    for (var j = 0; j < module.figures.length; j++) {
      FIGURE_TO_MODULE[module.figures[j]] = module.src;
    }
  }

  var loads = Object.create(null);

  function absoluteUrl(src) {
    return /^(?:[a-z]+:)?\/\//i.test(src) || src.charAt(0) === '/'
      ? src
      : baseUrl + src;
  }

  function loadScript(src) {
    var url = absoluteUrl(src);
    if (loads[url]) return loads[url];

    loads[url] = new Promise(function (resolve) {
      var script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.setAttribute('data-aifs-figure-module', src);
      script.onload = function () { resolve(true); };
      script.onerror = function () {
        // Do not turn a transient network failure into a page-lifetime cache.
        // Concurrent callers still share this promise; a later mount can retry.
        delete loads[url];
        console.warn('lesson figure module failed to load:', src);
        resolve(false);
      };
      document.head.appendChild(script);
    });
    return loads[url];
  }

  function requiredModules(root) {
    var scope = root || document;
    var hosts = [];
    if (scope.matches && scope.matches('.lesson-figure[data-figure]')) hosts.push(scope);
    if (scope.querySelectorAll) {
      var descendants = scope.querySelectorAll('.lesson-figure[data-figure]');
      for (var i = 0; i < descendants.length; i++) hosts.push(descendants[i]);
    }

    var needed = [];
    var seen = Object.create(null);
    for (var j = 0; j < hosts.length; j++) {
      var raw = (hosts[j].getAttribute('data-figure') || '').trim();
      var name = raw ? raw.split(/\s+/, 1)[0] : '';
      var src = FIGURE_TO_MODULE[name];
      if (src && !seen[src]) {
        seen[src] = true;
        needed.push(src);
      }
    }
    return { hasFigures: hosts.length > 0, sources: needed };
  }

  function ensureModules(root) {
    var required = requiredModules(root);
    if (!required.hasFigures) return Promise.resolve(false);

    // The generated upstream manifest owns the complete provider graph. Load
    // through it first so legacy and newly added providers are all lazy; this
    // zh manifest then adds the translation overlay and remains a fallback for
    // static previews built before the generated loader existed.
    if (typeof window.AIFS_loadFigureProviders === 'function') {
      return window.AIFS_loadFigureProviders(root)
        .then(function () { return loadScript(i18nSrc); })
        .then(function () { return true; });
    }

    var pending = [];
    for (var i = 0; i < required.sources.length; i++) {
      pending.push(loadScript(required.sources[i]));
    }

    // The zh layer wraps mountLessonFigures, so it must run after every
    // requested renderer has registered itself. Its own failure is non-fatal.
    return Promise.all(pending)
      .then(function () { return loadScript(i18nSrc); })
      .then(function () { return true; });
  }

  function mount(root) {
    var scope = root || document;
    return ensureModules(scope).then(function (hasFigures) {
      if (!hasFigures || typeof window.mountLessonFigures !== 'function') return false;
      try {
        window.mountLessonFigures(scope);
      } catch (error) {
        // A broken visual must never prevent the course body from rendering.
        console.warn('lesson figure mount failed:', error);
      }
      return true;
    });
  }

  // Export both pieces for the lesson shell and the repository audit.
  window.AIFS_FIGURE_TO_MODULE = FIGURE_TO_MODULE;
  window.AIFS_mountLessonFigures = mount;
})();
