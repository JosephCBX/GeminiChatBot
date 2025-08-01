document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput   = document.getElementById('apiKeyInput');
  const saveKeyBtn    = document.getElementById('saveKeyBtn');
  const newChatBtn    = document.getElementById('newChatBtn');
  const chatList      = document.getElementById('chatList');
  const promptInput   = document.getElementById('promptInput');
  const sendBtn       = document.getElementById('sendBtn');
  const chatContainer = document.getElementById('chatContainer');

  // — API Key Storage —
  let apiKey = localStorage.getItem('geminiApiKey') || '';
  apiKeyInput.value = apiKey;
  saveKeyBtn.addEventListener('click', () => {
    apiKey = apiKeyInput.value.trim();
    localStorage.setItem('geminiApiKey', apiKey);
    alert('✅ Key saved');
  });

  // — Chat sessions —
  let sessions = JSON.parse(localStorage.getItem('sessions') || '[]');
  let currentSessionId = localStorage.getItem('currentSessionId');

  function saveSessions() {
    localStorage.setItem('sessions', JSON.stringify(sessions));
  }

  function renderSidebar() {
    chatList.innerHTML = '';
    sessions.forEach(sess => {
      const li = document.createElement('li');
      li.textContent = sess.name;
      li.dataset.id = sess.id;
      if (sess.id === currentSessionId) li.classList.add('active');
      li.addEventListener('click', () => switchSession(sess.id));
      chatList.appendChild(li);
    });
  }

  function switchSession(id) {
    currentSessionId = id;
    localStorage.setItem('currentSessionId', id);
    renderSidebar();
    renderChat();
  }

  function createSession() {
    const name = `Chat ${sessions.length + 1}`;
    const sess = { id: Date.now().toString(), name, messages: [] };
    sessions.unshift(sess);
    saveSessions();
    switchSession(sess.id);
  }

  newChatBtn.addEventListener('click', createSession);

  function renderChat() {
    chatContainer.innerHTML = '';
    const sess = sessions.find(s => s.id === currentSessionId);
    if (!sess) return;
    sess.messages.forEach(m => addBubble(m.sender, m.text));
  }

  function addBubble(sender, text) {
    const m = document.createElement('div');
    m.className = `message ${sender}`;
    const b = document.createElement('div');
    b.className = 'bubble';
    b.textContent = text;
    m.appendChild(b);
    chatContainer.appendChild(m);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  function appendMessage(sender, text) {
    addBubble(sender, text);
    const sess = sessions.find(s => s.id === currentSessionId);
    sess.messages.push({ sender, text });
    saveSessions();
  }

  // — Initialize first session if none —
  if (sessions.length === 0) createSession();
  else if (!currentSessionId || !sessions.find(s => s.id === currentSessionId)) {
    switchSession(sessions[0].id);
  } else {
    renderSidebar();
    renderChat();
  }

  // — Sending a prompt —
  sendBtn.addEventListener('click', async () => {
    const prompt = promptInput.value.trim();
    if (!prompt) return;
    if (!apiKey) return alert('Paste your Gemini API key first!');
    appendMessage('user', prompt);
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
      if (payload.error) throw new Error(payload.error.message);
      const reply = payload.candidates?.[0]?.content?.parts?.[0]?.text || '';
      appendMessage('bot', reply);
    } catch (err) {
      appendMessage('bot', `Error: ${err.message}`);
    }
  });
});
