## 特征
用 left 和 right 表示一个连续区间，让 right 扩大窗口，条件不满足时让 left 缩小窗口。

## 解题流程
```cpp
int left = 0;

for (int right = 0; right < n; ++right) {
    // 1. right 加入窗口

    while (窗口不满足条件) {
        // 2. left 移出窗口
        ++left;
    }

    // 3. 当前窗口满足条件，更新答案
}
```

核心顺序是：扩大窗口 、 判断是否违规 、 缩小窗口 、 更新答案  
最重要的考虑点是：在什么情况下，窗口不合法

### 示例
我们用一道简单题来做演示：  
[无重复字符的最长子串](https://leetcode.cn/problems/longest-substring-without-repeating-characters/description)

#### 思路
例如题目字符串为：
```text
s = "abcabcbb"
```

最长无重复子串是：
```text
"abc"
```

长度为：
```text
3
```

可得窗口中需要维护一个没有重复字符的子串，我们使用
```cpp
unordered_map<char,int> cnt;
```
表示每个字符在当前串中，出现的数量


#### 指针移动规则
右指针移动，意味着向窗口中增加字符
```cpp
++cnt[s[r]];
```

如果出现了重复的字符
```cpp
cnt[s[r]] > 1
```

那就需要移动左指针，直到窗口再次回到没有重复字符的合法状态
```cpp
while(cnt[s[r]] > 1){
    --cnt[s[l]];
    l++;
}
```
现在窗口就合法了，可以更新答案了；

#### 循环不变量
这里的合法情况 -- 每次更新答案之前，窗口 [left, right] 中没有重复字符  
就是循环不变量，所以窗口长度一定是一个合法的答案

#### 模板
```cpp
class Solution{
    public:
    int lengthOfLongestSubstring(string s){
        unordered_map<char,int> cnt;
        int l = 0;
        int ans = 0;

        for(int r = 0; r < s.size(); r++){
            ++cnt[s[r]];

            while(cnt[s[r]] > 1){
                --cnt[s[l]];
                l++;
            }

            ans = max(ans,r-l+1);
        }

        return ans;
    }
};
```