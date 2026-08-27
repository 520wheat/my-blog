## 特征
两个下标同时移动，利用题目中的单调性或者结构，节省掉不必要的搜索

一般来说：
### 同向双指针
- 原地删除元素
- 移动元素
- 去重
- 划分数组
- 一个指针遍历，一个指针维护结果

```cpp
int slow = 0;

for(int fast = 0; fast < nums.size(); fast++){
    if(条件满足){
        nums[slow] = nums[fast];
        slow++;
    }
}
```

### 相向双指针
- 有序数组查找
- 两数之和
- 区间收缩
- 根据某种规律排除一部分答案

```cpp
int l = 0;
int r = nums.size() - 1;

while(l < r){
    //根据规则移动 l 或 r
}
```

## 移动谁
需要明确一个问题：如果我移动了这个指针，排除掉的情况，一定不会是最优解吗
双指针题目的核心往往不在“两个指针”，而是有依据证明某一侧是可以被排除的

### 接雨水
这里以接雨水为例：
https://leetcode.cn/problems/trapping-rain-water/description/

某个位置能接多少雨水，取决于这个位置往两个方向，取各自最高的墙  
min(左侧最高柱子, 右侧最高柱子) - 当前高度

如果每个位置都向左右寻找最高柱子，会重复计算。所以我们使用双指针维护：  
leftMax：左侧已经遇到的最高柱子  
rightMax：右侧已经遇到的最高柱子  

每次处理矮的那一边
```cpp
if (height[left] <= height[right]) {
    处理 left;
} else {
    处理 right;
}
```

```cpp
class Solution {
public:
    int trap(vector<int>& height) {
        int l = 0;
        int r = height.size() - 1;
        int ans = 0;

        int lmx = 0;
        int rmx = 0;
        while(l < r){
            if(height[l] <= height[r]){
                lmx = max(lmx,height[l]);
                ans += lmx - height[l];
                l++;
            }else{
                rmx = max(rmx,height[r]);
                ans += rmx - height[r];
                r--;
            }
        }

        return ans;
    }
};
```