# en-study-web · 儿童英语闯关（前端）

Taro 3.6 + React 18 + webpack5，一套代码同时编译 **H5** 和 **微信小程序**。

## 页面

| 路由 | 说明 |
|---|---|
| `pages/index/index` | 首页：2 列卡片格子（动物 + emoji + 章节名 + 序号，学过的挂 ⭐） |
| `pages/practice/practice` | 第 1 天：单词卡（点词冒小动物 + 朗读）；第 2 天：单词连线 / 交叉练习 / 句子填空 |
| `pages/collection/collection` | 卡牌册（目前首页无入口） |

交叉练习按「例句挖空 → 英文选中文 → 中文选英文」轮换出题。

## 运行

```bash
npm install

# H5（本地调试，http://localhost:10086）
npx taro build --type h5 --watch

# 微信小程序（用微信开发者工具打开 dist 目录）
npx taro build --type weapp
```

H5 产物在 `dist/`，可直接用任意静态服务器托管。

## 后端地址配置

所有接口地址集中在 `src/utils/config.js`，默认 `http://192.168.1.47:8000`（局域网调试用）。

上线时构建覆盖即可：

```bash
API_BASE=https://api.your-domain.com npx taro build --type h5
```

## 数据来源与兜底

`src/utils/api.js` 的三级兜底：服务端 `/api/chapters` → 本地缓存（key `en_chapters_cache_v1`）→ 包内 `src/data/chapters.js`。
所以断网或后端挂了也能继续练，只是题库是旧版。

## 语音

不在浏览器用 `speechSynthesis`（iOS 缺英文音色会静默失败），统一走后端 `/tts` 拿 mp3，用 InnerAudioContext 播放。
进页面会并发预热本单元词句，避免首次点击等待。

## 目录

```
config/          Taro 构建配置
src/app.js       入口
src/pages/       页面
src/data/        题库兜底 + 卡片配置 + 词图映射
src/utils/       tts / api / config / storage / sfx / game
src/assets/      吉祥物贴纸、答错音效
```
