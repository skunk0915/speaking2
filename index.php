<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no">
    <title>English Training</title>
    <link rel="stylesheet" href="css/style.css?v=<?php echo time(); ?>">
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
    <link rel="icon" href="img/icon-192.png">

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
                    <option value="jk" selected>JK</option>
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
                <label for="initial-mode-select">初期生成モード</label>
                <select id="initial-mode-select">
                    <option value="auto">自動</option>
                    <option value="manual" selected>日本語から作成</option>
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
            <div class="setting-item user-info-section">
                <label>アカウント</label>
                <div class="user-display">
                    <span id="display-user-email">...</span>
                    <button id="btn-logout" class="btn-text danger">ログアウト</button>
                </div>
            </div>
        </div>


        <!-- Persona Help Modal -->
        <div id="persona-help-overlay" class="modal-overlay hidden"></div>
        <div id="persona-help-panel" class="settings-panel">
            <div class="settings-header">
                <h3>ペルソナの詳細</h3>
                <button id="btn-close-persona-help" class="btn-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="settings-body persona-help-body">
                <div class="help-persona-item">
                    <div class="avatar">🧔</div>
                    <div class="info">
                        <h4>ルイス (在米ブラジル人)</h4>
                        <p class="tag">Learner English</p>
                        <p>非日本語圏の初級者。語彙が少なく、教科書的なシンプルな英語を好みます。日本語特有の曖昧な表現やカタカナ英語は通じません。</p>
                    </div>
                </div>
                <div class="help-persona-item">
                    <div class="avatar">👩‍🔬</div>
                    <div class="info">
                        <h4>エレーナ (教師)</h4>
                        <p class="tag">Standard English</p>
                        <p>論理重視の非ネイティブ。正確で標準的な英語を話し、曖昧さや文法ミスによる情報の欠落に厳しい視点を持ちます。</p>
                    </div>
                </div>
                <div class="help-persona-item">
                    <div class="avatar">👱‍♂️</div>
                    <div class="info">
                        <h4>ジェームス (ネイティブ)</h4>
                        <p class="tag">Natural Spoken English</p>
                        <p>ネイティブの友人。自然なノリを重視し、省略や崩し（gonna/wanna等）を含むリアルな口語を多用します。</p>
                    </div>
                </div>
            </div>
        </div>



        <div id="input-group" class="input-group">
            <div id="hint-display" class="hint-display hidden">
                <p class="label">例えば…</p>
                <div class="hint-list"></div>
            </div>
            <div id="main-timer-container" class="practice-timer-container hidden" style="margin-bottom: 8px;">
                <span class="practice-timer-icon">⏱️</span>
                <span id="main-timer-val" class="practice-timer-val">0.0</span>s
            </div>
            <div class="input-row">
                <div class="input-text-container">
                    <textarea id="user-input-jp" placeholder="言いたい日本語を入力（任意）..." rows="1"></textarea>
                    <textarea id="user-input" placeholder="英語で返信を入力..." rows="1"></textarea>
                </div>
                <div class="input-actions">
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
                    <p class="japanese hidden"></p>
                    <p class="english hidden"></p>
                </div>
                <div class="actions">
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
                    <button class="btn-translate-jp" title="日本語訳を表示/非表示">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="5" width="18" height="14" rx="2" ry="2"></rect>
                            <circle cx="12" cy="12" r="3.5" fill="currentColor"></circle>
                        </svg>
                    </button>
                    <button class="btn-translate" title="英訳を表示/非表示">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="5" width="18" height="14" rx="2" ry="2"></rect>
                            <rect x="3" y="5" width="8" height="7" fill="currentColor" stroke="none"></rect>
                            <line x1="11" y1="8.5" x2="21" y2="8.5"></line>
                            <line x1="11" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="15.5" x2="21" y2="15.5"></line>
                        </svg>
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
                    <button class="btn-pronounce-toggle" title="発音練習">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                            <line x1="12" y1="19" x2="12" y2="23"></line>
                            <line x1="8" y1="23" x2="16" y2="23"></line>
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
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
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
                    <div class="practice-timer-container">
                        <span class="practice-timer-icon">⏱️</span>
                        <span class="practice-timer-val">0.0</span>s
                    </div>
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
                        <div class="correction-hint-display hidden"></div>
                        <div class="reactions-container hidden">
                            <div class="reactions-header">
                                <h3>伝わりやすさの反応</h3>
                                <button class="btn-persona-help" title="ペルソナの詳細">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                    </svg>
                                </button>
                            </div>
                            <div class="reactions-list"></div>
                        </div>
                        <h3>添削</h3>
                        <p class="correction"></p>
                        <h3>提案</h3>
                        <ul class="suggestions-list"></ul>

                        <div class="retry-results"></div>

                        <div class="user-memo-section">
                            <h3>自分用メモ</h3>
                            <textarea class="user-memo-input" placeholder="自分用のメモ（復習時のポイントなど）を入力..." rows="2"></textarea>
                        </div>

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

                <div class="pronounce-section hidden">
                    <h3>発音練習</h3>
                    <div class="pronounce-container">
                        <div class="pronounce-instruction">
                            <p>「発声開始」ボタンを押し、マイクに向かって英文を発音してください。</p>
                        </div>
                        <div class="pronounce-controls">
                            <button class="btn-pronounce-record">
                                <svg class="icon-record-mic" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                    <line x1="12" y1="19" x2="12" y2="23"></line>
                                    <line x1="8" y1="23" x2="16" y2="23"></line>
                                </svg>
                                <span class="record-text"></span>
                            </button>
                            <div class="pronounce-recording-status hidden">
                                <div class="audio-wave">
                                    <span></span><span></span><span></span><span></span><span></span>
                                </div>
                                <span class="time-limit">録音中...</span>
                            </div>
                            <div class="pronounce-playbacks hidden">
                                <button class="btn-pronounce-play" title="自分の発音を再生">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="3" y="5" width="18" height="14" rx="2" ry="2"></rect>
                                        <circle cx="12" cy="12" r="3.5" fill="currentColor"></circle>
                                    </svg>
                                </button>
                                <button class="btn-pronounce-model-play" title="お手本の音声を再生">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="3" y="5" width="18" height="14" rx="2" ry="2"></rect>
                                        <rect x="3" y="5" width="8" height="7" fill="currentColor" stroke="none"></rect>
                                        <line x1="11" y1="8.5" x2="21" y2="8.5"></line>
                                        <line x1="11" y1="12" x2="21" y2="12"></line>
                                        <line x1="3" y1="15.5" x2="21" y2="15.5"></line>
                                    </svg>
                                    <div class="loader hidden"></div>
                                </button>
                            </div>
                        </div>

                        <div class="pronounce-loading hidden">
                            <div class="loading-spinner-wrapper">
                                <div class="loading-spinner"></div>
                                <div class="loading-pulse"></div>
                            </div>
                            <span class="loading-text">発音を分析中...</span>
                        </div>

                        <div class="pronounce-result-area hidden">
                            <div class="pronounce-score-wrapper">
                                <div class="pronounce-score-circle">
                                    <svg class="score-ring" width="120" height="120">
                                        <circle class="score-ring-bg" cx="60" cy="60" r="50"></circle>
                                        <circle class="score-ring-bar" cx="60" cy="60" r="50"></circle>
                                    </svg>
                                    <div class="score-number-container">
                                        <span class="score-num">0</span>
                                        <span class="score-label">総合スコア</span>
                                    </div>
                                </div>
                                <div class="pronounce-metrics">
                                    <div class="metric-item">
                                        <span class="metric-label">正確性</span>
                                        <div class="metric-progress-bg">
                                            <div class="metric-progress-bar metric-accuracy" style="width: 0%"></div>
                                        </div>
                                        <span class="metric-val accuracy-val">0%</span>
                                    </div>
                                    <div class="metric-item">
                                        <span class="metric-label">流暢さ</span>
                                        <div class="metric-progress-bg">
                                            <div class="metric-progress-bar metric-fluency" style="width: 0%"></div>
                                        </div>
                                        <span class="metric-val fluency-val">0%</span>
                                    </div>
                                    <div class="metric-item">
                                        <span class="metric-label">完全性</span>
                                        <div class="metric-progress-bg">
                                            <div class="metric-progress-bar metric-completeness" style="width: 0%"></div>
                                        </div>
                                        <span class="metric-val completeness-val">0%</span>
                                    </div>
                                </div>
                            </div>
                            <div class="pronounce-words-feedback">
                                <h4>単語ごとの発音詳細</h4>
                                <div class="words-container"></div>
                                <div class="words-legend">
                                    <span class="legend-item legend-good"><span class="color-dot"></span>正しく発音できています</span>
                                    <span class="legend-item legend-bad"><span class="color-dot"></span>発音が不正確です</span>
                                </div>
                                <div class="pronounce-feedback-text">
                                    <h4>発音改善のアドバイス</h4>
                                    <div class="feedback-comment"></div>
                                    <div class="feedback-words-list hidden">
                                        <h5>発音改善が必要な単語:</h5>
                                        <div class="feedback-words-items"></div>
                                    </div>
                                    <div class="item-qa-section hidden">
                                        <div class="item-qa-container"></div>
                                        <div class="item-qa-input-area">
                                            <textarea class="item-qa-input" placeholder="この発音について質問..." rows="1"></textarea>
                                            <button class="btn-icon btn-item-qa-send" disabled>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
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
                        <div class="correction-hint-display hidden"></div>
                        <div class="reactions-container hidden">
                            <div class="reactions-header">
                                <h3>伝わりやすさの反応</h3>
                                <button class="btn-persona-help" title="ペルソナの詳細">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                    </svg>
                                </button>
                            </div>
                            <div class="reactions-list"></div>
                        </div>
                        <h3>添削</h3>
                        <p class="correction"></p>
                        <h3>提案</h3>
                        <ul class="suggestions-list"></ul>

                        <div class="retry-results"></div>

                        <div class="user-memo-section">
                            <h3>自分用メモ</h3>
                            <textarea class="user-memo-input" placeholder="自分用のメモ（復習時のポイントなど）を入力..." rows="2"></textarea>
                        </div>

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

    <template id="tmpl-initial-input">
        <div class="initial-input-container">
            <div class="header-section">
                <div class="icon-badge">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                </div>
                <h3>どのような会話を始めますか？</h3>
            </div>

            <div class="mode-tabs">
                <button class="mode-tab active" data-mode="translate">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m5 8 6 6"></path>
                        <path d="m4 14 6-6 2-3"></path>
                        <path d="M2 5h12"></path>
                        <path d="M7 2h1"></path>
                        <path d="m22 22-5-10-5 10"></path>
                        <path d="M14 18h6"></path>
                    </svg>
                    <span>内容を指定</span>
                </button>
                <button class="mode-tab" data-mode="creative">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 2v8"></path>
                        <path d="m4.93 10.93 1.41 1.41"></path>
                        <path d="M2 18h2"></path>
                        <path d="M20 18h2"></path>
                        <path d="m19.07 10.93-1.41 1.41"></path>
                        <path d="M22 22H2"></path>
                        <path d="m8 22 4-10 4 10"></path>
                    </svg>
                    <span>状況を指定</span>
                </button>
                <button class="mode-tab" data-mode="url">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                    </svg>
                    <span>URLから作成</span>
                </button>
            </div>

            <div class="input-section" id="section-translate">
                <div class="info-badge">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 16v-4"></path>
                        <path d="M12 8h.01"></path>
                    </svg>
                    <span>入力した日本語を忠実に英訳して開始します</span>
                </div>
                <textarea id="initial-japanese-input-translate" placeholder="例：そのドーナツを温めるときは700wで30秒ぐらいがちょうどいい" rows="4"></textarea>
            </div>

            <div class="input-section hidden" id="section-creative">
                <div class="info-badge">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
                        <path d="M12 2a10 10 0 0 1 10 10h-10V2z"></path>
                        <path d="M12 12L2.8 2.2"></path>
                        <path d="M12 12L19.8 4.2"></path>
                    </svg>
                    <span>まず日本語候補を10個出し、その中から選んで開始します</span>
                </div>
                <textarea id="initial-japanese-input-creative" placeholder="例：ホテルのチェックイン / 海外のカフェで注文 / 病院の受付" rows="4"></textarea>
            </div>

            <div class="input-section hidden" id="section-url">
                <div class="info-badge">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 16v-4"></path>
                        <path d="M12 8h.01"></path>
                    </svg>
                    <span>指定したURLの文章から設定の文字数に基づき文章を作成します</span>
                </div>
                <div class="url-input-wrapper">
                    <input type="url" id="initial-url-input" placeholder="例: https://example.com/news-article" />
                    <button type="button" class="btn-clear-url" id="btn-clear-url" aria-label="URLをクリア" style="display: none;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="url-history-section" id="url-history-section" style="display: none;">
                    <div class="history-title">履歴から選択:</div>
                    <div class="url-history-list" id="url-history-list"></div>
                    <button type="button" class="btn-toggle-history btn-text" id="btn-toggle-history" style="display: none;">もっと見る</button>
                </div>
            </div>

            <div class="initial-input-wrapper">
                <button id="btn-start-conversation" class="btn btn-primary btn-block" disabled>
                    <span>会話を生成する</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m9 18 6-6-6-6"></path>
                    </svg>
                </button>
            </div>
            <div class="initial-mode-toggle">
                <button id="btn-switch-auto" class="btn-text">または完全に自動生成で始める</button>
            </div>
        </div>
    </template>

    <div id="loading-overlay" class="loading-overlay hidden">
        <div class="loader-content">
            <div class="loader-spinner"></div>
            <p>生成中...</p>
        </div>
    </div>

    <!-- Auth Overlay/Panel -->
    <div id="auth-overlay" class="modal-overlay hidden"></div>
    <div id="auth-panel" class="auth-panel">
        <div class="auth-content">
            <div class="auth-header">
                <h2>English Training</h2>
                <p>学習を記録するためにログインしてください</p>
            </div>
            <div id="auth-error" class="auth-error hidden"></div>
            <div class="auth-tabs">
                <button id="tab-login" class="auth-tab active" data-mode="login">ログイン</button>
                <button id="tab-signup" class="auth-tab" data-mode="signup">新規登録</button>
            </div>
            <form id="auth-form" class="auth-form">
                <div class="form-group">
                    <label for="auth-email">メールアドレス</label>
                    <input type="email" id="auth-email" name="email" required placeholder="example@mail.com" autocomplete="email" autofocus>
                </div>
                <div class="form-group">
                    <label for="auth-password">パスワード</label>
                    <input type="password" id="auth-password" name="password" required placeholder="" autocomplete="current-password">
                </div>
                <button type="submit" id="btn-auth-submit" class="btn btn-primary btn-block">ログイン</button>
            </form>
        </div>
    </div>

    <!-- Global Audio Player -->
    <div id="global-audio-player" class="global-audio-player hidden">
        <div class="player-container">
            <div class="player-info">
                <span class="player-title">音声再生中</span>
                <span class="player-text" id="player-audio-text">...</span>
            </div>
            <div class="player-controls">
                <div class="player-progress-container">
                    <span class="player-time" id="player-current-time">0:00</span>
                    <div class="seekbar-wrapper">
                        <input type="range" id="player-seekbar" min="0" max="100" value="0" step="0.1">
                        <div id="player-range-ab" class="player-range-ab hidden"></div>
                        <div id="player-marker-a" class="player-marker hidden">A</div>
                        <div id="player-marker-b" class="player-marker marker-b hidden">B</div>
                    </div>
                    <span class="player-time" id="player-duration">0:00</span>
                </div>
                <div class="player-buttons-row">
                    <button id="player-btn-play-pause" class="player-btn" title="再生/一時停止">
                        <svg class="icon-play" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        <svg class="icon-pause hidden" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="6" y="4" width="4" height="16"></rect>
                            <rect x="14" y="4" width="4" height="16"></rect>
                        </svg>
                    </button>
                    <button id="player-btn-ab" class="player-btn" title="ABリピート">AB</button>
                    <div id="player-ab-sub-controls" class="player-ab-sub-controls hidden">
                        <button id="player-btn-a" class="player-btn-sub" title="A地点を設定">A</button>
                        <button id="player-btn-b" class="player-btn-sub" title="B地点を設定">B</button>
                    </div>
                    <button id="player-btn-close" class="player-btn btn-close" title="閉じる">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <script src="js/app.js?v=<?php echo time(); ?>"></script>
</body>

</html>