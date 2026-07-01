# 博弈论：律政与代码

> 一款基于博弈论的双人实时对战网页游戏，律师 vs 程序员，用命令点数（CP）进行策略对抗。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Firebase](https://img.shields.io/badge/Firebase-Realtime%20Database-orange)](https://firebase.google.com/)
[![Version](https://img.shields.io/badge/version-V3.5.3-blue)](https://github.com/genoling/command-point-game)

## 🎮 游戏简介

「律政与代码」是一款基于博弈论设计的双人实时对战网页游戏。两位玩家分别扮演**律师**和**程序员**，通过发布命令、使用技能、银行贷款等方式争夺命令点数（CP），体验策略博弈的乐趣。

游戏基于 **Firebase Realtime Database** 实现实时同步，支持双人在线对战，数据即时刷新。

## ✨ 功能特性

### 核心玩法
- **命令系统**：支持 1级（-1 CP）、2级（-2 CP）、3级（-4 CP）三级惩罚命令下达
- **打赌机制**：打赌获胜获得 1 CP
- **All in 通吃**：消耗自身全部 CP，经对方确认后掠夺对方同等数量的 CP（破釜沉舟，防止偷袭）
- **银行系统**：可向银行贷款获得 CP，但会即时生成一条由贷款人自己完成的抵押待办，由对方监督确认完成
- **专属技能**：每个角色拥有独特专属技能，使用后进入 24 小时实时倒计时冷却：
  - 👨‍⚖️ 律师【律师函警告】：强行撤销对方最后下达的 1 条普通命令，全额退还对方消耗的 CP
  - 👨‍💻 程序员【致命Bug】：突袭扣除对方当前 30% 的 CP（按四舍五入计算，最少扣 1 点）

### 系统与安全
- **实时同步**：基于 Firebase 实时数据库，双方操作、日志、待办即时毫秒级同步
- **房间系统**：支持自由创建、加入不同的独立对战房间，支持一键分享专属链接
- **角色密码**：每个角色可独立设置一次性密码，生效后按钮置灰，防止对方跨端越权操纵
- **管理设置**：支持管理员密码验证、全局房间管理（查看/新建/批量删除）、角色密码重置
- **历史撤销**：完整记录战局快照，支持最高 3 步的历史无损撤销回滚
- **数据迁移**：支持整局房间数据的加密导入与导出，无缝支持跨设备、版本升级迁移

### 🎨 V3.5.3 视觉与安全优化
- ✅ **全新明亮淡雅风格**：界面整体重构为清新雅致的浅色调（白底与 `#f8fafc` 优雅灰背景），告别暗色压抑感
- ✅ **CP 术语精准解析**：在游戏规则中明确解析 **CP 即 Command Point（命令点数）**，在卡片高频操作区保持精简易读的 `CP` 简称
- ✅ **默认管理口令脱敏**：全局隐藏默认管理员密码 `8868` 的文案提示，防止屏幕分享或窥屏泄密，提升实战安全性
- ✅ **极简紧凑版房间列表**：优化批量操作与房间表格排版，完美适配移动端与 PC 端查看

## 🎯 游戏规则

### 基本规则
1. 两位玩家分别选择律师或程序员角色。
2. 每回合可以发布命令、打赌、使用技能或发起 All in。
3. 普通命令需要由接收方（对方）确认完成，贷款待办由贷款人自己完成并由对方确认完成。
4. 打赌获胜方可以获得 1 CP 并夺得当前回合。
5. 技能具有 24 小时冷却时间，页面实时显示倒计时。

### 命令等级
| 等级 | CP消耗 | 效果说明 |
|------|--------|------|
| 1级 | -1 CP | 基础惩罚命令 |
| 2级 | -2 CP | 中级惩罚命令 |
| 3级 | -4 CP | 高级惩罚命令 |

### 银行系统
- 可以向银行申请 1、2、4 CP 的紧急贷款。
- 贷款成功后，会立即为贷款方生成一条带 `【贷款抵押】` 标记的特殊待办。
- 只有在对方勾选并确认你完成了该抵押事件后，此贷款待办才会核销。

## 🛠️ 技术栈

- **前端**：单文件纯原生 HTML5 + Tailwind CSS + Vanilla JavaScript
- **实时数据库**：Firebase Realtime Database (Compat SDK)
- **部署**：支持任何静态托管平台（GitHub Pages、Vercel、Netlify 等）

## 🚀 快速开始

### 本地运行
```bash
# 克隆项目
git clone https://github.com/genoling/command-point-game.git

# 进入目录
cd command-point-game

# 直接用浏览器打开
open index.html
```

### Firebase 配置
游戏默认内置了开箱即用的公共测试数据库。如需使用自己的私有数据库，请在 `index.html` 中修改配置：

```javascript
const firebaseConfig = {
    databaseURL: "https://your-project-id-default-rtdb.firebaseio.com"
};
```

## 📦 部署

### GitHub Pages 快速托管
1. 将代码推送到你的 GitHub 仓库。
2. 在仓库设置中找到 `Settings` -> `Pages`。
3. 将 Source 设置为 `Deploy from a branch` 并选择 `main` 分支。
4. 保存后即可通过 `https://genoling.github.io/command-point-game/` 访问。

### Vercel 命令行一键部署
```bash
npm i -g vercel
vercel --prod
```

## 📝 版本历史

### V3.5.3 (最新)
- 重构全站 UI 风格为明亮淡雅色调，大幅提升白昼光照下的视觉舒适度。
- 在规则说明中补充 `CP = Command Point` 的概念定义，高频操作区保留精简简称。
- 脱敏并隐藏了 UI 中原先直接显示的默认管理员密码提示 `8868`。

### V3.5.2
- 重构管理面板中“房间管理”模块，压缩表格排版，提升批量处理多房间时的操作效率。

### V3.5.1
- 修复了银行贷款成功下达时，提示弹窗中 CP 数值错误显示为 `+0CP` 的 Bug，使其与实际贷款数值保持一致。

### V3.5
- 取消首次切换角色时强制设置密码的逻辑。
- 角色密码改为一次性锁死，设置生效后按钮自动置灰。
- All in 博弈机制优化为必须在对方点击确认后才能夺取，避免误触。

### V3.0 - V3.4
- 新增银行贷款系统、角色密码锁、24小时技能实时倒计时、战斗历史快照及 3 步撤销功能。

### V1.0 - V2.0
- 接入 Firebase Realtime Database 实时对战系统，支持多房间切换。

## 🤝 贡献

1. Fork 本仓库 (`https://github.com/genoling/command-point-game`)
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- Firebase 提供实时数据库服务
- 所有参与测试和反馈的玩家

---

**享受博弈的乐趣吧！** 🎮