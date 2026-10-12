(function () {
  "use strict";
  window.AIFSProjectFigures.register("pj-subtitle-localization-desk-1", {"title": "解析字幕 cue 并保留时间", "caption": "解析 cue 标识，原样保留时间字符串。", "steps": [{"label": "解析字幕 cue 并保留时间", "detail": "解析 cue 标识，原样保留时间字符串。"}, {"label": "将术语表应用于翻译提案", "detail": "将已审阅术语表应用于给定翻译提案。"}, {"label": "审阅 cue 长度、术语和含义", "detail": "计算阅读压力，不移动时间戳。"}, {"label": "导出本地化字幕及审阅决定", "detail": "输出本地化 WebVTT 前要求明确审阅。"}], lab: {controls: [{"key": "seconds", "label": "cue 时长（秒）", "type": "range", "value": 3, "min": 0.5, "max": 10, "step": 0.5}, {"key": "rate", "label": "阅读预算（字符／秒）", "type": "range", "value": 12, "min": 1, "max": 30}, {"key": "text", "label": "给定翻译提案", "type": "text", "value": "Abre el map."}, {"key": "source", "label": "源术语", "type": "text", "value": "map"}, {"key": "target", "label": "必需目标术语", "type": "text", "value": "mapa"}, {"key": "approved", "label": "审阅者已批准此 cue", "type": "checkbox", "value": false}, {"key": "override", "label": "明确接受阅读超额", "type": "checkbox", "value": false}], calculate(values, stepIndex) { const stage = 1;

const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const pattern=values.source?new RegExp('(?<!\\w)'+escape(values.source)+'(?!\\w)','gi'):null;
const proposal=stage===1?values.text:pattern?values.text.replace(pattern,()=>values.target):values.text;
const visible=proposal.replace(/<[^>]*>/g,''),count=Array.from(visible.replace(/\s/g,'')).length,budget=Math.floor(values.seconds*values.rate),overflow=count>budget;
const termPresent=values.target.length>0&&proposal.toLowerCase().includes(values.target.toLowerCase());
const emit=values.approved&&termPresent&&(!overflow||values.override);
return {summary:stage===1?'时间仍是 '+values.seconds+' 秒窗口。':stage===2?'术语表结果：'+proposal:stage===3?(overflow?'字幕超过阅读预算。':'字幕符合阅读预算。'):(emit?'已审阅 cue 可按原时间导出。':'cue 仍在审阅中；不输出最终字幕轨。'),metrics:[{label:'时长（秒）',value:values.seconds},{label:'可见字符数',value:count},{label:'预算',value:budget},{label:'字符／秒',value:(count/values.seconds).toFixed(2)}],columns:['证据','值'],rows:[['源术语',values.source],['目标术语',values.target],['提案',proposal],['含有术语',termPresent],['阅读超额',overflow],['已审阅导出',stage===4&&emit]],bars:[{label:'字幕字符数',value:count,max:Math.max(1,budget,count)},{label:'可用预算',value:budget,max:Math.max(1,budget,count)}]};

}}});
  window.AIFSProjectFigures.register("pj-subtitle-localization-desk-2", {"title": "将术语表应用于翻译提案", "caption": "将已审阅术语表应用于给定翻译提案。", "steps": [{"label": "解析字幕 cue 并保留时间", "detail": "解析 cue 标识，原样保留时间字符串。"}, {"label": "将术语表应用于翻译提案", "detail": "将已审阅术语表应用于给定翻译提案。"}, {"label": "审阅 cue 长度、术语和含义", "detail": "计算阅读压力，不移动时间戳。"}, {"label": "导出本地化字幕及审阅决定", "detail": "输出本地化 WebVTT 前要求明确审阅。"}], lab: {controls: [{"key": "seconds", "label": "cue 时长（秒）", "type": "range", "value": 3, "min": 0.5, "max": 10, "step": 0.5}, {"key": "rate", "label": "阅读预算（字符／秒）", "type": "range", "value": 12, "min": 1, "max": 30}, {"key": "text", "label": "给定翻译提案", "type": "text", "value": "Abre el map."}, {"key": "source", "label": "源术语", "type": "text", "value": "map"}, {"key": "target", "label": "必需目标术语", "type": "text", "value": "mapa"}, {"key": "approved", "label": "审阅者已批准此 cue", "type": "checkbox", "value": false}, {"key": "override", "label": "明确接受阅读超额", "type": "checkbox", "value": false}], calculate(values, stepIndex) { const stage = 2;

const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const pattern=values.source?new RegExp('(?<!\\w)'+escape(values.source)+'(?!\\w)','gi'):null;
const proposal=stage===1?values.text:pattern?values.text.replace(pattern,()=>values.target):values.text;
const visible=proposal.replace(/<[^>]*>/g,''),count=Array.from(visible.replace(/\s/g,'')).length,budget=Math.floor(values.seconds*values.rate),overflow=count>budget;
const termPresent=values.target.length>0&&proposal.toLowerCase().includes(values.target.toLowerCase());
const emit=values.approved&&termPresent&&(!overflow||values.override);
return {summary:stage===1?'时间仍是 '+values.seconds+' 秒窗口。':stage===2?'术语表结果：'+proposal:stage===3?(overflow?'字幕超过阅读预算。':'字幕符合阅读预算。'):(emit?'已审阅 cue 可按原时间导出。':'cue 仍在审阅中；不输出最终字幕轨。'),metrics:[{label:'时长（秒）',value:values.seconds},{label:'可见字符数',value:count},{label:'预算',value:budget},{label:'字符／秒',value:(count/values.seconds).toFixed(2)}],columns:['证据','值'],rows:[['源术语',values.source],['目标术语',values.target],['提案',proposal],['含有术语',termPresent],['阅读超额',overflow],['已审阅导出',stage===4&&emit]],bars:[{label:'字幕字符数',value:count,max:Math.max(1,budget,count)},{label:'可用预算',value:budget,max:Math.max(1,budget,count)}]};

}}});
  window.AIFSProjectFigures.register("pj-subtitle-localization-desk-3", {"title": "审阅 cue 长度、术语和含义", "caption": "计算阅读压力，不移动时间戳。", "steps": [{"label": "解析字幕 cue 并保留时间", "detail": "解析 cue 标识，原样保留时间字符串。"}, {"label": "将术语表应用于翻译提案", "detail": "将已审阅术语表应用于给定翻译提案。"}, {"label": "审阅 cue 长度、术语和含义", "detail": "计算阅读压力，不移动时间戳。"}, {"label": "导出本地化字幕及审阅决定", "detail": "输出本地化 WebVTT 前要求明确审阅。"}], lab: {controls: [{"key": "seconds", "label": "cue 时长（秒）", "type": "range", "value": 3, "min": 0.5, "max": 10, "step": 0.5}, {"key": "rate", "label": "阅读预算（字符／秒）", "type": "range", "value": 12, "min": 1, "max": 30}, {"key": "text", "label": "给定翻译提案", "type": "text", "value": "Abre el map."}, {"key": "source", "label": "源术语", "type": "text", "value": "map"}, {"key": "target", "label": "必需目标术语", "type": "text", "value": "mapa"}, {"key": "approved", "label": "审阅者已批准此 cue", "type": "checkbox", "value": false}, {"key": "override", "label": "明确接受阅读超额", "type": "checkbox", "value": false}], calculate(values, stepIndex) { const stage = 3;

const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const pattern=values.source?new RegExp('(?<!\\w)'+escape(values.source)+'(?!\\w)','gi'):null;
const proposal=stage===1?values.text:pattern?values.text.replace(pattern,()=>values.target):values.text;
const visible=proposal.replace(/<[^>]*>/g,''),count=Array.from(visible.replace(/\s/g,'')).length,budget=Math.floor(values.seconds*values.rate),overflow=count>budget;
const termPresent=values.target.length>0&&proposal.toLowerCase().includes(values.target.toLowerCase());
const emit=values.approved&&termPresent&&(!overflow||values.override);
return {summary:stage===1?'时间仍是 '+values.seconds+' 秒窗口。':stage===2?'术语表结果：'+proposal:stage===3?(overflow?'字幕超过阅读预算。':'字幕符合阅读预算。'):(emit?'已审阅 cue 可按原时间导出。':'cue 仍在审阅中；不输出最终字幕轨。'),metrics:[{label:'时长（秒）',value:values.seconds},{label:'可见字符数',value:count},{label:'预算',value:budget},{label:'字符／秒',value:(count/values.seconds).toFixed(2)}],columns:['证据','值'],rows:[['源术语',values.source],['目标术语',values.target],['提案',proposal],['含有术语',termPresent],['阅读超额',overflow],['已审阅导出',stage===4&&emit]],bars:[{label:'字幕字符数',value:count,max:Math.max(1,budget,count)},{label:'可用预算',value:budget,max:Math.max(1,budget,count)}]};

}}});
  window.AIFSProjectFigures.register("pj-subtitle-localization-desk-4", {"title": "导出本地化字幕及审阅决定", "caption": "输出本地化 WebVTT 前要求明确审阅。", "steps": [{"label": "解析字幕 cue 并保留时间", "detail": "解析 cue 标识，原样保留时间字符串。"}, {"label": "将术语表应用于翻译提案", "detail": "将已审阅术语表应用于给定翻译提案。"}, {"label": "审阅 cue 长度、术语和含义", "detail": "计算阅读压力，不移动时间戳。"}, {"label": "导出本地化字幕及审阅决定", "detail": "输出本地化 WebVTT 前要求明确审阅。"}], lab: {controls: [{"key": "seconds", "label": "cue 时长（秒）", "type": "range", "value": 3, "min": 0.5, "max": 10, "step": 0.5}, {"key": "rate", "label": "阅读预算（字符／秒）", "type": "range", "value": 12, "min": 1, "max": 30}, {"key": "text", "label": "给定翻译提案", "type": "text", "value": "Abre el map."}, {"key": "source", "label": "源术语", "type": "text", "value": "map"}, {"key": "target", "label": "必需目标术语", "type": "text", "value": "mapa"}, {"key": "approved", "label": "审阅者已批准此 cue", "type": "checkbox", "value": false}, {"key": "override", "label": "明确接受阅读超额", "type": "checkbox", "value": false}], calculate(values, stepIndex) { const stage = 4;

const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const pattern=values.source?new RegExp('(?<!\\w)'+escape(values.source)+'(?!\\w)','gi'):null;
const proposal=stage===1?values.text:pattern?values.text.replace(pattern,()=>values.target):values.text;
const visible=proposal.replace(/<[^>]*>/g,''),count=Array.from(visible.replace(/\s/g,'')).length,budget=Math.floor(values.seconds*values.rate),overflow=count>budget;
const termPresent=values.target.length>0&&proposal.toLowerCase().includes(values.target.toLowerCase());
const emit=values.approved&&termPresent&&(!overflow||values.override);
return {summary:stage===1?'时间仍是 '+values.seconds+' 秒窗口。':stage===2?'术语表结果：'+proposal:stage===3?(overflow?'字幕超过阅读预算。':'字幕符合阅读预算。'):(emit?'已审阅 cue 可按原时间导出。':'cue 仍在审阅中；不输出最终字幕轨。'),metrics:[{label:'时长（秒）',value:values.seconds},{label:'可见字符数',value:count},{label:'预算',value:budget},{label:'字符／秒',value:(count/values.seconds).toFixed(2)}],columns:['证据','值'],rows:[['源术语',values.source],['目标术语',values.target],['提案',proposal],['含有术语',termPresent],['阅读超额',overflow],['已审阅导出',stage===4&&emit]],bars:[{label:'字幕字符数',value:count,max:Math.max(1,budget,count)},{label:'可用预算',value:budget,max:Math.max(1,budget,count)}]};

}}});
})();
