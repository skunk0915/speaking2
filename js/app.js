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
        ENGLISH_LEVEL: 'english-training-english-level'
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
    }

    // Save settings to localStorage
    function saveSettings() {
        localStorage.setItem(STORAGE_KEYS.VOICE, voiceSelect.value);
        localStorage.setItem(STORAGE_KEYS.SPEED, speedRange.value);
        localStorage.setItem(STORAGE_KEYS.LENGTH, lengthRange.value);
        if (aiStyleSelect) localStorage.setItem(STORAGE_KEYS.AI_STYLE, aiStyleSelect.value);
        if (englishLevelSelect) localStorage.setItem(STORAGE_KEYS.ENGLISH_LEVEL, englishLevelSelect.value);
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

    let conversationHistory = [];

    let currentAudio = null;
    let currentAudioBtn = null;
    let isRepeating = false;
    let currentContext = ""; // Store the last Japanese prompt
    let currentSampleAnswers = []; // Store current sample answers

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

            await getCorrection(text, feedbackSection, retryHistory);

            // Update retry history with the latest result
            const correctionText = feedbackSection.querySelector('.correction').textContent;
            retryHistory.push({ user_input: text, correction: correctionText });
            lastGroup.dataset.retryHistory = JSON.stringify(retryHistory);

            // Auto-advance conversation
            await generateText('continue');
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

    async function getCorrection(userText, feedbackElement, history = []) {
        const correctionP = feedbackElement.querySelector('.correction');
        const suggestionsList = feedbackElement.querySelector('.suggestions-list');
        const qaSection = feedbackElement.querySelector('.item-qa-section');

        // Show loading state
        feedbackElement.classList.remove('hidden');
        correctionP.innerHTML = '<div class="loader" style="display:inline-block; vertical-align:middle; margin-right:8px; width:16px; height:16px; border-width:2px;"></div><span>添削中...</span>';
        suggestionsList.innerHTML = '';
        if (qaSection) qaSection.classList.add('hidden');
        const retrySection = feedbackElement.querySelector('.retry-section');
        if (retrySection) retrySection.classList.add('hidden');

        try {
            const response = await fetch('api/correct_text.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_input: userText,
                    context: currentContext,
                    mode: 'conversation',
                    ai_style: aiStyleSelect ? aiStyleSelect.value : 'polite',
                    retry_history: history
                })
            });

            if (!response.ok) throw new Error('API Error');
            const data = await response.json();

            // Render Feedback
            correctionP.innerHTML = marked.parse(data.correction);

            suggestionsList.innerHTML = '';
            suggestionsList.innerHTML = '';
            data.suggestions.forEach(suggestion => {
                const li = createSuggestionElement(suggestion, suggestionsList);
                suggestionsList.appendChild(li);
            });

            // Initialize Q&A for this item
            setupItemQa(feedbackElement, {
                situation: currentContext,
                user_input: userText,
                correction: data.correction
            });

            if (qaSection) qaSection.classList.remove('hidden');
            if (retrySection) retrySection.classList.remove('hidden');
            feedbackElement.classList.remove('hidden');

        } catch (error) {
            console.error(error);
            alert('添削の取得に失敗しました。');
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
                    ai_style: aiStyleSelect ? aiStyleSelect.value : 'polite'
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

            addConversationItem(data);
            conversationHistory.push(data);
            currentContext = data.japanese; // Update context
            currentSampleAnswers = data.sample_user_answers || (data.sample_user_japanese ? [data.sample_user_japanese] : []); // Update sample answers

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

    function addConversationItem(data, insertAfterGroup = null) {
        const clone = tmpl.content.cloneNode(true);
        const item = clone.querySelector('.conversation-item');
        const japanese = clone.querySelector('.japanese');
        const english = clone.querySelector('.english');
        const btnTranslate = clone.querySelector('.btn-translate');
        const btnSpeak = clone.querySelector('.btn-speak');
        const btnRepeat = clone.querySelector('.btn-repeat');
        const btnVariationMenu = clone.querySelector('.btn-variation-menu');
        const btnPractice = clone.querySelector('.btn-practice');
        const btnQa = clone.querySelector('.btn-qa');
        
        const practiceSection = clone.querySelector('.practice-section');
        const variationSection = clone.querySelector('.variation-section');
        const mainQa = clone.querySelector('.main-qa');
        
        const practiceInput = clone.querySelector('.practice-input');
        const btnPracticeSend = clone.querySelector('.btn-practice-send');
        const practiceFeedback = clone.querySelector('.feedback-content');

        japanese.textContent = data.japanese;
        english.textContent = data.english;

        // Interaction Toggles (Practice, Variation, QA)
        const toggleSection = (btn, section, inputToFocus = null) => {
            if (!section) return;
            const isOpening = section.classList.contains('hidden');
            
            // Close others in the same item
            const others = [
                { b: btnPractice, s: practiceSection },
                { b: btnVariationMenu, s: variationSection },
                { b: btnQa, s: mainQa }
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
                situation: currentContext
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
                                mainQa;
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
            let practiceRetryHistory = [];

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

                // Show loading
                const correctionP = practiceFeedback.querySelector('.correction');
                const suggestionsList = practiceFeedback.querySelector('.suggestions-list');
                const qaSection = practiceFeedback.querySelector('.item-qa-section');
                
                practiceFeedback.classList.remove('hidden');
                correctionP.innerHTML = '<div class="loader" style="display:inline-block; vertical-align:middle; margin-right:8px; width:16px; height:16px; border-width:2px;"></div><span>添削中...</span>';
                suggestionsList.innerHTML = '';
                if (qaSection) qaSection.classList.add('hidden');
                const retrySection = practiceFeedback.querySelector('.retry-section');
                if (retrySection) retrySection.classList.add('hidden');

                // Call API
                try {
                    const response = await fetch('api/correct_text.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            user_input: text,
                            context: data.japanese, // Use the system message Japanese as context
                            mode: 'translation',
                            ai_style: aiStyleSelect ? aiStyleSelect.value : 'polite',
                            retry_history: practiceRetryHistory
                        })
                    });

                    if (!response.ok) throw new Error('API Error');
                    const resData = await response.json();

                    // Render Feedback
                    correctionP.innerHTML = marked.parse(resData.correction);
                    suggestionsList.innerHTML = '';
                    resData.suggestions.forEach(suggestion => {
                        const li = createSuggestionElement(suggestion, suggestionsList);
                        suggestionsList.appendChild(li);
                    });

                    // Add to history
                    practiceRetryHistory.push({
                        user_input: text,
                        correction: resData.correction
                    });

                    practiceFeedback.classList.remove('hidden');

                    // Initialize Q&A for this practice item
                    setupItemQa(practiceFeedback, {
                        situation: data.japanese, // Context is the system message
                        user_input: text,
                        correction: resData.correction
                    });

                    if (qaSection) qaSection.classList.remove('hidden');
                    if (retrySection) retrySection.classList.remove('hidden');
                    practiceFeedback.classList.remove('hidden');

                } catch (error) {
                    console.error(error);
                    alert('添削の取得に失敗しました。');
                } finally {
                    practiceInput.disabled = false;
                    btnPracticeSend.disabled = false;
                }
            });

            // Retry Button Logic
            const btnRetryList = item.querySelectorAll('.btn-retry');
            btnRetryList.forEach(btnRetry => {
                btnRetry.addEventListener('click', () => {
                    const feedback = btnRetry.closest('.feedback-content') || btnRetry.closest('.feedback-section');
                    const isPractice = feedback.classList.contains('feedback-content') && practiceSection.contains(feedback);
                    
                    if (isPractice) {
                        practiceInput.value = '';
                        practiceInput.disabled = false;
                        practiceInput.style.height = 'auto';
                        btnPracticeSend.disabled = true;
                        feedback.classList.add('hidden');
                        practiceInput.focus();
                    } else {
                        // Main conversation retry
                        userInput.value = '';
                        userInput.disabled = false;
                        userInput.style.height = 'auto';
                        btnSend.disabled = true;
                        feedback.classList.add('hidden');
                        userInput.focus();
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
            container.appendChild(clone);
        }

        // Note: We don't scroll here because moveInputToBottom will handle scrolling
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

        // Show result container
        resultContainer.classList.remove('hidden');

        // Add loading item
        const loadingItem = document.createElement('div');
        loadingItem.className = 'variation-result-item loading';
        loadingItem.innerHTML = `<div class="loader" style="margin: 0 auto; width: 20px; height: 20px; border-width: 2px;"></div>`;
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

            // Render Variation Item
            const variationItem = document.createElement('div');
            variationItem.className = 'variation-result-item';
            
            let label = 'Variation';
            if (type === 'formal') label = 'Formal';
            if (type === 'casual') label = 'Casual';
            if (type === 'simple') label = 'Simple';

            variationItem.innerHTML = `
                <div class="variation-result-header">
                    <span class="variation-result-type">${label}</span>
                    <button class="btn-variation-play" title="再生">
                        <svg class="icon-play" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        <svg class="icon-pause hidden" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        <div class="loader hidden" style="width:12px; height:12px; border-width: 2px;"></div>
                    </button>
                </div>
                <div class="variation-result-text">
                    <p class="variation-result-eng">${data.english}</p>
                    <p class="variation-result-jp">${data.japanese}</p>
                </div>
            `;

            const btnPlay = variationItem.querySelector('.btn-variation-play');
            btnPlay.addEventListener('click', () => {
                playSuggestionAudio(data.english, btnPlay); // Reusing suggestion audio logic (simple play)
            });

            resultContainer.appendChild(variationItem);
            variationItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        } catch (error) {
            console.error(error);
            loadingItem.innerHTML = '<p style="font-size:12px; color:red; text-align:center;">Failed to generate.</p>';
            setTimeout(() => loadingItem.remove(), 2000);
        }
    }

    async function generateSuggestionVariation(originalData, originalItemElement, type) {
        const resultContainer = originalItemElement.querySelector('.variation-result-container');
        if (!resultContainer) return;

        resultContainer.classList.remove('hidden');
        const loadingItem = document.createElement('div');
        loadingItem.className = 'variation-result-item';
        loadingItem.innerHTML = `<div class="loader" style="margin: 0 auto; width: 16px; height: 16px; border-width: 2px;"></div>`;
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
            variationItem.style.padding = '8px';
            variationItem.style.marginTop = '8px';

            let label = 'Variation';
            if (type === 'formal') label = 'Formal';
            if (type === 'casual') label = 'Casual';
            if (type === 'simple') label = 'Simple';

            variationItem.innerHTML = `
                <div class="variation-result-header">
                    <span class="variation-result-type" style="font-size:9px;">${label}</span>
                    <button class="btn-variation-play" style="width:24px; height:24px;" title="再生">
                        <svg class="icon-play" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        <svg class="icon-pause hidden" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        <div class="loader hidden" style="width:10px; height:10px; border-width: 2px;"></div>
                    </button>
                </div>
                <div class="variation-result-text">
                    <p class="variation-result-eng" style="font-size:13px;">${data.english}</p>
                    <p class="variation-result-jp" style="font-size:11px;">${data.japanese}</p>
                </div>
            `;

            const btnPlay = variationItem.querySelector('.btn-variation-play');
            btnPlay.addEventListener('click', () => {
                playSuggestionAudio(data.english, btnPlay);
            });

            resultContainer.appendChild(variationItem);

        } catch (error) {
            console.error(error);
            loadingItem.innerHTML = '<p style="font-size:10px; color:red;">Error</p>';
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
                    <div class="loader hidden" style="width:16px;height:16px;border-width:2px;"></div>
                </button>
                <button class="btn-repeat-suggestion" title="リピート再生">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                </button>
                <button class="btn-variation-menu" title="バリエーション生成">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>
                </button>
            </div>
            <div class="variation-section hidden" style="width:100%; margin-top:12px; border-top:1px solid rgba(255,255,255,0.1); padding-top:12px;">
                <h3 style="font-size:12px; margin-bottom:8px;">バリエーション</h3>
                <div class="variation-options">
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
                <div class="variation-result-container hidden" style="margin-top:12px;"></div>
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
});
