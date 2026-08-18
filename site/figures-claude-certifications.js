/* figures-claude-certifications.js: interactive mechanism labs for the Claude
   certification curriculum. Loads after lesson-figures.js and topic figure
   modules, then registers through window.LF. Vanilla ES5, no dependencies. */
(function () {
  'use strict';

  var LF = window.LF;
  if (!LF) return;

  var el = LF.el;
  var slider = LF.slider;
  var select = LF.select;
  var clamp = LF.clamp;

  function ensureStyles() {
    if (document.getElementById('cert-figure-styles')) return;
    var style = document.createElement('style');
    style.id = 'cert-figure-styles';
    style.textContent = [
      '.cf-shell{border:1px solid var(--rule-soft,#ddd);background:var(--bg,#fafaf5);margin:28px 0;font-family:var(--font-body,serif)}',
      '.cf-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:12px 16px;border-bottom:1px solid var(--rule-soft,#ddd);font-family:var(--font-mono,monospace);font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-mute,#777)}',
      '.cf-head strong{color:var(--blueprint,#3553ff);font-weight:600}',
      '.cf-body{padding:16px}',
      '.cf-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 22px}',
      '.cf-output{margin-top:18px;padding-top:16px;border-top:1px dashed var(--rule-soft,#ddd)}',
      '.cf-status{font-family:var(--font-display,monospace);font-size:clamp(2rem,7vw,3.4rem);line-height:1;color:var(--blueprint,#3553ff)}',
      '.cf-status small{display:block;margin-top:8px;font-family:var(--font-mono,monospace);font-size:.68rem;line-height:1.45;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-soft,#555)}',
      '.cf-meta,.cf-formula{margin-top:8px;font-family:var(--font-mono,monospace);font-size:.7rem;line-height:1.5;color:var(--ink-mute,#777)}',
      '.cf-formula{color:var(--ink-soft,#555)}',
      '.cf-caption{padding:12px 16px;border-top:1px solid var(--rule-soft,#ddd);font-size:.92rem;line-height:1.55;color:var(--ink-soft,#555)}',
      '.cf-meter-list{display:grid;gap:10px;margin-top:14px}',
      '.cf-meter-row{display:grid;gap:4px}',
      '.cf-meter-label{display:flex;justify-content:space-between;gap:12px;font-family:var(--font-mono,monospace);font-size:.68rem;color:var(--ink-soft,#555)}',
      '.cf-meter{height:10px;overflow:hidden;background:var(--rule-soft,#ddd)}',
      '.cf-meter>i{display:block;width:100%;height:100%;background:var(--blueprint,#3553ff);transform:scaleX(0);transform-origin:left;transition:transform 120ms var(--ease-out,cubic-bezier(.23,1,.32,1))}',
      '.cf-meter.is-warning>i{background:var(--warn,#b8870f)}',
      '.cf-pipeline{display:grid;grid-template-columns:repeat(var(--cf-steps),minmax(0,1fr));gap:6px;margin-top:14px}',
      '.cf-step{min-height:72px;padding:9px;border:1px solid var(--rule-soft,#ddd);background:var(--bg-surface,#eee);font-family:var(--font-mono,monospace);font-size:.65rem;line-height:1.35;color:var(--ink-mute,#777)}',
      '.cf-step strong,.cf-step span{display:block}',
      '.cf-step strong{margin-bottom:5px;color:var(--ink,#111)}',
      '.cf-step.is-done{border-color:var(--blueprint,#3553ff);color:var(--blueprint,#3553ff)}',
      '.cf-step.is-active{border-color:var(--blueprint,#3553ff);background:var(--blueprint,#3553ff);color:var(--bg,#fff)}',
      '.cf-step.is-active strong{color:var(--bg,#fff)}',
      '.cf-lanes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:14px}',
      '.cf-lane{padding:10px;border:1px solid var(--rule-soft,#ddd);font-family:var(--font-mono,monospace);font-size:.68rem;text-align:center;color:var(--ink-mute,#777)}',
      '.cf-lane.is-active{border-color:var(--blueprint,#3553ff);background:var(--blueprint-tint,rgba(53,83,255,.08));color:var(--blueprint,#3553ff)}',
      '@media(max-width:640px){.cf-grid{grid-template-columns:1fr}.cf-pipeline{grid-template-columns:1fr}.cf-lanes{grid-template-columns:1fr}.cf-step{min-height:0}}',
      '@media(prefers-reduced-motion:reduce){.cf-meter>i,.cf-shell .lf-bar i{transition:none}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function labelControls(root) {
    var groups = root.querySelectorAll('.lf-ctrl');
    for (var index = 0; index < groups.length; index++) {
      var control = groups[index].querySelector('input,select');
      var label = groups[index].querySelector('label');
      if (!control || !label || control.getAttribute('aria-label')) continue;
      var name = '';
      for (var node = label.firstChild; node; node = node.nextSibling) {
        if (node.nodeType === 3) name += node.nodeValue;
      }
      control.setAttribute('aria-label', name.trim() || '交互数值');
    }
  }

  function shell(host, config, controls, output) {
    ensureStyles();
    var section = el('section', { class: 'cf-shell' }, [
      el('div', { class: 'cf-head' }, [
        el('strong', {}, [config.title]),
        el('span', {}, [config.hint || '调整输入值'])
      ]),
      el('div', { class: 'cf-body' }, [controls, output]),
      el('div', { class: 'cf-caption' }, [config.caption])
    ]);
    host.appendChild(section);
    labelControls(section);
  }

  function meterRow(name) {
    var value = el('span', {}, ['0']);
    var fill = el('i');
    var meter = el('div', {
      class: 'cf-meter', role: 'progressbar',
      'aria-label': name,
      'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0'
    }, [fill]);
    return {
      root: el('div', { class: 'cf-meter-row' }, [
        el('div', { class: 'cf-meter-label' }, [el('span', {}, [name]), value]),
        meter
      ]),
      update: function (score, warning) {
        var safe = clamp(Math.round(score), 0, 100);
        value.textContent = safe + '%';
        meter.setAttribute('aria-valuenow', String(safe));
        meter.classList.toggle('is-warning', !!warning);
        fill.style.transform = 'scaleX(' + (safe / 100).toFixed(3) + ')';
      }
    };
  }

  function makeDecision(config) {
    return function (host) {
      var state = { a: config.a.defaultValue, b: config.b.defaultValue };
      var status = el('div', { class: 'cf-status', 'aria-live': 'polite' });
      var meta = el('div', { class: 'cf-meta' });
      var formula = el('div', { class: 'cf-formula' });
      var list = el('div', { class: 'cf-meter-list' });
      var rows = config.choices.map(function (choice) {
        var row = meterRow(choice.name);
        list.appendChild(row.root);
        return row;
      });

      state._render = function () {
        var bestIndex = 0;
        var bestScore = -1;
        config.choices.forEach(function (choice, index) {
          var score = choice.base + choice.a * ((state.a - 50) / 50) + choice.b * ((state.b - 50) / 50);
          score = clamp(score, 0, 100);
          rows[index].update(score, false);
          if (score > bestScore) {
            bestIndex = index;
            bestScore = score;
          }
        });
        var best = config.choices[bestIndex];
        status.innerHTML = best.name + '<small>' + best.why + '</small>';
        meta.textContent = config.a.label + ' ' + state.a + '  ·  ' + config.b.label + ' ' + state.b + '  ·  匹配度 ' + Math.round(bestScore) + '%';
        formula.textContent = config.formula;
      };

      var controls = el('div', { class: 'cf-grid' }, [
        slider(state, 'a', config.a.label, 0, 100, 1),
        slider(state, 'b', config.b.label, 0, 100, 1)
      ]);
      var output = el('div', { class: 'cf-output' }, [status, list, meta, formula]);
      shell(host, config, controls, output);
      state._render();
    };
  }

  function makeThreshold(config) {
    return function (host) {
      var state = { signal: config.signal.defaultValue, impact: config.impact.defaultValue, cut: config.cut };
      var status = el('div', { class: 'cf-status', 'aria-live': 'polite' });
      var meta = el('div', { class: 'cf-meta' });
      var formula = el('div', { class: 'cf-formula' });
      var scoreMeter = meterRow(config.scoreLabel || '决策风险');
      var lanes = config.decisions.map(function (name) {
        var lane = el('div', { class: 'cf-lane' }, [name]);
        return lane;
      });

      state._render = function () {
        var score = Math.round(state.signal * config.signalWeight + state.impact * (1 - config.signalWeight));
        var index = score < state.cut ? 0 : score < state.cut + config.escalationBand ? 1 : 2;
        lanes.forEach(function (lane, laneIndex) { lane.classList.toggle('is-active', laneIndex === index); });
        scoreMeter.update(score, index === 2);
        status.innerHTML = config.decisions[index] + '<small>' + config.reasons[index] + '</small>';
        meta.textContent = config.signal.label + ' ' + state.signal + '  ·  ' + config.impact.label + ' ' + state.impact + '  ·  阈值 ' + state.cut;
        formula.textContent = config.formula;
      };

      var controls = el('div', { class: 'cf-grid' }, [
        slider(state, 'signal', config.signal.label, 0, 100, 1),
        slider(state, 'impact', config.impact.label, 0, 100, 1),
        slider(state, 'cut', config.thresholdLabel || '审查阈值', 20, 80, 1)
      ]);
      var output = el('div', { class: 'cf-output' }, [status, scoreMeter.root, el('div', { class: 'cf-lanes' }, lanes), meta, formula]);
      shell(host, config, controls, output);
      state._render();
    };
  }

  function makePipeline(config) {
    return function (host) {
      var state = { step: 0 };
      var status = el('div', { class: 'cf-status', 'aria-live': 'polite' });
      var meta = el('div', { class: 'cf-meta' });
      var pipeline = el('div', { class: 'cf-pipeline', style: '--cf-steps:' + config.steps.length });
      var cards = config.steps.map(function (step, index) {
        var card = el('div', { class: 'cf-step' }, [
          el('strong', {}, [(index + 1) + '. ' + step.name]),
          el('span', {}, [step.short])
        ]);
        pipeline.appendChild(card);
        return card;
      });

      state._render = function () {
        cards.forEach(function (card, index) {
          card.classList.toggle('is-done', index < state.step);
          card.classList.toggle('is-active', index === state.step);
          card.querySelector('span').textContent = index < state.step ? '已验证' : index === state.step ? config.steps[index].short : '等待中';
        });
        var active = config.steps[state.step];
        status.innerHTML = active.name + '<small>' + active.detail + '</small>';
        meta.textContent = '第 ' + (state.step + 1) + ' / ' + config.steps.length + ' 阶段  ·  ' + config.formula;
      };

      var controls = el('div', {}, [slider(state, 'step', config.controlLabel || '当前阶段', 0, config.steps.length - 1, 1)]);
      var output = el('div', { class: 'cf-output' }, [status, pipeline, meta]);
      shell(host, config, controls, output);
      state._render();
    };
  }

  function makeEquation(config) {
    return function (host) {
      var state = { a: config.a.defaultValue, b: config.b.defaultValue };
      var status = el('div', { class: 'cf-status', 'aria-live': 'polite' });
      var meta = el('div', { class: 'cf-meta' });
      var formula = el('div', { class: 'cf-formula' });
      var resultMeter = meterRow(config.meterLabel);

      state._render = function () {
        var result = config.calculate(state.a, state.b);
        resultMeter.update(result.percent, result.warning);
        status.innerHTML = result.value + '<small>' + result.status + '</small>';
        meta.textContent = result.meta;
        formula.textContent = result.formula;
      };

      var controls = el('div', { class: 'cf-grid' }, [
        slider(state, 'a', config.a.label, config.a.min, config.a.max, config.a.step),
        slider(state, 'b', config.b.label, config.b.min, config.b.max, config.b.step)
      ]);
      var output = el('div', { class: 'cf-output' }, [status, resultMeter.root, meta, formula]);
      shell(host, config, controls, output);
      state._render();
    };
  }

  function makeReadiness(config) {
    return function (host) {
      var state = { knowledge: 55, practice: 35, evidence: 25 };
      var status = el('div', { class: 'cf-status', 'aria-live': 'polite' });
      var meta = el('div', { class: 'cf-meta' });
      var readiness = meterRow('路线准备度');

      state._render = function () {
        var score = Math.round(state.knowledge * config.weights[0] + state.practice * config.weights[1] + state.evidence * config.weights[2]);
        var stage = score >= 80 ? config.ready : score >= 60 ? config.near : config.build;
        readiness.update(score, score < 60);
        status.innerHTML = score + '%<small>' + stage + '</small>';
        meta.textContent = config.formula + '  ·  最弱维度：' + [
          ['知识', state.knowledge], ['实践', state.practice], ['证据', state.evidence]
        ].sort(function (x, y) { return x[1] - y[1]; })[0][0];
      };

      var controls = el('div', { class: 'cf-grid' }, [
        slider(state, 'knowledge', config.labels[0], 0, 100, 1),
        slider(state, 'practice', config.labels[1], 0, 100, 1),
        slider(state, 'evidence', config.labels[2], 0, 100, 1)
      ]);
      var output = el('div', { class: 'cf-output' }, [status, readiness.root, meta]);
      shell(host, config, controls, output);
      state._render();
    };
  }

  function contextCache(host) {
    ensureStyles();
    var state = { mode: 'prefix' };
    var stage = el('div');
    state._render = function () {
      while (stage.firstChild) stage.removeChild(stage.firstChild);
      var name = state.mode === 'prefix' ? 'prompt-cache-hit' : 'semantic-cache';
      var figure = window.LESSON_FIGURES && window.LESSON_FIGURES[name];
      if (figure) figure(stage, {});
      labelControls(stage);
    };
    var controls = el('div', { class: 'cf-grid' }, [
      select(state, 'mode', '缓存机制', [['提供商前缀缓存', 'prefix'], ['应用语义缓存', 'semantic']])
    ]);
    shell(host, {
      title: '上下文缓存实验室',
      hint: '切换机制后再拖动控件',
      caption: '前缀缓存会跳过重复 prompt 的计算。语义缓存会为相似查询复用先前答案。前者精确且由提供商处理，后者近似且在应用侧处理，因此其阈值是一个安全决策。'
    }, controls, el('div', { class: 'cf-output' }, [stage]));
    state._render();
  }

  var decisions = {
    '01-claude-model-fit': {
      title: '模型匹配度计算器', hint: '调整延迟和推理需求',
      a: { label: '延迟压力', defaultValue: 65 }, b: { label: '推理复杂度', defaultValue: 55 },
      choices: [
        { name: 'Haiku', base: 60, a: 34, b: -28, why: '当延迟占主导且任务边界明确时，使用最快的层级。' },
        { name: 'Sonnet', base: 76, a: 4, b: 8, why: '速度和推理都重要时，使用均衡的层级。' },
        { name: 'Opus', base: 58, a: -24, b: 36, why: '只有任务复杂度足以证明成本合理时，才使用推理能力最强的层级。' }
      ],
      formula: '匹配度 = 基线 + 延迟系数 + 推理系数',
      caption: '模型选择是工作负载决策，不是排行榜决策。调整约束条件，观察最优匹配如何变化。'
    },
    '16-multi-agent-topology': {
      title: '编排拓扑', hint: '调整耦合度和并行度',
      a: { label: '任务耦合度', defaultValue: 55 }, b: { label: '并行工作量', defaultValue: 60 },
      choices: [
        { name: '单 agent', base: 72, a: 22, b: -30, why: '当各步骤高度相互依赖时，维持一个上下文。' },
        { name: '监督者', base: 74, a: 5, b: 10, why: '工作可以拆分、但决策仍需要单一负责人时，使用监督者。' },
        { name: '对等 agent 群', base: 55, a: -28, b: 36, why: '只在工作彼此独立且有明确合并契约时，才使用对等 agent。' }
      ],
      formula: '拓扑匹配度在依赖成本与可用并行度之间权衡',
      caption: '更多 agent 会增加协调成本。只有任务足够独立、能够安全合并时，并行才有帮助。'
    },
    '18-tool-discovery-contract': {
      title: '工具发现预算', hint: '调整工具数量和歧义程度',
      a: { label: '可用工具数', defaultValue: 45 }, b: { label: '请求歧义度', defaultValue: 50 },
      choices: [
        { name: '全部暴露', base: 70, a: -36, b: -12, why: '只有注册表较小且意图明确时，才暴露全部工具。' },
        { name: '渐进式发现', base: 78, a: 20, b: 16, why: '先展示一小组相关工具，只在必要时再扩展。' },
        { name: '固定工作流', base: 60, a: -8, b: 26, why: '当歧义较高但流程已知时，使用固定顺序。' }
      ],
      formula: '无关工具和意图歧义越多，选择质量越低',
      caption: '模型无法从无限长的工具列表中做好选择。渐进式发现会在执行前缩小选择范围。'
    },
    '22-sla-value-tradeoff': {
      title: 'SLA 价值权衡', hint: '调整业务影响和可靠性要求',
      a: { label: '业务影响', defaultValue: 65 }, b: { label: '可靠性要求', defaultValue: 70 },
      choices: [
        { name: '辅助式工作流', base: 74, a: -12, b: -20, why: '当价值中等或不确定性持续较高时，让人保持控制权。' },
        { name: '受控自动化', base: 78, a: 8, b: 12, why: '用可测量的关卡和明确的回退机制自动化常见路径。' },
        { name: '确定性服务', base: 54, a: 20, b: 32, why: '当可靠性占主导时，将关键不变量移出模型。' }
      ],
      formula: '架构匹配度 = 获取的业务价值 − 失败暴露度',
      caption: '最好的 AI 架构是在获得所需价值的前提下，概率性表面最小的架构。'
    },
    '23-architecture-tradeoff': {
      title: '架构选择', hint: '调整知识新鲜度和工作流复杂度',
      a: { label: '知识新鲜度', defaultValue: 70 }, b: { label: '工作流复杂度', defaultValue: 55 },
      choices: [
        { name: '仅 prompt', base: 70, a: -28, b: -18, why: '对于稳定知识和边界明确的转换，只使用 prompt。' },
        { name: 'RAG 服务', base: 68, a: 36, b: -5, why: '当答案依赖会变化或私有的知识时，进行检索。' },
        { name: 'Agent 工作流', base: 58, a: 4, b: 38, why: '只有系统必须选择并编排操作时，才加入 agent。' }
      ],
      formula: '从满足新鲜度和操作需求的最简单架构开始',
      caption: 'prompt、检索和 agent 解决的是不同问题。只有需求确实要求时，才引入复杂性。'
    }
  };

  var thresholds = {
    '02-responsible-ai-risk': ['负责任的 AI 风险', '模型不确定性', '用户影响', ['允许', '人工审查', '阻止并升级'], ['低风险使用仍在政策范围内。', '发布前必须由审查者消除不确定性。', '高影响的不确定性越过了停止边界。']],
    '06-data-analysis-confidence': ['分析置信度', '证据缺口', '决策影响', ['附带限制说明后发布', '核验来源', '停止分析'], ['证据支持一个边界明确的结论。', '重新计算或检索缺失的证据。', '不要把薄弱证据转化为自信的决策。']],
    '07-human-review-threshold': ['人工交接', '模型不确定性', '可逆性成本', ['自动完成', '请求审查', '升级给负责人'], ['该操作风险低且可逆。', '应由人工确认拟议操作。', '必须由负责的所有者作出决定。']],
    '11-mcp-permission-boundary': ['MCP 权限边界', '请求的权限', '资源敏感度', ['允许限定范围的调用', '需要批准', '拒绝请求'], ['该调用仍在最小权限契约内。', '扩大范围必须由人员批准。', '所请求的能力超出了服务器边界。']],
    '13-secrets-threat-model': ['密钥暴露风险', '暴露可能性', '凭据影响范围', ['安全继续', '轮换并调查', '控制事件'], ['没有密钥跨越模型或日志边界。', '将可能的暴露视为事故信号。', '先撤销访问权限，再做其他事。']],
    '20-batch-review-confidence': ['批处理审查关卡', '提取不确定性', '记录关键性', ['接受批次', '抽样审查', '隔离批次'], ['该批次达到质量下限。', '发布前检查一份按风险加权的样本。', '在理解失败模式之前停止传播。']],
    '21-provenance-escalation': ['溯源关卡', '无依据的主张', '决策后果', ['带引用作答', '检索证据', '升级不确定性'], ['每一项关键主张都有可追溯的证据。', '系统必须检索或请求缺失的支持材料。', '后果过高，不能给出无依据的答案。']],
    '27-governance-approval-flow': ['治理审批', '政策偏离', '受影响人群', ['标准发布', '风险批准', '高管叫停'], ['常规控制足以覆盖这次发布。', '该偏离需要记录在案的风险接受。', '这项变更超出了授权范围。']]
  };

  var pipelines = {
    '03-prompt-contract': ['prompt 契约', '契约阶段', ['意图', '输入', '约束', '输出', '测试'], ['定义模型必须支持的决策。', '明确所需上下文，并拒绝缺失字段。', '说明边界、拒答规则和不变量。', '声明下游代码使用的确切结构。', '运行正常、边界、对抗和缺失数据用例。']],
    '05-document-vision-pipeline': ['文档与视觉处理管道', '管道阶段', ['接收', '分段', '提取', '验证', '路由'], ['保留页面和图像的身份信息。', '按语义和视觉边界切分。', '返回带来源坐标的字段。', '检查数据模式、总计和跨页一致性。', '把低置信度案例发送给合适的负责人。']],
    '08-messages-lifecycle': ['Messages API 生命周期', '请求阶段', ['构建', '发送', '检查', '继续', '记录'], ['构建有序的角色、内容块和限制。', '提交一个明确的请求边界。', '读取停止原因、用量和返回块。', '追加工具结果或下一轮用户输入。', '持久化调试和成本核算所需的追踪记录。']],
    '09-structured-output-recovery': ['结构化输出恢复', '恢复阶段', ['生成', '解析', '验证', '修复', '升级'], ['请求声明的数据模式。', '将响应视为不可信的字节。', '检查类型、范围和业务不变量。', '携带确切的验证错误重试一次。', '返回有类型的失败，而不是猜测。']],
    '12-agent-hook-lifecycle': ['agent 钩子生命周期', '钩子阶段', ['开始', '工具前', '执行', '工具后', '停止'], ['创建追踪和政策上下文。', '在产生副作用前授权参数。', '运行边界明确的操作。', '记录输出、成本和已变更状态。', '关闭资源并发布终态结果。']],
    '14-eval-observability-loop': ['评测与可观测性循环', '反馈阶段', ['数据集', '运行', '评分', '追踪', '改进'], ['对代表性案例和失败切片进行版本管理。', '执行确切的候选配置。', '测量任务、安全、延迟和成本。', '将聚合失败关联到单个追踪记录。', '每次只改变一个假设，然后重跑同一组。']],
    '15-team-agent-loop': ['团队 agent 循环', '团队阶段', ['规划', '分配', '执行', '审查', '合并'], ['写明验收标准和所有权。', '为每个 agent 分配边界明确且不重叠的工作面。', '产出可检查的工作和验证证据。', '检查正确性、冲突和遗漏范围。', '只有所有契约达成一致后才集成。']],
    '19-memory-rule-precedence': ['记忆与规则优先级', '解析阶段', ['当前请求', '仓库规则', '实时代码', '项目记忆', '全局默认值'], ['在权限范围内，最新的明确指令优先。', '应用距离最近且仍在维护的项目契约。', '根据当前实现验证行为。', '只有检查过漂移后，才使用持久上下文。', '最后才回退到通用偏好。']],
    '25-identity-permission-path': ['身份与权限路径', '授权阶段', ['认证', '解析行为主体', '授权', '执行', '审计'], ['验证所呈现的身份。', '绑定用户、租户和受委托服务身份。', '按最小权限评估资源与操作。', '只执行已获授权的操作。', '记录行为主体、决策、目标和结果。']],
    '28-adr-lifecycle': ['ADR 生命周期', '决策阶段', ['背景', '选项', '决策', '后果', '复审'], ['说明约束以及为什么需要作出决策。', '使用同一标准比较可行替代方案。', '明确选定方案和负责所有者。', '记录收益、成本、风险和后续事项。', '当假设或指标变化时重新打开。']]
  };

  var figures = {
    '00-certification-route-map': makeReadiness({
      title: '认证路线准备度', hint: '评估证据，不评估自信', labels: ['考试知识', '限时练习', '已交付证据'], weights: [0.35, 0.3, 0.35],
      ready: '已准备好进行限时完整模拟', near: '补齐最弱维度后重新测试', build: '回到课程并产出证据',
      formula: '35% 知识 + 30% 限时练习 + 35% 产物',
      caption: '准备度不取决于你对蓝图有多熟悉，而取决于你能解释什么、能在时间压力下完成什么，以及能用产物证明什么。'
    }),
    '04-context-cache': contextCache,
    '10-tool-loop-budget': makeEquation({
      title: '工具循环预算', hint: '调整调用上限和成功率', meterLabel: '成功完成率',
      a: { label: '最大工具调用次数', min: 1, max: 20, step: 1, defaultValue: 8 }, b: { label: '每次调用成功率（%）', min: 10, max: 95, step: 1, defaultValue: 65 },
      calculate: function (calls, success) { var p = 1 - Math.pow(1 - success / 100, calls); return { value: (p * 100).toFixed(1) + '%', status: calls > 12 ? '完成率提高了，但失控循环的暴露风险现在很高。' : '为循环设定边界，并检查每个停止原因。', percent: p * 100, warning: calls > 12, meta: '最多 ' + calls + ' 次调用  ·  每次调用推进任务的概率为 ' + success + '%', formula: 'P（至少一次成功）= 1 − (1 − p)^调用次数' }; },
      caption: '工具循环需要明确的调用预算、终止条件和有类型的失败。更多重试能提高完成率，但也会提高延迟、成本和副作用风险。'
    }),
    '17-session-context-budget': makeEquation({
      title: '会话上下文预算', hint: '调整历史记录和压缩率', meterLabel: '已占用上下文',
      a: { label: '原始历史 token 数', min: 1000, max: 200000, step: 1000, defaultValue: 80000 }, b: { label: '压缩后保留比例（%）', min: 5, max: 100, step: 1, defaultValue: 35 },
      calculate: function (tokens, retained) { var used = Math.round(tokens * retained / 100); var pct = used / 100000 * 100; return { value: used.toLocaleString('en-US') + ' 个 token', status: pct > 80 ? '继续前请再次压缩，或按需检索。' : '会话保留了决策，同时为新工作留出了空间。', percent: pct, warning: pct > 80, meta: tokens.toLocaleString('en-US') + ' 个原始 token  ·  压缩后保留 ' + retained + '%', formula: '活跃上下文 = 历史 token 数 × 保留比例' }; },
      caption: '会话记忆应保留决策、约束和未解决状态，而不是重放每一个 token。压缩是信息设计问题。'
    }),
    '24-rag-ranking': makeEquation({
      title: 'RAG 排序阈值', hint: '调整相关性和证据覆盖度', meterLabel: '答案支持度',
      a: { label: '检索相关性（%）', min: 0, max: 100, step: 1, defaultValue: 72 }, b: { label: '证据覆盖度（%）', min: 0, max: 100, step: 1, defaultValue: 68 },
      calculate: function (relevance, coverage) { var support = relevance * 0.55 + coverage * 0.45; return { value: Math.round(support) + '% 支持度', status: support >= 75 ? '带引用生成答案，并保留排序后的证据。' : support >= 55 ? '再次检索，或缩小问题范围。' : '语料库不支持该答案，应拒绝作答。', percent: support, warning: support < 55, meta: '相关性 ' + relevance + '%  ·  主张覆盖度 ' + coverage + '%', formula: '支持度 = 0.55 × 相关性 + 0.45 × 证据覆盖度' }; },
      caption: '检索质量不只是最近邻相似度。选出的证据还必须覆盖答案准备提出的主张。'
    }),
    '26-latency-cost-slo': makeEquation({
      title: '延迟与成本 SLO', hint: '调整缓存命中率和模型延迟', meterLabel: '已使用延迟预算',
      a: { label: '缓存命中率（%）', min: 0, max: 100, step: 1, defaultValue: 60 }, b: { label: '未缓存延迟（毫秒）', min: 200, max: 6000, step: 100, defaultValue: 2400 },
      calculate: function (hit, latency) { var effective = hit / 100 * 80 + (1 - hit / 100) * latency; var pct = effective / 2000 * 100; return { value: Math.round(effective) + ' 毫秒', status: effective <= 2000 ? '混合路径满足 2 秒目标。' : '减少模型工作量、提高安全的缓存命中率，或调整 SLO。', percent: pct, warning: effective > 2000, meta: '以 80 毫秒命中 ' + hit + '%  ·  未命中时为 ' + latency + ' 毫秒', formula: '混合延迟 = 命中率 × 80 毫秒 + 未命中率 × 未缓存延迟' }; },
      caption: '平均值会掩盖架构问题。模型延迟、缓存行为和允许的服务目标必须作为一个系统来衡量。'
    })
  };

  Object.keys(decisions).forEach(function (id) { figures[id] = makeDecision(decisions[id]); });
  Object.keys(thresholds).forEach(function (id) {
    var item = thresholds[id];
    figures[id] = makeThreshold({
      title: item[0], hint: '调整风险和阈值', signal: { label: item[1], defaultValue: 45 }, impact: { label: item[2], defaultValue: 60 },
      cut: 50, signalWeight: 0.55, escalationBand: 20, decisions: item[3], reasons: item[4],
      scoreLabel: '综合决策分数', thresholdLabel: '审查阈值', formula: '分数 = 55% 信号 + 45% 影响；阈值决定控制路径',
      caption: '可靠系统会将不确定性和后果转化为明确的控制路径。移动审查阈值改变的是自动化政策，不是模型事实。'
    });
  });
  Object.keys(pipelines).forEach(function (id) {
    var item = pipelines[id];
    figures[id] = makePipeline({
      title: item[0], hint: '拖动以浏览机制', controlLabel: item[1],
      steps: item[2].map(function (name, index) { return { name: name, short: item[3][index], detail: item[3][index] }; }),
      formula: '每个已验证阶段都会成为下一阶段的契约',
      caption: '逐步推进并检查每个边界上的契约。可靠性来自明确的状态转换，不是指望一条很长的 prompt 处理整个工作流。'
    });
  });

  [
    ['29-associate-capstone-readiness', '助理级综合项目', ['工作流决策', '场景练习', '交接证据'], [0.35, 0.35, 0.3]],
    ['30-developer-capstone-readiness', '开发者综合项目', ['API 机制', '经过测试的实现', '运维资料包'], [0.3, 0.4, 0.3]],
    ['31-architect-foundation-readiness', '架构师基础综合项目', ['模式选择', '权衡练习', '架构资料包'], [0.35, 0.3, 0.35]],
    ['32-architect-professional-readiness', '架构师专业级综合项目', ['系统判断', '故障演练', '治理证据'], [0.3, 0.35, 0.35]]
  ].forEach(function (item) {
    figures[item[0]] = makeReadiness({
      title: item[1], hint: '衡量你能证明的内容', labels: item[2], weights: item[3],
      ready: '综合项目证据已准备好接受评分量规审查', near: '修复最弱证据后重新运行验证器', build: '先完成缺失产物，再宣称已准备好',
      formula: Math.round(item[3][0] * 100) + '% 知识 + ' + Math.round(item[3][1] * 100) + '% 实践 + ' + Math.round(item[3][2] * 100) + '% 证据',
      caption: '当另一位工程师能够检查决策、运行验证器，并在无需还原你意图的情况下操作结果时，综合项目才算完成。'
    });
  });

  LF.register(figures);
})();
