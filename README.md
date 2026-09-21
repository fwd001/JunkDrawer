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

**充电管家** — 特斯拉 Model 3 交流充电。给「当前电量 + 什么时候出发 + 什么时候开始充」，算出**刚好在出发前充满所需的最小电流**，并画出「开始 → 充满 → 出发」的时间轴，把满电空放的区间用斜纹标出来。

默认值就是多数人的日常：出发 明天 09:00、开始 出发当天凌晨 01:00、提前 30 分钟充满、家充桩 7 kW。会提前很多就提示「不想满电久放，可以晚点开始 HH:MM」，一键改；电流不够就提示「最晚 HH:MM 就得开始」，同样一键改。

电池差异按厂家建议预置：**磷酸铁锂**要定期充到 100% 才校准得准电量，满电停放负担小，所以目标默认 100%；**三元锂**日常 80–90% 更耐久、怕满电久放，目标默认 90%。选车型（后轮驱动＝磷酸铁锂 60 kWh，长续航/高性能＝三元锂 78/80 kWh）会自动带上电池类型。充电设备按 随车充 10A/16A、家充桩 220V 单相 32A(7 kW)、三相桩 380V(车端约 11 kW) 预置，不用自己填电压相数。交流充电从电表到电池的整体损耗固定按 88% 计（车载充电机 + 线损 + 热管理），不作为一个设置暴露出来。

算法在 `src/tools/chargefit/calc.ts`：电流→功率→时长是解析式的，从小到大取第一个能卡进截止点的档位，所以「最温和」和「刚好来得及」是同一个解；13 条单测覆盖温和电流选择、档位对齐、电流不足、开始时间过晚和边界情况。

参考：[特斯拉·續航里程貼士](https://www.tesla.com/zh_hk/support/range)、[特斯拉家庭充电](https://www.tesla.cn/home-charging)、[特斯拉官方对 LFP 电池的充电建议（汽车之家论坛整理）](http://club.autohome.com.cn/bbs/thread/60ed54fb4cf59d0e/115640843-1.html)、[欧标 32A 充电枪只跑 7 kW 的原因（单相 32A≈7kW、三相 32A≈22kW、随车充 10A≈2.3kW/16A≈3.7kW）](https://m.sohu.com/a/1060332673_122884249)、[2026 家充桩实测对比（Model 3/Y 三相车端 11 kW 上限）](https://auto.sina.cn/2026-09-14/detail-iniruxus9389740.d.html)

