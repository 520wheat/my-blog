## 特征
1. 快速判断一个元素是否存在(两数关系)
2. 是否需要统计出现次数
3. 是否需要记录下标
4. 是否需要映射（将同样特征的元素放到一起）

只需要判断**存在性**可以使用`set`
```cpp
unordered_set<int> st;
```

其余情况可以使用`map`
```cpp
unordered_map<int,int> mp;
```

## 解题流程
### 1.确认保存的东西
只判断存在性       -> unordered_set  
统计出现次数       -> unordered_map<T, int>  
记录下标           -> unordered_map<T, int>  
记录分组           -> unordered_map<Key, vector< T >>  
记录第一次出现     -> 只在不存在时插入  
记录最后一次出现   -> 每次直接覆盖

### 2.确定key
这里要确定一个用来快速查找的标识，下面提供一些例子：
```text
两数之和：
key = 数值
value = 下标

字母异位词：
key = 排序后的字符串或字符计数
value = 同组字符串

最长连续序列：
key = 数值
value = 是否存在
```
### 3.确认循环不变量
循环每次开始时都成立、执行一轮后仍然成立的条件。  
用于明确当前数据结构代表什么，帮助验证循环逻辑正确，避免重复计算、漏算或错误使用当前数据。

### 4.检查边界
- 空数组
- 数组中有重复元素
- 负数和 0
- 当前元素是否会和自己匹配
- 第一次出现和最后一次出现
- key 是否真的能唯一表示特征

## 参考模版
### 1.计数
```cpp
unordered_map<int,int> freq;

for(int x : nums){
    ++freq[x];
}
```

### 2.查找补数
```cpp
unordered_map<int,int> pos;

for(int i = 0; i < nums.size(); i++){
    int need = target - nums[i];

    if(pos.find(need) != pos.end()){
        // 找到了
    }

    pos[nums[i]] = i;//没找到的时候将此时这个nums[i]存入哈希表
}
```

### 3.判断存在性
```cpp
unordered_set<int> st(nums.begin(), nums.end());

if(st.count(x)){
    //x存在
}
```

### 4.按特征分组
```cpp
unordered_map<string, vector<string>> groups;

for(string& s : strs){
    string key = s;
    sort(key.begin(), key.end());

    groups[key].push_back(s);
}
```