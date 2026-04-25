const API_BASE = 'https://grimlily.grenadine0syrup.workers.dev';

const priceMap = {
  Quartz: 'price_1TNLksGfyAVlSOBgUiq2N7d8',
  Amethyst: 'price_1TNLy9GfyAVlSOBghwzLe0iO',
  Sapphire: 'price_1TNM66GfyAVlSOBg1Ly8dRt5',
  Diamond: 'price_1TNM7dGfyAVlSOBg8AbgC8vT',
  Boost: 'price_1TNLtrGfyAVlSOBgUjxgLN2h',
};

function showToast(message, type = 'info', duration = 4500) {
  document.querySelectorAll('.toast').forEach((existing) => existing.remove());

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
  toast.textContent = message;
  document.body.appendChild(toast);

  window.requestAnimationFrame(() => toast.classList.add('show'));

  window.setTimeout(() => {
    toast.classList.remove('show');
    window.setTimeout(() => toast.remove(), 450);
  }, duration);
}

function isConfiguredPriceId(priceId) {
  return typeof priceId === 'string' && priceId.startsWith('price_') && !priceId.includes('XXXXXXXX');
}

function isTrustedCheckoutUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && /(^|\.)stripe\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
}

function resetCheckoutButtons() {
  document.querySelectorAll('[data-checkout-plan]').forEach((button) => {
    const label = button.querySelector('span');
    button.disabled = false;
    button.removeAttribute('aria-busy');
    if (label && button.dataset.originalText) {
      label.textContent = button.dataset.originalText;
    }
  });
}

function buildResultOverlay(result) {
  const config = result === 'success'
    ? {
        iconType: 'success',
        title: '庭へようこそ',
        lines: [
          'ビジター登録が完了しました。',
          'ご登録のメールアドレスに、庭へお入りいただくリンクをお送りしましたので、ご確認ください。',
        ],
      }
    : {
        iconType: 'cancel',
        title: '決済がキャンセルされました',
        lines: [
          'お支払いは完了していません。',
          'もう一度お試しいただくか、別のプランをご検討ください。',
        ],
      };

  const overlay = document.createElement('div');
  overlay.className = 'result-overlay';

  const box = document.createElement('div');
  box.className = 'result-box';

  const icon = document.createElement('div');
  icon.className = `result-icon ${config.iconType}`;
  icon.innerHTML = config.iconType === 'success'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';

  const title = document.createElement('h2');
  title.className = 'result-title';
  title.textContent = config.title;

  const desc = document.createElement('p');
  desc.className = 'result-desc';
  config.lines.forEach((line, index) => {
    if (index > 0) {
      desc.appendChild(document.createElement('br'));
    }
    desc.appendChild(document.createTextNode(line));
  });

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'result-btn';
  close.dataset.resultClose = 'true';
  close.textContent = '閉じる';

  box.append(icon, title, desc, close);
  overlay.appendChild(box);
  return overlay;
}

function showCheckoutResult() {
  const params = new URLSearchParams(window.location.search);
  const result = params.get('result');
  if (result !== 'success' && result !== 'cancel') {
    return;
  }

  document.body.appendChild(buildResultOverlay(result));
}

async function handleCheckout(plan, button) {
  const priceId = priceMap[plan];
  const label = button.querySelector('span');
  const originalText = label ? label.textContent : '';

  if (!isConfiguredPriceId(priceId)) {
    showToast('このプランは現在お申し込み準備中です。時間をおいて再度ご確認ください。', 'warn');
    return;
  }

  if (label && !button.dataset.originalText) {
    button.dataset.originalText = originalText;
  }

  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  if (label) {
    label.textContent = '処理中...';
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 15000);

  try {
    const isBoost = plan === 'Boost';
    const response = await fetch(`${API_BASE}/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId,
        mode: isBoost ? 'payment' : 'subscription',
      }),
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'strict-origin-when-cross-origin',
      signal: controller.signal,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || '決済URLが取得できませんでした');
    }
    if (!data.url || !isTrustedCheckoutUrl(data.url)) {
      throw new Error('信頼できる決済URLを確認できませんでした');
    }

    window.location.assign(data.url);
  } catch (error) {
    console.error('Checkout error:', error);
    const message = error.name === 'AbortError'
      ? '通信がタイムアウトしました。時間をおいて再度お試しください。'
      : '決済ページの読み込みに失敗しました。もう一度お試しください。';
    showToast(message, 'error');
    button.disabled = false;
    button.removeAttribute('aria-busy');
    if (label) {
      label.textContent = button.dataset.originalText || originalText;
    }
  } finally {
    window.clearTimeout(timeoutId);
  }
}

window.addEventListener('load', () => {
  const loader = document.getElementById('loader');
  window.setTimeout(() => loader?.classList.add('hidden'), 600);
});

window.addEventListener('pageshow', resetCheckoutButtons);

document.addEventListener('DOMContentLoaded', () => {
  const particles = document.getElementById('particles');
  if (particles) {
    for (let i = 0; i < 14; i += 1) {
      const particle = document.createElement('div');
      const size = Math.random() * 2.5 + 1.5;
      const colors = ['rgba(157,192,204,.3)', 'rgba(209,179,195,.25)', 'rgba(196,176,216,.2)'];
      particle.className = 'particle';
      particle.style.cssText = `width:${size}px;height:${size}px;left:${Math.random() * 100}%;background:${colors[i % 3]};animation-duration:${Math.random() * 8 + 10}s;animation-delay:${Math.random() * 8}s;`;
      particles.appendChild(particle);
    }
  }

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.06 });
    document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));
  } else {
    document.querySelectorAll('.reveal').forEach((element) => element.classList.add('visible'));
  }

  if (window.matchMedia('(pointer:fine)').matches) {
    let lastRippleTime = 0;
    document.addEventListener('mousemove', (event) => {
      const now = Date.now();
      if (now - lastRippleTime < 160) {
        return;
      }
      lastRippleTime = now;
      const ripple = document.createElement('div');
      ripple.className = 'ripple';
      ripple.style.left = `${event.clientX}px`;
      ripple.style.top = `${event.clientY}px`;
      document.body.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 800);
    });
  }

  document.querySelectorAll('[data-checkout-plan]').forEach((button) => {
    button.addEventListener('click', () => {
      handleCheckout(button.dataset.checkoutPlan, button);
    });
  });

  document.addEventListener('click', (event) => {
    const closeButton = event.target.closest('[data-result-close]');
    if (!closeButton) {
      return;
    }

    const overlay = closeButton.closest('.result-overlay');
    overlay?.remove();
    history.replaceState(null, '', window.location.pathname);
  });

  showCheckoutResult();
});
