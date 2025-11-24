document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('conversation-container');
    const btnNew = document.getElementById('btn-new');
    // const btnContinue = document.getElementById('btn-continue'); // Removed
    const voiceSelect = document.getElementById('voice-select');
    const speedRange = document.getElementById('speed-range');
    const speedVal = document.getElementById('speed-val');
    const lengthRange = document.getElementById('length-range');
    const lengthVal = document.getElementById('length-val');
    const tmpl = document.getElementById('tmpl-conversation');
    const tmplLoading = document.getElementById('tmpl-loading');

    // Local Storage Keys
    const STORAGE_KEYS = {
        VOICE: 'english-training-voice',
        SPEED: 'english-training-speed',
        LENGTH: 'english-training-length'
    };

    // Load settings from localStorage
    function loadSettings() {
        const savedVoice = localStorage.getItem(STORAGE_KEYS.VOICE);
        const savedSpeed = localStorage.getItem(STORAGE_KEYS.SPEED);
        const savedLength = localStorage.getItem(STORAGE_KEYS.LENGTH);

        if (savedVoice) {
            voiceSelect.value = savedVoice;
        }
        if (savedSpeed) {
            speedRange.value = savedSpeed;
        }
        if (savedLength) {
            lengthRange.value = savedLength;
        }
    }

    // Save settings to localStorage
    function saveSettings() {
        localStorage.setItem(STORAGE_KEYS.VOICE, voiceSelect.value);
        localStorage.setItem(STORAGE_KEYS.SPEED, speedRange.value);
        localStorage.setItem(STORAGE_KEYS.LENGTH, lengthRange.value);
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
    const variationMenu = document.getElementById('variation-menu');
    let activeVariationData = null;
    let activeVariationItem = null;

    // Q&A Elements


    // Input Group Elements
    const inputGroup = document.getElementById('input-group');
    const hintDisplay = document.getElementById('hint-display');
    const hintText = hintDisplay.querySelector('.text');
    const userInput = document.getElementById('user-input');
    const btnHint = document.getElementById('btn-hint');
    const btnSend = document.getElementById('btn-send');

    let conversationHistory = [];

    let currentAudio = null;
    let currentAudioBtn = null;
    let isRepeating = false;
    let currentContext = ""; // Store the last Japanese prompt
    let currentSampleAnswer = ""; // Store the current sample answer

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
            await getCorrection(text, feedbackSection);

            // Auto-advance conversation
            await generateText('continue');
        }

        userInput.disabled = false;
        userInput.focus({ preventScroll: true });
    });

    btnHint.addEventListener('click', () => {
        hintDisplay.classList.remove('hidden');
        hintText.textContent = currentSampleAnswer;
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

    // Variation Menu Logic
    document.addEventListener('click', (e) => {
        if (!variationMenu.contains(e.target) && !e.target.closest('.btn-variation-menu')) {
            variationMenu.classList.add('hidden');
        }
    });

    variationMenu.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            if (activeVariationData && activeVariationItem) {
                if (activeVariationItem.classList.contains('suggestion-item')) {
                    generateSuggestionVariation(activeVariationData, activeVariationItem, type);
                } else {
                    generateVariation(activeVariationData, activeVariationItem, type);
                }
            }
            variationMenu.classList.add('hidden');
        });
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
                        history: history
                    },
                    text: text
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
        div.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    async function getCorrection(userText, feedbackElement) {
        const correctionP = feedbackElement.querySelector('.correction');
        const suggestionsList = feedbackElement.querySelector('.suggestions-list');

        try {
            const response = await fetch('api/correct_text.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_input: userText,
                    context: currentContext,
                    mode: 'conversation'
                })
            });

            if (!response.ok) throw new Error('API Error');
            const data = await response.json();

            // Render Feedback
            correctionP.textContent = data.correction;

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
                        audioInstance.play();
                    }
                }, 500);
            } else {
                iconPlay.classList.remove('hidden');
                iconPause.classList.add('hidden');
            }
        });

        currentAudio.play();
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
                    length: length
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
            currentSampleAnswer = data.sample_user_japanese || ""; // Update sample answer

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
        hintText.textContent = '';
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

        japanese.textContent = data.japanese;
        english.textContent = data.english;

        // Variation Menu Trigger
        btnVariationMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            activeVariationData = data;
            activeVariationItem = item;

            // Position menu
            const rect = btnVariationMenu.getBoundingClientRect();
            const menuWidth = 180; // Approximate width or measure it

            // Position below the button, right-aligned
            variationMenu.style.top = (rect.bottom + window.scrollY + 8) + 'px';
            variationMenu.style.left = (rect.right + window.scrollX - menuWidth) + 'px';

            variationMenu.classList.remove('hidden');
        });

        // Translation Toggle
        let translateTimeout;
        btnTranslate.addEventListener('click', () => {
            english.classList.toggle('hidden');
            if (!english.classList.contains('hidden')) {
                clearTimeout(translateTimeout);
                translateTimeout = setTimeout(() => {
                    english.classList.add('hidden');
                }, 60000); // Hide after 1 min
            }
        });

        // Practice Mode
        const btnPractice = clone.querySelector('.btn-practice');
        const practiceSection = clone.querySelector('.practice-section');
        const practiceInput = clone.querySelector('.practice-input');
        const btnPracticeSend = clone.querySelector('.btn-practice-send');
        const practiceFeedback = clone.querySelector('.feedback-content');

        if (btnPractice) {
            btnPractice.addEventListener('click', () => {
                practiceSection.classList.toggle('hidden');
                if (!practiceSection.classList.contains('hidden')) {
                    practiceInput.focus();
                }
            });

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

                // Call API
                try {
                    const response = await fetch('api/correct_text.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            user_input: text,
                            context: data.japanese, // Use the system message Japanese as context
                            mode: 'translation'
                        })
                    });

                    if (!response.ok) throw new Error('API Error');
                    const resData = await response.json();

                    // Render Feedback
                    const correctionP = practiceFeedback.querySelector('.correction');
                    const suggestionsList = practiceFeedback.querySelector('.suggestions-list');

                    correctionP.textContent = resData.correction;
                    suggestionsList.innerHTML = '';
                    resData.suggestions.forEach(suggestion => {
                        const li = createSuggestionElement(suggestion, suggestionsList);
                        suggestionsList.appendChild(li);
                    });

                    practiceFeedback.classList.remove('hidden');

                    // Initialize Q&A for this practice item
                    setupItemQa(practiceFeedback, {
                        situation: data.japanese, // Context is the system message
                        user_input: text,
                        correction: resData.correction
                    });

                } catch (error) {
                    console.error(error);
                    alert('添削の取得に失敗しました。');
                } finally {
                    practiceInput.disabled = false;
                    btnPracticeSend.disabled = false;
                }
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

                    const resData = await res.json();
                    audioUrl = resData.audio_url;

                    // Save current settings
                    lastVoice = currentVoice;
                    lastSpeed = currentSpeed;
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

            currentAudio.play();
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

    async function generateVariation(originalData, originalItemElement, type = 'variation') {
        // Show loading below the original item
        let loadingElement = null;
        if (tmplLoading) {
            const loadingClone = tmplLoading.content.cloneNode(true);
            // Get the element from the clone BEFORE insertion
            const loadingGroup = loadingClone.querySelector('.conversation-group');
            loadingElement = loadingGroup.querySelector('.conversation-item');

            const currentGroup = originalItemElement.closest('.conversation-group');
            currentGroup.parentNode.insertBefore(loadingClone, currentGroup.nextSibling);
        }

        try {
            const response = await fetch('api/generate_text.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: type,
                    context: {
                        japanese: originalData.japanese,
                        english: originalData.english
                    }
                })
            });

            if (!response.ok) throw new Error('API Error');
            const data = await response.json();

            // Remove loading
            if (loadingElement) {
                const loadingGroup = loadingElement.closest('.conversation-group');
                loadingGroup.remove();
            }

            // Add new item
            addConversationItem(data, originalItemElement.closest('.conversation-group'));

        } catch (error) {
            console.error(error);
            alert('バリエーション生成に失敗しました。');
            if (loadingElement) {
                const loadingGroup = loadingElement.closest('.conversation-group');
                loadingGroup.remove();
            }
        }
    }

    async function generateSuggestionVariation(originalData, originalItemElement, type) {
        // Show loading below the original item
        const loadingLi = document.createElement('li');
        loadingLi.className = 'suggestion-item loading-item';
        loadingLi.innerHTML = `
            <div class="suggestion-content" style="display:flex;justify-content:center;align-items:center;padding:20px;">
                <div class="loader"></div>
            </div>
        `;
        originalItemElement.parentNode.insertBefore(loadingLi, originalItemElement.nextSibling);

        try {
            const response = await fetch('api/generate_text.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: type,
                    context: {
                        japanese: originalData.japanese,
                        english: originalData.english
                    }
                })
            });

            if (!response.ok) throw new Error('API Error');
            const data = await response.json();

            // Remove loading
            loadingLi.remove();

            // Create new suggestion item
            // Map API response to suggestion format
            const suggestionData = {
                english: data.english,
                japanese: data.japanese,
                point: data.point
            };

            const newLi = createSuggestionElement(suggestionData, originalItemElement.parentNode);
            originalItemElement.parentNode.insertBefore(newLi, originalItemElement.nextSibling);

        } catch (error) {
            console.error(error);
            alert('バリエーション生成に失敗しました。');
            loadingLi.remove();
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
                ${pointText ? `<p class="point"><span class="label">POINT</span> ${pointText}</p>` : ''}
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
        `;

        // Add play event for suggestion
        const btnPlay = li.querySelector('.btn-play-suggestion');
        const btnRepeat = li.querySelector('.btn-repeat-suggestion');
        const btnVariation = li.querySelector('.btn-variation-menu');

        btnPlay.addEventListener('click', () => playSuggestionAudio(engText, btnPlay, btnRepeat));

        btnRepeat.addEventListener('click', () => {
            btnRepeat.classList.toggle('active');
        });

        btnVariation.addEventListener('click', (e) => {
            e.stopPropagation();
            activeVariationData = {
                japanese: jpText,
                english: engText
            };
            activeVariationItem = li;

            // Position menu
            const rect = btnVariation.getBoundingClientRect();
            const menuWidth = 180;

            // Position below the button, right-aligned
            variationMenu.style.top = (rect.bottom + window.scrollY + 8) + 'px';
            variationMenu.style.left = (rect.right + window.scrollX - menuWidth) + 'px';

            variationMenu.classList.remove('hidden');
        });

        return li;
    }

    function setLoading(isLoading) {
        btnNew.disabled = isLoading;
        // btnContinue.disabled = isLoading; // Removed
    }
});
