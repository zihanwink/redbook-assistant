const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

// 官网体验中心「视觉模型」对应当前 API 名称（非旧版 glm-4v）
export const ZHIPU_VISION_MODELS = [
  { id: 'glm-4.6v', label: 'GLM-4.6V（推荐，图文/视频理解）' },
  { id: 'glm-5v-turbo', label: 'GLM-5V-Turbo（视频与 Agent 更强）' },
  { id: 'glm-4.6v-flash', label: 'GLM-4.6V-Flash（免费）' },
  { id: 'glm-4v-flash', label: 'GLM-4V-Flash（免费轻量）' },
];

export const DEFAULT_VISION_MODEL = 'glm-4.6v';

function supportsThinking(model) {
  return /^glm-(4\.6v|5v-turbo|4\.5v|4\.1v)/i.test(model);
}

/**
 * 调用智谱视觉模型（apiKey、model 由前端传入）
 */
export async function callZhipuVision({ apiKey, systemPrompt, userText, imageBase64s, model, maxTokens = 2000 }) {
  if (!apiKey) return { content: null, error: '未提供智谱 API Key' };

  const visionModel = model || DEFAULT_VISION_MODEL;
  const content = [];
  if (userText) content.push({ type: 'text', text: userText });

  for (const raw of (imageBase64s || []).slice(0, 4)) {
    const url = raw.startsWith('data:') ? raw : `data:image/jpeg;base64,${raw}`;
    content.push({ type: 'image_url', image_url: { url } });
  }

  if (!content.length) return { content: null, error: '无有效输入内容' };

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content });

  const body = {
    model: visionModel,
    messages,
    temperature: 0.6,
    max_tokens: maxTokens,
  };
  if (supportsThinking(visionModel)) {
    body.thinking = { type: 'enabled' };
  }

  try {
    const res = await fetch(ZHIPU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      const err = data.error?.message || data.message || res.statusText;
      console.log('智谱视觉API失败:', visionModel, err);
      return { content: null, error: err };
    }
    return { content: data.choices?.[0]?.message?.content || null, error: null };
  } catch (err) {
    console.log('智谱视觉API异常:', err.message);
    return { content: null, error: err.message };
  }
}
