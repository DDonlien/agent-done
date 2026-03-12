# AI Tab Progress Indicator（Chrome 扩展）

这个扩展会在常见生成式 AI 网站中，动态修改网页 Tab 的 favicon：

- 生成中：原图标半透明 + 右上角旋转读取标识。
- 生成完成：右上角显示绿色打勾。
- 用户切回该标签页并查看后：自动恢复原始图标。

## 当前支持的网站（通过 URL 判断）

- ChatGPT (`chatgpt.com`, `chat.openai.com`)
- Claude (`claude.ai`)
- Gemini (`gemini.google.com`)
- Perplexity (`www.perplexity.ai`)
- Poe (`poe.com`)
- DeepSeek (`chat.deepseek.com`)
- 豆包 (`www.doubao.com`)
- 腾讯元宝 (`yuanbao.tencent.com`)
- Kimi (`kimi.moonshot.cn`)

## 安装（开发者模式）

1. 打开 Chrome，进入 `chrome://extensions/`
2. 打开右上角“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择本项目目录

## 说明

- 本阶段仅使用“网站 + 页面行为”做任务开始/结束判断。
- 不同网站 DOM 结构变化较快，若后续某站点检测不准，可增补 `content.js` 中该站点的选择器规则。
