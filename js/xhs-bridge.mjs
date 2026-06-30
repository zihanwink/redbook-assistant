import * as xhsTopic from '/utils/xhsTopicPrompt.js';
import { buildCreationAdvice } from '/utils/xhsCreationAdvice.js';

try {
  await xhsTopic.preloadSkillPrompts();
  window.__xhsTopicMod = xhsTopic;
  window.__buildCreationAdvice = buildCreationAdvice;
} catch (err) {
  console.error('xhs modules load failed:', err);
}
window.dispatchEvent(new Event('xhs-ready'));
