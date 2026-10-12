`NewBudget(n int)*Budget`；`(*Budget).Take()bool`；`ServerDelay(value string,now time.Time)(time.Duration,error)`。无效值失败。实时服务端延迟超过 MaxMS 时停止请求，而不是比指示时间更早重试。

限制跨客户端的总尝试次数，而不只是单个请求。
