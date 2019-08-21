# Vue patch算法

Vue的differ`O(n)`是对传统differ`O(n^3)`的策略优化，只对同层级节点进行比较，其中patch部分包含了**属性更新、文本更新、子节点更新**，这里只要是**子节点更新**的实现
