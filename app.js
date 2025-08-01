// --------- State & Storage Helpers ----------
const STORAGE_KEY = 'geminiChatApp';

function loadState() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// --------- Main ----------
document.addEventListener('DOMContentLoaded', () => {
  const chatListEl    = document.getElementById('chatList');
  const newChatBtn    = document.getElementById('newChatBtn');
  const saveKeyBtn    = document.getElementById('saveKeyBtn');
  const apiKeyInput   = document.getElementById('apiKeyInput');
  const chatContainer = document.getElementById('chatContainer');
  const promptInput   = document.getElementById('promptInput');
  const sendBtn       = document.getElementById('sendBtn');

  // Load or init state
  const state = loadState();
  state.chats         ||= [];
  state.activeChatId  ||= null;
  state.apiKey        ||= '';
  apiKeyInput.value = state.apiKey;

  // Render sidebar chat list
  function renderChatList() {
    chatListEl.innerHTML = '';
    state.chats.forEach((chat, idx) => {
      const li = document.createElement('li');
      li.className = 'chat-item' + (chat.id === state.activeChatId ? ' active' : '');

      // title
      const span = document.createElement('span');
      span.textContent = chat.title;
      li.appendChild(span);

      // actions wrapper
      const actions = document.createElement('div');
      actions.className = 'chat-actions';

      // rename button
      const renameBtn = document.createElement('button');
      renameBtn.className = 'rename-btn';
      renameBtn.innerText = '✏️';
      renameBtn.onclick = e => {
        e.stopPropagation();
        const newName = prompt('Rename chat:', chat.title);
        if (newName?.trim()) {
          chat.title = newName.trim();
          saveState(state);
          renderChatList();
        }
      };
      actions.appendChild(renameBtn);

      // delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.innerText = '🗑️';
      deleteBtn.onclick = e => {
        e.stopPropagation();
        if (!confirm(`Delete chat "${chat.title}"?`)) return;
        state.chats.splice(idx, 1);
        if (state.activeChatId === chat.id) {
          if (state.chats.length) {
            state.activeChatId = state.chats[Math.max(0, idx - 1)].id;
          } else {
            state.activeChatId = null;
          }
        }
        saveState(state);
        if (state.chats.length === 0) {
          newChatBtn.click();
        } else {
          renderChatList();
          renderMessages();
        }
      };
      actions.appendChild(deleteBtn);

      li.appendChild(actions);

      // activate on click
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

  // Add a message bubble (with Markdown)
  function addMessageToDOM(who, text) {
    const m = document.createElement('div');
    m.className = `message ${who}`;
    const b = document.createElement('div');
    b.className = 'bubble';
    const rawHtml = marked.parse(text);
    b.innerHTML = DOMPurify.sanitize(rawHtml);
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
    document.getElementById('typing-indicator')?.remove();
  }

  // Send prompt to Gemini
  async function sendToGemini(prompt) {
    showTyping();
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${state.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
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

  // Handle sending a message
  async function handleSend() {
    const text = promptInput.value.trim();
    if (!text) return;
    if (!state.apiKey) return alert('Paste your Gemini API key first!');

    const chat = state.chats.find(c => c.id === state.activeChatId);
    if (!chat) return;

    chat.messages.push({ sender: 'user', text });
    addMessageToDOM('user', text);
    promptInput.value = '';
    saveState(state);

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

  // Send triggers
  sendBtn.addEventListener('click', handleSend);
  promptInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // On load: ensure at least one chat exists
  if (state.chats.length === 0) {
    newChatBtn.click();
  } else {
    renderChatList();
    renderMessages();
  }
});
