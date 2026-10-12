`Fetch(ctx,*http.Client,url,id,Policy,*Budget)([]Attempt,error)`；`Local(Policy,clients,budget)(Report,error)`。TypeScript `analyze(text)` 在计算放大效应前，检查尝试编号连续性、客户端边界、成功终止性和计数器一致性。

执行实际 HTTP 请求，独立验证导出的计数器。
