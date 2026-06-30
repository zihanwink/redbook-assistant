# 创作建议生成规则

选题详情页「创作建议」由 `utils/xhsCreationAdvice.js` 根据本 Skill 动态生成。

## 输出字段

| 字段 | 来源 |
|------|------|
| 内容角度 | 标题/描述关键词 → STYLE_GUIDE 笔记结构 |
| 笔记结构 | 7 步模板 + 人群定制 |
| 封面方案 | 分类 profile + 封面模板 |
| 标题备选 | STYLE_GUIDE 标题模板 2 条 |
| 评论引导 | XHS_STYLE_GUIDE 评论引导规则 |
| 差异化建议 | 选题类型推断 |
| 风险提醒 | RISK_RULES + 分类 |
| 人工需补充 | Skill Human-in-the-Loop |

## 维护

修改规则时更新 `utils/xhsCreationAdvice.js` 中的 `CATEGORY_PROFILES` 与检测逻辑。
