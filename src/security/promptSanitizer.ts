export class PromptSanitizer {
  private dangerousPatterns = [
    /ignore previous instructions/i,
    /delete all files/i,
    /system override/i,
    /ফাইল মুছ/i,
    /পাসওয়ার্ড দাও/i
  ];

  sanitize(input: string): string {
    let cleanInput = input;
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(cleanInput)) {
        throw new Error("Malicious prompt injection detected!");
      }
    }
    return cleanInput.trim();
  }
}
