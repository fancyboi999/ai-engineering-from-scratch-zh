window.AIFSProjectFigures.register("pj-feedback-theme-board-1", {
  "title": "使用稳定标识导入反馈",
  "steps": [
    {
      "label": "观察输入",
      "detail": "检查给定值，说明它们应满足的契约。"
    },
    {
      "label": "计算状态",
      "detail": "parseFeedback(text); validateThemes(value)"
    },
    {
      "label": "检查结果",
      "detail": "修改下方一个输入，先预测结果，再解释计算结果的变化。"
    }
  ],
  "caption": "这是一个原创机制演示。修改输入会立即重新计算；项目测试验证实际实现。"
,
"lab":{controls:[{key:'ids',label:'记录 ID（逗号分隔）',type:'text',value:'f-1,f-2,f-3'}],calculate(v){const ids=v.ids.split(',').map(x=>x.trim());const unique=new Set(ids);const valid=ids.every(Boolean)&&ids.length===unique.size;return {summary:valid?'稳定且唯一的记录标识已就绪，可以匹配证据。':'拒绝空记录标识或重复标识。',metrics:[{label:'记录数',value:ids.length},{label:'不同 ID 数',value:unique.size}],columns:['ID','出现次数'],rows:[...unique].map(id=>[id,ids.filter(x=>x===id).length])};}}
});

window.AIFSProjectFigures.register("pj-feedback-theme-board-2", {
  "title": "匹配短语，同时保留原文区间",
  "steps": [
    {
      "label": "观察输入",
      "detail": "检查给定值，说明它们应满足的契约。"
    },
    {
      "label": "计算状态",
      "detail": "findEvidence(row, phrase)"
    },
    {
      "label": "检查结果",
      "detail": "修改下方一个输入，先预测结果，再解释计算结果的变化。"
    }
  ],
  "caption": "这是一个原创机制演示。修改输入会立即重新计算；项目测试验证实际实现。"
,
"lab":{controls:[{key:'text',label:'反馈文本',type:'text',value:'Search shows old pages after updates.'},{key:'phrase',label:'主题短语',type:'text',value:'old pages'}],calculate(v){const tokens=[...v.text.matchAll(/[\p{L}\p{N}]+/gu)],needle=[...v.phrase.matchAll(/[\p{L}\p{N}]+/gu)].map(x=>x[0].toLowerCase());let found=null;if(needle.length)for(let i=0;i<=tokens.length-needle.length;i++)if(needle.every((word,j)=>word===tokens[i+j][0].toLowerCase())){found=[tokens[i].index,tokens[i+needle.length-1].index+tokens[i+needle.length-1][0].length];break;}return {summary:found?'规则匹配到了原文中的确切词语；解释仍需审阅。':'未匹配到连续词语。将此记录保留为未匹配。',metrics:[{label:'是否匹配',value:found?'是':'否'}],columns:['开始位置','结束位置','引用原文'],rows:found?[[found[0],found[1],v.text.slice(...found)]]:[]};}}
});

window.AIFSProjectFigures.register("pj-feedback-theme-board-3", {
  "title": "统计证据，不夸大来源支持",
  "steps": [
    {
      "label": "观察输入",
      "detail": "检查给定值，说明它们应满足的契约。"
    },
    {
      "label": "计算状态",
      "detail": "buildBoard(rows, themes)"
    },
    {
      "label": "检查结果",
      "detail": "修改下方一个输入，先预测结果，再解释计算结果的变化。"
    }
  ],
  "caption": "这是一个原创机制演示。修改输入会立即重新计算；项目测试验证实际实现。"
,
"lab":{controls:[{key:'sources',label:'匹配记录的来源',type:'text',value:'interview-a,interview-a,support-b'}],calculate(v){const sources=v.sources.split(',').map(x=>x.trim()).filter(Boolean),unique=new Set(sources);return {summary:'同一来源的重复反馈不会增加新的来源标签。',metrics:[{label:'已匹配记录数',value:sources.length},{label:'不同来源数',value:unique.size}],bars:[{label:'记录数',value:sources.length},{label:'不同来源数',value:unique.size}],columns:['来源','记录数'],rows:[...unique].map(s=>[s,sources.filter(x=>x===s).length])};}}
});

window.AIFSProjectFigures.register("pj-feedback-theme-board-4", {
  "title": "发布证据与可审阅的调查草稿",
  "steps": [
    {
      "label": "观察输入",
      "detail": "检查给定值，说明它们应满足的契约。"
    },
    {
      "label": "计算状态",
      "detail": "draftIssue(theme); renderBoard(board)"
    },
    {
      "label": "检查结果",
      "detail": "修改下方一个输入，先预测结果，再解释计算结果的变化。"
    }
  ],
  "caption": "这是一个原创机制演示。修改输入会立即重新计算；项目测试验证实际实现。"
,
"lab":{controls:[{key:'matched',label:'有证据的记录数',type:'range',value:4,min:0,max:20,step:1},{key:'unmatched',label:'未匹配记录数',type:'range',value:2,min:0,max:20,step:1}],calculate(v){const total=v.matched+v.unmatched,coverage=total?v.matched/total:0;return {summary:total?'在主题旁同时发布未匹配记录，让覆盖缺口保持可见。':'没有记录：不要报告完全覆盖。',metrics:[{label:'覆盖率',value:(coverage*100).toFixed(1)+'%'},{label:'需审阅数',value:v.unmatched}],bars:[{label:'已匹配',value:v.matched},{label:'未匹配',value:v.unmatched}]};}}
});
