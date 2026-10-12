`Hedged(parent context.Context,client *http.Client,endpoints []string,delay time.Duration)(Receipt,error)`。接受一或两个端点，延迟为 0 到 1 秒。Receipt 含发起尝试数、胜出索引、值、胜出延迟。本阶段的响应验证由脚手架提供。

只有延迟先于胜出响应到期，才发起第二次安全读取。
