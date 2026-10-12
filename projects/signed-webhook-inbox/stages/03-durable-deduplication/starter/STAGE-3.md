`Accept(dir,id,body,now)(Entry,created,error)`；`LoadEntry(dir,id)(Entry,error)`。Entry 存 schemaVersion、deliveryId、base64 body、sha256、acceptedAt。`ErrConflict` 标识复用交付 ID。损坏存储记录按拒绝原则失败。

确认交付前，持久化接受的身份和正文。
