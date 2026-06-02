document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('conversation-container');
    const btnNew = document.getElementById('btn-new');
    // const btnContinue = document.getElementById('btn-continue'); // Removed
    const voiceSelect = document.getElementById('voice-select');
    const speedRange = document.getElementById('speed-range');
    const speedVal = document.getElementById('speed-val');
    const lengthRange = document.getElementById('length-range');
    const lengthVal = document.getElementById('length-val');
    const aiStyleSelect = document.getElementById('ai-style-select');
    const englishLevelSelect = document.getElementById('english-level-select');
    const initialModeSelect = document.getElementById('initial-mode-select');
    const tmpl = document.getElementById('tmpl-conversation');
    const tmplLoading = document.getElementById('tmpl-loading');
    const tmplInitialInput = document.getElementById('tmpl-initial-input');

    // Local Storage Keys
    const STORAGE_KEYS = {
        VOICE: 'english-training-voice',
        SPEED: 'english-training-speed',
        LENGTH: 'english-training-length',
        AI_STYLE: 'english-training-ai-style',
        ENGLISH_LEVEL: 'english-training-english-level',
        INITIAL_MODE: 'english-training-initial-mode',
        SITUATIONS: 'english-training-situations',
        SITUATIONS: 'english-training-situations'
        // REVIEWS moved to MySQL
    };

    // Load settings from localStorage
    function loadSettings() {
        const savedVoice = localStorage.getItem(STORAGE_KEYS.VOICE);
        const savedSpeed = localStorage.getItem(STORAGE_KEYS.SPEED);
        const savedLength = localStorage.getItem(STORAGE_KEYS.LENGTH);
        const savedAiStyle = localStorage.getItem(STORAGE_KEYS.AI_STYLE);
        const savedEnglishLevel = localStorage.getItem(STORAGE_KEYS.ENGLISH_LEVEL);
        const savedInitialMode = localStorage.getItem(STORAGE_KEYS.INITIAL_MODE);

        if (savedVoice) {
            voiceSelect.value = savedVoice;
        }
        if (savedSpeed) {
            speedRange.value = savedSpeed;
        }
        if (savedLength) {
            lengthRange.value = savedLength;
        }
        if (savedAiStyle && aiStyleSelect) {
            aiStyleSelect.value = savedAiStyle;
        }
        if (savedEnglishLevel && englishLevelSelect) {
            englishLevelSelect.value = savedEnglishLevel;
        }
        if (savedInitialMode && initialModeSelect) {
            initialModeSelect.value = savedInitialMode;
        }

        // Situations are handled in initSituations
    }

    // Save settings to localStorage
    function saveSettings() {
        localStorage.setItem(STORAGE_KEYS.VOICE, voiceSelect.value);
        localStorage.setItem(STORAGE_KEYS.SPEED, speedRange.value);
        localStorage.setItem(STORAGE_KEYS.LENGTH, lengthRange.value);
        if (aiStyleSelect) localStorage.setItem(STORAGE_KEYS.AI_STYLE, aiStyleSelect.value);
        if (englishLevelSelect) localStorage.setItem(STORAGE_KEYS.ENGLISH_LEVEL, englishLevelSelect.value);
        if (initialModeSelect) localStorage.setItem(STORAGE_KEYS.INITIAL_MODE, initialModeSelect.value);

        const activeSituations = Array.from(document.querySelectorAll('.situation-tag.active')).map(t => t.dataset.category);
        localStorage.setItem(STORAGE_KEYS.SITUATIONS, JSON.stringify(activeSituations));
    }

    // Slider Logic
    function updateSliderVisuals(range, valDisplay) {
        const val = range.value;
        if (valDisplay) valDisplay.textContent = val;
        const min = range.min ? parseFloat(range.min) : 0;
        const max = range.max ? parseFloat(range.max) : 100;
        const percentage = ((val - min) / (max - min)) * 100;
        range.style.setProperty('--value', percentage + '%');
    }

    speedRange.addEventListener('input', () => {
        updateSliderVisuals(speedRange, speedVal);
        saveSettings();
    });
    lengthRange.addEventListener('input', () => {
        updateSliderVisuals(lengthRange, lengthVal);
        saveSettings();
    });

    // Save voice setting when changed
    voiceSelect.addEventListener('change', () => {
        saveSettings();
    });

    if (aiStyleSelect) {
        aiStyleSelect.addEventListener('change', () => {
            saveSettings();
        });
    }

    if (englishLevelSelect) {
        englishLevelSelect.addEventListener('change', () => {
            saveSettings();
        });
    }

    if (initialModeSelect) {
        initialModeSelect.addEventListener('change', () => {
            saveSettings();
        });
    }

    // Load settings first
    loadSettings();

    // Initialize sliders
    updateSliderVisuals(speedRange, speedVal);
    updateSliderVisuals(lengthRange, lengthVal);

    async function initSituations() {
        const situationTags = document.getElementById('situation-tags');
        const btnAll = document.getElementById('btn-situation-all');
        const btnNone = document.getElementById('btn-situation-none');

        try {
            const response = await fetch('data/situations.json');
            const situations = await response.json();

            // Extract unique categories
            const categories = [...new Set(situations.map(s => s.category))].sort();

            // Get saved situations
            const savedStr = localStorage.getItem(STORAGE_KEYS.SITUATIONS);
            const saved = savedStr ? JSON.parse(savedStr) : categories; // Default to all selected

            situationTags.innerHTML = '';
            categories.forEach(cat => {
                const tag = document.createElement('div');
                tag.className = 'situation-tag' + (saved.includes(cat) ? ' active' : '');
                tag.innerHTML = `<span class="tag-label">${cat}</span>`;
                tag.dataset.category = cat;

                tag.addEventListener('click', () => {
                    tag.classList.toggle('active');
                    saveSettings();
                });

                situationTags.appendChild(tag);
            });

            btnAll.addEventListener('click', () => {
                document.querySelectorAll('.situation-tag').forEach(t => t.classList.add('active'));
                saveSettings();
            });

            btnNone.addEventListener('click', () => {
                document.querySelectorAll('.situation-tag').forEach(t => t.classList.remove('active'));
                saveSettings();
            });

        } catch (e) {
            console.error('Failed to load situations:', e);
        }
    }

    // Auth Logic
    const authOverlay = document.getElementById('auth-overlay');
    const authPanel = document.getElementById('auth-panel');
    const authForm = document.getElementById('auth-form');
    const authEmail = document.getElementById('auth-email');
    const authPassword = document.getElementById('auth-password');
    const authTabs = document.querySelectorAll('.auth-tab');
    const authError = document.getElementById('auth-error');
    const btnAuthSubmit = document.getElementById('btn-auth-submit');
    const displayUserEmail = document.getElementById('display-user-email');
    const btnLogout = document.getElementById('btn-logout');

    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            authMode = tab.dataset.mode;
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            btnAuthSubmit.textContent = authMode === 'login' ? 'ログイン' : '新規登録';
            authError.classList.add('hidden');
            if (authEmail) authEmail.focus();
        });
    });

    async function checkAuth() {
        try {
            const res = await fetch('api/auth.php?action=check');
            const data = await res.json();
            if (data.status === 'success') {
                currentUser = data.user;
                if (displayUserEmail) displayUserEmail.textContent = currentUser.email;
                hideAuth();
                // Fetch initial reviews
                const reviewRes = await fetch('api/reviews.php');
                const reviewData = await reviewRes.json();
                if (reviewData.status === 'success') {
                    reviews = reviewData.reviews;
                }
                // Restore UI state
                await restoreUIState();
            } else {
                // Try logging in using remember_token from localStorage
                const token = localStorage.getItem('speaking2_remember_token');
                if (token) {
                    const tokenRes = await fetch('api/auth.php?action=login_by_token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: token })
                    });
                    const tokenData = await tokenRes.json();
                    if (tokenData.status === 'success') {
                        currentUser = tokenData.user;
                        if (displayUserEmail) displayUserEmail.textContent = currentUser.email;
                        hideAuth();
                        // Fetch reviews
                        const reviewRes = await fetch('api/reviews.php');
                        const reviewData = await reviewRes.json();
                        if (reviewData.status === 'success') {
                            reviews = reviewData.reviews;
                        }
                        // Restore UI state
                        await restoreUIState();
                        return;
                    } else {
                        // Token is invalid/expired, remove it
                        localStorage.removeItem('speaking2_remember_token');
                    }
                }
                showAuth();
            }
        } catch (e) {
            console.error('Auth check failed', e);
            showAuth();
        }
    }

    function showAuth() {
        if (authOverlay) authOverlay.classList.remove('hidden');
        if (authPanel) {
            authPanel.classList.add('active');
            setTimeout(() => {
                if (authEmail) {
                    authEmail.focus();
                }
            }, 100);
        }
    }

    function hideAuth() {
        if (authOverlay) authOverlay.classList.add('hidden');
        if (authPanel) authPanel.classList.remove('active');
    }

    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            authError.classList.add('hidden');
            btnAuthSubmit.disabled = true;

            try {
                const res = await fetch('api/auth.php?action=' + authMode, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: authEmail.value,
                        password: authPassword.value
                    })
                });
                const data = await res.json();
                if (data.status === 'success') {
                    currentUser = data.user;
                    if (displayUserEmail) displayUserEmail.textContent = currentUser.email;
                    
                    // Save remember_token if returned
                    if (data.remember_token) {
                        localStorage.setItem('speaking2_remember_token', data.remember_token);
                    }
                    
                    hideAuth();
                    // Fetch reviews
                    const reviewRes = await fetch('api/reviews.php');
                    const reviewData = await reviewRes.json();
                    if (reviewData.status === 'success') {
                        reviews = reviewData.reviews;
                    }
                    // Restore UI state
                    await restoreUIState();
                } else {
                    authError.textContent = data.message || '認証に失敗しました';
                    authError.classList.remove('hidden');
                }
            } catch (e) {
                authError.textContent = 'エラーが発生しました';
                authError.classList.remove('hidden');
            } finally {
                btnAuthSubmit.disabled = false;
            }
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            const token = localStorage.getItem('speaking2_remember_token');
            try {
                await fetch('api/auth.php?action=logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: token })
                });
            } catch (e) {
                console.error(e);
            }
            localStorage.removeItem('speaking2_remember_token');
            localStorage.removeItem('speaking2_ui_state');
            location.reload();
        });
    }

    // Call checkAuth on init
    checkAuth();

    initSituations();

    // New UI Elements
    const btnSettings = document.getElementById('btn-settings');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const settingsPanel = document.getElementById('settings-panel');
    const settingsOverlay = document.getElementById('settings-overlay');

    // Variation Menu Elements



    // Q&A Elements


    // Input Group Elements
    const inputGroup = document.getElementById('input-group');
    const hintDisplay = document.getElementById('hint-display');
    const hintList = hintDisplay.querySelector('.hint-list');
    const userInput = document.getElementById('user-input');
    const userInputJp = document.getElementById('user-input-jp');
    const btnHint = document.getElementById('btn-hint');
    const btnSend = document.getElementById('btn-send');

    // Review Tab Elements
    const tabPractice = document.getElementById('tab-practice');
    const tabReview = document.getElementById('tab-review');
    const reviewContainer = document.getElementById('review-container');
    const conversationContainer = document.getElementById('conversation-container');

    let reviews = []; // Now loaded from server
    let currentUser = null;
    let authMode = 'login';
    let currentMode = 'practice'; // 'practice' or 'review'

    let conversationHistory = [];

    let currentAudio = null;
    let currentAudioBtn = null;
    let isRepeating = false;
    let currentContext = ""; // Store the last Japanese prompt
    let currentSampleAnswers = []; // Store current sample answers

    // Tab Switching
    function switchMode(mode) {
        currentMode = mode;
        if (mode === 'practice' || mode === 'conversation') {
            tabPractice.classList.add('active');
            tabReview.classList.remove('active');
            conversationContainer.classList.remove('hidden');
            reviewContainer.classList.add('hidden');
            inputGroup.classList.remove('hidden');
            inputGroup.style.display = ''; 
        } else {
            tabReview.classList.add('active');
            tabPractice.classList.remove('active');
            conversationContainer.classList.add('hidden');
            reviewContainer.classList.remove('hidden');
            inputGroup.classList.add('hidden');
            renderReviews();
        }
        if (typeof saveUIState === 'function') {
            saveUIState();
        }
    }

    tabPractice.addEventListener('click', () => switchMode('practice'));
    tabReview.addEventListener('click', () => switchMode('review'));

    async function renderReviews() {
        reviewContainer.innerHTML = '<div style="text-align:center; padding:20px;"><div class="loader"></div></div>';
        
        try {
            const res = await fetch('api/reviews.php');
            const data = await res.json();
            if (data.status === 'success') {
                reviews = data.reviews;
                reviewContainer.innerHTML = '';
                reviews.forEach(review => {
                    addConversationItem(review, null, true);
                });

                if (reviews.length === 0) {
                    reviewContainer.innerHTML = '<div class="empty-state" style="text-align:center; padding:40px; color:#8d97a5;">保存されたアイテムはありません。</div>';
                }
            } else {
                reviewContainer.innerHTML = '<div class="empty-state" style="text-align:center; padding:40px; color:#FF3B30;">データの取得に失敗しました。</div>';
            }
        } catch (e) {
            console.error(e);
            reviewContainer.innerHTML = '<div class="empty-state" style="text-align:center; padding:40px; color:#FF3B30;">エラーが発生しました。</div>';
        }
    }

    // Event Listeners
    btnNew.addEventListener('click', () => {
        if (conversationHistory.length === 0 || confirm('新しい会話を始めますか？今の会話は消えます。')) {
            container.innerHTML = '';
            conversationHistory = [];
            stopAudio();
            localStorage.removeItem('speaking2_ui_state');

            if (initialModeSelect && initialModeSelect.value === 'manual') {
                showInitialInputUI();
            } else {
                generateText('new');
            }
        }
    });

    userInput.addEventListener('input', () => {
        const hasValue = userInput.value.trim() !== '';
        btnSend.disabled = !hasValue;

        // Show/hide Japanese input based on whether English input has content
        userInputJp.style.display = hasValue ? 'block' : (userInputJp.value.trim() !== '' ? 'block' : 'none');

        userInput.style.height = 'auto';
        userInput.style.height = Math.min(userInput.scrollHeight, 100) + 'px';
    });

    userInputJp.addEventListener('input', () => {
        userInputJp.style.height = 'auto';
        userInputJp.style.height = Math.min(userInputJp.scrollHeight, 100) + 'px';
    });

    btnSend.addEventListener('click', async () => {
        const text = userInput.value.trim();
        const textJp = userInputJp.value.trim();
        if (!text) return;

        // Disable input
        userInput.disabled = true;
        userInputJp.disabled = true;
        btnSend.disabled = true;

        // Find the feedback section of the last item
        const groups = container.querySelectorAll('.conversation-group');
        if (groups.length > 0) {
            const lastGroup = groups[groups.length - 1];
            const isRetry = lastGroup.dataset.isRetrying === 'true';

            if (isRetry) {
                // Remove retry flag
                delete lastGroup.dataset.isRetrying;

                const feedbackSection = lastGroup.querySelector('.feedback-section');
                if (!lastGroup.dataset.retryHistory) {
                    lastGroup.dataset.retryHistory = JSON.stringify([]);
                }
                const retryHistory = JSON.parse(lastGroup.dataset.retryHistory);

                const data = await getCorrection(text, feedbackSection, retryHistory, true, textJp);
 
                // Update retry history with the latest result
                if (data && data.correction) {
                    const historyItemRef = { user_input: text, correction: data.correction, intended_japanese: textJp, memo: '' };
                    retryHistory.push(historyItemRef);
                    lastGroup.dataset.retryHistory = JSON.stringify(retryHistory);

                    // Bind user memo for retry item
                    const retryItems = feedbackSection.querySelectorAll('.retry-result-item');
                    const lastRetryItem = retryItems[retryItems.length - 1];
                    if (lastRetryItem) {
                        const memoInput = lastRetryItem.querySelector('.user-memo-input');
                        setupUserMemo(memoInput, historyItemRef, () => {
                            lastGroup.dataset.retryHistory = JSON.stringify(retryHistory);
                            updateSavedData('history', retryHistory);
                        });
                    }
                }
 
                // For retry, we don't auto-advance conversation
            } else {
                // Show User Message
                const userMsgDiv = lastGroup.querySelector('.user-message');
                const userTextP = lastGroup.querySelector('.user-text');
                if (userMsgDiv && userTextP) {
                    userTextP.textContent = text;
                    userMsgDiv.classList.remove('hidden');
                }
 
                // Add to history
                conversationHistory.push({ role: 'user', text: text });
 
                const feedbackSection = lastGroup.querySelector('.feedback-section');
 
                // Initialize or get retry history for this specific message
                if (!lastGroup.dataset.retryHistory) {
                    lastGroup.dataset.retryHistory = JSON.stringify([]);
                }
                const retryHistory = JSON.parse(lastGroup.dataset.retryHistory);
 
                const data = await getCorrection(text, feedbackSection, retryHistory, false, textJp);
 
                // Update retry history with the latest result
                if (data && data.correction) {
                    const historyItemRef = { user_input: text, correction: data.correction, intended_japanese: textJp, memo: '' };
                    retryHistory.push(historyItemRef);
                    lastGroup.dataset.retryHistory = JSON.stringify(retryHistory);

                    // Bind user memo for initial feedback item
                    const memoInput = feedbackSection.querySelector('.user-memo-input');
                    setupUserMemo(memoInput, historyItemRef, () => {
                        lastGroup.dataset.retryHistory = JSON.stringify(retryHistory);
                        updateSavedData('history', retryHistory);
                    });
                }

                // Auto-advance conversation
                await generateText('continue');
            }
        }

        userInput.disabled = false;
        userInputJp.disabled = false;
        userInput.focus({ preventScroll: true });
        if (typeof saveUIState === 'function') {
            saveUIState();
        }
    });

    btnHint.addEventListener('click', () => {
        const isOpening = hintDisplay.classList.contains('hidden');
        hintDisplay.classList.toggle('hidden');
        btnHint.classList.toggle('active', isOpening);

        if (isOpening) {
            hintList.innerHTML = '';
            currentSampleAnswers.forEach(ans => {
                const div = document.createElement('div');
                div.className = 'hint-item';

                const jaText = typeof ans === 'object' ? ans.ja : ans;
                const enText = typeof ans === 'object' ? ans.en : '';

                div.innerHTML = `
                    <p class="ja-hint">${jaText}</p>
                `;

                div.addEventListener('click', (e) => {
                    // Fill Japanese input
                    userInputJp.value = jaText;
                    userInputJp.style.display = 'block'; // Show it
                    userInputJp.style.height = 'auto';
                    userInputJp.style.height = Math.min(userInputJp.scrollHeight, 100) + 'px';

                    // Focus English input to encourage starting
                    userInput.focus();
                });
                hintList.appendChild(div);
            });
        }
    });

    // Initial Load
    if (initialModeSelect && initialModeSelect.value === 'manual') {
        showInitialInputUI();
    } else {
        generateText('new');
    }

    function showInitialInputUI() {
        container.innerHTML = '';
        const clone = tmplInitialInput.content.cloneNode(true);
        const tabs = clone.querySelectorAll('.mode-tab');
        const sectionTranslate = clone.querySelector('#section-translate');
        const sectionCreative = clone.querySelector('#section-creative');
        const sectionUrl = clone.querySelector('#section-url');
        const inputTranslate = clone.querySelector('#initial-japanese-input-translate');
        const inputCreative = clone.querySelector('#initial-japanese-input-creative');
        const inputUrl = clone.querySelector('#initial-url-input');
        const btnStart = clone.querySelector('#btn-start-conversation');
        const btnSwitchAuto = clone.querySelector('#btn-switch-auto');

        let currentMode = 'translate';

        const updateBtnState = () => {
            let currentInput;
            if (currentMode === 'translate') {
                currentInput = inputTranslate;
            } else if (currentMode === 'creative') {
                currentInput = inputCreative;
            } else {
                currentInput = inputUrl;
            }
            let isValid = currentInput.value.trim() !== '';
            
            // 簡易URLバリデーション（http:// か https:// で始まっていることをチェック）
            if (currentMode === 'url' && isValid) {
                const urlVal = currentInput.value.trim();
                isValid = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(urlVal);
            }
            btnStart.disabled = !isValid;
        };

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentMode = tab.dataset.mode;

                [sectionTranslate, sectionCreative, sectionUrl].forEach(sec => {
                    if (sec) sec.classList.add('hidden');
                });

                if (currentMode === 'translate') {
                    if (sectionTranslate) sectionTranslate.classList.remove('hidden');
                    if (inputTranslate) inputTranslate.focus();
                } else if (currentMode === 'creative') {
                    if (sectionCreative) sectionCreative.classList.remove('hidden');
                    if (inputCreative) inputCreative.focus();
                } else if (currentMode === 'url') {
                    if (sectionUrl) sectionUrl.classList.remove('hidden');
                    if (inputUrl) inputUrl.focus();
                }
                updateBtnState();
            });
        });

        [inputTranslate, inputCreative].forEach(input => {
            input.addEventListener('input', () => {
                updateBtnState();
                input.style.height = 'auto';
                input.style.height = Math.min(input.scrollHeight, 150) + 'px';
            });
        });

        if (inputUrl) {
            // 最後の入力URLを復元
            const savedUrl = localStorage.getItem('last_input_url');
            if (savedUrl) {
                inputUrl.value = savedUrl;
            }

            // xボタンの要素を取得
            const btnClearUrl = clone.querySelector('#btn-clear-url');
            const updateClearButtonVisibility = () => {
                if (btnClearUrl) {
                    btnClearUrl.style.display = inputUrl.value ? 'flex' : 'none';
                }
            };

            // 初期状態でのクリアボタンの表示制御
            updateClearButtonVisibility();

            inputUrl.addEventListener('input', () => {
                localStorage.setItem('last_input_url', inputUrl.value);
                updateClearButtonVisibility();
                updateBtnState();
            });

            if (btnClearUrl) {
                btnClearUrl.addEventListener('click', () => {
                    inputUrl.value = '';
                    localStorage.removeItem('last_input_url');
                    updateClearButtonVisibility();
                    updateBtnState();
                    inputUrl.focus();
                });
            }

            // 履歴リストの描画
            const historySection = clone.querySelector('#url-history-section');
            const historyList = clone.querySelector('#url-history-list');
            const btnToggleHistory = clone.querySelector('#btn-toggle-history');

            let isHistoryExpanded = false;

            const renderUrlHistory = async () => {
                let history = [];
                if (typeof currentUser !== 'undefined' && currentUser) {
                    try {
                        const res = await fetch('api/url_history.php');
                        const data = await res.json();
                        if (data.status === 'success') {
                            history = data.history;
                        }
                    } catch (e) {
                        console.error('Failed to fetch URL history from server:', e);
                    }
                } else {
                    try {
                        const saved = localStorage.getItem('url_history');
                        if (saved) history = JSON.parse(saved);
                    } catch (e) {}
                }
                if (!Array.isArray(history)) history = [];

                if (history.length > 0 && historyList && historySection) {
                    historyList.innerHTML = '';
                    
                    // 表示件数の決定（展開時は全件、それ以外は3件）
                    const displayLimit = isHistoryExpanded ? history.length : 3;
                    const itemsToShow = history.slice(0, displayLimit);

                    itemsToShow.forEach(item => {
                        // 後方互換性対応: item がオブジェクトでなく文字列の場合もある
                        const isObject = (typeof item === 'object' && item !== null);
                        const url = isObject ? item.url : item;
                        const title = isObject ? item.title : '';

                        // アイテム全体のコンテナ (div)
                        const containerDiv = document.createElement('div');
                        containerDiv.className = 'url-history-item';

                        // 左側のリンクボタン
                        const linkBtn = document.createElement('button');
                        linkBtn.type = 'button';
                        linkBtn.className = 'url-history-link';
                        
                        const iconSvg = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 8V12L15 15"></path>
                                <circle cx="12" cy="12" r="10"></circle>
                            </svg>
                        `;
                        linkBtn.innerHTML = iconSvg;

                        const contentDiv = document.createElement('div');
                        contentDiv.className = 'url-history-content';

                        const titleSpan = document.createElement('span');
                        titleSpan.className = 'url-title';
                        titleSpan.textContent = title ? title : url;
                        contentDiv.appendChild(titleSpan);

                        if (title) {
                            const urlSpan = document.createElement('span');
                            urlSpan.className = 'url-subtitle';
                            urlSpan.textContent = url;
                            contentDiv.appendChild(urlSpan);
                        }

                        linkBtn.appendChild(contentDiv);

                        linkBtn.addEventListener('click', () => {
                            inputUrl.value = url;
                            localStorage.setItem('last_input_url', url);
                            updateClearButtonVisibility();
                            updateBtnState();
                            inputUrl.focus();
                        });

                        // 右側の削除ボタン (ゴミ箱アイコン)
                        const deleteBtn = document.createElement('button');
                        deleteBtn.type = 'button';
                        deleteBtn.className = 'btn-delete-history';
                        deleteBtn.ariaLabel = '履歴を削除';
                        
                        const trashSvg = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                        `;
                        deleteBtn.innerHTML = trashSvg;

                        deleteBtn.addEventListener('click', async (e) => {
                            e.stopPropagation();
                            
                            if (typeof currentUser !== 'undefined' && currentUser) {
                                try {
                                    const res = await fetch(`api/url_history.php?url=${encodeURIComponent(url)}`, {
                                        method: 'DELETE'
                                    });
                                    const delData = await res.json();
                                    if (delData.status === 'success') {
                                        renderUrlHistory();
                                    } else {
                                        alert('履歴の削除に失敗しました: ' + delData.message);
                                    }
                                } catch (err) {
                                    console.error('Failed to delete URL history on server:', err);
                                    alert('履歴の削除に失敗しました。');
                                }
                            } else {
                                let currentHistory = [];
                                try {
                                    const saved = localStorage.getItem('url_history');
                                    if (saved) currentHistory = JSON.parse(saved);
                                } catch (err) {}
                                if (!Array.isArray(currentHistory)) currentHistory = [];

                                currentHistory = currentHistory.filter(h => {
                                    const hUrl = (typeof h === 'object' && h !== null) ? h.url : h;
                                    return hUrl !== url;
                                });

                                localStorage.setItem('url_history', JSON.stringify(currentHistory));
                                renderUrlHistory();
                            }
                        });

                        containerDiv.appendChild(linkBtn);
                        containerDiv.appendChild(deleteBtn);
                        historyList.appendChild(containerDiv);
                    });

                    // 「もっと見る」ボタンの表示制御
                    if (btnToggleHistory) {
                        if (history.length > 3) {
                            btnToggleHistory.style.display = 'block';
                            btnToggleHistory.textContent = isHistoryExpanded ? '閉じる' : 'もっと見る';
                        } else {
                            btnToggleHistory.style.display = 'none';
                        }
                    }

                    historySection.style.display = 'block';
                } else if (historySection) {
                    historySection.style.display = 'none';
                }
            };

            if (btnToggleHistory) {
                btnToggleHistory.addEventListener('click', () => {
                    isHistoryExpanded = !isHistoryExpanded;
                    renderUrlHistory();
                });
            }

            renderUrlHistory();
        }

        btnStart.addEventListener('click', () => {
            let input;
            if (currentMode === 'translate') input = inputTranslate;
            else if (currentMode === 'creative') input = inputCreative;
            else input = inputUrl;

            const valText = input.value.trim();
            if (!valText) return;

            if (currentMode === 'url') {
                localStorage.setItem('last_input_url', valText);
            }

            generateText('new', valText, currentMode);
        });

        btnSwitchAuto.addEventListener('click', () => {
            generateText('new');
        });

        container.appendChild(clone);
        inputTranslate.focus();

        // Hide regular input group while waiting for initial input
        inputGroup.classList.add('hidden');
    }

    // Settings Panel Logic
    function toggleSettings(show) {
        if (show) {
            settingsPanel.classList.add('active');
            settingsOverlay.classList.remove('hidden');
            setTimeout(() => settingsOverlay.classList.add('active'), 10);
        } else {
            settingsPanel.classList.remove('active');
            settingsOverlay.classList.remove('active');
            setTimeout(() => settingsOverlay.classList.add('hidden'), 300);
        }
    }

    btnSettings.addEventListener('click', () => toggleSettings(true));
    btnCloseSettings.addEventListener('click', () => toggleSettings(false));
    settingsOverlay.addEventListener('click', () => {
        toggleSettings(false);
    });

    // Persona Help Logic
    const personaHelpOverlay = document.getElementById('persona-help-overlay');
    const personaHelpPanel = document.getElementById('persona-help-panel');
    const btnClosePersonaHelp = document.getElementById('btn-close-persona-help');

    function togglePersonaHelp(show) {
        if (!personaHelpPanel || !personaHelpOverlay) return;
        if (show) {
            personaHelpPanel.classList.add('active');
            personaHelpOverlay.classList.remove('hidden');
            setTimeout(() => personaHelpOverlay.classList.add('active'), 10);
        } else {
            personaHelpPanel.classList.remove('active');
            personaHelpOverlay.classList.remove('active');
            setTimeout(() => personaHelpOverlay.classList.add('hidden'), 300);
        }
    }

    if (btnClosePersonaHelp) btnClosePersonaHelp.addEventListener('click', () => togglePersonaHelp(false));
    if (personaHelpOverlay) personaHelpOverlay.addEventListener('click', () => togglePersonaHelp(false));

    // Delegate help button click (since they are in dynamic feedback)
    document.addEventListener('click', (e) => {
        if (e.target.closest('.btn-persona-help')) {
            togglePersonaHelp(true);
        }
    });

    // Free Text Player Logic
    const settingsFreeText = document.getElementById('settings-free-text');
    const btnSettingsPlay = document.getElementById('btn-settings-play');
    const btnSettingsRepeat = document.getElementById('btn-settings-repeat');

    btnSettingsRepeat.addEventListener('click', () => {
        btnSettingsRepeat.classList.toggle('active');
    });

    btnSettingsPlay.addEventListener('click', () => {
        const text = settingsFreeText.value.trim();
        if (!text) return;
        playSuggestionAudio(text, btnSettingsPlay, btnSettingsRepeat);
    });



    // Q&A Logic (Per Item)
    async function setupItemQa(feedbackElement, contextData, initialHistory = [], onUpdate = null) {
        const qaContainer = feedbackElement.querySelector('.item-qa-container');
        let qaInput = feedbackElement.querySelector('.item-qa-input');
        let btnQaSend = feedbackElement.querySelector('.btn-item-qa-send');

        // To avoid duplicate listeners when re-initializing, replace the elements with clones
        const newQaInput = qaInput.cloneNode(true);
        qaInput.parentNode.replaceChild(newQaInput, qaInput);
        qaInput = newQaInput;

        const newBtnQaSend = btnQaSend.cloneNode(true);
        btnQaSend.parentNode.replaceChild(newBtnQaSend, btnQaSend);
        btnQaSend = newBtnQaSend;

        // Store history on the element so it can be retrieved during saving
        feedbackElement.itemQaHistory = [...initialHistory];

        // Render initial history
        qaContainer.innerHTML = '';
        feedbackElement.itemQaHistory.forEach(msg => {
            appendItemQaMessage(qaContainer, msg.text, msg.role);
        });

        qaInput.addEventListener('input', () => {
            btnQaSend.disabled = qaInput.value.trim() === '';
            qaInput.style.height = 'auto';
            qaInput.style.height = Math.min(qaInput.scrollHeight, 100) + 'px';
        });

        btnQaSend.addEventListener('click', async () => {
            const text = qaInput.value.trim();
            if (!text) return;

            // Add user message
            appendItemQaMessage(qaContainer, text, 'user');

            qaInput.value = '';
            qaInput.style.height = 'auto';
            btnQaSend.disabled = true;

            // Add to history
            feedbackElement.itemQaHistory.push({ role: 'user', text: text });
            if (onUpdate) onUpdate(feedbackElement.itemQaHistory);
            if (typeof saveUIState === 'function') {
                saveUIState();
            }

            // Call API
            await sendItemQuestion(text, contextData, feedbackElement.itemQaHistory, qaContainer, onUpdate);
        });
    }

    async function sendItemQuestion(text, contextData, history, container, onUpdate = null) {
        // Show loading
        const loadingId = 'qa-loading-' + Date.now();
        const loadingDiv = document.createElement('div');
        loadingDiv.id = loadingId;
        loadingDiv.className = 'qa-message ai';
        loadingDiv.innerHTML = '<div class="loader" style="width:16px;height:16px;border-width:2px;"></div>';
        container.appendChild(loadingDiv);
        container.scrollTop = container.scrollHeight;

        try {
            const response = await fetch('api/generate_text.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'question',
                    context: {
                        situation: contextData.situation,
                        user_input: contextData.user_input,
                        correction: contextData.correction,
                        english: contextData.english,
                        history: history
                    },
                    text: text,
                    ai_style: aiStyleSelect ? aiStyleSelect.value : 'polite'
                })
            });

            if (!response.ok) throw new Error('API Error');
            const data = await response.json();

            // Remove loading
            document.getElementById(loadingId).remove();

            if (data.answer) {
                appendItemQaMessage(container, data.answer, 'ai');
                history.push({ role: 'ai', text: data.answer });
                if (onUpdate) onUpdate(history);
                if (typeof saveUIState === 'function') {
                    saveUIState();
                }
            }

        } catch (error) {
            console.error(error);
            const lEl = document.getElementById(loadingId);
            if (lEl) lEl.remove();
            appendItemQaMessage(container, 'エラーが発生しました。', 'ai');
        }
    }

    function appendItemQaMessage(container, text, role) {
        const div = document.createElement('div');
        div.className = `qa-message ${role}`;

        if (role === 'ai') {
            // Use marked for AI messages
            div.innerHTML = marked.parse(text);
        } else {
            // Use textContent or simple escape for user messages to avoid XSS
            div.textContent = text;
        }

        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    function scrollToBottom() {
        setTimeout(() => {
            window.scrollTo({
                top: document.body.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
    }

    async function getCorrection(userText, feedbackElement, history = [], isRetry = false, intendedJp = "", onQaUpdate = null) {
        const correctionP = feedbackElement.querySelector('.correction');
        const suggestionsList = feedbackElement.querySelector('.suggestions-list');
        const qaSection = feedbackElement.querySelector('.item-qa-section');
        const retryResults = feedbackElement.querySelector('.retry-results');
        const retrySection = feedbackElement.querySelector('.retry-section');
        const userInputDisplay = feedbackElement.querySelector('.user-input-display');
        const suggestionsHeader = feedbackElement.querySelector('h3:nth-of-type(2)'); // "提案" header

        if (isRetry) {
            // In retry mode, show the feedback section (which was hidden)
            feedbackElement.classList.remove('hidden');

            // Add a temporary loading item to retryResults
            const loadingItem = document.createElement('div');
            loadingItem.className = 'retry-result-item loading';
            loadingItem.innerHTML = `
                <div class="retry-user-text-wrapper">
                    ${intendedJp ? `<div class="intended-jp">${intendedJp}</div>` : ''}
                    <div class="retry-user-text-row">
                        <span class="label">再挑戦:</span>
                        <span class="retry-user-text">${userText}</span>
                    </div>
                </div>
                <div class="loader" style="display:inline-block; margin-top:8px; width:16px; height:16px; border-width:2px;"></div>
            `;
            retryResults.appendChild(loadingItem);
            loadingItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            try {
                const response = await fetch('api/correct_text.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_input: userText,
                        context: feedbackElement.closest('.practice-section') ? feedbackElement.closest('.conversation-item').querySelector('.japanese').textContent : currentContext,
                        mode: feedbackElement.closest('.practice-section') ? 'translation' : 'conversation',
                        ai_style: aiStyleSelect ? aiStyleSelect.value : 'polite',
                        english_level: englishLevelSelect ? englishLevelSelect.value : 'native',
                        retry_history: history,
                        suggested_sentences: getSuggestedSentences(feedbackElement.closest('.conversation-group')),
                        is_retry: true,
                        intended_japanese: intendedJp
                    })
                });

                if (!response.ok) throw new Error('API Error');
                const data = await response.json();

                // Replace loading with actual result
                loadingItem.classList.remove('loading');
                loadingItem.innerHTML = `
                    <div class="retry-user-text-wrapper">
                        ${intendedJp ? `<div class="intended-jp">${intendedJp}</div>` : ''}
                        <div class="retry-user-text-row">
                            <span class="label">再挑戦:</span>
                            <span class="retry-user-text">${userText}</span>
                        </div>
                    </div>
                    <div class="retry-correction">${marked.parse(data.correction)}</div>
                    <div class="user-memo-section">
                        <h3>自分用メモ</h3>
                        <textarea class="user-memo-input" placeholder="自分用のメモ（復習時のポイントなど）を入力..." rows="2"></textarea>
                    </div>
                `;
                loadingItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

                return data;

            } catch (error) {
                console.error(error);
                loadingItem.innerHTML = '<p style="color:red;">添削の取得に失敗しました。</p>';
                return null;
            }
        } else {
            // Initial correction
            feedbackElement.classList.remove('hidden');
            correctionP.innerHTML = '<div class="loader" style="display:inline-block; vertical-align:middle; margin-right:8px; width:16px; height:16px; border-width:2px;"></div><span>添削中...</span>';
            suggestionsList.innerHTML = '';
            if (retryResults) retryResults.innerHTML = '';
            if (qaSection) qaSection.classList.add('hidden');
            if (retrySection) retrySection.classList.add('hidden');
            const reactionsContainer = feedbackElement.querySelector('.reactions-container');
            if (reactionsContainer) reactionsContainer.classList.add('hidden');

            if (userInputDisplay) {
                userInputDisplay.innerHTML = `
                    ${intendedJp ? `<div class="intended-jp">${intendedJp}</div>` : ''}
                    <div class="text">${userText}</div>
                `;
                userInputDisplay.classList.remove('hidden');
            }

            try {
                const response = await fetch('api/correct_text.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_input: userText,
                        context: feedbackElement.closest('.practice-section') ? feedbackElement.closest('.conversation-item').querySelector('.japanese').textContent : currentContext,
                        mode: feedbackElement.closest('.practice-section') ? 'translation' : 'conversation',
                        ai_style: aiStyleSelect ? aiStyleSelect.value : 'polite',
                        english_level: englishLevelSelect ? englishLevelSelect.value : 'native',
                        retry_history: history,
                        suggested_sentences: getSuggestedSentences(feedbackElement.closest('.conversation-group')),
                        is_retry: false,
                        intended_japanese: intendedJp
                    })
                });

                if (!response.ok) throw new Error('API Error');
                const data = await response.json();

                // Render Feedback
                correctionP.innerHTML = marked.parse(data.correction);

                suggestionsList.innerHTML = '';
                if (data.suggestions && data.suggestions.length > 0) {
                    if (suggestionsHeader) suggestionsHeader.classList.remove('hidden');
                    data.suggestions.forEach(suggestion => {
                        const li = createSuggestionElement(suggestion, suggestionsList);
                        suggestionsList.appendChild(li);
                    });
                } else {
                    if (suggestionsHeader) suggestionsHeader.classList.add('hidden');
                }

                // Initialize Q&A for this item
                const qaSectionInFeedback = feedbackElement.querySelector('.item-qa-section');
                if (qaSectionInFeedback) {
                    setupItemQa(feedbackElement, {
                        situation: feedbackElement.closest('.practice-section') ? feedbackElement.closest('.conversation-item').querySelector('.japanese').textContent : currentContext,
                        user_input: userText,
                        correction: data.correction
                    }, history.qa_history || [], (newHistory) => {
                        if (typeof onQaUpdate === 'function') onQaUpdate(newHistory);
                    });
                }


                // Render Reactions
                const reactionsContainer = feedbackElement.querySelector('.reactions-container');
                const reactionsList = feedbackElement.querySelector('.reactions-list');
                if (reactionsContainer && reactionsList && data.reactions) {
                    reactionsContainer.classList.remove('hidden');
                    reactionsList.innerHTML = '';
                    data.reactions.forEach(react => {
                        const div = document.createElement('div');
                        div.className = `reaction-item level-${react.level}`;
                        div.innerHTML = `
                            <div class="reaction-top">
                                <div class="reaction-avatar">${react.emoji}</div>
                                <div class="reaction-name">${react.name}</div>
                            </div>
                            <div class="reaction-text">${react.reaction}</div>
                            <div class="reaction-suggestion">
                                <span class="label">How I'd say:</span>
                                <span class="text">${react.suggestion || '...'}</span>
                            </div>
                        `;
                        reactionsList.appendChild(div);
                    });
                }

                if (qaSection) qaSection.classList.remove('hidden');
                if (retrySection) retrySection.classList.remove('hidden');
                feedbackElement.classList.remove('hidden');

                return data;

            } catch (error) {
                console.error(error);
                alert('添削の取得に失敗しました。');
                return null;
            }
        }
    }

    async function playSuggestionAudio(text, btn, btnRepeat) {
        const iconPlay = btn.querySelector('.icon-play');
        const iconPause = btn.querySelector('.icon-pause');
        const loader = btn.querySelector('.loader');

        const currentVoice = voiceSelect.value;
        const currentSpeed = speedRange.value;

        // Get stored audio URL and settings from button's dataset
        let audioUrl = btn.dataset.audioUrl || null;
        let lastVoice = btn.dataset.lastVoice || null;
        let lastSpeed = btn.dataset.lastSpeed || null;

        // Check if settings have changed
        const settingsChanged = (lastVoice && lastSpeed) &&
            (lastVoice !== currentVoice || lastSpeed !== currentSpeed);

        // If audio exists and is the current playing audio, toggle play/pause
        if (audioUrl && currentAudio && currentAudio.src.includes(audioUrl) && !settingsChanged) {
            if (currentAudio.paused) {
                currentAudio.play();
            } else {
                currentAudio.pause();
            }
            return;
        }

        stopAudio(); // Stop other audio

        // Regenerate audio if no audio exists, or settings have changed
        if (!audioUrl || settingsChanged) {
            // Generate Speech
            iconPlay.classList.add('hidden');
            loader.classList.remove('hidden');

            try {
                const res = await fetch('api/generate_speech.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: text,
                        voice: currentVoice,
                        speed: currentSpeed
                    })
                });

                const resData = await res.json();
                audioUrl = resData.audio_url;

                // Save current settings to button's dataset
                btn.dataset.audioUrl = audioUrl;
                btn.dataset.lastVoice = currentVoice;
                btn.dataset.lastSpeed = currentSpeed;
            } catch (e) {
                console.error(e);
                alert('音声生成に失敗しました');
                iconPlay.classList.remove('hidden');
                loader.classList.add('hidden');
                return;
            }
        }

        // Play
        currentAudio = new Audio(audioUrl);
        currentAudioBtn = btn;

        // Set initial loop state based on repeat button
        // currentAudio.loop = btnRepeat.classList.contains('active'); // Removed for manual delay

        currentAudio.addEventListener('play', () => {
            iconPlay.classList.add('hidden');
            iconPause.classList.remove('hidden');
            loader.classList.add('hidden');
        });

        currentAudio.addEventListener('pause', () => {
            iconPlay.classList.remove('hidden');
            iconPause.classList.add('hidden');
        });

        const audioInstance = currentAudio;
        currentAudio.addEventListener('ended', () => {
            if (btnRepeat.classList.contains('active')) {
                setTimeout(() => {
                    if (currentAudio === audioInstance) {
                        audioInstance.currentTime = 0;
                        const playPromise = audioInstance.play();
                        if (playPromise !== undefined) {
                            playPromise.catch(error => {
                                console.log('Playback interrupted or prevented:', error);
                            });
                        }
                    }
                }, 500);
            } else {
                iconPlay.classList.remove('hidden');
                iconPause.classList.add('hidden');
            }
        });

        const playPromise = currentAudio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log('Playback interrupted or prevented:', error);
            });
        }
    }

    async function startSituationOptionsFlow(initialJp, inputMode) {
        setLoading(true);
        const targetLength = lengthRange ? Number(lengthRange.value) : 20;
        
        let excludeList = [];
        try {
            const savedExclude = localStorage.getItem('speaking2_recent_situations');
            if (savedExclude) {
                excludeList = JSON.parse(savedExclude);
            }
            // Clean up URLs and invalid items from the exclude list
            if (Array.isArray(excludeList)) {
                excludeList = excludeList.filter(item => {
                    if (!item || typeof item !== 'string') return false;
                    const trimmed = item.trim();
                    const isUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://') || /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})/i.test(trimmed);
                    return !isUrl && trimmed.length > 3;
                });
            } else {
                excludeList = [];
            }
        } catch (e) {
            console.error('Failed to parse recent situations:', e);
        }

        try {
            const response = await fetch('api/generate_text.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'situation_options',
                    situation: initialJp || '',
                    length: targetLength,
                    situations: Array.from(document.querySelectorAll('.situation-tag.active')).map(t => t.dataset.category),
                    exclude_situations: excludeList
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error('API Error: ' + response.status + ' ' + errorText);
            }

            const data = await response.json();
            setLoading(false);
            
            renderSituationOptionsUI(data.situation, data.options, inputMode, targetLength);
        } catch (error) {
            console.error('startSituationOptionsFlow Error:', error);
            alert('日本語訳バリエーションの生成に失敗しました: ' + error.message);
            setLoading(false);
            
            if (initialModeSelect && initialModeSelect.value === 'manual') {
                showInitialInputUI();
            }
        }
    }

    function renderSituationOptionsUI(situation, options, inputMode, targetLength) {
        container.innerHTML = '';
        
        const wrapper = document.createElement('div');
        wrapper.className = 'situation-options-wrapper';
        
        const header = document.createElement('div');
        header.className = 'situation-options-header';
        header.innerHTML = `
            <div class="situation-badge">シチュエーション</div>
            <h3 class="situation-title">${situation}</h3>
            <p class="situation-desc">まずは日本語候補を10個出しています。会話の第一声にしたいものを選んでください。</p>
        `;
        wrapper.appendChild(header);
        
        const optionsList = document.createElement('div');
        optionsList.className = 'situation-options-list';

        const optionsMeta = document.createElement('div');
        optionsMeta.className = 'situation-options-meta';

        const optionsStatus = document.createElement('p');
        optionsStatus.className = 'situation-options-pill';

        const optionsLength = document.createElement('p');
        optionsLength.className = 'situation-options-pill';
        optionsLength.textContent = `目安 ${targetLength}文字`;

        function updateOptionsStatus() {
            optionsStatus.textContent = `表示中の候補: ${optionsList.children.length}件`;
        }
        
        function addOptions(items) {
            let addedCount = 0;
            items.forEach((optText, index) => {
                const alreadyExists = Array.from(optionsList.querySelectorAll('.situation-option-item'))
                    .some(button => button.dataset.optionText === optText);
                if (alreadyExists) return;
                
                const btn = document.createElement('button');
                btn.className = 'situation-option-item';
                btn.dataset.optionText = optText;
                btn.innerHTML = `
                    <span class="option-num">${optionsList.children.length + 1}</span>
                    <span class="option-text">${optText}</span>
                `;
                
                btn.addEventListener('click', () => {
                    generateText('new', optText, 'translate', situation);
                });
                
                optionsList.appendChild(btn);
                addedCount += 1;
            });

            updateOptionsStatus();
            return addedCount;
        }
        
        addOptions(options);
        optionsMeta.appendChild(optionsStatus);
        optionsMeta.appendChild(optionsLength);
        wrapper.appendChild(optionsMeta);
        wrapper.appendChild(optionsList);
        
        const actionsRow = document.createElement('div');
        actionsRow.className = 'situation-options-actions';
        
        const btnMore = document.createElement('button');
        btnMore.className = 'btn btn-secondary btn-more-options';
        btnMore.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                <path d="M21 3v5h-5"></path>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                <path d="M3 21v-5h5"></path>
            </svg>
            <span>もっと出す</span>
        `;
        
        btnMore.addEventListener('click', async () => {
            btnMore.disabled = true;
            const originalText = btnMore.querySelector('span').textContent;
            btnMore.querySelector('span').textContent = '読み込み中...';
            
            const currentOptions = Array.from(optionsList.querySelectorAll('.situation-option-item')).map(btn => btn.dataset.optionText);
            
            let excludeList = [];
            try {
                const savedExclude = localStorage.getItem('speaking2_recent_situations');
                if (savedExclude) {
                    excludeList = JSON.parse(savedExclude);
                }
                // Clean up URLs and invalid items from the exclude list
                if (Array.isArray(excludeList)) {
                    excludeList = excludeList.filter(item => {
                        if (!item || typeof item !== 'string') return false;
                        const trimmed = item.trim();
                        const isUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://') || /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})/i.test(trimmed);
                        return !isUrl && trimmed.length > 3;
                    });
                } else {
                    excludeList = [];
                }
            } catch (e) {}

            try {
                const response = await fetch('api/generate_text.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'situation_options',
                        situation: situation,
                        length: targetLength,
                        exclude: currentOptions,
                        situations: Array.from(document.querySelectorAll('.situation-tag.active')).map(t => t.dataset.category),
                        exclude_situations: excludeList
                    })
                });
                
                if (!response.ok) throw new Error('API Error');
                const data = await response.json();
                
                const addedCount = addOptions(data.options);
                if (addedCount === 0) {
                    alert('既出と異なる候補をこれ以上追加できませんでした。時間をおいてもう一度試してください。');
                    return;
                }
                
                setTimeout(() => {
                    const lastChild = optionsList.lastChild;
                    if (lastChild) {
                        lastChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }, 100);
            } catch (e) {
                console.error(e);
                alert('追加のバリエーション生成に失敗しました。');
            } finally {
                btnMore.disabled = false;
                btnMore.querySelector('span').textContent = originalText;
            }
        });
        
        actionsRow.appendChild(btnMore);
        wrapper.appendChild(actionsRow);
        
        container.appendChild(wrapper);
        
        inputGroup.classList.add('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function generateText(type, initialJp = null, inputMode = 'translate', selectedSituation = null) {
        console.log('generateText called with type:', type, 'initialJp:', initialJp, 'mode:', inputMode, 'selectedSituation:', selectedSituation);

        if (type === 'new' && inputMode !== 'translate' && inputMode !== 'url') {
            await startSituationOptionsFlow(initialJp, inputMode);
            return;
        }

        setLoading(true);

        // Show loading display
        let loadingElement = null;
        if (tmplLoading) {
            const loadingClone = tmplLoading.content.cloneNode(true);
            loadingElement = loadingClone.querySelector('.loading-group');
            container.appendChild(loadingClone);
        }

        try {
            if (!lengthRange) {
                console.error('lengthRange element not found');
                return;
            }
            const length = lengthRange.value;

            // Get recently played situations to avoid duplicates
            let excludeList = [];
            try {
                const savedExclude = localStorage.getItem('speaking2_recent_situations');
                if (savedExclude) {
                    excludeList = JSON.parse(savedExclude);
                }
                // Clean up URLs and invalid items from the exclude list
                if (Array.isArray(excludeList)) {
                    excludeList = excludeList.filter(item => {
                        if (!item || typeof item !== 'string') return false;
                        const trimmed = item.trim();
                        const isUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://') || /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})/i.test(trimmed);
                        return !isUrl && trimmed.length > 3;
                    });
                } else {
                    excludeList = [];
                }
            } catch (e) {
                console.error('Failed to parse recent situations:', e);
            }

            console.log('Fetching from api/generate_text.php...');
            const response = await fetch('api/generate_text.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: type,
                    context: conversationHistory,
                    length: length,
                    english_level: englishLevelSelect ? englishLevelSelect.value : 'native',
                    ai_style: aiStyleSelect ? aiStyleSelect.value : 'polite',
                    situations: Array.from(document.querySelectorAll('.situation-tag.active')).map(t => t.dataset.category),
                    exclude_situations: excludeList,
                    japanese_input: initialJp,
                    input_mode: inputMode,
                    selected_situation: selectedSituation
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error('API Error: ' + response.status + ' ' + errorText);
            }

            const data = await response.json();
            console.log('API Response:', data);

            if (!data || typeof data !== 'object') {
                throw new Error('Invalid data format');
            }

            // URLモードで成功した場合、履歴に保存する
            if (inputMode === 'url' && initialJp) {
                const url = initialJp.trim();
                const title = data.url_title || '';

                if (typeof currentUser !== 'undefined' && currentUser) {
                    try {
                        await fetch('api/url_history.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url: url, title: title })
                        });
                    } catch (e) {
                        console.error('Failed to save URL history to server:', e);
                    }
                } else {
                    let history = [];
                    try {
                        const saved = localStorage.getItem('url_history');
                        if (saved) history = JSON.parse(saved);
                    } catch (e) {}
                    if (!Array.isArray(history)) history = [];

                    // 既存の同じURLがあれば削除
                    history = history.filter(item => {
                        const itemUrl = (typeof item === 'object' && item !== null) ? item.url : item;
                        return itemUrl !== url;
                    });

                    // 先頭に追加
                    history.unshift({ url: url, title: title });

                    // 最大15件
                    if (history.length > 15) history = history.slice(0, 15);

                    localStorage.setItem('url_history', JSON.stringify(history));
                }
                localStorage.setItem('last_input_url', url);
            }

            // Save selected situation to recent list to prevent immediate repeats
            if (data && data.selected_situation) {
                const val = data.selected_situation.trim();
                const isUrl = val.startsWith('http://') || val.startsWith('https://') || /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})/i.test(val);
                if (!isUrl && val.length > 3) {
                    excludeList.push(val);
                    if (excludeList.length > 20) {
                        excludeList.shift();
                    }
                    localStorage.setItem('speaking2_recent_situations', JSON.stringify(excludeList));
                }
            }

            const itemElement = addConversationItem(data);
            conversationHistory.push(data);
            currentContext = data.japanese; // Update context

            const sampleAnswers = data.sample_user_answers || (data.sample_user_japanese ? [data.sample_user_japanese] : []);
            currentSampleAnswers = sampleAnswers; // For hint button
            itemElement.dataset.sampleAnswers = JSON.stringify(sampleAnswers);

            // Move input to bottom
            moveInputToBottom(type === 'new');
            if (typeof saveUIState === 'function') {
                saveUIState();
            }

        } catch (error) {
            console.error('generateText Error:', error);
            alert('文章の生成に失敗しました: ' + error.message);
        } finally {
            // Remove loading display
            if (loadingElement && loadingElement.parentNode) {
                loadingElement.remove();
            }
            setLoading(false);
        }
    }

    function moveInputToBottom(shouldScroll = true) {
        container.appendChild(inputGroup);
        // Ensure input group is visible (it might be hidden by showInitialInputUI)
        inputGroup.classList.remove('hidden');
        inputGroup.style.display = ''; // Clear any inline display:none

        // Reset hint display
        hintDisplay.classList.add('hidden');
        btnHint.classList.remove('active');
        hintList.innerHTML = '';
        userInput.value = '';
        userInputJp.value = '';
        userInputJp.style.display = 'none'; // Hide again
        userInput.style.height = 'auto';
        userInputJp.style.height = 'auto';
        btnSend.disabled = true;

        // Scroll to bottom after move
        if (shouldScroll) {
            scrollToBottom();
        }
    }

    function setupUserMemo(memoTextarea, historyItem, onUpdate) {
        if (!memoTextarea) return;
        memoTextarea.value = historyItem.memo || '';
        
        memoTextarea.oninput = () => {
            historyItem.memo = memoTextarea.value;
            if (typeof onUpdate === 'function') {
                onUpdate(historyItem);
            }
            if (typeof saveUIState === 'function') {
                saveUIState();
            }
        };
    }

    function addConversationItem(data, insertAfterGroup = null, isReviewMode = false) {
        const clone = tmpl.content.cloneNode(true);
        const group = clone.querySelector('.conversation-group');
        const item = clone.querySelector('.conversation-item');
        const japanese = clone.querySelector('.japanese');
        const english = clone.querySelector('.english');
        const btnTranslate = clone.querySelector('.btn-translate');
        const btnSpeak = clone.querySelector('.btn-speak');
        const btnRepeat = clone.querySelector('.btn-repeat');
        const btnVariationMenu = clone.querySelector('.btn-variation-menu');
        const btnPractice = clone.querySelector('.btn-practice');
        const btnQa = clone.querySelector('.btn-qa');
        const btnSave = clone.querySelector('.btn-save');
        const btnHistory = clone.querySelector('.btn-history');
 
        const practiceSection = clone.querySelector('.practice-section');
        const variationSection = clone.querySelector('.variation-section');
        const mainQa = clone.querySelector('.main-qa');
        const historySection = clone.querySelector('.history-section');
        const historyContainer = clone.querySelector('.history-container');
 
        const practiceInput = clone.querySelector('.practice-input');
        const btnPracticeSend = clone.querySelector('.btn-practice-send');
        const practiceFeedback = clone.querySelector('.feedback-content');
 
        japanese.textContent = data.japanese;
        english.textContent = data.english;
 
        if (isReviewMode) {
            english.classList.add('hidden');
            if (data.history && data.history.length > 0) {
                btnHistory.classList.remove('hidden');
                renderHistory(data.history, historyContainer);
            }
            // Render reactions in review mode if they exist
            if (data.reactions && data.reactions.length > 0) {
                const practiceFeedback = clone.querySelector('.feedback-content');
                if (practiceFeedback) {
                    renderReactions(data.reactions, practiceFeedback);
                }
            }
        }
 
        // History Toggle
        if (btnHistory) {
            btnHistory.addEventListener('click', () => toggleSection(btnHistory, historySection));
        }
 
        function renderHistory(history, container) {
            container.innerHTML = '';
            history.forEach(h => {
                const hItem = document.createElement('div');
                hItem.className = 'history-item feedback-content';
 
                const suggestionsContainer = document.createElement('ul');
                suggestionsContainer.className = 'suggestions-list';
 
                if (h.suggestions && h.suggestions.length > 0) {
                    h.suggestions.forEach(s => {
                        const sEl = createSuggestionElement(s, suggestionsContainer);
                        suggestionsContainer.appendChild(sEl);
                    });
                }
 
                hItem.innerHTML = `
                    <div class="user-input-display">
                        ${h.intended_japanese ? `<div class="intended-jp">${h.intended_japanese}</div>` : ''}
                        <div class="text">${h.user_input}</div>
                    </div>
                    <div class="reactions-container hidden">
                        <div class="reactions-header">
                            <h3>伝わりやすさの反応</h3>
                        </div>
                        <div class="reactions-list"></div>
                    </div>
                    <h3>添削</h3>
                    <div class="correction">${marked.parse(h.correction)}</div>
                    ${h.suggestions && h.suggestions.length > 0 ? `<h3>提案</h3>` : ''}
                    <div class="user-memo-section">
                        <h3>自分用メモ</h3>
                        <textarea class="user-memo-input" placeholder="自分用のメモ（復習時のポイントなど）を入力..." rows="2"></textarea>
                    </div>
                `;
                if (h.suggestions && h.suggestions.length > 0) {
                    hItem.appendChild(suggestionsContainer);
                }
 
                // Add Q&A section to history item
                const qaSection = document.createElement('div');
                qaSection.className = 'item-qa-section history-item-qa';
                qaSection.innerHTML = `
                    <h3>質問</h3>
                    <div class="item-qa-container"></div>
                    <div class="item-qa-input-area">
                        <textarea class="item-qa-input" placeholder="この添削について質問..." rows="1"></textarea>
                        <button class="btn-icon btn-item-qa-send" disabled>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </div>
                `;
                hItem.appendChild(qaSection);
 
                // Initialize reactions if present in history item
                if (h.reactions && h.reactions.length > 0) {
                    renderReactions(h.reactions, hItem);
                }
 
                // Initialize Q&A for history item
                setupItemQa(hItem, {
                    situation: data.japanese,
                    user_input: h.user_input,
                    correction: h.correction
                }, h.qa_history || [], (newHistory) => {
                    h.qa_history = newHistory;
                    updateSavedData('history', history);
                });

                // Initialize Memo for history item
                const memoInput = hItem.querySelector('.user-memo-input');
                setupUserMemo(memoInput, h, () => {
                    updateSavedData('history', history);
                });
 
                container.appendChild(hItem);
            });
        }


        // Save Logic (Toggleable)
        const updateAllSaveButtons = (isActive) => {
            const allBtnSaves = group.querySelectorAll('.btn-save');
            allBtnSaves.forEach(btn => {
                if (isActive) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
            if (typeof saveUIState === 'function') {
                saveUIState();
            }
        };

        const updateSavedData = async (key, value) => {
            const reviewIdx = reviews.findIndex(r => r.japanese === data.japanese);
            if (reviewIdx !== -1) {
                reviews[reviewIdx][key] = value;
                
                // Sync the top-level memo when history is updated
                if (key === 'history' && Array.isArray(value)) {
                    let latestMemo = "";
                    if (value.length > 0) {
                        const lastItem = value[value.length - 1];
                        if (lastItem && typeof lastItem === 'object') {
                            latestMemo = lastItem.memo || "";
                        }
                    }
                    reviews[reviewIdx].memo = latestMemo;
                }
                
                // Persist to server
                try {
                    await fetch('api/reviews.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(reviews[reviewIdx])
                    });
                } catch (e) {
                    console.error('Failed to persist review update', e);
                }
            }
        };

        const toggleSave = async () => {
            const index = reviews.findIndex(r => r.japanese === data.japanese);
            const isSaved = index !== -1;

            if (isSaved) {
                // Un-save from server
                const reviewId = reviews[index].id;
                try {
                    const res = await fetch(`api/reviews.php?id=${reviewId}`, { method: 'DELETE' });
                    const resData = await res.json();
                    if (resData.status === 'success') {
                        reviews.splice(index, 1);
                        updateAllSaveButtons(false);
                    }
                } catch (e) {
                    console.error('Delete failed', e);
                }
            } else {
                // Save to server
                const reviewData = {
                    japanese: data.japanese,
                    english: data.english,
                    sample_user_answers: data.sample_user_answers,
                    history: [],
                    qa_history: (mainQa && mainQa.itemQaHistory) ? mainQa.itemQaHistory : [],
                    reactions: data.reactions || [] // Include reactions
                };

                const mainHistoryStr = group.dataset.retryHistory;
                const mainHistory = mainHistoryStr ? JSON.parse(mainHistoryStr) : [];

                reviewData.history = [
                    ...mainHistory,
                    ...(practiceRetryHistory || [])
                ];

                // Sync the latest memo to the top-level
                let latestMemo = "";
                if (reviewData.history && reviewData.history.length > 0) {
                    const lastHistoryItem = reviewData.history[reviewData.history.length - 1];
                    if (lastHistoryItem && typeof lastHistoryItem === 'object') {
                        latestMemo = lastHistoryItem.memo || "";
                    }
                }
                reviewData.memo = latestMemo;

                try {
                    const res = await fetch('api/reviews.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(reviewData)
                    });
                    const resData = await res.json();
                    if (resData.status === 'success') {
                        reviewData.id = resData.id;
                        reviews.push(reviewData);
                        updateAllSaveButtons(true);
                    }
                } catch (e) {
                    console.error('Save failed', e);
                }
            }
        };

        if (btnSave) {
            btnSave.addEventListener('click', toggleSave);
        }

        // Initial check
        if (reviews.some(r => r.japanese === data.japanese)) {
            updateAllSaveButtons(true);
        }

        // Interaction Toggles (Practice, Variation, QA)
        const toggleSection = (btn, section, inputToFocus = null) => {
            if (!section) return;
            const isOpening = section.classList.contains('hidden');

            // Close others in the same item
            const others = [
                { b: btnPractice, s: practiceSection },
                { b: btnVariationMenu, s: variationSection },
                { b: btnQa, s: mainQa },
                { b: btnHistory, s: historySection }
            ];

            const scrollToParent = () => {
                // conversation-groupだと縦長すぎる場合に入力欄が見えなくなるため、
                // 操作中の個別メッセージ枠である conversation-item を優先的に上端に合わせる
                const targetElement = section.closest('.conversation-item') || section.closest('.conversation-group');
                if (targetElement) {
                    const rect = targetElement.getBoundingClientRect();
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    const targetY = scrollTop + rect.top - 20; // 20px space at the top
                    window.scrollTo({ top: targetY, behavior: 'smooth' });
                }
            };

            const closePromises = [];
            others.forEach(pair => {
                if (pair.s && pair.s !== section && !pair.s.classList.contains('hidden')) {
                    pair.b.classList.remove('active');
                    pair.s.classList.add('hiding');
                    const p = new Promise(resolve => {
                        setTimeout(() => {
                            pair.s.classList.add('hidden');
                            pair.s.classList.remove('hiding');
                            resolve();
                        }, 300);
                    });
                    closePromises.push(p);
                }
            });

            if (isOpening) {
                section.classList.remove('hiding');
                section.classList.remove('hidden');
                btn.classList.add('active');
                
                if (closePromises.length > 0) {
                    // 他のセクションが閉じきって高さが縮んだ（hiddenになった）後にスクロールを実行する
                    Promise.all(closePromises).then(() => {
                        setTimeout(() => {
                            scrollToParent();
                            if (inputToFocus) {
                                inputToFocus.focus();
                            }
                        }, 50);
                    });
                } else {
                    setTimeout(() => {
                        scrollToParent();
                        if (inputToFocus) {
                            inputToFocus.focus();
                        }
                    }, 50);
                }
            } else {
                btn.classList.remove('active');
                section.classList.add('hiding');
                setTimeout(() => {
                    section.classList.add('hidden');
                    section.classList.remove('hiding');
                    // 完全に非表示になって高さが縮んだ後にスクロール位置を調整する
                    scrollToParent();
                }, 300);
            }
            if (typeof saveUIState === 'function') {
                saveUIState();
            }
        };

        if (btnPractice) {
            btnPractice.addEventListener('click', () => toggleSection(btnPractice, practiceSection, practiceInput));
        }

        let practiceRetryHistory = data.history || [];

        if (btnVariationMenu) {
            btnVariationMenu.addEventListener('click', () => toggleSection(btnVariationMenu, variationSection));

            variationSection.querySelectorAll('button').forEach(vBtn => {
                vBtn.addEventListener('click', () => {
                    const type = vBtn.dataset.type;
                    generateVariation(data, item, type);
                    // Section remains open as per user request
                });
            });
        }

        if (btnQa && mainQa) {
            btnQa.addEventListener('click', () => toggleSection(btnQa, mainQa, mainQa.querySelector('.item-qa-input')));

            setupItemQa(mainQa, {
                english: data.english,
                situation: data.japanese
            }, data.qa_history || [], (newHistory) => updateSavedData('qa_history', newHistory));
        }

        // Translation Toggle
        let translateTimeout;
        btnTranslate.addEventListener('click', () => {
            // Close active sections if any
            const activeBtn = [btnPractice, btnVariationMenu, btnQa].find(b => b && b.classList.contains('active'));
            if (activeBtn) {
                const section = activeBtn === btnPractice ? practiceSection :
                    activeBtn === btnVariationMenu ? variationSection :
                        activeBtn === btnQa ? mainQa : historySection;
                const input = activeBtn === btnPractice ? practiceInput :
                    (activeBtn === btnQa ? mainQa.querySelector('.item-qa-input') : null);
                toggleSection(activeBtn, section, input);

                // If practice was active, always show english (remove .hidden)
                if (activeBtn === btnPractice) {
                    english.classList.remove('hidden');
                } else {
                    english.classList.toggle('hidden');
                }
            } else {
                // Normal toggle
                english.classList.toggle('hidden');
            }

            if (!english.classList.contains('hidden')) {
                clearTimeout(translateTimeout);
                translateTimeout = setTimeout(() => {
                    english.classList.add('hidden');
                }, 60000); // Hide after 1 min
            }
        });

        // Practice Mode
        if (btnPractice) {

            practiceInput.addEventListener('input', () => {
                btnPracticeSend.disabled = practiceInput.value.trim() === '';
                practiceInput.style.height = 'auto';
                practiceInput.style.height = Math.min(practiceInput.scrollHeight, 100) + 'px';
            });

            btnPracticeSend.addEventListener('click', async () => {
                const text = practiceInput.value.trim();
                if (!text) return;

                // Disable input
                practiceInput.disabled = true;
                btnPracticeSend.disabled = true;

                const isRetry = item.dataset.isPracticeRetrying === 'true';

                if (isRetry) {
                    delete item.dataset.isPracticeRetrying;
                    
                    // The latest history item will be updated by getCorrection's onQaUpdate
                    const historyItemRef = {
                        user_input: text,
                        correction: '', // Will be filled
                        suggestions: [],
                        reactions: [],
                        intended_japanese: null,
                        qa_history: [],
                        memo: ''
                    };
                    practiceRetryHistory.push(historyItemRef);
 
                    const dataCorr = await getCorrection(text, practiceFeedback, practiceRetryHistory.slice(0, -1), true, "", (newQaHistory) => {
                        historyItemRef.qa_history = newQaHistory;
                        updateSavedData('history', practiceRetryHistory);
                        if (isReviewMode) {
                            renderHistory(practiceRetryHistory, historyContainer);
                        }
                    });
 
                    if (dataCorr && dataCorr.correction) {
                        historyItemRef.correction = dataCorr.correction;
                        historyItemRef.suggestions = dataCorr.suggestions || [];
                        historyItemRef.reactions = dataCorr.reactions || [];
                        historyItemRef.intended_japanese = dataCorr.intended_japanese || null;
                        
                        // Bind user memo for retry item
                        const retryItems = practiceFeedback.querySelectorAll('.retry-result-item');
                        const lastRetryItem = retryItems[retryItems.length - 1];
                        if (lastRetryItem) {
                            const memoInput = lastRetryItem.querySelector('.user-memo-input');
                            setupUserMemo(memoInput, historyItemRef, () => {
                                updateSavedData('history', practiceRetryHistory);
                            });
                        }

                        updateSavedData('history', practiceRetryHistory);
                        if (isReviewMode) {
                            btnHistory.classList.remove('hidden');
                            renderHistory(practiceRetryHistory, historyContainer);
                        }
                    }
 
                    practiceInput.value = '';
                } else {
                    // Initial correction
                    const historyItemRef = {
                        user_input: text,
                        correction: '', // Will be filled
                        suggestions: [],
                        reactions: [],
                        intended_japanese: null,
                        qa_history: [],
                        memo: ''
                    };
                    practiceRetryHistory.push(historyItemRef);
 
                    const dataCorr = await getCorrection(text, practiceFeedback, practiceRetryHistory.slice(0, -1), false, "", (newQaHistory) => {
                        historyItemRef.qa_history = newQaHistory;
                        updateSavedData('history', practiceRetryHistory);
                        if (isReviewMode) {
                            renderHistory(practiceRetryHistory, historyContainer);
                        }
                    });
 
                    if (dataCorr && dataCorr.correction) {
                        historyItemRef.correction = dataCorr.correction;
                        historyItemRef.suggestions = dataCorr.suggestions || [];
                        historyItemRef.reactions = dataCorr.reactions || [];
                        historyItemRef.intended_japanese = dataCorr.intended_japanese || null;
                        
                        // Bind user memo for initial feedback item
                        const memoInput = practiceFeedback.querySelector('.user-memo-input');
                        setupUserMemo(memoInput, historyItemRef, () => {
                            updateSavedData('history', practiceRetryHistory);
                        });

                        updateSavedData('history', practiceRetryHistory);
                        if (isReviewMode) {
                            btnHistory.classList.remove('hidden');
                            renderHistory(practiceRetryHistory, historyContainer);
                        }
                    }
 
                    practiceInput.value = '';
                }

                practiceInput.disabled = false;
                btnPracticeSend.disabled = false;
                if (typeof saveUIState === 'function') {
                    saveUIState();
                }
            });

            // Retry Button Logic
            const btnRetryList = group.querySelectorAll('.btn-retry');
            btnRetryList.forEach(btnRetry => {
                btnRetry.addEventListener('click', () => {
                    const feedback = btnRetry.closest('.feedback-content') || btnRetry.closest('.feedback-section');
                    const isPractice = feedback.classList.contains('feedback-content') && practiceSection.contains(feedback);

                    if (isPractice) {
                        item.dataset.isPracticeRetrying = 'true';
                        practiceInput.value = '';
                        practiceInput.disabled = false;
                        practiceInput.style.height = 'auto';
                        btnPracticeSend.disabled = true;
                        feedback.classList.add('hidden');
                        practiceInput.focus();
                    } else {
                        // Main conversation retry
                        const group = btnRetry.closest('.conversation-group');
                        group.dataset.isRetrying = 'true';

                        const userTextP = group.querySelector('.user-text');
                        userInput.value = userTextP ? userTextP.textContent : '';
                        userInput.disabled = false;
                        userInput.style.height = 'auto';
                        btnSend.disabled = userInput.value.trim() === '';

                        feedback.classList.add('hidden');

                        // Move input back to bottom
                        moveInputToBottom();

                        userInput.focus();
                        userInput.setSelectionRange(userInput.value.length, userInput.value.length);
                    }
                    if (typeof saveUIState === 'function') {
                        saveUIState();
                    }
                });
            });
        }

        // Speech
        let audioUrl = null;
        let lastVoice = null;
        let lastSpeed = null;

        const playAudio = async () => {
            const iconPlay = btnSpeak.querySelector('.icon-play');
            const iconPause = btnSpeak.querySelector('.icon-pause');
            const loader = btnSpeak.querySelector('.loader');

            const currentVoice = voiceSelect.value;
            const currentSpeed = speedRange.value;

            // Check if settings have changed
            const settingsChanged = (lastVoice && lastSpeed) &&
                (lastVoice !== currentVoice || lastSpeed !== currentSpeed);

            // If audio exists and is the current playing audio, toggle play/pause
            if (audioUrl && currentAudio && currentAudio.src.includes(audioUrl) && !settingsChanged) {
                if (currentAudio.paused) {
                    currentAudio.play();
                } else {
                    currentAudio.pause();
                }
                return;
            }

            stopAudio(); // Stop other audio

            // Regenerate audio if no audio exists, or settings have changed
            if (!audioUrl || settingsChanged) {
                // Generate Speech
                iconPlay.classList.add('hidden');
                loader.classList.remove('hidden');

                try {
                    const res = await fetch('api/generate_speech.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            text: data.english,
                            voice: currentVoice,
                            speed: currentSpeed
                        })
                    });

                    if (!res.ok) {
                        const errorText = await res.text();
                        console.error('Speech API Error Details:', errorText);
                        throw new Error(`Server returned ${res.status}: ${errorText}`);
                    }

                    const resData = await res.json();
                    if (!resData.audio_url) {
                        throw new Error('No audio URL returned');
                    }
                    audioUrl = resData.audio_url;

                    // Save current settings
                    lastVoice = currentVoice;
                    lastSpeed = currentSpeed;
                } catch (e) {
                    console.error('Speech generation failed:', e);
                    alert('音声生成に失敗しました: ' + e.message);
                    iconPlay.classList.remove('hidden');
                    loader.classList.add('hidden');
                    return;
                }
            }

            // Play
            currentAudio = new Audio(audioUrl);
            currentAudioBtn = btnSpeak;

            currentAudio.addEventListener('play', () => {
                iconPlay.classList.add('hidden');
                iconPause.classList.remove('hidden');
                loader.classList.add('hidden');
            });

            currentAudio.addEventListener('pause', () => {
                iconPlay.classList.remove('hidden');
                iconPause.classList.add('hidden');
            });

            const audioInstance = currentAudio;
            currentAudio.addEventListener('ended', () => {
                if (btnRepeat.classList.contains('active')) {
                    setTimeout(() => {
                        if (currentAudio === audioInstance) {
                            audioInstance.currentTime = 0;
                            audioInstance.play();
                        }
                    }, 500);
                } else {
                    iconPlay.classList.remove('hidden');
                    iconPause.classList.add('hidden');
                }
            });

            const playPromise = currentAudio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log('Playback interrupted or prevented:', error);
                });
            }
        };

        btnSpeak.addEventListener('click', () => playAudio());

        btnRepeat.addEventListener('click', () => {
            btnRepeat.classList.toggle('active');
            isRepeating = btnRepeat.classList.contains('active');
        });

        if (insertAfterGroup) {
            insertAfterGroup.parentNode.insertBefore(clone, insertAfterGroup.nextSibling);
        } else {
            const targetContainer = isReviewMode ? reviewContainer : container;
            targetContainer.appendChild(clone);
        }

        // Note: We don't scroll here because moveInputToBottom will handle scrolling
        group.updateSavedData = updateSavedData;
        return group;
    }

    function stopAudio() {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
        if (currentAudioBtn) {
            const iconPlay = currentAudioBtn.querySelector('.icon-play');
            const iconPause = currentAudioBtn.querySelector('.icon-pause');
            if (iconPlay && iconPause) {
                iconPlay.classList.remove('hidden');
                iconPause.classList.add('hidden');
            }
            currentAudioBtn = null;
        }
    }

    async function generateVariation(originalData, originalItemElement, type) {
        const resultContainer = originalItemElement.querySelector('.variation-result-container');
        if (!resultContainer) return;

        resultContainer.classList.remove('hidden');

        // Add loading item
        const loadingItem = document.createElement('div');
        loadingItem.className = 'variation-result-item loading';
        loadingItem.innerHTML = `<div class="loader"></div>`;
        resultContainer.appendChild(loadingItem);
        loadingItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        const existingVariations = Array.from(resultContainer.querySelectorAll('.variation-result-eng')).map(el => el.textContent);

        try {
            const response = await fetch('api/generate_text.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: type,
                    context: {
                        japanese: originalData.japanese,
                        english: originalData.english,
                        exclude: existingVariations
                    },
                    ai_style: aiStyleSelect ? aiStyleSelect.value : 'polite'
                })
            });

            if (!response.ok) throw new Error('API Error');
            const data = await response.json();

            loadingItem.remove();

            const variationItem = document.createElement('div');
            variationItem.className = 'variation-result-item';

            let label = 'Variation';
            if (type === 'native') label = 'Native';
            if (type === 'formal') label = 'Formal';
            if (type === 'casual') label = 'Casual';
            if (type === 'simple') label = 'Simple';

            variationItem.innerHTML = `
                <div class="variation-result-header">
                    <span class="variation-result-type">${label}</span>
                    <div class="variation-actions">
                        <button class="btn-play-suggestion" title="再生">
                            <svg class="icon-play" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            <svg class="icon-pause hidden" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                            <div class="loader hidden"></div>
                        </button>
                        <button class="btn-repeat-suggestion" title="リピート再生">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                        </button>
                    </div>
                </div>
                <div class="variation-result-text">
                    <p class="variation-result-eng">${data.english}</p>
                    <p class="variation-result-jp">${data.japanese}</p>
                </div>
            `;

            const btnPlay = variationItem.querySelector('.btn-play-suggestion');
            const btnRepeat = variationItem.querySelector('.btn-repeat-suggestion');

            btnPlay.addEventListener('click', () => {
                playSuggestionAudio(data.english, btnPlay, btnRepeat);
            });

            btnRepeat.addEventListener('click', () => {
                btnRepeat.classList.toggle('active');
            });

            resultContainer.appendChild(variationItem);
            variationItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            if (typeof saveUIState === 'function') {
                saveUIState();
            }

        } catch (error) {
            console.error(error);
            loadingItem.innerHTML = '<p class="error-text">生成に失敗しました。</p>';
            setTimeout(() => loadingItem.remove(), 2000);
        }
    }

    async function generateSuggestionVariation(originalData, originalItemElement, type) {
        const resultContainer = originalItemElement.querySelector('.variation-result-container');
        if (!resultContainer) return;

        resultContainer.classList.remove('hidden');
        const loadingItem = document.createElement('div');
        loadingItem.className = 'variation-result-item loading';
        loadingItem.innerHTML = `<div class="loader"></div>`;
        resultContainer.appendChild(loadingItem);

        const existingVariations = Array.from(resultContainer.querySelectorAll('.variation-result-eng')).map(el => el.textContent);

        try {
            const response = await fetch('api/generate_text.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: type,
                    context: {
                        japanese: originalData.japanese,
                        english: originalData.english,
                        exclude: existingVariations
                    },
                    ai_style: aiStyleSelect ? aiStyleSelect.value : 'polite'
                })
            });

            if (!response.ok) throw new Error('API Error');
            const data = await response.json();

            loadingItem.remove();

            const variationItem = document.createElement('div');
            variationItem.className = 'variation-result-item';

            let label = 'Variation';
            if (type === 'native') label = 'Native';
            if (type === 'formal') label = 'Formal';
            if (type === 'casual') label = 'Casual';
            if (type === 'simple') label = 'Simple';

            variationItem.innerHTML = `
                <div class="variation-result-header">
                    <span class="variation-result-type">${label}</span>
                    <div class="variation-actions">
                        <button class="btn-play-suggestion" title="再生">
                            <svg class="icon-play" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            <svg class="icon-pause hidden" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                            <div class="loader hidden"></div>
                        </button>
                        <button class="btn-repeat-suggestion" title="リピート再生">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                        </button>
                    </div>
                </div>
                <div class="variation-result-text">
                    <p class="variation-result-eng">${data.english}</p>
                    <p class="variation-result-jp">${data.japanese}</p>
                </div>
            `;

            const btnPlay = variationItem.querySelector('.btn-play-suggestion');
            const btnRepeat = variationItem.querySelector('.btn-repeat-suggestion');

            btnPlay.addEventListener('click', () => {
                playSuggestionAudio(data.english, btnPlay, btnRepeat);
            });

            btnRepeat.addEventListener('click', () => {
                btnRepeat.classList.toggle('active');
            });

            resultContainer.appendChild(variationItem);
            if (typeof saveUIState === 'function') {
                saveUIState();
            }

        } catch (error) {
            console.error(error);
            loadingItem.innerHTML = '<p class="error-text">生成に失敗しました。</p>';
            setTimeout(() => loadingItem.remove(), 2000);
        }
    }

    function createSuggestionElement(suggestion, containerList) {
        const li = document.createElement('li');
        li.className = 'suggestion-item';

        // Handle both old (string) and new (object) formats for backward compatibility
        const engText = typeof suggestion === 'string' ? suggestion : suggestion.english;
        const jpText = typeof suggestion === 'string' ? '' : suggestion.japanese;
        const pointText = typeof suggestion === 'string' ? '' : suggestion.point;

        li.innerHTML = `
            <div class="suggestion-content">
                <p class="english">${engText}</p>
                ${jpText ? `<p class="japanese">${jpText}</p>` : ''}
                <div class="suggestion-actions">
                    <button class="btn-play-suggestion" title="再生">
                        <svg class="icon-play" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        <svg class="icon-pause hidden" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        <div class="loader hidden"></div>
                    </button>
                    <button class="btn-repeat-suggestion" title="リピート再生">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                    </button>
                    <button class="btn-variation-menu" title="バリエーション生成">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>
                    </button>
                </div>
                ${pointText ? `<p class="point"><span class="label">POINT</span> ${marked.parse(pointText).replace(/^<p>|<\/p>$/g, '')}</p>` : ''}
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        フォーマル
                    </button>
                    <button data-type="casual">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                        カジュアル
                    </button>
                    <button data-type="simple">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                        簡単
                    </button>
                </div>
                <div class="variation-result-container hidden"></div>
            </div>
        `;

        // Add play event for suggestion
        const btnPlay = li.querySelector('.btn-play-suggestion');
        const btnRepeat = li.querySelector('.btn-repeat-suggestion');
        const btnVariation = li.querySelector('.btn-variation-menu');

        btnPlay.addEventListener('click', () => playSuggestionAudio(engText, btnPlay, btnRepeat));

        btnRepeat.addEventListener('click', () => {
            btnRepeat.classList.toggle('active');
        });

        const variationSection = li.querySelector('.variation-section');

        btnVariation.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpening = variationSection.classList.contains('hidden');

            if (isOpening) {
                variationSection.classList.remove('hiding');
                variationSection.classList.remove('hidden');
                btnVariation.classList.add('active');
            } else {
                btnVariation.classList.remove('active');
                variationSection.classList.add('hiding');
                setTimeout(() => {
                    variationSection.classList.add('hidden');
                    variationSection.classList.remove('hiding');
                }, 300);
            }
        });

        variationSection.querySelectorAll('button').forEach(vBtn => {
            vBtn.addEventListener('click', () => {
                const type = vBtn.dataset.type;
                generateSuggestionVariation({
                    japanese: jpText,
                    english: engText
                }, li, type);

                // Section remains open as per user request
            });
        });

        return li;
    }

    function setLoading(isLoading) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            if (isLoading) {
                overlay.classList.remove('hidden');
            } else {
                overlay.classList.add('hidden');
            }
        }
        btnNew.disabled = isLoading;
    }

    function getSuggestedSentences(groupElement) {
        if (!groupElement) return [];
        const sentences = new Set();

        // 1. Sample Answers from dataset
        if (groupElement.dataset.sampleAnswers) {
            try {
                const answers = JSON.parse(groupElement.dataset.sampleAnswers);
                answers.forEach(ans => {
                    if (typeof ans === 'object' && ans.en) {
                        sentences.add(ans.en);
                    }
                });
            } catch (e) {
                console.error('Error parsing sample answers:', e);
            }
        }

        // 2. The main English sentence of the group
        const mainEng = groupElement.querySelector('.english');
        if (mainEng && mainEng.textContent) {
            sentences.add(mainEng.textContent);
        }

        // 3. Any English in suggestions
        groupElement.querySelectorAll('.suggestions-list .english').forEach(el => {
            if (el.textContent) sentences.add(el.textContent);
        });

        // 4. Any English in variations
        groupElement.querySelectorAll('.variation-result-eng').forEach(el => {
            if (el.textContent) sentences.add(el.textContent);
        });

        return Array.from(sentences).filter(s => s.trim() !== '');
    }
    function renderReactions(reactions, feedbackElement) {
        const reactionsContainer = feedbackElement.querySelector('.reactions-container');
        const reactionsList = feedbackElement.querySelector('.reactions-list');
        if (reactionsContainer && reactionsList && reactions) {
            reactionsContainer.classList.remove('hidden');
            reactionsList.innerHTML = '';
            reactions.forEach(react => {
                const div = document.createElement('div');
                div.className = `reaction-item level-${react.level}`;
                div.innerHTML = `
                    <div class="reaction-top">
                        <div class="reaction-avatar">${react.emoji}</div>
                        <div class="reaction-name">${react.name}</div>
                    </div>
                    <div class="reaction-text">${react.reaction}</div>
                    <div class="reaction-suggestion">
                        <span class="label">How I'd say:</span>
                        <span class="text">${react.suggestion || '...'}</span>
                    </div>
                `;
                reactionsList.appendChild(div);
            });
        }
    }

    function saveUIState() {
        if (!currentUser) return; // Don't save if not logged in
        
        const groupsData = [];
        const groups = container.querySelectorAll('.conversation-group');
        groups.forEach(group => {
            const jpEl = group.querySelector('.japanese');
            const enEl = group.querySelector('.english');
            
            // Retrieve sample answers
            let sampleAnswers = [];
            if (group.dataset.sampleAnswers) {
                try {
                    sampleAnswers = JSON.parse(group.dataset.sampleAnswers);
                } catch (e) {}
            }
            
            // Retrieve retry history
            let retryHistory = [];
            if (group.dataset.retryHistory) {
                try {
                    retryHistory = JSON.parse(group.dataset.retryHistory);
                } catch (e) {}
            }
            
            const isRetrying = group.dataset.isRetrying === 'true';
            
            // User message
            const userMsgDiv = group.querySelector('.user-message');
            const userText = group.querySelector('.user-text')?.textContent || '';
            const userMsgVisible = userMsgDiv && !userMsgDiv.classList.contains('hidden');
            
            // Feedback section
            const feedbackSection = group.querySelector('.feedback-section');
            const feedbackVisible = feedbackSection && !feedbackSection.classList.contains('hidden');
            
            let feedbackData = null;
            if (feedbackVisible) {
                const correctionHtml = feedbackSection.querySelector('.correction')?.innerHTML || '';
                const userInputDisplayEl = feedbackSection.querySelector('.user-input-display');
                const userInputDisplayHtml = userInputDisplayEl?.innerHTML || '';
                const userInputDisplayVisible = userInputDisplayEl && !userInputDisplayEl.classList.contains('hidden');
                
                // Suggestions
                const suggestions = [];
                feedbackSection.querySelectorAll('.suggestions-list .suggestion-item').forEach(sEl => {
                    const sEng = sEl.querySelector('.english')?.textContent || '';
                    const sJp = sEl.querySelector('.japanese')?.textContent || '';
                    const sPoint = sEl.querySelector('.point')?.textContent || '';
                    suggestions.push({ english: sEng, japanese: sJp, point: sPoint });
                });
                
                // Reactions
                const reactions = [];
                feedbackSection.querySelectorAll('.reactions-list .reaction-item').forEach(rEl => {
                    const emoji = rEl.querySelector('.reaction-avatar')?.textContent || '';
                    const name = rEl.querySelector('.reaction-name')?.textContent || '';
                    const reaction = rEl.querySelector('.reaction-text')?.textContent || '';
                    const suggestion = rEl.querySelector('.reaction-suggestion .text')?.textContent || '';
                    
                    let level = 1;
                    rEl.classList.forEach(cls => {
                        if (cls.startsWith('level-')) {
                            level = parseInt(cls.replace('level-', ''));
                        }
                    });
                    reactions.push({ emoji, name, reaction, suggestion, level });
                });
                
                const qaHistory = feedbackSection.itemQaHistory || [];
                
                feedbackData = {
                    correction_html: correctionHtml,
                    suggestions: suggestions,
                    reactions: reactions,
                    qa_history: qaHistory,
                    user_input_display_html: userInputDisplayHtml,
                    user_input_display_visible: userInputDisplayVisible,
                    memo: feedbackSection.querySelector('.user-memo-input')?.value || ''
                };
            }
            
            // Main Q&A
            const mainQa = group.querySelector('.main-qa');
            const mainQaVisible = mainQa && !mainQa.classList.contains('hidden');
            const mainQaHistory = mainQa?.itemQaHistory || [];
            
            // Practice Section
            const practiceSection = group.querySelector('.practice-section');
            const practiceVisible = practiceSection && !practiceSection.classList.contains('hidden');
            let practiceData = null;
            if (practiceVisible) {
                const practiceInputVal = group.querySelector('.practice-input')?.value || '';
                const practiceFeedback = practiceSection.querySelector('.feedback-content');
                const practiceFeedbackVisible = practiceFeedback && !practiceFeedback.classList.contains('hidden');
                
                let practiceFeedbackData = null;
                if (practiceFeedbackVisible) {
                    const practiceCorrection = practiceFeedback.querySelector('.correction')?.innerHTML || '';
                    const practiceUserInputDisplayEl = practiceFeedback.querySelector('.user-input-display');
                    const practiceUserInputDisplayHtml = practiceUserInputDisplayEl?.innerHTML || '';
                    const practiceUserInputDisplayVisible = practiceUserInputDisplayEl && !practiceUserInputDisplayEl.classList.contains('hidden');
                    
                    const practiceSuggestions = [];
                    practiceFeedback.querySelectorAll('.suggestions-list .suggestion-item').forEach(sEl => {
                        const sEng = sEl.querySelector('.english')?.textContent || '';
                        const sJp = sEl.querySelector('.japanese')?.textContent || '';
                        const sPoint = sEl.querySelector('.point')?.textContent || '';
                        practiceSuggestions.push({ english: sEng, japanese: sJp, point: sPoint });
                    });
                    
                    const practiceReactions = [];
                    practiceFeedback.querySelectorAll('.reactions-list .reaction-item').forEach(rEl => {
                        const emoji = rEl.querySelector('.reaction-avatar')?.textContent || '';
                        const name = rEl.querySelector('.reaction-name')?.textContent || '';
                        const reaction = rEl.querySelector('.reaction-text')?.textContent || '';
                        const suggestion = rEl.querySelector('.reaction-suggestion .text')?.textContent || '';
                        
                        let level = 1;
                        rEl.classList.forEach(cls => {
                            if (cls.startsWith('level-')) {
                                level = parseInt(cls.replace('level-', ''));
                            }
                        });
                        practiceReactions.push({ emoji, name, reaction, suggestion, level });
                    });
                    
                    const practiceQaHistory = practiceFeedback.itemQaHistory || [];
                    
                    practiceFeedbackData = {
                        correction_html: practiceCorrection,
                        suggestions: practiceSuggestions,
                        reactions: practiceReactions,
                        qa_history: practiceQaHistory,
                        user_input_display_html: practiceUserInputDisplayHtml,
                        user_input_display_visible: practiceUserInputDisplayVisible,
                        memo: practiceFeedback.querySelector('.user-memo-input')?.value || ''
                    };
                }
                
                practiceData = {
                    visible: true,
                    input_value: practiceInputVal,
                    is_retrying: group.dataset.isPracticeRetrying === 'true',
                    feedback: practiceFeedbackData
                };
            }
            
            // Variations
            const variationSection = group.querySelector('.variation-section');
            const variationVisible = variationSection && !variationSection.classList.contains('hidden');
            const variations = [];
            if (variationVisible) {
                variationSection.querySelectorAll('.variation-result-item').forEach(vEl => {
                    const vEng = vEl.querySelector('.variation-result-eng')?.textContent || '';
                    const vJp = vEl.querySelector('.variation-result-jp')?.textContent || '';
                    const vType = vEl.querySelector('.variation-result-type')?.textContent || '';
                    variations.push({ english: vEng, japanese: vJp, type: vType });
                });
            }
            
            groupsData.push({
                prompt: {
                    japanese: jpEl?.textContent || '',
                    english: enEl?.textContent || '',
                    sample_user_answers: sampleAnswers,
                    english_hidden: enEl?.classList.contains('hidden')
                },
                user_msg: {
                    visible: userMsgVisible,
                    text: userText
                },
                feedback: feedbackData,
                main_qa: {
                    visible: mainQaVisible,
                    history: mainQaHistory
                },
                practice: practiceData,
                variations: {
                    visible: variationVisible,
                    items: variations
                },
                retry_history: retryHistory,
                is_retrying: isRetrying
            });
        });
        
        const uiState = {
            currentMode: currentMode,
            conversationHistory: conversationHistory,
            currentContext: currentContext,
            currentSampleAnswers: currentSampleAnswers,
            groups: groupsData
        };
        
        localStorage.setItem('speaking2_ui_state', JSON.stringify(uiState));
    }

    async function restoreUIState() {
        const saved = localStorage.getItem('speaking2_ui_state');
        if (!saved) {
            // No saved state, show initial input UI or generate new conversation
            if (initialModeSelect && initialModeSelect.value === 'manual') {
                showInitialInputUI();
            } else {
                generateText('new');
            }
            return;
        }
        
        try {
            const state = JSON.parse(saved);
            currentMode = state.currentMode || 'practice';
            conversationHistory = state.conversationHistory || [];
            currentContext = state.currentContext || '';
            currentSampleAnswers = state.currentSampleAnswers || [];
            
            // Clear container first
            container.innerHTML = '';
            
            if (!state.groups || state.groups.length === 0) {
                if (initialModeSelect && initialModeSelect.value === 'manual') {
                    showInitialInputUI();
                } else {
                    generateText('new');
                }
                return;
            }
            
            // Restore each group
            for (const gData of state.groups) {
                const promptData = {
                    japanese: gData.prompt.japanese,
                    english: gData.prompt.english,
                    sample_user_answers: gData.prompt.sample_user_answers,
                    history: gData.retry_history || []
                };
                
                const groupEl = addConversationItem(promptData);
                
                // Set datasets
                groupEl.dataset.sampleAnswers = JSON.stringify(gData.prompt.sample_user_answers);
                
                // English visibility
                const englishEl = groupEl.querySelector('.english');
                if (gData.prompt.english_hidden) {
                    englishEl.classList.add('hidden');
                } else {
                    englishEl.classList.remove('hidden');
                }
                
                if (gData.retry_history) {
                    groupEl.dataset.retryHistory = JSON.stringify(gData.retry_history);
                }
                
                if (gData.is_retrying) {
                    groupEl.dataset.isRetrying = 'true';
                }
                
                // User message
                const userMsgDiv = groupEl.querySelector('.user-message');
                const userTextP = groupEl.querySelector('.user-text');
                if (gData.user_msg.visible) {
                    userMsgDiv.classList.remove('hidden');
                    userTextP.textContent = gData.user_msg.text;
                }
                
                // Main Q&A Section
                if (gData.main_qa.visible) {
                    const btnQa = groupEl.querySelector('.btn-qa');
                    const mainQa = groupEl.querySelector('.main-qa');
                    mainQa.classList.remove('hidden');
                    btnQa.classList.add('active');
                    
                    setupItemQa(mainQa, {
                        english: promptData.english,
                        situation: promptData.japanese
                    }, gData.main_qa.history || [], (newHistory) => {
                        updateSavedDataExternal(groupEl, 'qa_history', newHistory);
                    });
                }
                
                // Variations Section
                if (gData.variations.visible) {
                    const btnVariationMenu = groupEl.querySelector('.btn-variation-menu');
                    const variationSection = groupEl.querySelector('.variation-section');
                    const resultContainer = variationSection.querySelector('.variation-result-container');
                    
                    variationSection.classList.remove('hidden');
                    btnVariationMenu.classList.add('active');
                    resultContainer.classList.remove('hidden');
                    
                    gData.variations.items.forEach(v => {
                        const variationItem = document.createElement('div');
                        variationItem.className = 'variation-result-item';
                        
                        variationItem.innerHTML = `
                            <div class="variation-result-header">
                                <span class="variation-result-type">${v.type}</span>
                                <div class="variation-actions">
                                    <button class="btn-play-suggestion" title="再生">
                                        <svg class="icon-play" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                        <svg class="icon-pause hidden" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                                        <div class="loader hidden"></div>
                                    </button>
                                    <button class="btn-repeat-suggestion" title="リピート再生">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                                    </button>
                                </div>
                            </div>
                            <div class="variation-result-text">
                                <p class="variation-result-eng">${v.english}</p>
                                <p class="variation-result-jp">${v.japanese}</p>
                            </div>
                        `;
                        
                        const btnPlay = variationItem.querySelector('.btn-play-suggestion');
                        const btnRepeat = variationItem.querySelector('.btn-repeat-suggestion');
                        
                        btnPlay.addEventListener('click', () => {
                            playSuggestionAudio(v.english, btnPlay, btnRepeat);
                        });
                        
                        btnRepeat.addEventListener('click', () => {
                            btnRepeat.classList.toggle('active');
                        });
                        
                        resultContainer.appendChild(variationItem);
                    });
                }
                
                // Practice Section
                if (gData.practice && gData.practice.visible) {
                    const btnPractice = groupEl.querySelector('.btn-practice');
                    const practiceSection = groupEl.querySelector('.practice-section');
                    const practiceFeedback = practiceSection.querySelector('.feedback-content');
                    
                    practiceSection.classList.remove('hidden');
                    btnPractice.classList.add('active');
                    
                    const practiceInput = groupEl.querySelector('.practice-input');
                    if (practiceInput && gData.practice.input_value) {
                        practiceInput.value = gData.practice.input_value;
                    }
                    
                    if (gData.practice.is_retrying) {
                        groupEl.querySelector('.conversation-item').dataset.isPracticeRetrying = 'true';
                    }
                    
                    if (gData.practice.feedback) {
                        practiceFeedback.classList.remove('hidden');
                        
                        // Restore practice correction HTML
                        practiceFeedback.querySelector('.correction').innerHTML = gData.practice.feedback.correction_html;
                        
                        // Restore user input display if available
                        const userInputDisplay = practiceFeedback.querySelector('.user-input-display');
                        if (userInputDisplay && gData.practice.feedback.user_input_display_html) {
                            userInputDisplay.innerHTML = gData.practice.feedback.user_input_display_html;
                            if (gData.practice.feedback.user_input_display_visible) {
                                userInputDisplay.classList.remove('hidden');
                            } else {
                                userInputDisplay.classList.add('hidden');
                            }
                        } else if (userInputDisplay) {
                            userInputDisplay.classList.add('hidden');
                        }
                        
                        // Suggestions
                        const suggestionsList = practiceFeedback.querySelector('.suggestions-list');
                        suggestionsList.innerHTML = '';
                        
                        const suggestionsHeader = practiceFeedback.querySelector('h3:nth-of-type(2)');
                        if (gData.practice.feedback.suggestions && gData.practice.feedback.suggestions.length > 0) {
                            if (suggestionsHeader) suggestionsHeader.classList.remove('hidden');
                            gData.practice.feedback.suggestions.forEach(suggestion => {
                                const li = createSuggestionElement(suggestion, suggestionsList);
                                suggestionsList.appendChild(li);
                            });
                        } else {
                            if (suggestionsHeader) suggestionsHeader.classList.add('hidden');
                        }
                        
                        // Reactions
                        const reactionsList = practiceFeedback.querySelector('.reactions-list');
                        const reactionsContainer = practiceFeedback.querySelector('.reactions-container');
                        
                        if (gData.practice.feedback.reactions && gData.practice.feedback.reactions.length > 0) {
                            reactionsContainer.classList.remove('hidden');
                            reactionsList.innerHTML = '';
                            gData.practice.feedback.reactions.forEach(react => {
                                const div = document.createElement('div');
                                div.className = `reaction-item level-${react.level}`;
                                div.innerHTML = `
                                    <div class="reaction-top">
                                        <div class="reaction-avatar">${react.emoji}</div>
                                        <div class="reaction-name">${react.name}</div>
                                    </div>
                                    <div class="reaction-text">${react.reaction}</div>
                                    <div class="reaction-suggestion">
                                        <span class="label">How I'd say:</span>
                                        <span class="text">${react.suggestion || '...'}</span>
                                    </div>
                                `;
                                reactionsList.appendChild(div);
                            });
                        }
                        
                        // Q&A for Practice
                        setupItemQa(practiceFeedback, {
                            situation: promptData.japanese,
                            user_input: gData.user_msg.text,
                            correction: gData.practice.feedback.correction_html
                        }, gData.practice.feedback.qa_history || [], (newHistory) => {
                            const practiceRetryHistory = gData.retry_history || [];
                            if (practiceRetryHistory.length > 0) {
                                practiceRetryHistory[practiceRetryHistory.length - 1].qa_history = newHistory;
                            }
                            updateSavedDataExternal(groupEl, 'history', practiceRetryHistory);
                        });

                        // Restore user memo for Practice
                        const practiceMemoInput = practiceFeedback.querySelector('.user-memo-input');
                        if (practiceMemoInput) {
                            const practiceRetryHistory = gData.retry_history || [];
                            const firstItem = practiceRetryHistory[0] || {};
                            firstItem.memo = gData.practice.feedback.memo || '';
                            practiceMemoInput.value = firstItem.memo;
                            
                            setupUserMemo(practiceMemoInput, firstItem, () => {
                                updateSavedDataExternal(groupEl, 'history', practiceRetryHistory);
                            });
                        }
                    }
                }
                
                // Conversation Feedback
                if (gData.feedback) {
                    const feedbackSection = groupEl.querySelector('.feedback-section');
                    feedbackSection.classList.remove('hidden');
                    
                    // Set correction HTML
                    feedbackSection.querySelector('.correction').innerHTML = gData.feedback.correction_html;
                    
                    // Restore user input display if available
                    const userInputDisplay = feedbackSection.querySelector('.user-input-display');
                    if (userInputDisplay && gData.feedback.user_input_display_html) {
                        userInputDisplay.innerHTML = gData.feedback.user_input_display_html;
                        if (gData.feedback.user_input_display_visible) {
                            userInputDisplay.classList.remove('hidden');
                        } else {
                            userInputDisplay.classList.add('hidden');
                        }
                    } else if (userInputDisplay) {
                        userInputDisplay.classList.add('hidden');
                    }
                    
                    // Suggestions
                    const suggestionsList = feedbackSection.querySelector('.suggestions-list');
                    suggestionsList.innerHTML = '';
                    
                    const suggestionsHeader = feedbackSection.querySelector('h3:nth-of-type(2)');
                    if (gData.feedback.suggestions && gData.feedback.suggestions.length > 0) {
                        if (suggestionsHeader) suggestionsHeader.classList.remove('hidden');
                        gData.feedback.suggestions.forEach(suggestion => {
                            const li = createSuggestionElement(suggestion, suggestionsList);
                            suggestionsList.appendChild(li);
                        });
                    } else {
                        if (suggestionsHeader) suggestionsHeader.classList.add('hidden');
                    }
                    
                    // Reactions
                    const reactionsList = feedbackSection.querySelector('.reactions-list');
                    const reactionsContainer = feedbackSection.querySelector('.reactions-container');
                    
                    if (gData.feedback.reactions && gData.feedback.reactions.length > 0) {
                        reactionsContainer.classList.remove('hidden');
                        reactionsList.innerHTML = '';
                        gData.feedback.reactions.forEach(react => {
                            const div = document.createElement('div');
                            div.className = `reaction-item level-${react.level}`;
                            div.innerHTML = `
                                <div class="reaction-top">
                                    <div class="reaction-avatar">${react.emoji}</div>
                                    <div class="reaction-name">${react.name}</div>
                                </div>
                                <div class="reaction-text">${react.reaction}</div>
                                <div class="reaction-suggestion">
                                    <span class="label">How I'd say:</span>
                                    <span class="text">${react.suggestion || '...'}</span>
                                </div>
                            `;
                            reactionsList.appendChild(div);
                        });
                    }
                    
                    // Q&A for Conversation Feedback
                    setupItemQa(feedbackSection, {
                        situation: promptData.japanese,
                        user_input: gData.user_msg.text,
                        correction: gData.feedback.correction_html
                    }, gData.feedback.qa_history || [], (newHistory) => {
                        gData.feedback.qa_history = newHistory;
                        saveUIState();
                    });

                    // Restore user memo for Conversation Feedback
                    const memoInput = feedbackSection.querySelector('.user-memo-input');
                    if (memoInput) {
                        const retryHistory = gData.retry_history || [];
                        const firstItem = retryHistory[0] || {};
                        firstItem.memo = gData.feedback.memo || '';
                        memoInput.value = firstItem.memo;
                        
                        setupUserMemo(memoInput, firstItem, () => {
                            groupEl.dataset.retryHistory = JSON.stringify(retryHistory);
                            updateSavedDataExternal(groupEl, 'history', retryHistory);
                        });
                    }
                }
            }
            
            // Restore active mode and tab
            switchMode(currentMode);
            
            // Move input to bottom of restored content
            moveInputToBottom();
            
        } catch (e) {
            console.error('Failed to restore UI state:', e);
            if (initialModeSelect && initialModeSelect.value === 'manual') {
                showInitialInputUI();
            } else {
                generateText('new');
            }
        }
    }

    function updateSavedDataExternal(groupEl, key, value) {
        if (groupEl && typeof groupEl.updateSavedData === 'function') {
            groupEl.updateSavedData(key, value);
        }
        saveUIState();
    }
});

