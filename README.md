# 记账小宝 (Smart Ledger) 💰

一款专为个人与家庭设计的日常记账手机应用，支持：
1. **每日收支与为谁支付记录**：支持标记“为谁支付”（本人、伴侣、家庭、同事/朋友垫付），并支持代付还款追踪。
2. **日历查账与追溯**：日历视图一键跳转查看任意历史月份与日期的消费流水及当日支出总额。
3. **月度收支与对象汇总**：自动计算月度总收入、总支出与结余，并生成按“消费对象”及“分类”的占比统计。

---

## 🚀 快速启动指南 (How to Run)

### 1. 安装依赖 (Install Dependencies)
在项目根目录下打开终端或 PowerShell，运行：
```bash
npm install
```

### 2. 启动应用 (Start App)
```bash
npm start
# 或者
npx expo start
```

### 3. 在真机上预览 (Run on Mobile Phone)
1. 在 iPhone 的 App Store 或 Android 应用商店下载安装 **Expo Go**。
2. 运行 `npx expo start` 后，终端会显示一个二维码（QR Code）。
3. 使用手机微信或相机（iOS）扫描二维码，即可在手机上直接体验完整功能！

---

## 🛠️ 项目结构
- `App.tsx`: 包含首页流水明细、日历历史查账、月度统计图表以及“为谁支付”记账弹窗的完整交互逻辑。
- `package.json`: 依赖配置文件（基于 Expo SDK 51 & React Native）。
- `app.json`: Expo 应用元数据与图标配置。
- `tsconfig.json`: TypeScript 配置。

