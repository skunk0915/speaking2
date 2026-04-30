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
    const tmpl = document.getElementById('tmpl-conversation');
    const tmplLoading = document.getElementById('tmpl-loading');

    // Local Storage Keys
    const STORAGE_KEYS = {
        VOICE: 'english-training-voice',
        SPEED: 'english-training-speed',
        LENGTH: 'english-training-length',
        AI_STYLE: 'english-training-ai-style',
        ENGLISH_LEVEL: 'english-training-english-level',
        SITUATIONS: 'english-training-situations',
        REVIEWS: 'english-training-reviews'
    };

    // Load settings from localStorage
    function loadSettings() {
        const savedVoice = localStorage.getItem(STORAGE_KEYS.VOICE);
        const savedSpeed = localStorage.getItem(STORAGE_KEYS.SPEED);
        const savedLength = localStorage.getItem(STORAGE_KEYS.LENGTH);
        const savedAiStyle = localStorage.getItem(STORAGE_KEYS.AI_STYLE);
        const savedEnglishLevel = localStorage.getItem(STORAGE_KEYS.ENGLISH_LEVEL);

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
        
        // Situations are handled in initSituations
    }

    // Save settings to localStorage
    function saveSettings() {
        localStorage.setItem(STORAGE_KEYS.VOICE, voiceSelect.value);
        localStorage.setItem(STORAGE_KEYS.SPEED, speedRange.value);
        localStorage.setItem(STORAGE_KEYS.LENGTH, lengthRange.value);
        if (aiStyleSelect) localStorage.setItem(STORAGE_KEYS.AI_STYLE, aiStyleSelect.value);
        if (englishLevelSelect) localStorage.setItem(STORAGE_KEYS.ENGLISH_LEVEL, englishLevelSelect.value);
        
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

    // Load settings first
    loadSettings();

    // Initialize sliders
    updateSliderVisuals(speedRange, speedVal);
    updateSliderVisuals(lengthRange, lengthVal);

    async function initSituations() {
        const situationTags = document.getElementById('situation-tags');
        const btnAll = document.getElementById('btn-situation-all');
        const btnNone = document.getElementById('btn-situation-none');

        const CATEGORY_MAP = {
            'Daily Life': '日常生活',
            'Travel': '旅行・観光',
            'Business': 'ビジネス',
            'Emotions': '感情・表現',
            'Social': '社交・交流',
            'Academic': 'アカデミック'
        };
        
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
                const label = CATEGORY_MAP[cat] || cat;
                const tag = document.createElement('div');
                tag.className = 'situation-tag' + (saved.includes(cat) ? ' active' : '');
                tag.innerHTML = `<span class="tag-label">${label}</span>`;
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
    const btnHint = document.getElementById('btn-hint');
    const btnSend = document.getElementById('btn-send');
    
    // Review Tab Elements
    const tabPractice = document.getElementById('tab-practice');
    const tabReview = document.getElementById('tab-review');
    const reviewContainer = document.getElementById('review-container');
    const conversationContainer = document.getElementById('conversation-container');

    let reviews = JSON.parse(localStorage.getItem(STORAGE_KEYS.REVIEWS) || '[]');
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
        if (mode === 'practice') {
            tabPractice.classList.add('active');
            tabReview.classList.remove('active');
            conversationContainer.classList.remove('hidden');
            reviewContainer.classList.add('hidden');
            inputGroup.classList.remove('hidden');
        } else {
            tabReview.classList.add('active');
            tabPractice.classList.remove('active');
            conversationContainer.classList.add('hidden');
            reviewContainer.classList.remove('hidden');
            inputGroup.classList.add('hidden');
            renderReviews();
        }
    }

    tabPractice.addEventListener('click', () => switchMode('practice'));
    tabReview.addEventListener('click', () => switchMode('review'));

    function renderReviews() {
        reviewContainer.innerHTML = '';
        reviews.forEach(review => {
            addConversationItem(review, null, true);
        });
        
        if (reviews.length === 0) {
            reviewContainer.innerHTML = '<div class="empty-state" style="text-align:center; padding:40px; color:#8d97a5;">保存されたアイテムはありません。</div>';
        }
    }

    // Event Listeners
    btnNew.addEventListener('click', () => {
        if (conversationHistory.length === 0 || confirm('新しい会話を始めますか？今の会話は消えます。')) {
            container.innerHTML = '';
            conversationHistory = [];
            stopAudio();
            generateText('new');
        }
    });

    userInput.addEventListener('input', () => {
        btnSend.disabled = userInput.value.trim() === '';
        userInput.style.height = 'auto';
        userInput.style.height = Math.min(userInput.scrollHeight, 100) + 'px';
    });

    btnSend.addEventListener('click', async () => {
        const text = userInput.value.trim();
        if (!text) return;

        // Disable input
        userInput.disabled = true;
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

                const data = await getCorrection(text, feedbackSection, retryHistory, true);

                // Update retry history with the latest result
                if (data && data.correction) {
                    retryHistory.push({ user_input: text, correction: data.correction });
                    lastGroup.dataset.retryHistory = JSON.stringify(retryHistory);
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

                const data = await getCorrection(text, feedbackSection, retryHistory, false);

                // Update retry history with the latest result
                if (data && data.correction) {
                    retryHistory.push({ user_input: text, correction: data.correction });
                    lastGroup.dataset.retryHistory = JSON.stringify(retryHistory);
                }

                // Auto-advance conversation
                await generateText('continue');
            }
        }

        userInput.disabled = false;
        userInput.focus({ preventScroll: true });
    });

    btnHint.addEventListener('click', () => {
        hintDisplay.classList.remove('hidden');
        hintList.innerHTML = '';
        currentSampleAnswers.forEach(ans => {
            const div = document.createElement('div');
            div.className = 'hint-item';
            
            const jaText = typeof ans === 'object' ? ans.ja : ans;
            const enText = typeof ans === 'object' ? ans.en : '';

            div.innerHTML = `
                <p class="ja-hint">${jaText}</p>
                ${enText ? `<p class="en-hint hidden">${enText}</p>` : ''}
            `;
            
            div.addEventListener('click', (e) => {
                const enHint = div.querySelector('.en-hint');
                if (enHint) {
                    // Toggle visibility of English translation
                    enHint.classList.toggle('hidden');
                }
            });
            hintList.appendChild(div);
        });
    });

    // Initial Load
    generateText('new');

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
    async function setupItemQa(feedbackElement, contextData) {
        const qaContainer = feedbackElement.querySelector('.item-qa-container');
        const qaInput = feedbackElement.querySelector('.item-qa-input');
        const btnQaSend = feedbackElement.querySelector('.btn-item-qa-send');
        let itemQaHistory = [];

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
            itemQaHistory.push({ role: 'user', text: text });

            // Call API
            await sendItemQuestion(text, contextData, itemQaHistory, qaContainer);
        });
    }

    async function sendItemQuestion(text, contextData, history, container) {
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
            }

        } catch (error) {
            console.error(error);
            document.getElementById(loadingId).remove();
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

    async function getCorrection(userText, feedbackElement, history = [], isRetry = false) {
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
                    <span class="label">再挑戦:</span>
                    <span class="retry-user-text">${userText}</span>
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
                        is_retry: true
                    })
                });

                if (!response.ok) throw new Error('API Error');
                const data = await response.json();

                // Replace loading with actual result
                loadingItem.classList.remove('loading');
                loadingItem.innerHTML = `
                    <div class="retry-user-text-wrapper">
                        <span class="label">再挑戦:</span>
                        <span class="retry-user-text">${userText}</span>
                    </div>
                    <div class="retry-correction">${marked.parse(data.correction)}</div>
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

            if (userInputDisplay) {
                userInputDisplay.innerHTML = `<div class="text">${userText}</div>`;
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
                        is_retry: false
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
                setupItemQa(feedbackElement, {
                    situation: feedbackElement.closest('.practice-section') ? feedbackElement.closest('.conversation-item').querySelector('.japanese').textContent : currentContext,
                    user_input: userText,
                    correction: data.correction
                });

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

    async function generateText(type) {
        console.log('generateText called with type:', type);
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
                    situations: Array.from(document.querySelectorAll('.situation-tag.active')).map(t => t.dataset.category)
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

            const itemElement = addConversationItem(data);
            conversationHistory.push(data);
            currentContext = data.japanese; // Update context
            
            const sampleAnswers = data.sample_user_answers || (data.sample_user_japanese ? [data.sample_user_japanese] : []);
            currentSampleAnswers = sampleAnswers; // For hint button
            itemElement.dataset.sampleAnswers = JSON.stringify(sampleAnswers);

            // Move input to bottom
            moveInputToBottom();

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

    function moveInputToBottom() {
        container.appendChild(inputGroup);
        // Reset hint display
        hintDisplay.classList.add('hidden');
        hintList.innerHTML = '';
        userInput.value = '';
        userInput.style.height = 'auto';
        btnSend.disabled = true;

        // Scroll to input
        // inputGroup.scrollIntoView({ behavior: 'smooth' });
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
            // btnSave.classList.add('hidden'); // Show it even in review mode to allow un-saving
            if (data.history && data.history.length > 0) {
                btnHistory.classList.remove('hidden');
                renderHistory(data.history, historyContainer);
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
                hItem.className = 'history-item';
                
                const suggestionsContainer = document.createElement('ul');
                suggestionsContainer.className = 'history-suggestions';
                
                if (h.suggestions && h.suggestions.length > 0) {
                    h.suggestions.forEach(s => {
                        const sEl = createSuggestionElement(s, suggestionsContainer);
                        suggestionsContainer.appendChild(sEl);
                    });
                }

                hItem.innerHTML = `
                    <span class="history-user-text">${h.user_input}</span>
                    <div class="history-correction">${marked.parse(h.correction)}</div>
                `;
                if (h.suggestions && h.suggestions.length > 0) {
                    hItem.appendChild(suggestionsContainer);
                }
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
        };

        const toggleSave = () => {
            const index = reviews.findIndex(r => r.japanese === data.japanese);
            const isSaved = index !== -1;

            if (isSaved) {
                // Un-save
                reviews.splice(index, 1);
                localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
                updateAllSaveButtons(false);
            } else {
                // Save
                const reviewData = {
                    id: Date.now().toString(),
                    japanese: data.japanese,
                    english: data.english,
                    sample_user_answers: data.sample_user_answers,
                    history: []
                };

                const mainHistoryStr = group.dataset.retryHistory;
                const mainHistory = mainHistoryStr ? JSON.parse(mainHistoryStr) : [];
                
                reviewData.history = [
                    ...mainHistory,
                    ...(practiceRetryHistory || [])
                ];

                reviews.push(reviewData);
                localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
                updateAllSaveButtons(true);
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

            others.forEach(pair => {
                if (pair.s && pair.s !== section && !pair.s.classList.contains('hidden')) {
                    pair.b.classList.remove('active');
                    pair.s.classList.add('hiding');
                    setTimeout(() => {
                        pair.s.classList.add('hidden');
                        pair.s.classList.remove('hiding');
                    }, 300);
                }
            });

            if (isOpening) {
                section.classList.remove('hiding');
                section.classList.remove('hidden');
                btn.classList.add('active');
                if (inputToFocus) {
                    setTimeout(() => {
                        section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        inputToFocus.focus();
                    }, 50);
                } else {
                    setTimeout(() => {
                        section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 50);
                }
            } else {
                btn.classList.remove('active');
                section.classList.add('hiding');
                setTimeout(() => {
                    section.classList.add('hidden');
                    section.classList.remove('hiding');
                }, 300);
            }
        };

        if (btnPractice) {
            btnPractice.addEventListener('click', () => toggleSection(btnPractice, practiceSection, practiceInput));
        }

        let practiceRetryHistory = isReviewMode ? (data.history || []) : [];

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
            });
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
                    const dataCorr = await getCorrection(text, practiceFeedback, practiceRetryHistory, true);

                    if (dataCorr && dataCorr.correction) {
                        const newHistoryItem = {
                            user_input: text,
                            correction: dataCorr.correction,
                            suggestions: dataCorr.suggestions || []
                        };
                        practiceRetryHistory.push(newHistoryItem);
                        
                        // Update stored review if in review mode
                        if (isReviewMode) {
                            const reviewIdx = reviews.findIndex(r => r.japanese === data.japanese);
                            if (reviewIdx !== -1) {
                                reviews[reviewIdx].history = practiceRetryHistory;
                                localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
                                btnHistory.classList.remove('hidden');
                                renderHistory(practiceRetryHistory, historyContainer);
                            }
                        }
                    }
                    
                    practiceInput.value = '';
                } else {
                    // Initial correction
                    const dataCorr = await getCorrection(text, practiceFeedback, practiceRetryHistory, false);

                    // Add to history
                    if (dataCorr && dataCorr.correction) {
                        const newHistoryItem = {
                            user_input: text,
                            correction: dataCorr.correction,
                            suggestions: dataCorr.suggestions || []
                        };
                        practiceRetryHistory.push(newHistoryItem);

                        // Update stored review if in review mode
                        if (isReviewMode) {
                            const reviewIdx = reviews.findIndex(r => r.japanese === data.japanese);
                            if (reviewIdx !== -1) {
                                reviews[reviewIdx].history = practiceRetryHistory;
                                localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
                                btnHistory.classList.remove('hidden');
                                renderHistory(practiceRetryHistory, historyContainer);
                            }
                        }
                    }
                    
                    practiceInput.value = '';
                }

                practiceInput.disabled = false;
                btnPracticeSend.disabled = false;
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
                ${pointText ? `<p class="point"><span class="label">POINT</span> ${marked.parse(pointText).replace(/^<p>|<\/p>$/g, '')}</p>` : ''}
            </div>
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
        btnNew.disabled = isLoading;
        // btnContinue.disabled = isLoading; // Removed
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
});
