# API 输出格式

本应用 AI 生成接口返回 **纯 JSON 数组**（无 markdown 代码块包裹）。

## 字段

```json
[
  {
    "title": "string，18字内优先，有小红书钩子",
    "description": "string，50-80字，目标用户+痛点+切入点+收获",
    "keywords": ["string", "3-5个搜索词/话题标签"],
    "category": "string，中文分类名",
    "score": 92
  }
]
```

## 约束

- 每次生成 **6 条**，角度互不重复
- `category` 优先从用户给定分类列表选择，可新建 2–4 字中文名
- `keywords` 含核心词 + 场景词 + 话题向标签
- 禁止额外字段导致 JSON 无法解析（扩展字段未来再加）

## 完整策划包

若 Agent 在 Cursor 内做深度策划（非 API），可参考 [coinluu/xhs-topic-strategist-skill OUTPUT_SCHEMA](https://github.com/coinluu/xhs-topic-strategist-skill/blob/main/OUTPUT_SCHEMA.md) 输出 Markdown 报告 + 结构化块。
