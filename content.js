(() => {
  const STATE = {
    IDLE: 'idle',
    LOADING: 'loading',
    DONE: 'done'
  };

  const siteConfig = [
    {
      host: /(^|\.)chatgpt\.com$|(^|\.)chat\.openai\.com$/,
      startSelectors: ['button[data-testid="send-button"]', 'form button[aria-label*="Send"]'],
      loadingSelectors: ['button[data-testid="stop-button"]', '.result-streaming']
    },
    {
      host: /(^|\.)claude\.ai$/,
      startSelectors: ['button[aria-label*="Send Message"]', 'button[data-testid="chat-input-send-button"]'],
      loadingSelectors: ['button[aria-label*="Stop"]', '.streaming']
    },
    {
      host: /(^|\.)gemini\.google\.com$/,
      startSelectors: ['button[aria-label*="Send"]'],
      loadingSelectors: ['button[aria-label*="Stop"]', 'div[class*="generating"]']
    },
    {
      host: /(^|\.)perplexity\.ai$|(^|\.)www\.perplexity\.ai$/,
      startSelectors: ['button[aria-label*="Submit"]', 'button[aria-label*="Send"]'],
      loadingSelectors: ['button[aria-label*="Stop"]', '.is-loading']
    },
    {
      host: /(^|\.)poe\.com$|(^|\.)chat\.deepseek\.com$|(^|\.)doubao\.com$|(^|\.)yuanbao\.tencent\.com$|(^|\.)kimi\.moonshot\.cn$/,
      startSelectors: ['button[type="submit"]', 'button[aria-label*="发送"]', 'button[aria-label*="Send"]'],
      loadingSelectors: ['button[aria-label*="停止"]', 'button[aria-label*="Stop"]', '[aria-busy="true"]']
    }
  ];

  const config = siteConfig.find((item) => item.host.test(location.host)) || {
    startSelectors: ['button[type="submit"]', 'button[aria-label*="Send"]', 'button[aria-label*="发送"]'],
    loadingSelectors: ['button[aria-label*="Stop"]', 'button[aria-label*="停止"]']
  };

  let state = STATE.IDLE;
  let spinTick = 0;
  let animationTimer = null;
  let baseIconDataUrl = null;
  let completionDebounce = null;
  let currentPluginIconUrl = null;
  let pollingInterval = null;

  // 使用自定义ID来标识插件的link
  const PLUGIN_ICON_ID = 'ai-progress-indicator-icon';

  function getPluginIconLink() {
    return document.getElementById(PLUGIN_ICON_ID);
  }

  function getOriginalIconLink() {
    // 查找非插件的 icon link
    const links = document.querySelectorAll('link[rel~="icon"]');
    for (let i = 0; i < links.length; i++) {
      if (links[i].id !== PLUGIN_ICON_ID) {
        return links[i];
      }
    }
    return null;
  }

  function getOrCreatePluginIconLink() {
    let link = getPluginIconLink();
    if (link) return link;
    
    link = document.createElement('link');
    link.rel = 'icon';
    link.id = PLUGIN_ICON_ID;
    document.head.appendChild(link);
    return link;
  }

  async function captureBaseIcon() {
    const iconLink = getOriginalIconLink();
    let iconUrl = iconLink?.href;
    
    if (!iconUrl) {
      iconUrl = `${location.origin}/favicon.ico`;
    }

    // 防止重复加载相同的 URL
    if (baseIconDataUrl && iconUrl === baseIconDataUrl) {
      return baseIconDataUrl;
    }

    try {
      baseIconDataUrl = await loadImageAsDataURL(iconUrl);
    } catch (e) {
      // 如果加载失败（CORS等），使用 Fallback
      if (!baseIconDataUrl) {
        baseIconDataUrl = createFallbackIcon();
      }
    }
    return baseIconDataUrl;
  }

  function loadImageAsDataURL(url) {
    return new Promise((resolve, reject) => {
      // 如果已经是 DataURL，直接返回
      if (url.startsWith('data:')) {
        resolve(url);
        return;
      }

      const img = new Image();
      // 尝试使用 anonymous，如果跨域且服务器不支持，会触发 onerror
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const size = 32;
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, size, size);
          resolve(canvas.toDataURL('image/png'));
        } catch (err) {
          // 如果 canvas tainted，这里会报错
          reject(err);
        }
      };
      
      img.onerror = () => {
        // 如果跨域失败，尝试不带 crossOrigin 加载？
        // 不行，不带 crossOrigin 加载的图片画到 canvas 上会导致 tainted，无法 toDataURL
        // 所以这里只能 reject
        reject(new Error('Image load failed or CORS blocked'));
      };
      
      img.src = url;
    });
  }

  function createFallbackIcon() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('AI', 16, 17);
    return canvas.toDataURL('image/png');
  }

  async function renderIcon(targetState) {
    // 确保有 base icon
    if (!baseIconDataUrl) {
      await captureBaseIcon();
    }
    
    const img = new Image();
    img.src = baseIconDataUrl;

    await new Promise((resolve) => {
      if (img.complete) {
        resolve();
      } else {
        img.onload = resolve;
        img.onerror = resolve; // 即使失败也继续，会画黑块
      }
    });

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    if (img.naturalWidth) {
      ctx.drawImage(img, 0, 0, 32, 32);
    } else {
      ctx.fillStyle = '#4b5563';
      ctx.fillRect(0, 0, 32, 32);
    }

    if (targetState === STATE.LOADING) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fillRect(0, 0, 32, 32);
      drawSpinner(ctx, spinTick);
    } else if (targetState === STATE.DONE) {
      drawCheck(ctx);
    }

    try {
      const url = canvas.toDataURL('image/png');
      currentPluginIconUrl = url;
      applyPluginIcon(url);
    } catch (e) {
      console.error('AI Tab Indicator: Failed to generate icon', e);
    }
  }
  
  function applyPluginIcon(url) {
    const link = getOrCreatePluginIconLink();
    if (link.href !== url) {
      link.href = url;
    }
    // 强制把我们的 link 移到最后，确保覆盖
    if (document.head.lastElementChild !== link) {
      document.head.appendChild(link);
    }
  }
  
  function removePluginIcon() {
    const link = getPluginIconLink();
    if (link) {
      link.remove();
    }
  }

  function drawSpinner(ctx, tick) {
    const cx = 16;
    const cy = 16;
    const radius = 10;
    const segments = 12;
    for (let i = 0; i < segments; i += 1) {
      const angle = ((Math.PI * 2) / segments) * i + tick * 0.35;
      const alpha = (i + 1) / segments;
      ctx.strokeStyle = `rgba(37, 99, 235, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * (radius - 3), cy + Math.sin(angle) * (radius - 3));
      ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      ctx.stroke();
    }
  }

  function drawCheck(ctx) {
    ctx.beginPath();
    ctx.arc(16, 16, 12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(22, 163, 74, 0.95)';
    ctx.fill();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(11, 16);
    ctx.lineTo(15, 20);
    ctx.lineTo(22, 12);
    ctx.stroke();
  }

  function setState(nextState) {
    console.log(`[AI Tab Indicator] State changed: ${state} -> ${nextState}`);
    const prevState = state;
    state = nextState;

    if (state === STATE.LOADING) {
      if (!animationTimer) {
        animationTimer = setInterval(() => {
          spinTick += 1;
          renderIcon(STATE.LOADING);
        }, 120);
      }
      renderIcon(STATE.LOADING);
      return;
    }

    if (animationTimer) {
      clearInterval(animationTimer);
      animationTimer = null;
    }

    if (state === STATE.DONE) {
      renderIcon(STATE.DONE);
      return;
    }

    // STATE.IDLE
    if (prevState !== STATE.IDLE) {
      // 恢复原状：移除插件的 icon link
      removePluginIcon();
      // 重新捕获，以防下次开始时图标变了
      captureBaseIcon();
    }
  }

  function isLikelyGenerating() {
    return config.loadingSelectors.some((selector) => document.querySelector(selector));
  }

  function handleGenerationStart() {
    setState(STATE.LOADING);
    if (completionDebounce) {
      clearTimeout(completionDebounce);
      completionDebounce = null;
    }
  }

  function handleGenerationStop() {
    if (completionDebounce) clearTimeout(completionDebounce);
    completionDebounce = setTimeout(() => {
      if (!isLikelyGenerating()) {
        setState(STATE.DONE);
      } else {
        setState(STATE.LOADING);
      }
    }, 1500);
  }

  function setupEventDetection() {
    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const matchedStart = config.startSelectors.some((selector) => target.closest(selector));
      const matchedStop = config.loadingSelectors.some((selector) => target.closest(selector));

      if (matchedStart) {
        console.log('[AI Tab Indicator] Start selector matched');
        handleGenerationStart();
      }
      if (matchedStop) {
        console.log('[AI Tab Indicator] Stop selector matched');
        handleGenerationStop();
      }
    }, true);

    document.addEventListener('keydown', (event) => {
      const isEnterSend = event.key === 'Enter' && !event.shiftKey && !event.isComposing;
      const active = document.activeElement;
      const inEditor = active && (
        active.tagName === 'TEXTAREA' ||
        active.getAttribute('contenteditable') === 'true' ||
        active.closest('[contenteditable="true"]')
      );
      if (isEnterSend && inEditor) {
        console.log('[AI Tab Indicator] Enter key in editor');
        handleGenerationStart();
      }
    }, true);

    const mutationObserver = new MutationObserver(() => {
      const generating = isLikelyGenerating();
      if (state === STATE.LOADING && !generating) {
        handleGenerationStop();
      } else if (state !== STATE.LOADING && generating) {
        console.log('[AI Tab Indicator] Generating detected by mutation');
        handleGenerationStart();
      }
    });

    mutationObserver.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true
    });

    // 替换复杂的 Head Observer，使用简单的 Polling 检查
    // 每 1000ms 检查一次图标状态
    pollingInterval = setInterval(() => {
      if (state !== STATE.IDLE) {
        // 如果正在显示插件图标，确保它是生效的（在最后）
        const pluginLink = getPluginIconLink();
        if (pluginLink && document.head.lastElementChild !== pluginLink) {
           document.head.appendChild(pluginLink);
        }
        // 如果插件 link 丢了，重新创建
        if (!pluginLink) {
           renderIcon(state);
        }
      } else {
        // IDLE 状态，定期更新 baseIcon，以防网站换了图标
        captureBaseIcon();
      }
    }, 1000);
  }

  function setupResetOnViewed() {
    const clearIfDone = () => {
      const viewed = document.visibilityState === 'visible' && document.hasFocus();
      if (viewed && state === STATE.DONE) {
        console.log('[AI Tab Indicator] Resetting to IDLE (Viewed)');
        setState(STATE.IDLE);
      }
    };

    document.addEventListener('visibilitychange', clearIfDone);
    window.addEventListener('focus', clearIfDone);
    document.addEventListener('pointerdown', clearIfDone, true);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') return;
      clearIfDone();
    }, true);
  }
  
  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.command === 'getDebugInfo') {
        sendResponse({
          state: state,
          siteConfigMatched: !!siteConfig.find((item) => item.host.test(location.host)),
          isLikelyGenerating: isLikelyGenerating()
        });
      } else if (message.command === 'forceState') {
        console.log(`[AI Tab Indicator] Force state: ${message.state}`);
        setState(message.state);
        sendResponse({ success: true });
      }
    });
  }

  async function init() {
    console.log('[AI Tab Indicator] Initializing...');
    await captureBaseIcon();
    setupEventDetection();
    setupResetOnViewed();
    setupMessageListener();

    if (isLikelyGenerating()) {
      setState(STATE.LOADING);
    }
  }

  init();
})();
