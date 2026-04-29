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

    <!-- Favicon placeholder to avoid 404 -->
    <link rel="icon" href="data:,">

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
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
</head>

<body>
    <div class="app-container">


        <div class="app-tabs">
            <button id="tab-practice" class="tab-item active">練習</button>
            <button id="tab-review" class="tab-item">復習</button>
        </div>

        <main id="conversation-container" class="conversation-container section-active">
            <!-- Conversation items will be injected here -->
        </main>

        <main id="review-container" class="conversation-container hidden">
            <!-- Review items will be injected here -->
        </main>



        <div id="settings-overlay" class="settings-overlay hidden"></div>
        <div id="settings-panel" class="settings-panel">
            <div class="settings-header">
                <h2>設定</h2>
                <button id="btn-close-settings" class="btn-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
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
                <label for="speed-range">Speed: <span id="speed-val">0.8</span>x</label>
                <input type="range" id="speed-range" min="0.5" max="2.0" step="0.1" value="0.8">
            </div>
            <div class="setting-item">
                <label for="ai-style-select">AIの話し方</label>
                <select id="ai-style-select">
                    <option value="polite">ですます調</option>
                    <option value="friendly">フレンドリー</option>
                    <option value="jk">JK</option>
                </select>
            </div>
            <div class="setting-item">
                <label for="english-level-select">英文レベル</label>
                <select id="english-level-select">
                    <option value="native">ネイティブ</option>
                    <option value="formal">フォーマル</option>
                    <option value="casual">カジュアル</option>
                    <option value="simple" selected>簡単</option>
                </select>
            </div>
            <div class="setting-item">
                <label for="length-range">Length: <span id="length-val">20</span> chars</label>
                <input type="range" id="length-range" min="10" max="500" step="10" value="20">
            </div>
            <div class="setting-item">
                <label>シチュエーション</label>
                <div class="situation-controls">
                    <button id="btn-situation-all" class="btn-text">全選択</button>
                    <button id="btn-situation-none" class="btn-text">全解除</button>
                </div>
                <div id="situation-tags" class="situation-tags">
                    <!-- Situation category tags will be injected here -->
                </div>
            </div>
            <div class="setting-item free-text-player">
                <label for="settings-free-text">Free Text Playback</label>
                <textarea id="settings-free-text" placeholder="Enter English text..." rows="3"></textarea>
                <div class="audio-controls">
                    <button id="btn-settings-play" class="btn-speak" title="再生">
                        <svg class="icon-play" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        <svg class="icon-pause hidden" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="6" y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                        </svg>
                        <div class="loader hidden"></div>
                    </button>
                    <button id="btn-settings-repeat" class="btn-repeat" title="リピート再生">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="17 1 21 5 17 9" />
                            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                            <polyline points="7 23 3 19 7 15" />
                            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>



        <div id="input-group" class="input-group">
            <div id="hint-display" class="hint-display hidden">
                <p class="label">例えば…</p>
                <div class="hint-list"></div>
            </div>
            <div class="input-row">
                <textarea id="user-input" placeholder="英語で返信を入力..." rows="1"></textarea>
                <button id="btn-hint" class="btn-icon btn-hint" title="ヒントを表示">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                </button>
                <button id="btn-send" class="btn-icon btn-send" disabled>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </div>
            <button id="btn-new" class="btn btn-primary btn-block">新しい会話を始める</button>
        </div>
    </div>

    <button id="btn-settings" class="btn-icon floating-settings" title="設定">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M5 8l6 6" />
                            <path d="M4 14l6-6 2-3" />
                            <path d="M2 5h12" />
                            <path d="M7 2h1" />
                            <path d="M22 22l-5-10-5 10" />
                            <path d="M14 18h6" />
                        </svg>
                    </button>
                    <button class="btn-speak" title="再生">
                        <svg class="icon-play" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        <svg class="icon-pause hidden" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="6" y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                        </svg>
                        <div class="loader hidden"></div>
                    </button>
                    <button class="btn-repeat" title="リピート再生">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="17 1 21 5 17 9" />
                            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                            <polyline points="7 23 3 19 7 15" />
                            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                        </svg>
                    </button>
                    <button class="btn-practice" title="英訳練習">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-variation-menu" title="バリエーション生成">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="16 3 21 3 21 8"></polyline>
                            <line x1="4" y1="20" x2="21" y2="3"></line>
                            <polyline points="21 16 21 21 16 21"></polyline>
                            <line x1="15" y1="15" x2="21" y2="21"></line>
                            <line x1="4" y1="4" x2="9" y2="9"></line>
                        </svg>
                    </button>
                    <button class="btn-qa" title="質問">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                    </button>
                    <button class="btn-save" title="復習に保存">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v13a2 2 0 0 1-2 2z"></path>
                            <polyline points="17 21 17 13 7 13 7 21"></polyline>
                            <polyline points="7 3 7 8 15 8"></polyline>
                        </svg>
                    </button>
                    <button class="btn-history hidden" title="過去の添削を閲覧">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                    </button>
                </div>

                <div class="history-section hidden">
                    <h3>過去の添削</h3>
                    <div class="history-container">
                        <!-- Saved corrections will be injected here -->
                    </div>
                </div>

                <div class="variation-section hidden">
                    <h3>バリエーション</h3>
                    <div class="variation-options">
                        <button data-type="native">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                            ネイティブ
                        </button>
                        <button data-type="formal">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                            フォーマル
                        </button>
                        <button data-type="casual">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                                <line x1="9" y1="9" x2="9.01" y2="9" />
                                <line x1="15" y1="9" x2="15.01" y2="9" />
                            </svg>
                            カジュアル
                        </button>
                        <button data-type="simple">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                            </svg>
                            簡単
                        </button>
                    </div>
                    <div class="variation-result-container hidden">
                        <!-- Generated variations go here -->
                    </div>
                </div>

                <div class="item-qa-section main-qa hidden">
                    <h3>この英文への質問</h3>
                    <div class="item-qa-container">
                        <!-- Q&A history for this item -->
                    </div>
                    <div class="item-qa-input-area">
                        <textarea class="item-qa-input" placeholder="この英文について質問..." rows="1"></textarea>
                        <button class="btn-icon btn-item-qa-send" disabled>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="practice-section hidden">
                    <div class="practice-input-area">
                        <textarea class="practice-input" placeholder="この日本語を英語で言ってみよう..." rows="1"></textarea>
                        <button class="btn-icon btn-practice-send" disabled>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </div>
                    <div class="feedback-content hidden">
                        <div class="user-input-display hidden"></div>
                        <h3>添削</h3>
                        <p class="correction"></p>
                        <h3>提案</h3>
                        <ul class="suggestions-list"></ul>

                        <div class="retry-results"></div>

                        <div class="item-qa-section">
                            <h3>質問</h3>
                            <div class="item-qa-container">
                                <!-- Q&A history for this item -->
                            </div>
                            <div class="item-qa-input-area">
                                <textarea class="item-qa-input" placeholder="この添削について質問..." rows="1"></textarea>
                                <button class="btn-icon btn-item-qa-send" disabled>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <line x1="22" y1="2" x2="11" y2="13"></line>
                                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div class="retry-section hidden">
                            <button class="btn btn-secondary btn-retry">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M23 4v6h-6"></path>
                                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                                </svg>
                                再挑戦
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="user-message hidden">
                <p class="user-text"></p>
            </div>

            <div class="feedback-section hidden">
                <div class="feedback-content">
                    <div class="user-input-display hidden"></div>
                    <h3>添削</h3>
                    <p class="correction"></p>
                    <h3>提案</h3>
                    <ul class="suggestions-list"></ul>

                    <div class="retry-results"></div>

                    <div class="item-qa-section">
                        <h3>質問</h3>
                        <div class="item-qa-container">
                            <!-- Q&A history for this item -->
                        </div>
                        <div class="item-qa-input-area">
                            <textarea class="item-qa-input" placeholder="この添削について質問..." rows="1"></textarea>
                            <button class="btn-icon btn-item-qa-send" disabled>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div class="retry-section hidden">
                        <button class="btn btn-secondary btn-retry">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M23 4v6h-6"></path>
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                            </svg>
                             再挑戦
                        </button>
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