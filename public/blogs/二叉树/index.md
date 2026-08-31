## 特征

- 题目只给出 `left`、`right`、`val`，没有排序性质：通常是普通二叉树。
- 强调“左子树、根、右子树”的相对顺序：考虑中序遍历。
- 问“从根到叶子”：通常维护一条路径，或使用前序思路。
- 问“子树高度、子树结果”：通常使用后序遍历。
- 问“逐层、最少层数、右侧可见”：通常使用层序遍历。

二叉树节点一般是：

```cpp
struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;

    TreeNode(int x)
        : val(x), left(nullptr), right(nullptr) {}
};
```

## 流程

### 一、大致判断：答案信息往哪个方向流？

二叉树题通常有三种信息流：

#### 1. 从根向下传信息

当前节点需要知道祖先或路径上的信息。

典型题：

- 路径总和
- 从根到叶子的路径题
- 用上下界验证 BST（二叉搜索树）

常见参数：

```cpp
dfs(node, pathInfo)
```

例如：

```cpp
dfs(node, currentSum)
dfs(node, lowerBound, upperBound)
```

---

#### 2. 从子树向上返回信息

当前节点要先知道左右子树的结果，再计算自己的结果。

典型题：

- 二叉树最大深度
- 二叉树直径
- 二叉树最大路径和
- 验证某种子树性质

常见形式：

```cpp
int dfs(TreeNode* node)
```

核心顺序通常是：

```cpp
左子树结果 = dfs(node->left);
右子树结果 = dfs(node->right);
根据左右结果计算当前节点；
return 当前节点给父节点的信息；
```

这就是后序思维。

---

#### 3. 同时比较左右两棵子树

典型题：

- 对称二叉树
- 判断两棵树是否相同
- 最近公共祖先

常见形式：

```cpp
bool dfs(TreeNode* a, TreeNode* b)
```

这类题不是处理一个节点，而是同时处理两个“对应位置”。

---

### 二、遍历顺序怎么选？

先看“什么时候需要处理当前节点”。

| 题目需求 | 常用遍历 | 原因 |
|---|---|---|
| 先处理根，再把信息传给孩子 | 前序 | 信息向下传 |
| 左、根、右的访问顺序 | 中序 | 题目明确要求中序；BST 中序有序 |
| 需要左右子树结果后再处理根 | 后序 | 信息从下往上汇总 |
| 按层处理、最短层数、右视图 | 层序 | 同一层一起处理 |

---

### 三、通用解题流程

遇到一道二叉树题，可以按这 6 步走：

#### 第一步：判断树的类型

问自己：

- 是普通二叉树，还是 BST？
- 是单棵树，还是需要比较两棵子树？
- 是求一个节点的属性，还是求整棵树的全局答案？
- 是返回结果，还是修改树结构？

#### 第二步：写出 `dfs` 的语义

必须说清楚：

> `dfs(node)` 到底代表什么？

例如：

```cpp
dfs(node) 表示以 node 为根的子树高度
dfs(node) 表示 node 子树中的最大收益
dfs(node) 表示将 node 子树展开成链表
```

#### 第三步：确定参数

看当前节点是否需要额外信息：

```cpp
dfs(node)
dfs(node, currentSum)
dfs(node, lower, upper)
dfs(node, parent)
dfs(a, b)
```

#### 第四步：确定返回值

常见返回值：

```cpp
int       // 高度、收益、数量
bool      // 是否满足条件
TreeNode* // 返回某个节点
void      // 只修改答案或树结构
```

#### 第五步：写递归不变量

例如：

> `dfs(node)` 返回后，返回值准确表示 `node` 子树的高度。

或者：

> `dfs(node)` 执行结束后，答案中已经加入 `node` 子树的全部中序结果。

#### 第六步：处理空节点和复杂度

几乎所有递归题都先处理：

```cpp
if (node == nullptr) {
    return ...
}
```

若每个节点访问常数次：

```text
时间复杂度 O(n)
```

递归栈一般是：

```text
空间复杂度 O(h)
```

其中 `h` 是树高。

---

### 四、C++ 模板

#### 1：三种深度优先遍历

```cpp
void dfs(TreeNode* node) {
    if (node == nullptr) return;

    // 前序：处理当前节点
    dfs(node->left);

    // 中序：处理当前节点
    dfs(node->right);

    // 后序：处理当前节点
}
```

真正决定遍历类型的，是“处理当前节点”的位置。

---

#### 模板 2：后序返回一个值

适合最大深度、子树高度、最长链等问题。

```cpp
int dfs(TreeNode* node) {
    if (node == nullptr) {
        return 0;
    }

    int left = dfs(node->left);
    int right = dfs(node->right);

    return max(left, right) + 1;
}
```

关键思想：

```text
先问孩子，再计算自己
```

---

#### 模板 3：后序返回值，同时更新全局答案

适合直径、最大路径和。

```cpp
int ans = 0;

int dfs(TreeNode* node) {
    if (node == nullptr) {
        return 0;
    }

    int left = dfs(node->left);
    int right = dfs(node->right);

    ans = max(ans, left + right);

    return max(left, right) + 1;
}
```

这里要区分：

- `return` 给父节点使用；
- `ans` 保存整棵树的最终答案。

这是很多二叉树题的核心结构。

---

#### 模板 4：比较两棵对应子树

适合对称二叉树。

```cpp
bool dfs(TreeNode* a, TreeNode* b) {
    if (a == nullptr && b == nullptr) {
        return true;
    }

    if (a == nullptr || b == nullptr) {
        return false;
    }

    if (a->val != b->val) {
        return false;
    }

    return dfs(a->left, b->right) &&
           dfs(a->right, b->left);
}
```

注意对称树不是：

```cpp
left 和 left 比较
right 和 right 比较
```

而是：

```text
左树的左边 ↔ 右树的右边
左树的右边 ↔ 右树的左边
```

---

#### 模板 5：层序遍历

适合层序遍历、最大深度的 BFS、右视图。

```cpp
vector<vector<int>> levelOrder(TreeNode* root) {
    vector<vector<int>> ans;

    if (root == nullptr) {
        return ans;
    }

    queue<TreeNode*> q;
    q.push(root);

    while (!q.empty()) {
        int size = q.size();
        vector<int> level;

        while (size--) {
            TreeNode* node = q.front();
            q.pop();

            level.push_back(node->val);

            if (node->left) q.push(node->left);
            if (node->right) q.push(node->right);
        }

        ans.push_back(level);
    }

    return ans;
}
```

循环不变量：

> 每次进入外层循环时，队列中只保存当前待处理层及其下一层节点；固定处理进入循环时的 `size`，就能保证本轮只处理一整层。

---

#### 模板 6：BST 中序遍历

BST 的性质：

```text
左子树所有值 < 根节点 < 右子树所有值
```

因此 BST 中序遍历一定升序。

```cpp
void inorder(TreeNode* node) {
    if (node == nullptr) return;

    inorder(node->left);

    // 这里访问节点时，顺序是递增的
    inorder(node->right);
}
```

适合：

- 验证 BST
- BST 第 K 小元素

---

#### 模板 7：上下界验证 BST

```cpp
bool dfs(TreeNode* node, long long low, long long high) {
    if (node == nullptr) {
        return true;
    }

    if (node->val <= low || node->val >= high) {
        return false;
    }

    return dfs(node->left, low, node->val) &&
           dfs(node->right, node->val, high);
}
```

关键是：

- 左子树范围变成 `(low, node->val)`
- 右子树范围变成 `(node->val, high)`

不能只比较当前节点和父节点，因为 BST 的限制来自所有祖先。

---

#### 模板 8：路径信息向下传递

例如路径和：

```cpp
void dfs(TreeNode* node, long long sum) {
    if (node == nullptr) {
        return;
    }

    sum += node->val;

    dfs(node->left, sum);
    dfs(node->right, sum);
}
```

如果要统计“任意起点到当前节点”的路径数量，通常会加上前缀和哈希表：

```cpp
unordered_map<long long, int> prefix;
```

这就是“路径总和 III”的模型。

---

#### 模板 9：根据遍历序列构造树

前序确定根，中序确定左右子树范围：

```cpp
TreeNode* build(
    vector<int>& preorder,
    int preL, int preR,
    vector<int>& inorder,
    int inL, int inR
) {
    if (preL > preR) {
        return nullptr;
    }

    int rootValue = preorder[preL];
    TreeNode* root = new TreeNode(rootValue);

    int k = position[rootValue]; // 根在中序中的位置
    int leftSize = k - inL;

    root->left = build(
        preorder,
        preL + 1,
        preL + leftSize,
        inorder,
        inL,
        k - 1
    );

    root->right = build(
        preorder,
        preL + leftSize + 1,
        preR,
        inorder,
        k + 1,
        inR
    );

    return root;
}
```