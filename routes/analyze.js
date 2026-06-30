import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  checkFfmpeg, extractVideoUrl, downloadVideo, extractAudio,
  extractKeyframes, cleanup, imageToBase64
} from '../utils/videoProcessor.js';
import { callZhipuVision } from '../utils/zhipuVision.js';

const router = express.Router();

const ALLOWED_IMAGE_HOSTS = [
  'xhscdn.com', 'xiaohongshu.com', 'xhslink.com', 'sns-webpic', 'sns-img',
];

function isAllowedImageUrl(url) {
  try {
    const u = new URL(url);
    return ALLOWED_IMAGE_HOSTS.some(h => u.hostname.includes(h));
  } catch { return false; }
}

// 公开封面代理（img 标签无法带 Authorization，需绕过小红书防盗链）
router.get('/cover', async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl || !isAllowedImageUrl(imageUrl)) {
    return res.status(400).json({ error: '无效的图片地址' });
  }
  try {
    const imgRes = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.xiaohongshu.com/',
        'Accept': 'image/*,*/*',
      },
      redirect: 'follow',
    });
    if (!imgRes.ok) return res.status(502).json({ error: '图片获取失败' });
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Content-Type', contentType);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: '图片代理失败：' + err.message });
  }
});

router.use(authMiddleware);

// ===== 图文笔记分析 Prompt =====
const TEXT_ANALYZE_PROMPT = `你是一个小红书爆款内容分析专家。请根据用户提供的小红书笔记内容，进行深度爆款拆解分析。

请严格按以下JSON格式返回（不要返回其他内容，不要markdown代码块）：
{
  "title": "笔记标题",
  "author": "作者昵称",
  "content": "笔记正文摘要（200字以内）",
  "likes": 0,
  "collects": 0,
  "comments": 0,
  "noteType": "image",
  "analysis": {
    "title_hook": "标题钩子分析（悬念/痛点/数字/情绪等）",
    "title_score": 85,
    "content_structure": "文案结构分析（如：提出问题-给出方案-引导互动）",
    "content_score": 80,
    "interaction_rate": "互动率分析（点赞/收藏/评论比例是否健康）",
    "interaction_score": 75,
    "cover_analysis": "封面/首图分析建议",
    "cover_score": 70,
    "overall_score": 82,
    "strengths": ["优势1", "优势2", "优势3"],
    "weaknesses": ["不足1", "不足2"],
    "suggestions": ["优化建议1", "优化建议2", "优化建议3", "优化建议4"],
    "tags": ["标签1", "标签2", "标签3"]
  }
}

注意：
- 所有score字段为0-100的整数
- strengths/weaknesses/suggestions/tags 为数组，每项为字符串
- 分析要具体、有实操价值，不要泛泛而谈`;

// ===== 视频笔记分析 Prompt =====
const VIDEO_ANALYZE_PROMPT = `你是一个小红书爆款视频内容分析专家。请根据视频的关键帧画面和语音转写脚本，进行深度爆款拆解分析。

请严格按以下JSON格式返回（不要返回其他内容，不要markdown代码块）：
{
  "title": "笔记标题",
  "author": "作者昵称",
  "content": "视频内容摘要（200字以内）",
  "likes": 0,
  "collects": 0,
  "comments": 0,
  "noteType": "video",
  "videoScript": "语音转写的主要脚本内容（500字以内摘要）",
  "analysis": {
    "title_hook": "标题钩子分析（悬念/痛点/数字/情绪等）",
    "title_score": 85,
    "content_structure": "视频文案/脚本结构分析（开头钩子-中间内容-结尾引导）",
    "content_score": 80,
    "video_pacing": "视频节奏分析（前3秒吸引力、节奏变化、完播逻辑）",
    "video_pacing_score": 78,
    "visual_quality": "画面质量分析（构图、色彩、字幕、特效使用）",
    "visual_score": 75,
    "script_quality": "脚本/口播质量分析（表达清晰度、情绪感染力、信息密度）",
    "script_score": 80,
    "interaction_rate": "互动率分析（点赞/收藏/评论比例）",
    "interaction_score": 72,
    "cover_analysis": "封面/首帧分析建议",
    "cover_score": 70,
    "overall_score": 78,
    "strengths": ["优势1", "优势2", "优势3"],
    "weaknesses": ["不足1", "不足2"],
    "suggestions": ["优化建议1", "优化建议2", "优化建议3", "优化建议4"],
    "tags": ["标签1", "标签2", "标签3"]
  }
}

注意：
- 所有score字段为0-100的整数
- 分析要结合关键帧画面和语音脚本内容
- strengths/weaknesses/suggestions/tags 为数组
- 分析要具体、有实操价值`;

// ===== 语音转写 Prompt =====
const TRANSCRIBE_PROMPT = `请将以下音频内容转写为文字。如果是中文请保持中文，保留口语化表达和语气词。只返回转写文字，不要添加任何说明。`;

const IMAGE_VISUAL_PROMPT = `请仔细观察这张小红书笔记封面/首图，从视觉角度分析：
1. 画面主体与构图
2. 色彩与氛围
3. 文字/信息呈现
4. 吸引点击的亮点与不足
请用 200 字以内中文描述，供后续爆款分析使用。`;

const VIDEO_VISUAL_PROMPT = `以下是小红书视频的关键帧（按时间顺序）。请分析：
1. 画面内容与视觉风格
2. 前 3 秒吸引力
3. 节奏与镜头变化
4. 字幕、特效、色彩运用
5. 亮点与可改进之处
请用 300 字以内中文描述，供后续爆款分析使用。`;

async function fetchXhsPage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
      redirect: 'follow',
    });
    const html = await res.text();

    const extract = (pattern) => {
      const match = html.match(pattern);
      return match ? match[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'") : '';
    };

    const ogTitle = extract(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/i) || extract(/<meta[^>]*content="([^"]*)"[^>]*property="og:title"/i);
    const ogDesc = extract(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/i) || extract(/<meta[^>]*content="([^"]*)"[^>]*property="og:description"/i);
    const ogImage = extract(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/i) || extract(/<meta[^>]*content="([^"]*)"[^>]*property="og:image"/i);

    const ssrMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})\s*<\/script>/);
    let ssrData = null;
    if (ssrMatch) {
      try { ssrData = JSON.parse(ssrMatch[1].replace(/undefined/g, 'null')); } catch {}
    }

    const noteIdMatch = url.match(/(?:item|explore|note)\/(\w+)/);
    const noteId = noteIdMatch ? noteIdMatch[1] : '';

    return { title: ogTitle || '', description: ogDesc || '', image: ogImage || '', noteId, ssrData, rawLength: html.length };
  } catch (err) {
    throw new Error('抓取页面失败：' + err.message);
  }
}

function extractContentFromSsr(ssrData) {
  if (!ssrData) return null;
  try {
    const map = ssrData.note?.noteDetailMap;
    if (!map) return null;
    const key = Object.keys(map)[0];
    const note = map[key]?.note;
    if (!note) return null;
    return {
      title: note.title || '',
      desc: note.desc || '',
      user: note.user?.nickname || '',
      likes: note.interactInfo?.likedCount || 0,
      collects: note.interactInfo?.collectedCount || 0,
      comments: note.interactInfo?.commentCount || 0,
      shares: note.interactInfo?.shareCount || 0,
      type: note.type || 'normal',
      tags: note.tagList?.map(t => t.name) || [],
      imageList: note.imageList?.map(i => i.urlDefault || i.urlPre) || [],
      video: note.video || null,
    };
  } catch { return null; }
}

// 调用 DeepSeek 文本 API
async function callDeepSeekChat(messages, apiKey) {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({ model: 'deepseek-chat', messages, temperature: 0.7, max_tokens: 3000 })
  });
  const data = await res.json();
  if (!res.ok) throw new Error('AI调用失败：' + (data.error?.message || res.statusText));
  return data.choices?.[0]?.message?.content || '';
}

// 下载图片为 base64（供智谱视觉模型使用）
async function fetchImageBase64(imageUrl, maxBytes = 800 * 1024) {
  if (!imageUrl) return null;
  try {
    const res = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.xiaohongshu.com/',
        'Accept': 'image/*,*/*',
      },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > maxBytes) {
      console.log(`图片过大(${(buffer.length / 1024).toFixed(0)}KB)，跳过视觉分析`);
      return null;
    }
    return buffer.toString('base64');
  } catch {
    return null;
  }
}

// 智谱 GLM-4V 独立完成结构化分析（无 DeepSeek 时使用）
async function analyzeWithZhipuOnly({ systemPrompt, textInfo, imageBase64s, zhipuApiKey, zhipuVisionModel }) {
  const prompt = `${systemPrompt}\n\n【笔记数据】\n${textInfo}\n\n请根据以上数据和图片（如有）进行真实分析，严格按 JSON 格式返回，不要 markdown 代码块，不要编造模板化空话。`;
  const { content, error } = await callZhipuVision({
    apiKey: zhipuApiKey,
    userText: prompt,
    imageBase64s,
    model: zhipuVisionModel,
    maxTokens: 3500,
  });
  if (!content) throw new Error('智谱 AI 分析失败：' + (error || '请检查 API Key 与模型权限'));
  return { result: parseAIJson(content), visionUsed: !!(imageBase64s?.length) };
}

// 智谱 GLM-4V 画面理解 + DeepSeek 结构化分析
async function analyzeWithVision({ systemPrompt, textInfo, imageBase64s, apiKey, zhipuApiKey, zhipuVisionModel, visualPrompt, noImageHint }) {
  let visualContext = '';
  if (imageBase64s?.length && zhipuApiKey) {
    const { content, error } = await callZhipuVision({
      apiKey: zhipuApiKey,
      userText: visualPrompt,
      imageBase64s,
      model: zhipuVisionModel,
      maxTokens: 1500,
    });
    visualContext = content || '';
    if (!visualContext && error) console.log('智谱画面分析跳过:', error);
  }

  let userContent = textInfo;
  if (visualContext) {
    userContent += `\n\n【智谱视觉模型画面分析】\n${visualContext}\n\n请结合以上真实画面分析，给出更准确的可视化维度评分与建议。`;
  } else if (imageBase64s?.length) {
    userContent += `\n（注：${noImageHint || '未配置智谱 API Key 或视觉分析不可用，请基于文本信息分析'}）`;
  }

  const aiContent = await callDeepSeekChat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ], apiKey);
  return { result: parseAIJson(aiContent), visionUsed: !!visualContext };
}

async function runAiAnalysis({ systemPrompt, textInfo, imageBase64s, apiKey, zhipuApiKey, zhipuVisionModel, visualPrompt, noImageHint }) {
  const hasDeepSeek = !!apiKey;
  const hasZhipu = !!zhipuApiKey;
  const hasImages = imageBase64s?.length > 0;

  if (hasDeepSeek && hasZhipu && hasImages) {
    const r = await analyzeWithVision({ systemPrompt, textInfo, imageBase64s, apiKey, zhipuApiKey, zhipuVisionModel, visualPrompt, noImageHint });
    return { analysis: r.result, visionUsed: r.visionUsed, analysisMode: r.visionUsed ? 'dual' : 'deepseek', zhipuModel: zhipuVisionModel };
  }
  if (hasDeepSeek) {
    let visionUsed = false;
    let analysis;
    if (hasImages && hasZhipu) {
      const r = await analyzeWithVision({ systemPrompt, textInfo, imageBase64s, apiKey, zhipuApiKey, zhipuVisionModel, visualPrompt, noImageHint });
      analysis = r.result;
      visionUsed = r.visionUsed;
    } else {
      let userContent = textInfo;
      if (hasImages && !hasZhipu) userContent += '\n（注：未配置智谱 Key，画面维度请结合文本合理推断）';
      else if (!hasImages && noImageHint) userContent += '\n（注：' + noImageHint + '）';
      analysis = parseAIJson(await callDeepSeekChat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ], apiKey));
    }
    return { analysis, visionUsed, analysisMode: visionUsed ? 'dual' : 'deepseek', zhipuModel: visionUsed ? zhipuVisionModel : null };
  }
  if (hasZhipu) {
    const r = await analyzeWithZhipuOnly({ systemPrompt, textInfo, imageBase64s: hasImages ? imageBase64s : [], zhipuApiKey, zhipuVisionModel });
    return { analysis: r.result, visionUsed: r.visionUsed, analysisMode: 'zhipu', zhipuModel: zhipuVisionModel };
  }
  throw new Error('未配置可用的 AI Key');
}

// 生成封面代理 URL（绕过防盗链，避免 base64 撑爆 Vercel 响应体）
function buildCoverProxyUrl(req, imageUrl) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('data:')) return imageUrl;
  if (!isAllowedImageUrl(imageUrl)) return null;
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const base = process.env.API_PUBLIC_URL || `${proto}://${host}`;
  return `${base}/api/analyze/cover?url=${encodeURIComponent(imageUrl)}`;
}

// 解析 AI 返回的 JSON
function parseAIJson(content) {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI返回格式异常');
  return JSON.parse(jsonMatch[0]);
}

// ===== 主路由 =====
router.post('/analyze', async (req, res) => {
  const { url, apiKey, zhipuApiKey, zhipuVisionModel } = req.body;
  const visionModel = zhipuVisionModel || 'glm-4.6v';
  if (!url) return res.status(400).json({ error: '请提供小红书链接' });

  const xhsPatterns = [/xiaohongshu\.com\/(discovery\/item|explore)\/\w+/i, /xhslink\.com\/\w+/i, /note\/\w+/i];
  if (!xhsPatterns.some(p => p.test(url))) {
    return res.status(400).json({ error: '请输入有效的小红书链接' });
  }

  let noteId = '';
  try {
    const pageData = await fetchXhsPage(url);
    noteId = pageData.noteId;
    const ssrContent = extractContentFromSsr(pageData.ssrData);
    const isVideo = ssrContent?.type === 'video';

    let baseInfo = { title: '', author: '', content: '', likes: 0, collects: 0, comments: 0 };
    if (ssrContent) {
      baseInfo = {
        title: ssrContent.title, author: ssrContent.user, content: ssrContent.desc,
        likes: parseInt(ssrContent.likes) || 0, collects: parseInt(ssrContent.collects) || 0,
        comments: parseInt(ssrContent.comments) || 0,
      };
    } else {
      baseInfo = { title: pageData.title, author: '', content: pageData.description, likes: 0, collects: 0, comments: 0 };
    }

    // ===== 有 API Key：真实 AI 分析 =====
    if (apiKey || zhipuApiKey) {
      if (isVideo) {
        // --- 视频笔记分析 ---
        const videoUrl = extractVideoUrl(pageData.ssrData);
        let videoScript = '';
        let keyframeBases = [];
        // Vercel 免费版函数超时 10s，跳过 ffmpeg 视频处理
        const ffmpegOk = !process.env.VERCEL && checkFfmpeg();

        if (videoUrl && ffmpegOk) {
          try {
            const { videoPath, audioPath } = await downloadVideo(videoUrl, noteId);
            const frames = extractKeyframes(videoPath, noteId, 3);
            keyframeBases = frames.map(f => imageToBase64(f.path));
            try {
              extractAudio(videoPath, audioPath);
              videoScript = '[音频已提取，转写功能开发中]';
            } catch {}
            cleanup(noteId);
          } catch (e) {
            console.log('视频处理失败:', e.message);
          }
        }

        const videoInfo = `标题：${ssrContent?.title || pageData.title}\n作者：${ssrContent?.user || ''}\n正文描述：${ssrContent?.desc || ''}\n点赞：${baseInfo.likes}\n收藏：${baseInfo.collects}\n评论：${baseInfo.comments}\n笔记类型：video\n${videoScript ? '语音转写：' + videoScript : '（语音转写暂不可用）'}`;

        const videoCoverUrl = ssrContent?.imageList?.[0] || pageData.image;
        let visionImages = [...keyframeBases];
        if (!visionImages.length && videoCoverUrl) {
          const coverB64 = await fetchImageBase64(videoCoverUrl);
          if (coverB64) visionImages = [coverB64];
        }

        const { analysis, visionUsed, analysisMode, zhipuModel } = await runAiAnalysis({
          systemPrompt: VIDEO_ANALYZE_PROMPT,
          textInfo: videoInfo,
          imageBase64s: visionImages,
          apiKey,
          zhipuApiKey,
          zhipuVisionModel: visionModel,
          visualPrompt: VIDEO_VISUAL_PROMPT,
          noImageHint: '未能提取视频画面，仅基于文本信息分析',
        });

        return res.json({
          success: true,
          visionUsed,
          analysisMode,
          zhipuModel,
          isDemo: false,
          baseInfo: { ...baseInfo, image: buildCoverProxyUrl(req, videoCoverUrl), noteType: 'video' },
          analysis: { ...analysis, noteType: 'video', videoScript: videoScript || analysis.videoScript || '' }
        });
      } else {
        // --- 图文笔记分析 ---
        const textInfo = `标题：${ssrContent?.title || pageData.title}\n作者：${ssrContent?.user || ''}\n正文：${ssrContent?.desc || ''}\n点赞：${baseInfo.likes}\n收藏：${baseInfo.collects}\n评论：${baseInfo.comments}\n笔记类型：image\n标签：${(ssrContent?.tags || []).join('、')}`;

        const coverUrl = ssrContent?.imageList?.[0] || pageData.image;
        const coverB64 = coverUrl ? await fetchImageBase64(coverUrl) : null;
        const visionImages = coverB64 ? [coverB64] : [];

        const { analysis, visionUsed, analysisMode, zhipuModel } = await runAiAnalysis({
          systemPrompt: TEXT_ANALYZE_PROMPT,
          textInfo,
          imageBase64s: visionImages,
          apiKey,
          zhipuApiKey,
          zhipuVisionModel: visionModel,
          visualPrompt: IMAGE_VISUAL_PROMPT,
        });

        return res.json({
          success: true,
          visionUsed,
          analysisMode,
          zhipuModel,
          isDemo: false,
          baseInfo: { ...baseInfo, image: buildCoverProxyUrl(req, coverUrl), noteType: 'image' },
          analysis: { ...analysis, noteType: 'image' }
        });
      }
    }

    // ===== 无 API Key：演示数据 =====
    const demoAnalysis = {
      title: baseInfo.title || '示例笔记', author: baseInfo.author || '示例作者',
      content: baseInfo.content || '这是一篇示例小红书笔记的内容摘要。',
      likes: baseInfo.likes || 12800, collects: baseInfo.collects || 5600, comments: baseInfo.comments || 890,
      noteType: isVideo ? 'video' : 'image',
      analysis: {
        title_hook: '标题使用了「数字+痛点+解决方案」的经典钩子结构，通过具体数字制造可信度，同时直击目标用户痛点，激发点击欲望。',
        title_score: 88,
        content_structure: '采用「提出问题 → 分析原因 → 给出方案 → 引导互动」四段式结构，逻辑清晰，阅读体验流畅。正文中穿插emoji提升可读性。',
        content_score: 82,
        interaction_rate: `${baseInfo.likes / Math.max(baseInfo.collects, 1) > 2 ? '点赞/收藏比2:1以上，内容偏娱乐性，实用收藏价值可提升' : '点赞/收藏比接近2:1，互动结构较为健康'}. 评论数偏低，建议在文末增加互动引导。`,
        interaction_score: 75,
        cover_analysis: '封面建议使用高清实拍图，文字覆盖面积不超过30%，主标题字体醒目，配色与内容调性一致。',
        cover_score: 70, overall_score: 79,
        strengths: ['标题钩子设计到位，数字+痛点组合有效提升点击率', '内容结构清晰，四段式逻辑便于读者理解和收藏', '话题标签选择精准，覆盖目标用户搜索关键词'],
        weaknesses: ['评论区互动引导不足，缺少明确的CTA（行动号召）', '封面信息密度可能不够，前3秒吸引力有待加强'],
        suggestions: ['在文末增加互动问题，如「你们觉得哪个方法最实用？评论区告诉我」', '封面尝试使用「前后对比」或「步骤拆解」形式，提升首屏吸引力', '正文前3行加入强钩子（悬念/反常识/痛点），降低跳出率', '增加相关话题标签数量至8-10个，覆盖更多搜索场景'],
        tags: ['爆款分析', '内容优化', '小红书运营', '选题策划']
      }
    };

    if (isVideo) {
      demoAnalysis.videoScript = '（演示模式）视频脚本转写需要配置API Key后使用真实AI分析';
      demoAnalysis.analysis.video_pacing = '视频前3秒使用了强钩子开场，节奏紧凑，每5-8秒切换一次画面/话题，有效维持观众注意力。结尾设置了悬念引导评论互动。';
      demoAnalysis.analysis.video_pacing_score = 82;
      demoAnalysis.analysis.visual_quality = '画面清晰度较高，色彩饱和度适中。字幕使用白色描边字体，在深色背景下清晰可读。建议增加动态文字效果提升视觉层次。';
      demoAnalysis.analysis.visual_score = 76;
      demoAnalysis.analysis.script_quality = '口播表达流畅，语速适中，情绪饱满。信息密度较高，每句话都有实质内容。建议适当加入停顿和重音强调关键信息。';
      demoAnalysis.analysis.script_score = 80;
    }

    // 下载封面图转 base64（绕过小红书防盗链）
    const demoCoverUrl = ssrContent?.imageList?.[0] || pageData.image;

    res.json({ success: true, baseInfo: { ...baseInfo, image: buildCoverProxyUrl(req, demoCoverUrl), noteType: isVideo ? 'video' : 'image' }, analysis: demoAnalysis, isDemo: true });
  } catch (err) {
    if (noteId) cleanup(noteId);
    res.status(500).json({ error: err.message });
  }
});

export default router;
