`Sign(key []byte,id string,timestamp int64,body []byte)string`；`Verify(Delivery,key,now,skew)error`。密钥至少 16 字节；skew 为 0..1 小时。接收器用五分钟。格式为原创，不兼容任何具名 webhook provider。

按明确教学方案认证身份、时间戳与原始字节。
