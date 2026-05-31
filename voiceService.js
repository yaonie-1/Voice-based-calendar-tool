export function createSpeechService({ onResult, onStart, onEnd, onError }) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    return {
      supported: false,
      start() {
        onError('当前浏览器不支持语音识别。建议使用最新版 Chrome 或 Edge。');
      },
      stop() {},
    };
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'zh-CN';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => onStart();
  recognition.onend = () => onEnd();
  recognition.onerror = (event) => onError(`语音识别失败：${event.error}`);
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join('');
    onResult(transcript);
  };

  return {
    supported: true,
    start() {
      recognition.start();
    },
    stop() {
      recognition.stop();
    },
  };
}

export function speak(text) {
  if (!('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
