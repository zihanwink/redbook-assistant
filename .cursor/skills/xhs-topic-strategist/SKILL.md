---
name: xhs-topic-strategist
description: >-
  Generates Xiaohongshu (小红书) topic suggestions with platform-native titles,
  pain points, and JSON output. Use when improving AI topic generation, editing
  prompts in xhsTopicPrompt.js, or when the user mentions 小红书选题/爆款选题/笔记风格.
---

# 小红书选题策划 Skill

基于 [coinluu/xhs-topic-strategist-skill](https://github.com/coinluu/xhs-topic-strategist-skill) 精简适配本项目 redbook 应用。

## 何时使用

- 修改 AI 生成页的选题质量、Prompt、演示数据
- 用户反馈选题「太模板化 / 不像小红书」
- 新增内容分类或调整输出字段

## 执行协议

1. 读取 [PROMPT_SYSTEM.md](PROMPT_SYSTEM.md) — 运行时 system prompt 唯一来源
2. 标题与正文风格遵循 [STYLE_GUIDE.md](STYLE_GUIDE.md)
3. 评分遵循 [SCORING_RULES.md](SCORING_RULES.md)（简版，70–95）
4. API 输出格式遵循 [OUTPUT_SCHEMA.md](OUTPUT_SCHEMA.md)
5. 高风险赛道参考 [RISK_RULES.md](RISK_RULES.md)
6. 演示模式数据维护在 `utils/xhsTopicPrompt.js` 的 `DEMO_ANGLE_BUILDERS`

## 代码接入点

| 文件 | 作用 |
|------|------|
| `utils/xhsTopicPrompt.js` | 加载 skill prompt、演示选题、解析 API 响应 |
| `utils/xhsCreationAdvice.js` | 选题详情页「创作建议」动态生成 |
| `app.html` | 前端 DeepSeek 调用、详情页 |
| `routes/ai.js` | 后端 `/api/ai/generate` |

创作建议规则见 [CREATION_ADVICE.md](CREATION_ADVICE.md)。

**修改 Prompt 时同步更新两处：**

1. `.cursor/skills/xhs-topic-strategist/PROMPT_SYSTEM.md`（Node / 后端）
2. `utils/xhsTopicPrompt.js` 内 `BROWSER_SKILL_PROMPTS`（浏览器直连，免网络请求）

## 质量自检（AI 味排查）

输出前检查：

- [ ] 是否像论文或官方通稿？
- [ ] 是否出现「围绕…从…角度切入」类模板句？
- [ ] 标题是否有具体人群/场景/数字/反差？
- [ ] 6 条选题角度是否互不重复？
- [ ] 是否编造个人经历或平台排名？

## 演示模式

无 API Key 时使用 `buildDemoTopics()`，按关键词 + 分类生成小红书风格示例，禁止 `关键词｜入门指南` 机械拼接。
