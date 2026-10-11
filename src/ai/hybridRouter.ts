import { LocalEdgeAI } from './localEdgeAi';
import { FastCloudAI, AdvancedReasoningAI } from './cloudAi';

export class IntentRouter {
  private analyzeComplexity(userInput: string): 'SIMPLE' | 'MEDIUM' | 'COMPLEX' {
    const text = userInput.toLowerCase();
    if (text.includes('flashlight') || text.includes('alarm') || text.includes('volume') || text.includes('ফ্ল্যাশলাইট')) {
      return 'SIMPLE';
    }
    if (text.length < 50 && !text.includes('বিশ্লেষণ') && !text.includes('প্ল্যান')) {
      return 'MEDIUM';
    }
    return 'COMPLEX';
  }

  async routeTask(userInput: string) {
    const complexity = this.analyzeComplexity(userInput);

    if (complexity === 'SIMPLE') {
      return await LocalEdgeAI.execute(userInput);
    } else if (complexity === 'MEDIUM') {
      return await FastCloudAI.execute(userInput);
    } else {
      return await AdvancedReasoningAI.execute(userInput);
    }
  }
}
