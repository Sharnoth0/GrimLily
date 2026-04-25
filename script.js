/* ============================================================
 * GrimLily 公式サイト – フロント JS
 * 元 index.html のインラインスクリプトを分離
 * ============================================================ */

/* ─────────────────────────────────────────────
 * Loader – 0.8s 後に隠す
 * ───────────────────────────────────────────── */
window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('hidden');
  }, 800);
});

/* ─────────────────────────────────────────────
 * スクロールで topBar / sidebar に scrolled クラス
 * ───────────────────────────────────────────── */
const tb = document.getElementById('topBar');
const sb = document.getElementById('sidebar');
window.addEventListener('scroll', () => {
  if (tb) tb.classList.toggle('scrolled', scrollY > 80);
  if (sb) sb.classList.toggle('scrolled', scrollY > 80);
}, { passive: true });

/* ─────────────────────────────────────────────
 * セクション in-view → サイドナビをアクティブ化
 * ───────────────────────────────────────────── */
const secs = document.querySelectorAll('section[id]');
const bna = document.querySelectorAll('.sb-link[href^="#"]');
secs.forEach((s) => {
  new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (e.isIntersecting) {
        bna.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
      }
    });
  }, { threshold: .12, rootMargin: '-8% 0px -55% 0px' }).observe(s);
});

/* ─────────────────────────────────────────────
 * 配信ガイドライン モーダル
 * ───────────────────────────────────────────── */
const mo = document.getElementById('modalOv');
const navGuideBtn = document.getElementById('navGuideBtn');
const closeModalBtn = document.getElementById('closeModal');
if (mo && navGuideBtn && closeModalBtn) {
  navGuideBtn.addEventListener('click', () => mo.classList.add('open'));
  closeModalBtn.addEventListener('click', () => mo.classList.remove('open'));
  mo.addEventListener('click', (e) => { if (e.target === mo) mo.classList.remove('open'); });
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && mo) mo.classList.remove('open');
});

/* ─────────────────────────────────────────────
 * Reveal アニメーション
 * ───────────────────────────────────────────── */
document.querySelectorAll('.reveal').forEach((r) => {
  new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: .06 }).observe(r);
});

/* ─────────────────────────────────────────────
 * 桜の花びら / Hero パーティクル
 * ───────────────────────────────────────────── */
(function () {
  const c = document.getElementById('sakura');
  if (!c) return;
  for (let i = 0; i < 12; i += 1) {
    const p = document.createElement('div');
    p.className = 'petal';
    const s = Math.random() * 11 + 5;
    p.style.cssText = `width:${s}px;height:${s}px;left:${Math.random() * 100}%;--po:${Math.random() * .14 + .06};animation-duration:${Math.random() * 8 + 11}s;animation-delay:${Math.random() * 10 + 4}s;`;
    c.appendChild(p);
  }
})();
(function () {
  const c = document.getElementById('heroParticles');
  if (!c) return;
  for (let i = 0; i < 18; i += 1) {
    const p = document.createElement('div');
    p.className = 'h-particle';
    const s = Math.random() * 2 + 1.5;
    p.style.cssText = `width:${s}px;height:${s}px;left:${Math.random() * 100}%;animation-duration:${Math.random() * 8 + 10}s;animation-delay:${Math.random() * 12}s;`;
    c.appendChild(p);
  }
})();

/* ─────────────────────────────────────────────
 * SNSシェアリンク URL 設定
 * ───────────────────────────────────────────── */
(function () {
  const pu = encodeURIComponent(location.href);
  const pt = encodeURIComponent('GrimLily - タイトル未定 公式サイト');
  const shareX = document.getElementById('shareX');
  const shareLine = document.getElementById('shareLine');
  if (shareX) shareX.href = 'https://twitter.com/intent/tweet?url=' + pu + '&text=' + pt;
  if (shareLine) shareLine.href = 'https://social-plugins.line.me/lineit/share?url=' + pu;
})();

/* ─────────────────────────────────────────────
 * 星カスタムカーソル（デスクトップ・hover対応のみ）
 * ───────────────────────────────────────────── */
if (matchMedia('(pointer:fine)').matches && !matchMedia('(hover:none)').matches) {
  const star = document.getElementById('cursorStar');
  const dot = document.getElementById('cursorDot');
  if (star && dot) {
    document.body.classList.add('has-custom-cursor');

    let mx = -100, my = -100;
    let sx = -100, sy = -100;
    let tracking = false;

    document.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.left = mx + 'px';
      dot.style.top = my + 'px';
      if (!tracking) {
        tracking = true;
        sx = mx; sy = my;
        star.style.left = sx + 'px';
        star.style.top = sy + 'px';
        requestAnimationFrame(animate);
      }
    }, { passive: true });

    function animate() {
      sx += (mx - sx) * 0.35;
      sy += (my - sy) * 0.35;
      if (Math.abs(mx - sx) < 0.2) sx = mx;
      if (Math.abs(my - sy) < 0.2) sy = my;
      star.style.left = sx + 'px';
      star.style.top = sy + 'px';
      requestAnimationFrame(animate);
    }

    const hoverSelector = 'a,button,input,textarea,select,[role="button"]';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(hoverSelector)) {
        star.classList.add('hover');
        dot.classList.add('hover');
      }
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(hoverSelector) && !e.relatedTarget?.closest(hoverSelector)) {
        star.classList.remove('hover');
        dot.classList.remove('hover');
      }
    });

    document.addEventListener('mousedown', () => star.classList.add('click'));
    document.addEventListener('mouseup', () => star.classList.remove('click'));

    document.addEventListener('mouseleave', () => {
      star.style.opacity = '0';
      dot.style.opacity = '0';
    });
    document.addEventListener('mouseenter', () => {
      star.style.opacity = '1';
      dot.style.opacity = '1';
    });
  }
}

/* ─────────────────────────────────────────────
 * 内部リンクのスムーススクロール
 * ───────────────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const h = a.getAttribute('href');
    if (!h || h === '#') return;
    const t = document.querySelector(h);
    if (t) {
      e.preventDefault();
      t.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

/* ============================================================
 * BGM（モーダルで同意 → 再生 → 音量コントロール）
 *   audio: BGM/thema1.mp3 （loop）
 *   sessionStorage に判断を記憶し、戻ってきた時はモーダル省略
 * ============================================================ */
(function bgmInit() {
  const SESSION_KEY = 'grimlily:bgm-choice';   // 'accepted' | 'declined'
  const VOLUME_KEY = 'grimlily:bgm-volume';   // 0–100

  const modal = document.getElementById('bgmModal');
  const acceptBtn = document.getElementById('bgmAccept');
  const declineBtn = document.getElementById('bgmDecline');
  const ctrl = document.getElementById('bgmCtrl');
  const toggleBtn = document.getElementById('bgmToggle');
  const volSlider = document.getElementById('bgmVolume');
  const audio = document.getElementById('bgmAudio');
  const icon = document.getElementById('bgmIcon');

  if (!modal || !audio || !ctrl || !toggleBtn || !volSlider) return;

  // 音量スライダーの塗り反映
  function paintSlider() {
    volSlider.style.setProperty('--vol', volSlider.value + '%');
  }

  // 初期音量（保存値があればそれ、無ければ60）
  const savedVol = Number(sessionStorage.getItem(VOLUME_KEY));
  const initialVol = (Number.isFinite(savedVol) && savedVol >= 0 && savedVol <= 100) ? savedVol : 60;
  volSlider.value = String(initialVol);
  audio.volume = initialVol / 100;
  paintSlider();

  // アイコン切替（再生中 / ミュート時）
  function setIcon(playing) {
    if (!icon) return;
    if (playing) {
      icon.innerHTML =
        '<path d="M11 5L6 9H2v6h4l5 4z"/>' +
        '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>' +
        '<path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>';
    } else {
      icon.innerHTML =
        '<path d="M11 5L6 9H2v6h4l5 4z"/>' +
        '<line x1="22" y1="9" x2="16" y2="15"/>' +
        '<line x1="16" y1="9" x2="22" y2="15"/>';
    }
  }

  // モーダル表示制御
  function showModal() {
    modal.classList.add('show');
  }
  function hideModal() {
    modal.classList.remove('show');
  }

  // 音量コントロールの表示制御
  function showCtrl() {
    ctrl.classList.add('show');
  }

  // BGM 再生開始
  async function startBgm() {
    try {
      await audio.play();
      setIcon(true);
    } catch (err) {
      // 自動再生ブロック等
      console.warn('BGM play failed:', err);
      setIcon(false);
    }
    showCtrl();
  }

  // モーダル：同意して再生
  acceptBtn?.addEventListener('click', () => {
    sessionStorage.setItem(SESSION_KEY, 'accepted');
    hideModal();
    startBgm();
  });

  // モーダル：拒否（コントロールは表示しておく。後から再生したい人のために）
  declineBtn?.addEventListener('click', () => {
    sessionStorage.setItem(SESSION_KEY, 'declined');
    hideModal();
    setIcon(false);
    showCtrl();
  });

  // 音量スライダー
  volSlider.addEventListener('input', () => {
    const v = Number(volSlider.value);
    audio.volume = v / 100;
    sessionStorage.setItem(VOLUME_KEY, String(v));
    paintSlider();
    // 0 にしたら一時停止扱い、戻ったら再生
    if (v === 0) {
      audio.pause();
      setIcon(false);
    } else if (audio.paused && sessionStorage.getItem(SESSION_KEY) === 'accepted') {
      audio.play().then(() => setIcon(true)).catch(() => {});
    }
  });

  // 再生 / 一時停止 トグル
  toggleBtn.addEventListener('click', () => {
    if (audio.paused) {
      // 一度同意がない場合はここで accepted 扱いにする
      if (sessionStorage.getItem(SESSION_KEY) !== 'accepted') {
        sessionStorage.setItem(SESSION_KEY, 'accepted');
      }
      audio.play().then(() => setIcon(true)).catch(() => setIcon(false));
    } else {
      audio.pause();
      setIcon(false);
    }
  });

  // audio 自身の状態変化に追従（外的要因で止まった等）
  audio.addEventListener('play', () => setIcon(true));
  audio.addEventListener('pause', () => setIcon(false));

  // 起動時の判断
  const choice = sessionStorage.getItem(SESSION_KEY);
  if (choice === 'accepted') {
    // 戻ってきたユーザー → モーダル飛ばして再生
    startBgm();
  } else if (choice === 'declined') {
    // 拒否済み → モーダル出さずコントロールだけ
    setIcon(false);
    showCtrl();
  } else {
    // 初回訪問 → loader 退場後にモーダル表示
    window.setTimeout(showModal, 1200);
  }
})();
