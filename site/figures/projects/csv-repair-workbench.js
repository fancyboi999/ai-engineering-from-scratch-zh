(function () {
  "use strict";
  window.AIFSProjectFigures.register("pj-csv-repair-workbench-1", {"title": "分析列并保留原始单元格", "caption": "统计缺失值和不同取值，同时原样保留源单元格。", "steps": [{"label": "分析列并保留原始单元格", "detail": "统计缺失值和不同取值，同时原样保留源单元格。"}, {"label": "提出明确的规范化规则", "detail": "按给定策略构建明确、有序的配方。"}, {"label": "预览修改并审阅歧义值", "detail": "展示每个变化的单元格，隔离不确定日期。"}, {"label": "导出可复用修复配方和清洗后表格", "detail": "重放配方，校验人工单元格决定。"}], lab: {controls: [{"key": "cell", "label": "原始地点单元格", "type": "text", "value": " N. Garden "}, {"key": "alias", "label": "明确别名", "type": "text", "value": "N. Garden"}, {"key": "canonical", "label": "规范拼写", "type": "text", "value": "North Garden"}, {"key": "date", "label": "原始日期单元格", "type": "text", "value": "03/04/2026"}, {"key": "approved", "label": "批准已审阅日期", "type": "checkbox", "value": false}, {"key": "reviewed", "label": "已审阅的 ISO 日期", "type": "text", "value": "2026-04-03"}], calculate(values, stepIndex) { const stage = 1;

const trimmed=values.cell.trim(), normalized=trimmed===values.alias?values.canonical:trimmed;
const rawDate=values.date.trim(); let dateValue=rawDate, reason='';
function validDate(year,month,day){const d=new Date(Date.UTC(year,month-1,day));return d.getUTCFullYear()===year&&d.getUTCMonth()===month-1&&d.getUTCDate()===day;}
function iso(year,month,day){return String(year).padStart(4,'0')+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');}
if(rawDate){
  const slash=rawDate.match(/^(\d+)\/(\d+)\/(\d{4})$/), exact=rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(slash){const a=Number(slash[1]),b=Number(slash[2]),year=Number(slash[3]);if(a<=12&&b<=12&&a!==b)reason='有歧义的日期';else{const day=a>12?a:b,month=a>12?b:a;if(validDate(year,month,day))dateValue=iso(year,month,day);else reason='无效日期';}}
  else if(!exact||!validDate(Number(exact[1]),Number(exact[2]),Number(exact[3])))reason='无效日期';
}
const reviewed=values.reviewed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
const accepted=stage===4&&reason&&values.approved&&reviewed&&validDate(Number(reviewed[1]),Number(reviewed[2]),Number(reviewed[3]));
if(accepted){dateValue=values.reviewed;reason='';}
const rows=stage===1?[['place',JSON.stringify(values.cell),'原样保留'],['date',JSON.stringify(values.date),'原样保留']]:stage===2?[['trim',JSON.stringify(values.cell),JSON.stringify(trimmed)],['alias',JSON.stringify(trimmed),JSON.stringify(normalized)],['date policy',rawDate,reason||dateValue]]:[['place',JSON.stringify(values.cell),JSON.stringify(normalized)],['date',values.date,reason?'未改变：'+reason:dateValue]];
return {summary:stage===1?'原始单元格字符串仍可查看。':reason?'日期仍待处理：'+reason+'.':'每个显示的变化均遵循明确配方或已审阅日期。',columns:['单元格／操作','之前','之后／状态'],rows,metrics:[{label:'变化单元格',value:stage===1?0:Number(values.cell!==normalized)+Number(values.date!==dateValue)},{label:'待处理日期',value:stage<3?0:Number(Boolean(reason))},{label:'保留的原始行',value:1}]};

}}});
  window.AIFSProjectFigures.register("pj-csv-repair-workbench-2", {"title": "提出明确的规范化规则", "caption": "按给定策略构建明确、有序的配方。", "steps": [{"label": "分析列并保留原始单元格", "detail": "统计缺失值和不同取值，同时原样保留源单元格。"}, {"label": "提出明确的规范化规则", "detail": "按给定策略构建明确、有序的配方。"}, {"label": "预览修改并审阅歧义值", "detail": "展示每个变化的单元格，隔离不确定日期。"}, {"label": "导出可复用修复配方和清洗后表格", "detail": "重放配方，校验人工单元格决定。"}], lab: {controls: [{"key": "cell", "label": "原始地点单元格", "type": "text", "value": " N. Garden "}, {"key": "alias", "label": "明确别名", "type": "text", "value": "N. Garden"}, {"key": "canonical", "label": "规范拼写", "type": "text", "value": "North Garden"}, {"key": "date", "label": "原始日期单元格", "type": "text", "value": "03/04/2026"}, {"key": "approved", "label": "批准已审阅日期", "type": "checkbox", "value": false}, {"key": "reviewed", "label": "已审阅的 ISO 日期", "type": "text", "value": "2026-04-03"}], calculate(values, stepIndex) { const stage = 2;

const trimmed=values.cell.trim(), normalized=trimmed===values.alias?values.canonical:trimmed;
const rawDate=values.date.trim(); let dateValue=rawDate, reason='';
function validDate(year,month,day){const d=new Date(Date.UTC(year,month-1,day));return d.getUTCFullYear()===year&&d.getUTCMonth()===month-1&&d.getUTCDate()===day;}
function iso(year,month,day){return String(year).padStart(4,'0')+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');}
if(rawDate){
  const slash=rawDate.match(/^(\d+)\/(\d+)\/(\d{4})$/), exact=rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(slash){const a=Number(slash[1]),b=Number(slash[2]),year=Number(slash[3]);if(a<=12&&b<=12&&a!==b)reason='有歧义的日期';else{const day=a>12?a:b,month=a>12?b:a;if(validDate(year,month,day))dateValue=iso(year,month,day);else reason='无效日期';}}
  else if(!exact||!validDate(Number(exact[1]),Number(exact[2]),Number(exact[3])))reason='无效日期';
}
const reviewed=values.reviewed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
const accepted=stage===4&&reason&&values.approved&&reviewed&&validDate(Number(reviewed[1]),Number(reviewed[2]),Number(reviewed[3]));
if(accepted){dateValue=values.reviewed;reason='';}
const rows=stage===1?[['place',JSON.stringify(values.cell),'原样保留'],['date',JSON.stringify(values.date),'原样保留']]:stage===2?[['trim',JSON.stringify(values.cell),JSON.stringify(trimmed)],['alias',JSON.stringify(trimmed),JSON.stringify(normalized)],['date policy',rawDate,reason||dateValue]]:[['place',JSON.stringify(values.cell),JSON.stringify(normalized)],['date',values.date,reason?'未改变：'+reason:dateValue]];
return {summary:stage===1?'原始单元格字符串仍可查看。':reason?'日期仍待处理：'+reason+'.':'每个显示的变化均遵循明确配方或已审阅日期。',columns:['单元格／操作','之前','之后／状态'],rows,metrics:[{label:'变化单元格',value:stage===1?0:Number(values.cell!==normalized)+Number(values.date!==dateValue)},{label:'待处理日期',value:stage<3?0:Number(Boolean(reason))},{label:'保留的原始行',value:1}]};

}}});
  window.AIFSProjectFigures.register("pj-csv-repair-workbench-3", {"title": "预览修改并审阅歧义值", "caption": "展示每个变化的单元格，隔离不确定日期。", "steps": [{"label": "分析列并保留原始单元格", "detail": "统计缺失值和不同取值，同时原样保留源单元格。"}, {"label": "提出明确的规范化规则", "detail": "按给定策略构建明确、有序的配方。"}, {"label": "预览修改并审阅歧义值", "detail": "展示每个变化的单元格，隔离不确定日期。"}, {"label": "导出可复用修复配方和清洗后表格", "detail": "重放配方，校验人工单元格决定。"}], lab: {controls: [{"key": "cell", "label": "原始地点单元格", "type": "text", "value": " N. Garden "}, {"key": "alias", "label": "明确别名", "type": "text", "value": "N. Garden"}, {"key": "canonical", "label": "规范拼写", "type": "text", "value": "North Garden"}, {"key": "date", "label": "原始日期单元格", "type": "text", "value": "03/04/2026"}, {"key": "approved", "label": "批准已审阅日期", "type": "checkbox", "value": false}, {"key": "reviewed", "label": "已审阅的 ISO 日期", "type": "text", "value": "2026-04-03"}], calculate(values, stepIndex) { const stage = 3;

const trimmed=values.cell.trim(), normalized=trimmed===values.alias?values.canonical:trimmed;
const rawDate=values.date.trim(); let dateValue=rawDate, reason='';
function validDate(year,month,day){const d=new Date(Date.UTC(year,month-1,day));return d.getUTCFullYear()===year&&d.getUTCMonth()===month-1&&d.getUTCDate()===day;}
function iso(year,month,day){return String(year).padStart(4,'0')+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');}
if(rawDate){
  const slash=rawDate.match(/^(\d+)\/(\d+)\/(\d{4})$/), exact=rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(slash){const a=Number(slash[1]),b=Number(slash[2]),year=Number(slash[3]);if(a<=12&&b<=12&&a!==b)reason='有歧义的日期';else{const day=a>12?a:b,month=a>12?b:a;if(validDate(year,month,day))dateValue=iso(year,month,day);else reason='无效日期';}}
  else if(!exact||!validDate(Number(exact[1]),Number(exact[2]),Number(exact[3])))reason='无效日期';
}
const reviewed=values.reviewed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
const accepted=stage===4&&reason&&values.approved&&reviewed&&validDate(Number(reviewed[1]),Number(reviewed[2]),Number(reviewed[3]));
if(accepted){dateValue=values.reviewed;reason='';}
const rows=stage===1?[['place',JSON.stringify(values.cell),'原样保留'],['date',JSON.stringify(values.date),'原样保留']]:stage===2?[['trim',JSON.stringify(values.cell),JSON.stringify(trimmed)],['alias',JSON.stringify(trimmed),JSON.stringify(normalized)],['date policy',rawDate,reason||dateValue]]:[['place',JSON.stringify(values.cell),JSON.stringify(normalized)],['date',values.date,reason?'未改变：'+reason:dateValue]];
return {summary:stage===1?'原始单元格字符串仍可查看。':reason?'日期仍待处理：'+reason+'.':'每个显示的变化均遵循明确配方或已审阅日期。',columns:['单元格／操作','之前','之后／状态'],rows,metrics:[{label:'变化单元格',value:stage===1?0:Number(values.cell!==normalized)+Number(values.date!==dateValue)},{label:'待处理日期',value:stage<3?0:Number(Boolean(reason))},{label:'保留的原始行',value:1}]};

}}});
  window.AIFSProjectFigures.register("pj-csv-repair-workbench-4", {"title": "导出可复用修复配方和清洗后表格", "caption": "重放配方，校验人工单元格决定。", "steps": [{"label": "分析列并保留原始单元格", "detail": "统计缺失值和不同取值，同时原样保留源单元格。"}, {"label": "提出明确的规范化规则", "detail": "按给定策略构建明确、有序的配方。"}, {"label": "预览修改并审阅歧义值", "detail": "展示每个变化的单元格，隔离不确定日期。"}, {"label": "导出可复用修复配方和清洗后表格", "detail": "重放配方，校验人工单元格决定。"}], lab: {controls: [{"key": "cell", "label": "原始地点单元格", "type": "text", "value": " N. Garden "}, {"key": "alias", "label": "明确别名", "type": "text", "value": "N. Garden"}, {"key": "canonical", "label": "规范拼写", "type": "text", "value": "North Garden"}, {"key": "date", "label": "原始日期单元格", "type": "text", "value": "03/04/2026"}, {"key": "approved", "label": "批准已审阅日期", "type": "checkbox", "value": false}, {"key": "reviewed", "label": "已审阅的 ISO 日期", "type": "text", "value": "2026-04-03"}], calculate(values, stepIndex) { const stage = 4;

const trimmed=values.cell.trim(), normalized=trimmed===values.alias?values.canonical:trimmed;
const rawDate=values.date.trim(); let dateValue=rawDate, reason='';
function validDate(year,month,day){const d=new Date(Date.UTC(year,month-1,day));return d.getUTCFullYear()===year&&d.getUTCMonth()===month-1&&d.getUTCDate()===day;}
function iso(year,month,day){return String(year).padStart(4,'0')+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');}
if(rawDate){
  const slash=rawDate.match(/^(\d+)\/(\d+)\/(\d{4})$/), exact=rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(slash){const a=Number(slash[1]),b=Number(slash[2]),year=Number(slash[3]);if(a<=12&&b<=12&&a!==b)reason='有歧义的日期';else{const day=a>12?a:b,month=a>12?b:a;if(validDate(year,month,day))dateValue=iso(year,month,day);else reason='无效日期';}}
  else if(!exact||!validDate(Number(exact[1]),Number(exact[2]),Number(exact[3])))reason='无效日期';
}
const reviewed=values.reviewed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
const accepted=stage===4&&reason&&values.approved&&reviewed&&validDate(Number(reviewed[1]),Number(reviewed[2]),Number(reviewed[3]));
if(accepted){dateValue=values.reviewed;reason='';}
const rows=stage===1?[['place',JSON.stringify(values.cell),'原样保留'],['date',JSON.stringify(values.date),'原样保留']]:stage===2?[['trim',JSON.stringify(values.cell),JSON.stringify(trimmed)],['alias',JSON.stringify(trimmed),JSON.stringify(normalized)],['date policy',rawDate,reason||dateValue]]:[['place',JSON.stringify(values.cell),JSON.stringify(normalized)],['date',values.date,reason?'未改变：'+reason:dateValue]];
return {summary:stage===1?'原始单元格字符串仍可查看。':reason?'日期仍待处理：'+reason+'.':'每个显示的变化均遵循明确配方或已审阅日期。',columns:['单元格／操作','之前','之后／状态'],rows,metrics:[{label:'变化单元格',value:stage===1?0:Number(values.cell!==normalized)+Number(values.date!==dateValue)},{label:'待处理日期',value:stage<3?0:Number(Boolean(reason))},{label:'保留的原始行',value:1}]};

}}});
})();
