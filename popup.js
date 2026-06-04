document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('current-state');
  const siteMatchEl = document.getElementById('site-match');
  const generatingEl = document.getElementById('is-generating');
  const errorEl = document.getElementById('error-msg');

  async function sendMessageToContent(command, payload = {}) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        throw new Error('No active tab found');
      }
      
      const response = await chrome.tabs.sendMessage(tab.id, { command, ...payload });
      return response;
    } catch (err) {
      console.error(err);
      errorEl.textContent = 'Failed to communicate with content script. Try refreshing the page.';
      return null;
    }
  }

  async function updateStatus() {
    errorEl.textContent = '';
    const info = await sendMessageToContent('getDebugInfo');
    if (info) {
      statusEl.textContent = info.state || 'Unknown';
      siteMatchEl.textContent = info.siteConfigMatched ? 'Yes' : 'No';
      generatingEl.textContent = info.isLikelyGenerating ? 'True' : 'False';
      
      // Update color based on state
      if (info.state === 'loading') {
        statusEl.style.color = '#2563eb';
      } else if (info.state === 'done') {
        statusEl.style.color = '#16a34a';
      } else {
        statusEl.style.color = '#6b7280';
      }
    }
  }

  document.getElementById('refresh-btn').addEventListener('click', updateStatus);

  document.getElementById('force-loading').addEventListener('click', async () => {
    await sendMessageToContent('forceState', { state: 'loading' });
    updateStatus();
  });

  document.getElementById('force-done').addEventListener('click', async () => {
    await sendMessageToContent('forceState', { state: 'done' });
    updateStatus();
  });

  document.getElementById('force-idle').addEventListener('click', async () => {
    await sendMessageToContent('forceState', { state: 'idle' });
    updateStatus();
  });

  // Initial load
  updateStatus();
});