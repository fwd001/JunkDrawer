# 杂物抽屉 JunkDrawer

纯前端工具箱。打开就是一个大卡片入口，点进去直接能用；每个工具自己记住你上次的用法，所有数据只留在你自己的设备上（localStorage，无后端、无账号）。

移动端按原生 App 的方式做：整屏路由切换、左缘右滑返回、毛玻璃标题栏、安全区适配、深色模式跟随系统，并且是一个可离线使用的 PWA，可以装到手机桌面。

## 技术栈

| 用途 | 选择 |
| --- | --- |
| 构建 | [Vite 8](https://vite.dev) + TypeScript |
| 框架 | [Vue 3.5](https://vuejs.org) 组合式 API + `<script setup>` |
| 路由 | vue-router 5（路由表由工具注册表生成） |
| UI | [Vant 4](https://vant-ui.github.io)（滑块、滚轮选择器、折叠面板等移动端控件） |
| 样式 | [UnoCSS](https://unocss.dev) preset-wind4 + preset-icons（lucide） |
| 工具函数 | [VueUse](https://vueuse.org)（`useStorage` / `useIntervalFn` / `useOnline` …） |
| PWA | vite-plugin-pwa（Workbox `generateSW`，`autoUpdate`） |
| 测试 | Vitest |

## 开发

```bash
npm install
npm run dev        # 开发，手机可用局域网地址同看
npm test           # 纯逻辑单测
npm run typecheck  # vue-tsc 类型检查
npm run build      # 产物在 dist/
```

## 部署到 GitHub Pages

`push` 到 `main` 后，`.github/workflows/deploy.yml` 会自动构建并发布到 Pages。

1. 仓库 Settings → Pages → Source 选 **GitHub Actions**
2. 访问地址即 `https://<你的用户名>.github.io/<仓库名>/`

两个和 Pages 相关的细节：

- 资源路径用 `VITE_BASE=/<仓库名>/` 注入，本地开发仍是 `/`
- Pages 没有 SPA 重写，构建后把 `dist/index.html` 复制成 `dist/404.html`，深链接（如 `/charge-fit`）才能直接打开

## 加工具

加工具只需要两步，注册表同时驱动首页卡片和路由表：

1. 新建 `src/tools/<name>/`：`calc.ts`（纯函数，配 `*.spec.ts`）、`state.ts`（`toolStorage()` 持久化状态）、`XxxView.vue`（界面，外层套 `ToolPage`）
2. 在 `src/core/tools.ts` 的 `tools` 数组里加一条：名称、图标、`path`、懒加载组件

状态一律用 `toolStorage(toolId, key, 默认值)`，命名空间是 `jd:tool:<toolId>:<key>`，所以每个工具的记忆互相独立、可以单独清掉。首页的「继续上次」和卡片排序来自 `src/core/session.ts` 的使用次数/时间，不需要工具自己写代码。

## 现有工具

**充电管家** — 特斯拉 Model 3 交流充电：给当前电量、目标电量和出发时间，算出*刚好来得及的最小电流*（不是最大电流），并给出功率、充电时长、充满时刻和提前量。参数（容量、最大电流、步进、电压相数、效率、提前量）都记住上次的值。算法在 `src/tools/chargefit/calc.ts`，从电流→功率→时长是解析式的，单测覆盖了温和电流选择、档位对齐、电流不足和边界情况。
