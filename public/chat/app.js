(() => {
  const history = [];
  const chat = document.querySelector('#chat');
  const form = document.querySelector('#form');
  const input = document.querySelector('#message');
  const provider = document.querySelector('#provider');
  const model = document.querySelector('#model');
  function add(role, text) { const el = document.createElement('div'); el.className = `bubble ${role}`; el.textContent = text; chat.appendChild(el); chat.scrollTop = chat.scrollHeight; }
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); const message = input.value.trim(); if (!message) return;
    add('user', message); input.value = ''; const button = form.querySelector('button'); button.disabled = true;
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({message, history, provider: provider.value, model: model.value.trim() || undefined}) });
      const data = await response.json(); const reply = data.reply || data.error || 'ไม่ได้รับข้อความตอบกลับ'; add('assistant', reply);
      history.push({role:'user', content:message}, {role:'assistant', content:reply});
    } catch { add('assistant', 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่'); } finally { button.disabled = false; input.focus(); }
  });
})();