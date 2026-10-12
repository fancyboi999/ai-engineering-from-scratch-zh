`ValidBody(status int,body []byte)(string,error)`；`Read(ctx,client,endpoint,index) Attempt`。Attempt 记录 status、valid、cancelled、late、elapsedMs 和可选 value/error。Receipt 区分 cancelRequested 和 unobserved。客户端结果不能证明服务计算已停止。

快速错误不能胜出；取消是观测，不是费用保证。
