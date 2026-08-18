## 0.前情摘要

Cordis 是 deepseek 的插件框架，dsh（deepseek harness）基于此框架。
它不是“启动一组模块”的工具，而是一个可**动态组合**的**运行时**：

> 插件声明依赖，
> Context 提供能力，
> Service 暴露能力，
> 事件负责协作，
> Fiber 管理加载、卸载与副作用。

因此，在读 dsh 插件时优先思考：

1. 它依赖哪些服务？
2. 它在 `apply()` 中注册了什么？
3. 这些注册在卸载时如何撤销？
4. 它监听的是观察事件、决策事件，还是中间件事件？

可以先把 Cordis 想象成一个会不断变化的运行时，而不是一张只在启动时解析一次的依赖图：

![](/blogs/dsh/dcc184fc053014bd.svg)

这张图可以作为全文的阅读索引：插件通过 Context 获取能力，通过事件参与协作，通过 Fiber 管理自己的生命周期；依赖和配置变化时，插件的行为也会随之安装、撤销或重新安装。

---

## 1.Plugin、Context、Service、inject
### `Plugin`
Cordis 支持三种插件形态：

#### 函数插件
这是 dsh 中最常见的
```TS
export const name = 'session-stats'
export const inject = ['sessionProjections']

export function apply(ctx: Context) {
  ctx.sessionProjections.register(definition)
}
```

#### 对象插件
```TS
export default {
  name: 'my-plugin',
  apply(ctx: Context) {
    // ...
  },
}
```

#### Service 子类插件
`Service` 本身也是一种插件。
它的特殊之处在于：构造时会把实例注册到 Context 中。
```
class MyService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'myService')
  }
}
```

### `Context`

`ctx` 同时承担三件事：

- 服务容器：`ctx.tools`、`ctx.llm`、`ctx.sessions`
- 事件接口：`ctx.on()`、`ctx.emit()`、`ctx.waterfall()`
- 生命周期接口：`ctx.plugin()`、`ctx.effect()`

dsh 的插件通常不直接导入具体实现，而是通过服务名获取能力：

```TS
export const inject = ['tools']

export function apply(ctx: Context) {
  ctx.tools.register(...)
}
```

这样，工具插件依赖的是 `tools` 这个能力，而不是某个具体的工具实现包。未来替换工具注册器时，**消费者**代码不必改变。

### `Service`

一个 Service 通常这样定义：

```TS
export class GreeterService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'greeter')
  }

  greet(name: string) {
    return `Hello, ${name}`
  }
}
```

`super(ctx, 'greeter')` 做了运行时注册。之后其他插件可以使用：

```TS
ctx.greeter.greet('world')
```

TypeScript 类型通常通过声明合并补上：

```TS
declare module '@deepseek-ai/cordis' {
  interface Context {
    greeter: GreeterService
  }
}
```

这里要区分两件事：

- `super(ctx, 'greeter')`：**运行时**注册服务。
- `interface Context`：**编译期**补类型，不产生运行时代码。

### `inject` 与依赖激活

```TS
export const inject = ['sessionProjections']
```

这不是普通的“启动前检查”，而是一个持续的生命周期依赖。

如果 `sessionProjections` 尚未存在，插件处于：

```Json
PENDING
```

此时 `apply()` 不会执行。

当服务出现时：

```text
PENDING -> LOADING -> ACTIVE
```

如果服务后来**被卸载或热替换**：

```text
ACTIVE -> UNLOADING -> PENDING
```

这意味着依赖不是一次性的启动条件，而是插件行为的“供电状态”：服务在线时，消费者可以工作；服务离线时，消费者的注册和监听也应被撤销；服务恢复后，消费者再重新安装自己的贡献。

![](/blogs/dsh/a8eaf0a1ed53c8b3.svg)

服务恢复后，插件会**重新加载**。

所以 `inject` 的真正含义是：

> 只有依赖完整时，这个插件的**行为**才存在。

dsh 官方源码中的例子：

```TS
export const inject = ['sessionProjections']

export function apply(ctx: Context): void {
  ctx.sessionProjections.register(sessionStatsProjectionDefinition)
}
```

这里不需要手动安排 `session-projection` 先于 `session-stats` 加载。只要服务可用，Cordis 会自动激活消费者。

配置文件中的顺序也不代表加载顺序：

```yaml
- name: './consumer.ts'
- name: './provider.ts'
```

只要 `provider` 提供了消费者需要的服务，消费者仍然可以正常启动。

**需要注意的是**，可选依赖不要写入 `inject`，而应在使用处探测：

```TS
const service = ctx.get('optionalService')
service?.run()
```
---

## 2. 事件模型：emit、parallel、serial、waterfall

事件的分发模式是**事件契约**的一部分，不是调用者随便选择的实现细节。

可以用“它是否等待、是否并发、是否传递结果”三个问题快速区分四种事件模型：

![](/blogs/dsh/a8fdc74959219ff8.svg)

### `emit`

```TS
ctx.emit('tools/result', exec, result)
```

语义：
- 同步调用监听器
- 按注册顺序执行
- 不等待 Promise
- 不收集返回值

适合观察型事件，例如：

- 日志
- 遥测
- 状态通知
- 工具结果广播

如果监听器内部有异步工作，通常应明确写成：

```TS
ctx.on('tools/result', (exec, result) => {
  void persistTelemetry(exec, result)
})
```

不要误以为 `emit()` 会等待 `persistTelemetry()`。

### `parallel`

```TS
await ctx.parallel('session/flush', session)
```

语义：
- 所有监听器并发执行
- 等待所有监听器结束
- 适合彼此独立的工作
- 多个失败会聚合后抛出

例如多个持久化、缓存或遥测后端可以并行响应同一个事件。

### `serial`

```TS
const result = await ctx.serial('approval/request', request)
```

语义：
- 按注册顺序执行
- 每个监听器执行完后才进入下一个
- 第一个非 `null`、非 `false`、非 `undefined` 的返回值会终止后续调用
- 有返回值

适合“按策略顺序询问”的事件：

```text
规则 A 没有决定
  -> 规则 B 没有决定
    -> 规则 C 返回批准/拒绝
```

### `bail`

`bail` 是同步版本的 `serial`：

```TS
const answer = ctx.bail('some/decision', input)
```

### `waterfall`

`waterfall` 是最容易读错的模型。

监听器接收 `next`：

```TS
ctx.on('agent/request', async (request, next) => {
  const result = await next()
  return transform(result)
})
```

它像洋葱式中间件：

```text
监听器 A
  -> next()
    -> 监听器 B
      -> next()
        -> 默认处理
      <- B 修改结果
  <- A 再修改结果
```

监听器可以：

1. 调用 `next()`，让下游继续；
2. 修改下游结果；
3. 不调用 `next()`，直接返回自己的结果，从而短路整个链路。

例如权限策略：

```TS
ctx.on('approval/request', async (request, next) => {
  if (request.toolName === 'dangerous-tool') {
    return { decision: 'deny', reason: 'policy' }
  }

  return next()
})
```

最重要的规则：

> 只观察、不负责决策的 waterfall 监听器必须调用 `next()`

否则，一个看似普通的日志监听器就可能吞掉下游默认行为。

---

## 3. `ctx.effect()`、卸载与热重载

Cordis 把插件的注册行为视为“**可逆副作用**”。

### 自己管理的资源

```TS
export function apply(ctx: Context) {
  ctx.effect(() => {
    const timer = setInterval(() => {
      console.log('tick')
    }, 1000)

    return () => {
      clearInterval(timer)
    }
  })
}
```

`ctx.effect()` 的结构是：

```text
执行 effect body
  -> 创建资源
  -> 返回 disposer
  -> 插件卸载时调用 disposer
```

这段流程的关键不在于“创建了什么资源”，而在于创建和撤销必须成对出现。只要把资源放进当前 Fiber 能够追踪的 effect 中，Cordis 才有机会在卸载和热重载时把现场清理干净。

![](/blogs/dsh/7278af969404717f.svg)

如果插件被卸载，定时器会被清除；如果插件被重新加载，新的 `apply()` 会创建新的定时器。

### 哪些操作已经自动成为 effect？

通常不需要手动写 disposer：

```TS
ctx.on('some/event', listener)
ctx.plugin(childPlugin)
ctx.tools.register(tool)
ctx.llm.registerAdapter(...)
```

这些 API 会把撤销动作绑定到当前插件的 Fiber。

例如：

```TS
ctx.on('tools/result', listener)
```

插件卸载时，监听器会自动移除。

### Fiber 状态

一个插件实例对应一个 Fiber，大致经历：

```text
PENDING
  -> LOADING
  -> ACTIVE
  -> UNLOADING
  -> DISPOSED
```

也可能进入：

```json
FAILED
```

常见触发卸载的原因：
- 配置中的 `disabled` 改变
- 配置条目被删除
- 显式调用 `fiber.dispose()`
- 必需服务消失
- HMR 检测到源码变化

### 为什么 HMR 依赖 effect？

HMR 的本质不是“修改旧对象”，而是：

```text
卸载旧插件
  -> 撤销所有 effect
  -> 加载新代码
  -> 再次执行 apply()
```

因此，插件必须把资源纳入生命周期。否则会出现：
- 旧事件监听器仍然存在
- 旧定时器继续触发
- 旧连接未关闭
- 新旧插件同时处理同一事件

dsh 的 `session-persistence` 中有一个很有代表性的模式：

```TS
ctx.effect(() => async () => {
  // 等待写入队列清空
  // 关闭后端
})

ctx.on('session/created', ...)
ctx.on('session/event', ...)
ctx.on('session/flush', ...)
```

它特意先注册最终清理 effect，再注册事件监听器。由于 disposer 按反向注册顺序清理，卸载时会先停止接收新事件，再执行最终 drain。

另一个细节是：多个异步 disposer 可能并发执行。如果清理必须严格按顺序完成，应把它们放进同一个 disposer 中，并显式 `await`。

---

## 4. 配置加载与插件组合

一个基础的 Cordis 配置项：

```yaml
- id: tools
  name: '@deepseek-ai/dsh-tools'
  config:
    maxConcurrent: 4
```

常见字段：
- `id`：稳定身份，用于配置 diff 和 HMR
- `name`：模块或包名
- `config`：传给插件的配置
- `disabled`：保留条目但不挂载
- `group`：把多个条目作为一组管理
- `isolate`：为不同组合提供隔离的服务实例

插件可以导出配置 schema：

```TS
export interface Config {
  maxConcurrent: number
}

export const Config = Schema.object({
  maxConcurrent: Schema.number().default(4),
})

export function apply(ctx: Context, config: Config) {
  // config 已经校验并填充默认值
}
```

配置流程是：

```text
读取配置
  -> 解析插件
  -> 校验 Config
  -> 创建 Fiber
  -> 等待 inject 依赖
  -> 执行 apply(ctx, config)
```

配置可以理解为“声明要组合哪些插件”，而 Fiber 才是运行时对这些声明的管理单元。配置变化并不只是改几个参数，它可能触发插件的重新挂载、卸载或重新激活。

![](/blogs/dsh/10de7d7611392908.svg)

配置无效时，插件不会以“半配置状态”启动，而是进入 `FAILED`。

### dsh 的组合方式

dsh 不是只有一份静态 `cordis.yml`，而是通过多层 patch 组合最终配置：

```text
base bundle
  -> mode bundle
    -> profile cordis.patch.yml
      -> home-level patch
        -> --patch overlay
          -> 环境开关
```

dsh 的 base bundle 中有类似：

```yaml
- id: llm
  name: '@deepseek-ai/dsh-llm'

- id: session
  name: '@deepseek-ai/dsh-session'

- id: session-projection
  name: '@deepseek-ai/dsh-session-projection'
```

这里的重点不是顺序，而是：
- 哪些插件被组合进应用
- 每个插件的配置是什么
- 哪些条目被禁用
- 哪个 provider 实际提供某个服务

`id` 很重要。配置更新时，Loader 可以判断某个条目是：
- 原条目配置发生变化
- 条目被删除
- 新条目被加入
- 仅仅是同一条目被重新挂载

dsh 的 patch 通常按 `id` 定位条目，后层覆盖前层；目标行的 `config` 整体替换，而不是自动深度合并。

---

## 5. Cordis 与其他机制的区别

| 机制       | 主要解决什么       | Cordis 多做了什么                     |
| -------- | ------------ | -------------------------------- |
| 传统 DI 容器 | 创建对象、注入依赖    | 依赖可动态失效和恢复，并绑定插件生命周期             |
| 事件总线     | 发布和订阅消息      | 事件与 Context、Service、Fiber、卸载机制集成 |
| 普通插件系统   | 加载模块、调用初始化函数 | 插件注册、依赖激活、配置更新、HMR、effect 回收统一管理 |
| Cordis   | 运行时组合能力      | 同时提供服务容器、事件模型、作用域和可逆副作用          |

传统 DI 通常是：

```
启动时解析依赖图
  -> 构造对象
  -> 全程持有对象
```

Cordis 更像：

```
依赖可用
  -> 激活插件
  -> 安装它的所有贡献

依赖失效
  -> 卸载插件
  -> 撤销它的所有贡献
```

这正适合 dsh：

- LLM provider 可以替换
- shell provider 可以按平台启用
- 工具包可以按 profile 组合
- 用户配置可以热更新
- 某些能力缺失时，相关插件可以保持 `PENDING`，而不是启动后到处报错

---

## 6. 阅读 dsh 插件的固定方法

看到一个插件文件时，按这个顺序读：

### 第一步：看 `name`

它只是诊断和日志标签，通常不影响逻辑。

### 第二步：看 `inject`

例如：

```TS
export const inject = ['sessionProjections']
```

立刻得到结论：

- 它依赖 `sessionProjections`
- 服务不存在时不会执行 `apply`
- 服务卸载时，它也应该被卸载
- 服务恢复时，它会重新激活

### 第三步：看 `apply`

判断它属于哪类插件：

```TS
ctx.someService.register(...)
```
通常是能力注册插件。

```TS
ctx.on('some/event', ...)
```
通常是事件观察或策略插件。

```TS
ctx.plugin(ChildPlugin)
```
通常是在构建子插件树。

```TS
ctx.effect(...)
```
通常是在接管外部资源生命周期。

### 第四步：找撤销路径

优先检查：
- 注册 API 是否自动返回 disposer
- 是否使用 `ctx.effect()`
- `apply()` 是否返回 disposer
- 是否存在手动创建的 timer、watcher、connection、stream

### 第五步：检查 HMR 语义

如果插件保存了内存状态，要问：
- 热重载后状态是否需要恢复？
- 现有 session 是否需要重新扫描？
- 旧监听器是否已移除？
- 新 provider 是否会触发依赖插件重新加载？
---
