# 博弈论：律政与代码

> 一款基于博弈论的双人实时对战网页游戏，律师 vs 程序员，用命令点数（CP）进行策略对抗。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Firebase](https://img.shields.io/badge/Firebase-Realtime%20Database-orange)](https://firebase.google.com/)
[![Version](https://img.shields.io/badge/version-V3.5-blue)](https://github.com/)

## 🎮 游戏简介

「律政与代码」是一款基于博弈论设计的双人实时对战网页游戏。两位玩家分别扮演**律师**和**程序员**，通过发布命令、使用技能、银行贷款等方式争夺命令点数（CP），体验策略博弈的乐趣。

游戏基于 **Firebase Realtime Database** 实现实时同步，支持多人在线对战，数据实时更新。

## ✨ 功能特性

### 核心玩法
- **命令系统**：1级（-1CP）、2级（-2CP）、3级（-4CP）三级命令
- **打赌机制**：打赌获胜获得 1CP
- **All in 通吃**：消耗全部CP，掠夺对方同等数量CP（需对方确认）
- **银行系统**：可贷款获得CP，但生成待办任务由对方确认完成
- **专属技能**：每个角色拥有独特技能，24小时冷却
  - 律师【律师函警告】：撤销对方最后1条命令，全额返还CP
  - 程序员【致命Bug】：扣除对方当前30% CP，最少扣1点

### 系统功能
- **实时同步**：基于Firebase实时数据库，双方操作即时同步
- **房间系统**：支持创建/加入/管理多个游戏房间
- **角色密码**：每个角色可独立设置密码，防止对方操作
- **管理设置**：管理员密码管理、房间管理、数据导入导出
- **战斗日志**：完整记录每一步操作，支持撤销
- **技能冷却**：技能使用后24小时冷却，带进度条显示

### V3.5 新特性
- ✅ 删掉首次切换角色强制设置密码，改为可选设置
- ✅ 角色密码设置改为一次性使用，生效后按钮置灰
- ✅ 深度优化批量操作UI，回归V3.2紧凑风格
- ✅ All in通吃改为需对方确认后生效，防止偷袭

## 🎯 游戏规则

### 基本规则
1. 两位玩家分别选择律师或程序员角色
2. 每回合可以发布命令、打赌、使用技能或All in
3. 命令需要对方确认完成才算生效
4. 打赌获胜获得1CP，失败失去1CP
5. 技能有24小时冷却时间

### 命令等级
| 等级 | CP消耗 | 效果 |
|------|--------|------|
| 1级 | -1 CP | 基础命令 |
| 2级 | -2 CP | 中级命令 |
| 3级 | -4 CP | 高级命令 |

### 银行系统
- 可以向银行贷款获得CP
- 贷款后会生成一条待办任务
- 待办任务由对方确认完成后核销
- 贷款需要谨慎使用，未完成的待办会一直存在

## 🛠️ 技术栈

- **前端**：纯 HTML + CSS + JavaScript（单文件）
- **实时数据库**：Firebase Realtime Database
- **SDK版本**：Firebase SDK 10.7.1 (compat)
- **部署**：支持静态托管（Netlify、Vercel、GitHub Pages等）

## 🚀 快速开始

### 在线体验
直接打开 `index.html` 即可开始游戏，无需安装。

### 本地运行
```bash
# 克隆项目
git clone https://github.com/your-username/lawyer-coder-game.git

# 进入目录
cd lawyer-coder-game

# 直接用浏览器打开
open index.html
```

### Firebase 配置
游戏使用公开的Firebase配置，开箱即用。如需使用自己的数据库，请修改 `index.html` 中的配置：

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

## 📦 部署

### Netlify 部署
1. Fork 本仓库
2. 登录 [Netlify](https://www.netlify.com/)
3. 选择 "New site from Git"
4. 选择你的仓库，一键部署

### Vercel 部署
```bash
npm i -g vercel
vercel --prod
```

### GitHub Pages
1. 启用 GitHub Pages
2. 选择主分支作为源
3. 访问 `https://your-username.github.io/lawyer-coder-game/`

## 📝 版本历史

### V3.5 (最新)
- 删掉首次切换角色强制设置密码
- 角色密码设置改为一次性使用，生效后置灰
- 深度优化批量操作UI，回归V3.2紧凑风格

### V3.4
- 角色选择区新增密码设置入口
- 优化房间管理批量操作UI更紧凑
- All in通吃改为需对方确认后生效

### V3.3
- 管理设置新增角色密码管理（查看/修改/重置）
- 修复房间管理复制失效bug
- 房间管理支持批量删除

### V3.2
- 修复导入后连接卡死问题
- 管理设置新增房间列表管理
- 重置整局移至管理设置内

### V3.1
- 修正贷款逻辑
- 新增修改重置密码
- 新增房间数据导入导出

### V3.0
- 银行系统
- 角色密码
- 重置密码
- 技能24小时冷却+进度条

### V2.0
- Firebase实时同步+房间系统

### V1.0
- 初始版本

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- Firebase 提供实时数据库服务
- 所有参与测试和反馈的玩家

---

**享受博弈的乐趣吧！** 🎮
