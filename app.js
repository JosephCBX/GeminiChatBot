document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput   = document.getElementById('apiKeyInput');
  const saveKeyBtn    = document.getElementById('saveKeyBtn');
  const clearChatBtn  = document.getElementById('clearChatBtn');
  const promptInput   = document.getElementById('promptInput');
  const sendBtn       = document.getElementById('sendBtn');
  const chatContainer = document.getElementById('chatContainer');

  // Load/store key in localStorage
  let apiKey = localStorage.getItem('geminiApiKey') || '';
  apiKeyInput.value = apiKey;

  saveKeyBtn.addEventListener('click', () => {
    apiKey = apiKeyInput.value.trim();
    localStorage.setItem('geminiApiKey', apiKey);
    alert('✅ Key saved');
  });

  clearChatBtn.addEventListener('click', () => {
    chatContainer.innerHTML = '';
  });

  sendBtn.addEventListener('click', async () => {
    const prompt = promptInput.value.trim();
    if (!prompt) return;
    if (!apiKey) return alert('Paste your Gemini API key first!');

    addMessage('user', prompt);
    promptInput.value = '';

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );
      const payload = await res.json();
      if (payload.error) {
        throw new Error(payload.error.message);
      }
      const reply = payload.candidates?.[0]?.content?.parts?.[0]?.text || '';
      addMessage('bot', reply);
    } catch (err) {
      addMessage('bot', `Error: ${err.message}`);
    }
  });

  function addMessage(who, text) {
    const m = document.createElement('div');
    m.className = `message ${who}`;
    const b = document.createElement('div');
    b.className = 'bubble';
    b.textContent = text;
    m.appendChild(b);
    chatContainer.appendChild(m);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
});
