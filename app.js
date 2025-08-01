// --------- State & Storage Helpers ----------
const STORAGE_KEY = 'geminiChatApp';
function loadState() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
}
function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// --------- Initialization ----------
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const chatListEl    = document.getElementById('chatList');
  const newChatBtn    = document.getElementById('newChatBtn');
  const saveKeyBtn    = document.getElementById('saveKeyBtn');
  const apiKeyInput   = document.getElementById('apiKeyInput');
  const chatContainer = document.getElementById('chatContainer');
  const promptInput   = document.getElementById('promptInput');
  const sendBtn       = document.getElementById('sendBtn');

  // Load app state
  const state = loadState();
  state.chats ||= [];             // array of { id, title, messages: [ {sender, text} ] }
  state.activeChatId ||= null;
  state.apiKey ||= '';

  // Restore API key
  apiKeyInput.value = state.apiKey;

  // Render chat list & select first if none
  function renderChatList() {
    chatListEl.innerHTML = '';
    state.chats.forEach(chat => {
      const li = document.createElement('li');
      li.textContent = chat.title;
      li.className = 'chat-item' + (chat.id === state.activeChatId ? ' active' : '');
      li.onclick = () => {
        state.activeChatId = chat.id;
        saveState(state);
        renderChatList();
        renderMessages();
      };
      chatListEl.appendChild(li);
    });
  }

  // Render messages for active chat
  function renderMessages() {
    chatContainer.innerHTML = '';
    const chat = state.chats.find(c => c.id === state.activeChatId);
    if (!chat) return;
    chat.messages.forEach(m => addMessageToDOM(m.sender, m.text));
  }

  // Add message DOM helper
  function addMessageToDOM(who, text) {
    const m = document.createElement('div');
    m.className = `message ${who}`;
    const b = document.createElement('div');
    b.className = 'bubble';
    b.textContent = text;
    m.appendChild(b);
    chatContainer.appendChild(m);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // Typing indicator
  function showTyping() {
    hideTyping();
    const m = document.createElement('div');
    m.id = 'typing-indicator';
    m.className = 'message bot';
    const bubble = document.createElement('div');
    bubble.className = 'bubble typing-bubble';
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.className = 'typing-dot';
      bubble.appendChild(dot);
    }
    m.appendChild(bubble);
    chatContainer.appendChild(m);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
  function hideTyping() {
    const old = document.getElementById('typing-indicator');
    if (old) old.remove();
  }

  // Send to Gemini
  async function sendToGemini(prompt) {
    showTyping();
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${state.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );
      const data = await res.json();
      hideTyping();
      if (data.error) throw new Error(data.error.message);
      return data.candidates[0].content.parts[0].text;
    } catch (err) {
      hideTyping();
      return `Error: ${err.message}`;
    }
  }

  // Add message & persist
  async function handleSend() {
    const text = promptInput.value.trim();
    if (!text) return;
    if (!state.apiKey) return alert('Paste your Gemini API key first!');

    const chat = state.chats.find(c => c.id === state.activeChatId);
    if (!chat) return;

    // User message
    chat.messages.push({ sender: 'user', text });
    addMessageToDOM('user', text);
    promptInput.value = '';
    saveState(state);

    // Bot response
    const reply = await sendToGemini(text);
    chat.messages.push({ sender: 'bot', text: reply });
    addMessageToDOM('bot', reply);
    saveState(state);
  }

  // New chat
  newChatBtn.addEventListener('click', () => {
    const newId = Date.now().toString();
    const title = `Chat ${state.chats.length + 1}`;
    state.chats.push({ id: newId, title, messages: [] });
    state.activeChatId = newId;
    saveState(state);
    renderChatList();
    renderMessages();
  });

  // Save API key
  saveKeyBtn.addEventListener('click', () => {
    state.apiKey = apiKeyInput.value.trim();
    saveState(state);
    alert('✅ Key saved');
  });

  // Send button
  sendBtn.addEventListener('click', handleSend);
  promptInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // On load: if no chats, create one
  if (state.chats.length === 0) {
    newChatBtn.click();
  } else {
    renderChatList();
    renderMessages();
  }
});
