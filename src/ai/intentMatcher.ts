// src/ai/intentMatcher.ts
export class IntentMatcher {
  static parseIntent(userInput: string) {
    const text = userInput.toLowerCase().trim();

    // কল সম্পর্কিত সাধারণ প্রশ্ন ফিল্টার (এগুলো প্রশ্ন, সরাসরি কল কমান্ড নয়)
    const isCallQuery = text.includes('রিসিভ করতে পারো') || 
                        text.includes('কল দিতে পারো') || 
                        text.includes('কল করতে পারো') ||
                        text.includes('কীভাবে কল');

    if (isCallQuery) {
      return { type: 'LLM_QUESTION', query: userInput };
    }

    // কাউকে সরাসরি কল দেওয়ার সঠিক কমান্ড (যেমন: "রহিমকে কল করো")
    if (text.startsWith('কল করো') || text.includes('কে কল দাও') || text.includes('কে ফোন করো')) {
      const contactName = text.replace(/(কে|কল|করো|ফোন|দাও)/g, '').trim();
      return { type: 'MAKE_CALL', target: contactName };
    }

    return { type: 'GENERAL_CHAT', query: userInput };
  }
}
