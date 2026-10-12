window.AIFSProjectFigures.register("pj-calendar-focus-planner-1", {
  "title": "读取明确的日历时间区间",
  "steps": [
    {
      "label": "观察输入",
      "detail": "检查给定值，说明它们应满足的契约。"
    },
    {
      "label": "计算状态",
      "detail": "parseCalendar(text)"
    },
    {
      "label": "检查结果",
      "detail": "修改下方一个输入，先预测结果，再解释计算结果的变化。"
    }
  ],
  "caption": "这是一个原创机制演示。修改输入会立即重新计算；项目测试验证实际实现。"
,
"lab":{controls:[{key:'start',label:'开始时间：09:00 后的分钟数',type:'range',value:30,min:0,max:180,step:15},{key:'end',label:'结束时间：09:00 后的分钟数',type:'range',value:75,min:0,max:240,step:15}],calculate(v){const duration=v.end-v.start;return {summary:duration>0?'有效事件占用半开区间 [start, end)。':'拒绝结束早于开始或时长为零的事件。',metrics:[{label:'时长',value:duration+' min'},{label:'边界',value:duration>0?'有效':'无效'}],bars:[{label:'开始偏移',value:v.start},{label:'结束偏移',value:v.end}]};}}
});

window.AIFSProjectFigures.register("pj-calendar-focus-planner-2", {
  "title": "先合并重叠区间，再寻找空档",
  "steps": [
    {
      "label": "观察输入",
      "detail": "检查给定值，说明它们应满足的契约。"
    },
    {
      "label": "计算状态",
      "detail": "availableSlots(events, window, bufferMinutes=0)"
    },
    {
      "label": "检查结果",
      "detail": "修改下方一个输入，先预测结果，再解释计算结果的变化。"
    }
  ],
  "caption": "这是一个原创机制演示。修改输入会立即重新计算；项目测试验证实际实现。"
,
"lab":{controls:[{key:'second',label:'第二场会议开始时间：09:00 后的分钟数',type:'range',value:60,min:0,max:180,step:5},{key:'buffer',label:'两侧缓冲时间（分钟）',type:'range',value:10,min:0,max:30,step:5}],calculate(v){const intervals=[[Math.max(0,30-v.buffer),75+v.buffer],[Math.max(0,v.second-v.buffer),v.second+60+v.buffer]].sort((a,b)=>a[0]-b[0]);const overlap=Math.max(0,Math.min(intervals[0][1],intervals[1][1])-Math.max(intervals[0][0],intervals[1][0]));const sum=intervals.reduce((n,x)=>n+x[1]-x[0],0),busy=sum-overlap;return {summary:'合并区间去除了 '+overlap+' 分钟的重复计数。',metrics:[{label:'合并后的占用时长',value:busy+' min'},{label:'8 小时内的空闲时长',value:480-busy+' min'}],bars:[{label:'直接相加的时长',value:sum},{label:'实际占用时间',value:busy}],columns:['开始偏移','结束偏移'],rows:intervals};}}
});

window.AIFSProjectFigures.register("pj-calendar-focus-planner-3", {
  "title": "按优先级安排，不假装所有任务都放得下",
  "steps": [
    {
      "label": "观察输入",
      "detail": "检查给定值，说明它们应满足的契约。"
    },
    {
      "label": "计算状态",
      "detail": "schedule(tasks, events, window, bufferMinutes=0)"
    },
    {
      "label": "检查结果",
      "detail": "修改下方一个输入，先预测结果，再解释计算结果的变化。"
    }
  ],
  "caption": "这是一个原创机制演示。修改输入会立即重新计算；项目测试验证实际实现。"
,
"lab":{controls:[{key:'gap',label:'连续空档（分钟）',type:'range',value:100,min:15,max:180,step:5},{key:'first',label:'高优先级任务（分钟）',type:'range',value:75,min:15,max:150,step:5},{key:'second',label:'第二个任务（分钟）',type:'range',value:45,min:15,max:120,step:5}],calculate(v){let left=v.gap;const rows=[['高优先级',v.first],['第二个任务',v.second]].map(([label,minutes])=>{const fits=minutes<=left;if(fits)left-=minutes;return [label,minutes,fits?'已安排':'放不下'];});return {summary:'不要为了让计划显得完整而缩短任务时长。',metrics:[{label:'剩余空档',value:left+' min'}],columns:['任务','分钟数','决定'],rows,bars:[{label:'可用时间',value:v.gap},{label:'已用时间',value:v.gap-left}]};}}
});

window.AIFSProjectFigures.register("pj-calendar-focus-planner-4", {
  "title": "导出可审阅的日历提案",
  "steps": [
    {
      "label": "观察输入",
      "detail": "检查给定值，说明它们应满足的契约。"
    },
    {
      "label": "计算状态",
      "detail": "exportCalendar(plan, createdAt); renderPlan(plan)"
    },
    {
      "label": "检查结果",
      "detail": "修改下方一个输入，先预测结果，再解释计算结果的变化。"
    }
  ],
  "caption": "这是一个原创机制演示。修改输入会立即重新计算；项目测试验证实际实现。"
,
"lab":{controls:[{key:'title',label:'日历事件标题',type:'text',value:'Read, then write'}],calculate(v){const escaped=v.title.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');const bytes=new TextEncoder().encode('SUMMARY:'+escaped).length;return {summary:bytes>75?'导出前，在 UTF-8 字符边界处折叠内容行。':'这条 SUMMARY 能放进一行 iCalendar 内容行。',metrics:[{label:'UTF-8 字节数',value:bytes},{label:'需要折叠',value:bytes>75?'是':'否'}],columns:['层次','值'],rows:[['显示标题',v.title],['内容属性','SUMMARY:'+escaped]]};}}
});
