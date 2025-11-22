<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>English Training</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
</head>
<body>
    <div class="app-container">
        <header class="app-header">
            <h1>English Training</h1>
            <div class="controls-top">
                <button id="btn-new" class="btn btn-primary">新しい会話を生成</button>
            </div>
        </header>

        <main id="conversation-container" class="conversation-container">
            <!-- Conversation items will be injected here -->
        </main>

        <div class="controls-bottom">
            <button id="btn-continue" class="btn btn-secondary">会話を続ける</button>
        </div>

        <div class="settings-panel">
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
    </div>

    <template id="tmpl-conversation">
        <div class="conversation-item">
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
                <button class="btn-regenerate" title="音声を再生成">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/></svg>
                </button>
            </div>
        </div>
    </template>

    <script src="js/app.js"></script>
</body>
</html>
