`Connect(rows []Row,workloads []Workload) []Row` 返回带可选修订版本和调查文本的行副本。不修改输入。修订版本注解键为 deployment.kubernetes.io/revision。

沿所有者 UID 追踪，不根据名称猜测。
