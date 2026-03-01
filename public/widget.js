(function() {
  'use strict';

  // === 設定 ===
  var CHAT_URL = 'https://cosme.links-create.co.jp/chat/widget';
  var CHAT_ORIGIN = 'https://cosme.links-create.co.jp';
  var PROACTIVE_DELAY = 8000;

  // === 状態 ===
  var isOpen = false;
  var iframe = null;
  var btn, bubble, container, style;

  // === リップスティックマスコットSVG ===
  var LIPSTICK_SVG = '<svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">'
    + '<rect x="30" y="52" width="40" height="38" rx="4" fill="#c4a07a"/>'
    + '<rect x="33" y="55" width="34" height="32" rx="2" fill="#d4b08a"/>'
    + '<rect x="28" y="46" width="44" height="8" rx="2" fill="#b8967a"/>'
    + '<rect x="34" y="12" width="32" height="36" rx="4" fill="#e06088"/>'
    + '<rect x="34" y="12" width="32" height="10" rx="4" fill="#c74b72"/>'
    + '<ellipse cx="43" cy="32" rx="3" ry="3.5" fill="#1a1a1a"/>'
    + '<ellipse cx="44" cy="31" rx="1.2" ry="1.2" fill="#fff"/>'
    + '<ellipse cx="57" cy="32" rx="3" ry="3.5" fill="#1a1a1a"/>'
    + '<ellipse cx="58" cy="31" rx="1.2" ry="1.2" fill="#fff"/>'
    + '<ellipse cx="38" cy="38" rx="4" ry="2.5" fill="#ff8a80" opacity="0.6"/>'
    + '<ellipse cx="62" cy="38" rx="4" ry="2.5" fill="#ff8a80" opacity="0.6"/>'
    + '<path d="M 44 40 Q 50 46 56 40" stroke="#1a1a1a" stroke-width="2" fill="none" stroke-linecap="round"/>'
    + '</svg>';

  var CLOSE_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">'
    + '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  // === CSS注入 ===
  function injectStyles() {
    style = document.createElement('style');
    style.textContent = ''
      + '@keyframes cosme-pulse{0%{transform:scale(1);box-shadow:0 4px 15px rgba(184,77,115,0.4)}50%{transform:scale(1.08);box-shadow:0 4px 40px rgba(184,77,115,0.9)}100%{transform:scale(1);box-shadow:0 4px 15px rgba(184,77,115,0.4)}}'
      + '@keyframes cosme-ripple{0%{transform:scale(1);opacity:0.6}100%{transform:scale(1.8);opacity:0}}'
      + '.cosme-chat-btn{position:fixed!important;bottom:76px!important;right:16px!important;z-index:99999!important;width:64px;height:64px;border-radius:50%;border:none;cursor:pointer;background:#b84d73;box-shadow:0 4px 15px rgba(184,77,115,0.4);transition:box-shadow .3s;display:flex;align-items:center;justify-content:center;padding:0;animation:cosme-pulse 2s ease-in-out infinite;}'
      + '.cosme-chat-btn::before{content:"";position:absolute;top:0;left:0;width:100%;height:100%;border-radius:50%;background:rgba(184,77,115,0.3);animation:cosme-ripple 2.5s ease-out infinite;pointer-events:none}'
      + '.cosme-chat-btn:hover{box-shadow:0 6px 28px rgba(184,77,115,0.6);animation:none}'
      + '.cosme-chat-btn:hover::before{animation:none;opacity:0}'
      + '.cosme-chat-btn.open{background:#555;box-shadow:0 4px 20px rgba(0,0,0,0.3);animation:none}'
      + '.cosme-chat-btn.open::before{animation:none;opacity:0}'
      + '.cosme-chat-bubble{position:fixed!important;bottom:152px!important;right:16px!important;z-index:99998!important;background:#fff;border-radius:16px;padding:14px 18px;box-shadow:0 4px 24px rgba(0,0,0,0.15);max-width:240px;font-size:14px;color:#333;line-height:1.6;opacity:0;transform:translateY(10px);transition:opacity .4s,transform .4s;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Hiragino Sans",sans-serif;pointer-events:none;}'
      + '.cosme-chat-bubble.show{opacity:1;transform:translateY(0);pointer-events:auto}'
      + '.cosme-chat-bubble::after{content:"";position:absolute;bottom:-8px;right:24px;width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:8px solid #fff}'
      + '.cosme-chat-bubble-close{position:absolute;top:4px;right:8px;background:none;border:none;cursor:pointer;font-size:16px;color:#999;line-height:1;padding:2px}'
      + '.cosme-chat-container{position:fixed!important;z-index:99999!important;bottom:148px;right:16px;width:380px;height:580px;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.15);opacity:0;transform:scale(0.8) translateY(20px);transform-origin:bottom right;transition:opacity .3s,transform .3s;pointer-events:none}'
      + '.cosme-chat-container.open{opacity:1;transform:scale(1) translateY(0);pointer-events:auto}'
      + '.cosme-chat-container iframe{width:100%;height:100%;border:none}'
      + '@media(max-width:768px){'
      + '.cosme-chat-btn{width:56px;height:56px;bottom:72px!important;right:12px!important}'
      + '.cosme-chat-container{top:0;left:0;right:0;bottom:0;width:100%!important;height:100%!important;border-radius:0;padding-bottom:env(safe-area-inset-bottom,0)}'
      + '.cosme-chat-bubble{right:12px!important;bottom:136px!important;max-width:200px}'
      + '}';
    document.head.appendChild(style);
  }

  // === DOM生成 ===
  function createElements() {
    btn = document.createElement('button');
    btn.className = 'cosme-chat-btn';
    btn.setAttribute('aria-label', 'コスメAIチャットを開く');
    btn.innerHTML = LIPSTICK_SVG;
    btn.addEventListener('click', toggleChat);
    document.body.appendChild(btn);

    // プロアクティブバブル
    bubble = document.createElement('div');
    bubble.className = 'cosme-chat-bubble';
    bubble.innerHTML = '\uD83D\uDC84 コスメの相談、<br>AIにおまかせ！<button class="cosme-chat-bubble-close" aria-label="閉じる">&times;</button>';
    bubble.addEventListener('click', function(e) {
      if (e.target.classList.contains('cosme-chat-bubble-close')) {
        hideBubble();
        try { sessionStorage.setItem('cosme-chat-bubble-closed', '1'); } catch(ex) {}
        return;
      }
      openChat();
    });
    document.body.appendChild(bubble);

    // iframeコンテナ
    container = document.createElement('div');
    container.className = 'cosme-chat-container';
    document.body.appendChild(container);
  }

  // === チャット開閉 ===
  function toggleChat() {
    if (isOpen) { closeChat(); } else { openChat(); }
  }

  function openChat() {
    isOpen = true;
    hideBubble();

    // iframe遅延生成（初回のみ）
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.src = CHAT_URL;
      iframe.setAttribute('title', 'コスメコンシェルジュ AI');
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
      container.appendChild(iframe);
    }

    container.classList.add('open');
    btn.innerHTML = CLOSE_SVG;
    btn.classList.add('open');

    // 肌プロフィールと閲覧中商品を送信
    sendInitData();

    // モバイル: bodyスクロール抑止
    if (window.innerWidth <= 768) {
      document.body.style.overflow = 'hidden';
    }
  }

  function closeChat() {
    isOpen = false;
    container.classList.remove('open');
    btn.innerHTML = LIPSTICK_SVG;
    btn.classList.remove('open');
    document.body.style.overflow = '';
  }

  // === 親PWAからデータ送信 ===
  function sendInitData() {
    if (!iframe || !iframe.contentWindow) return;

    // SkinProfile取得（親PWAのSkinProfile.get()を利用）
    var skinProfile = null;
    try {
      if (window.SkinProfile && typeof window.SkinProfile.get === 'function') {
        skinProfile = window.SkinProfile.get();
      }
    } catch(ex) {}

    // 閲覧中商品（CosmeApp.currentResultから取得）
    var currentProduct = null;
    try {
      if (window.CosmeApp && window.CosmeApp.currentResult) {
        var r = window.CosmeApp.currentResult;
        currentProduct = {
          name: r.productName || r.name || '',
          brand: r.brand || '',
          barcode: r.barcode || '',
          category: r.category || ''
        };
      }
    } catch(ex) {}

    iframe.contentWindow.postMessage({
      type: 'cosme-chat-init',
      skinProfile: skinProfile,
      currentProduct: currentProduct
    }, CHAT_ORIGIN);
  }

  function showBubble() {
    try {
      if (sessionStorage.getItem('cosme-chat-bubble-closed') === '1') return;
      if (localStorage.getItem('cosme-chat-used') === '1') return;
    } catch(ex) {}
    if (isOpen) return;
    bubble.classList.add('show');
  }

  function hideBubble() {
    bubble.classList.remove('show');
  }

  // === postMessage受信 ===
  window.addEventListener('message', function(e) {
    if (e.origin !== CHAT_ORIGIN) return;

    if (e.data && e.data.type === 'cosme-chat-close') {
      closeChat();
    }
    if (e.data && e.data.type === 'cosme-chat-ready') {
      try { localStorage.setItem('cosme-chat-used', '1'); } catch(ex) {}
      // ready受信後にデータ送信
      sendInitData();
    }
    if (e.data && e.data.type === 'cosme-chat-search') {
      // チャットからの商品検索リクエスト → 親PWAの検索を実行
      try {
        if (window.performSearch && e.data.keyword) {
          window.performSearch(e.data.keyword);
        }
      } catch(ex) {}
    }
  });

  // === 初期化 ===
  function init() {
    injectStyles();
    createElements();
    setTimeout(showBubble, PROACTIVE_DELAY);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
