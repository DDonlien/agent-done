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
      loadingSelectors: ['button[data-testid="stop-button"]']
    },
    {
      host: /(^|\.)claude\.ai$/,
      startSelectors: ['button[aria-label*="Send Message"]', 'button[data-testid="chat-input-send-button"]'],
      loadingSelectors: ['button[aria-label*="Stop"]']
    },
    {
      host: /(^|\.)gemini\.google\.com$/,
      startSelectors: ['button[aria-label*="Send"]'],
      loadingSelectors: ['button[aria-label*="Stop"]']
    },
    {
      host: /(^|\.)perplexity\.ai$|(^|\.)www\.perplexity\.ai$/,
      startSelectors: ['button[aria-label*="Submit"]', 'button[aria-label*="Send"]'],
      loadingSelectors: ['button[aria-label*="Stop"]']
    },
    {
      host: /(^|\.)poe\.com$|(^|\.)chat\.deepseek\.com$|(^|\.)doubao\.com$|(^|\.)yuanbao\.tencent\.com$|(^|\.)kimi\.moonshot\.cn$/,
      startSelectors: ['button[type="submit"]', 'button[aria-label*="发送"]', 'button[aria-label*="Send"]'],
      loadingSelectors: ['button[aria-label*="停止"]', 'button[aria-label*="Stop"]']
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
  let currentIconLink = null;
  let mutationObserver = null;
  let completionDebounce = null;

  function getOrCreateIconLink() {
    const existing = document.querySelector('link[rel~="icon"]');
    if (existing) return existing;
    const link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
    return link;
  }

  async function captureBaseIcon() {
    if (baseIconDataUrl) return baseIconDataUrl;

    const iconLink = document.querySelector('link[rel~="icon"]');
    let iconUrl = iconLink?.href;
    if (!iconUrl) {
      iconUrl = `${location.origin}/favicon.ico`;
    }

    baseIconDataUrl = await loadImageAsDataURL(iconUrl).catch(() => createFallbackIcon());
    return baseIconDataUrl;
  }

  function loadImageAsDataURL(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const size = 32;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
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

  async function renderIcon(nextState) {
    const base = await captureBaseIcon();
    const img = new Image();
    img.src = base;

    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
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

    if (nextState === STATE.LOADING) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fillRect(0, 0, 32, 32);
      drawSpinner(ctx, spinTick);
    } else if (nextState === STATE.DONE) {
      drawCheck(ctx);
    }

    const url = canvas.toDataURL('image/png');
    currentIconLink = getOrCreateIconLink();
    currentIconLink.href = url;
  }

  function drawSpinner(ctx, tick) {
    const cx = 24;
    const cy = 8;
    const radius = 5;
    const segments = 12;
    for (let i = 0; i < segments; i += 1) {
      const angle = ((Math.PI * 2) / segments) * i + tick * 0.35;
      const alpha = (i + 1) / segments;
      ctx.strokeStyle = `rgba(37, 99, 235, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * (radius - 2), cy + Math.sin(angle) * (radius - 2));
      ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      ctx.stroke();
    }
  }

  function drawCheck(ctx) {
    ctx.beginPath();
    ctx.arc(24, 8, 7, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(22, 163, 74, 0.95)';
    ctx.fill();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(21, 8);
    ctx.lineTo(23.5, 10.5);
    ctx.lineTo(27.5, 6.5);
    ctx.stroke();
  }

  function setState(nextState) {
    if (state === nextState) return;
    state = nextState;

    if (state === STATE.LOADING) {
      if (animationTimer) clearInterval(animationTimer);
      animationTimer = setInterval(() => {
        spinTick += 1;
        renderIcon(STATE.LOADING);
      }, 120);
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

    const iconLink = document.querySelector('link[rel~="icon"]');
    if (iconLink && baseIconDataUrl) {
      iconLink.href = baseIconDataUrl;
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
      }
    }, 700);
  }

  function setupEventDetection() {
    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const matchedStart = config.startSelectors.some((selector) => target.closest(selector));
      const matchedStop = config.loadingSelectors.some((selector) => target.closest(selector));

      if (matchedStart) {
        handleGenerationStart();
      }
      if (matchedStop) {
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
        handleGenerationStart();
      }
    }, true);

    mutationObserver = new MutationObserver(() => {
      if (state === STATE.LOADING && !isLikelyGenerating()) {
        handleGenerationStop();
      } else if (state !== STATE.LOADING && isLikelyGenerating()) {
        handleGenerationStart();
      }
    });

    mutationObserver.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-busy', 'disabled']
    });
  }

  function setupResetOnViewed() {
    const clearIfDone = () => {
      const viewed = document.visibilityState === 'visible' && document.hasFocus();
      if (viewed && state === STATE.DONE) {
        setState(STATE.IDLE);
      }
    };

    document.addEventListener('visibilitychange', clearIfDone);
    window.addEventListener('focus', clearIfDone);
    document.addEventListener('pointerdown', clearIfDone, true);
    document.addEventListener('keydown', clearIfDone, true);
  }

  async function init() {
    await captureBaseIcon();
    setupEventDetection();
    setupResetOnViewed();

    if (isLikelyGenerating()) {
      setState(STATE.LOADING);
    }
  }

  init();
})();
