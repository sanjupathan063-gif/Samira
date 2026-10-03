export type DiagnosticResult = { id:string; label:string; ok:boolean; detail:string };

export async function runSanjuDiagnostics(): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];
  try { localStorage.setItem('__sanju_diag','1'); localStorage.removeItem('__sanju_diag'); results.push({id:'storage',label:'Local storage',ok:true,detail:'Readable and writable'}); }
  catch { results.push({id:'storage',label:'Local storage',ok:false,detail:'Storage unavailable'}); }
  results.push({id:'speech',label:'Speech recognition',ok:Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),detail:((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) ? 'Browser engine available' : 'Native speech plugin may be required'});
  results.push({id:'tts',label:'Text to speech',ok:'speechSynthesis' in window,detail:'speechSynthesis' in window ? `${window.speechSynthesis.getVoices().length} voices detected` : 'TTS unavailable'});
  results.push({id:'network',label:'Network',ok:navigator.onLine,detail:navigator.onLine ? 'Online' : 'Offline; local features remain available'});
  results.push({id:'secure',label:'Secure context',ok:window.isSecureContext,detail:window.isSecureContext ? 'Secure context enabled' : 'Some browser APIs may be restricted'});
  return results;
}
