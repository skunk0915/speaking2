<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no">
    <title>English Training</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
    
    <!-- PWA Support -->
    <link rel="manifest" href="manifest.json">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="English Training">
    <link rel="apple-touch-icon" href="img/icon-192.png">
    
    <script>
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js')
                    .then(registration => {
                        console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    }, err => {
                        console.log('ServiceWorker registration failed: ', err);
                    });
            });
        }
    </script>
</head>
<body>
    <div class="app-container">


        <main id="conversation-container" class="conversation-container">
            <!-- Conversation items will be injected here -->
        </main>

        <div id="variation-menu" class="variation-menu hidden">
            <button data-type="formal">フォーマル</button>
            <button data-type="casual">カジュアル</button>
            <button data-type="simple">簡単</button>
        </div>

        <div id="settings-overlay" class="settings-overlay hidden"></div>
        <div id="settings-panel" class="settings-panel">
            <div class="settings-header">
                <h2>設定</h2>
                <button id="btn-close-settings" class="btn-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            <div class="setting-item">
                <label for="voice-select">Voice</label>
                <select id="voice-select">
                    <option value="en-US-Journey-F">Journey F (Female)</option>
                    <option value="en-US-Journey-D">Journey D (Male)</option>
                    <option value="en-US-Neural2-C">Neural2 C (Female)</option>
                    <option value="en-US-Neural2-J">Neural2 J (Male)</option>
                </select>
            </div>
            <div class="setting-item">
                <label for="speed-range">Speed: <span id="speed-val">1.0</span>x</label>
                <input type="range" id="speed-range" min="0.5" max="2.0" step="0.1" value="1.0">
            </div>
            <div class="setting-item">
                <label for="length-range">Length: <span id="length-val">100</span> chars</label>
                <input type="range" id="length-range" min="50" max="500" step="10" value="100">
            </div>
        </div>



        <div id="input-group" class="input-group">
            <div id="hint-display" class="hint-display hidden">
                <p class="label">例えば…</p>
                <p class="text"></p>
            </div>
            <div class="input-row">
                <textarea id="user-input" placeholder="英語で返信を入力..." rows="1"></textarea>
                <button id="btn-hint" class="btn-icon btn-hint" title="ヒントを表示">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                </button>
                <button id="btn-send" class="btn-icon btn-send" disabled>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
            </div>
            <button id="btn-new" class="btn btn-primary btn-block">新しい会話を生成</button>
        </div>
    </div>

    <button id="btn-settings" class="btn-icon floating-settings" title="設定">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
    </button>

    <template id="tmpl-conversation">
        <div class="conversation-group">
            <div class="conversation-item system-message">
                <div class="text-content">
                    <p class="japanese"></p>
                    <p class="english hidden"></p>
                </div>
                <div class="actions">
                    <button class="btn-translate" title="英訳を表示/非表示">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/></svg>
                    </button>
                    <button class="btn-speak" title="再生">
                        <svg class="icon-play" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        <svg class="icon-pause hidden" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        <div class="loader hidden"></div>
                    </button>
                    <button class="btn-repeat" title="リピート再生">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                    </button>
                    <button class="btn-variation-menu" title="バリエーション生成">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>
                    </button>
                </div>
            </div>
            
            <div class="user-message hidden">
                <p class="user-text"></p>
            </div>

            <div class="feedback-section hidden">
                <div class="feedback-content">
                    <h3>添削</h3>
                    <p class="correction"></p>
                    <h3>提案</h3>
                    <ul class="suggestions-list"></ul>
                    
                    <div class="item-qa-section">
                        <h3>質問</h3>
                        <div class="item-qa-container">
                            <!-- Q&A history for this item -->
                        </div>
                        <div class="item-qa-input-area">
                            <textarea class="item-qa-input" placeholder="この添削について質問..." rows="1"></textarea>
                            <button class="btn-icon btn-item-qa-send" disabled>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </template>

    <template id="tmpl-loading">
        <div class="conversation-group loading-group">
            <div class="conversation-item loading-item">
                <div class="loading-content">
                    <div class="loader"></div>
                    <p>会話を生成中...</p>
                </div>
            </div>
        </div>
    </template>

    <script src="js/app.js?v=<?php echo time(); ?>"></script>
</body>
</html>
