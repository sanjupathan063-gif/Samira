/** Cloud adapter uses the app's configured voice-analysis API, with safe fallback. */
async function analyze(input: string, mode: 'fast' | 'reasoning') {
  try {
    const response = await fetch('/api/voice/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transcript: input, language: /[\u0980-\u09FF]/.test(input) ? 'bn' : 'en', context: { mode } }) });
    if (response.ok) return { mode, result: await response.json(), status: 'completed' };
  } catch { /* The caller receives an explicit local fallback below. */ }
  return { mode, result: { intent: 'QUERY', transcript: input }, status: 'offline_fallback' };
}
export class FastCloudAI { static execute(input: string) { return analyze(input, 'fast'); } }
export class AdvancedReasoningAI { static execute(input: string) { return analyze(input, 'reasoning'); } }
