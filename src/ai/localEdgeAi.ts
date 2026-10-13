/** Safe local capability resolver. It never executes arbitrary code. */
export class LocalEdgeAI {
  static async execute(userInput: string) {
    const text = userInput.trim();
    const lower = text.toLowerCase();
    if (/youtube|you\s*tube|youtub|ইউটিউব/.test(lower) && /play|watch|ভিডিও|video|চালাও|দেখাও|cartoon|কার্টুন/.test(lower)) {
      const query = text.replace(/youtube|you\s*tube|youtub|ইউটিউব(?:ের|ে)?/ig, ' ').replace(/(থেকে|একটা|একটি|theke|ekta|ekti|ভিডিও|video|চালাও|chalao|দেখাও|dekhao|play|watch|আমাকে|amake)/ig, ' ').replace(/\s+/g, ' ').trim() || 'cartoon';
      return { intent: 'SEARCH_MEDIA', app: 'youtube', query, requiresConfirmation: false, status: 'planned' };
    }
    if (/flashlight|ফ্ল্যাশলাইট/.test(lower)) return { intent: 'SYSTEM_CONTROL', action: 'flashlight', status: 'requires_native_capability' };
    return { intent: 'QUERY', query: text, status: 'needs_assistant_analysis' };
  }
}
