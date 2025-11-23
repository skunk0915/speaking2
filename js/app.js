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

    // New UI Elements
    const btnSettings = document.getElementById('btn-settings');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const settingsPanel = document.getElementById('settings-panel');
    const settingsOverlay = document.getElementById('settings-overlay');

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
        userInput.focus();
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
                    context: currentContext
                })
            });

            if (!response.ok) throw new Error('API Error');
            const data = await response.json();

            // Render Feedback
            correctionP.textContent = data.correction;

            suggestionsList.innerHTML = '';
            data.suggestions.forEach(suggestion => {
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
                    </div>
                `;

                // Add play event for suggestion
                const btnPlay = li.querySelector('.btn-play-suggestion');
                const btnRepeat = li.querySelector('.btn-repeat-suggestion');

                btnPlay.addEventListener('click', () => playSuggestionAudio(engText, btnPlay, btnRepeat));

                btnRepeat.addEventListener('click', () => {
                    btnRepeat.classList.toggle('active');
                    // If currently playing this audio, update loop status
                    if (currentAudio && currentAudioBtn === btnPlay) {
                        currentAudio.loop = btnRepeat.classList.contains('active');
                    }
                });

                suggestionsList.appendChild(li);
            });

            // Initialize Q&A for this item
            setupItemQa(feedbackElement, {
                situation: currentContext,
                user_input: userText,
                correction: data.correction
            });

            feedbackElement.classList.remove('hidden');
            feedbackElement.scrollIntoView({ behavior: 'smooth', block: 'end' });

        } catch (error) {
            console.error(error);
            alert('添削の取得に失敗しました。');
        }
    }

    async function playSuggestionAudio(text, btn, btnRepeat) {
        const iconPlay = btn.querySelector('.icon-play');
        const iconPause = btn.querySelector('.icon-pause');
        const loader = btn.querySelector('.loader');

        // Toggle logic if already playing
        if (currentAudio && currentAudioBtn === btn) {
            if (currentAudio.paused) {
                currentAudio.play();
            } else {
                currentAudio.pause();
            }
            return;
        }

        stopAudio(); // Stop other audio

        try {
            // Use current settings
            const speed = speedRange.value;
            const voice = voiceSelect.value;

            // Visual feedback
            iconPlay.classList.add('hidden');
            loader.classList.remove('hidden');

            const res = await fetch('api/generate_speech.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    voice: voice,
                    speed: speed
                })
            });

            const resData = await res.json();
            const audioUrl = resData.audio_url;

            const audio = new Audio(audioUrl);

            // Set initial loop state based on repeat button
            audio.loop = btnRepeat.classList.contains('active');

            audio.addEventListener('ended', () => {
                if (!audio.loop) {
                    iconPlay.classList.remove('hidden');
                    iconPause.classList.add('hidden');
                }
            });

            audio.addEventListener('play', () => {
                iconPlay.classList.add('hidden');
                iconPause.classList.remove('hidden');
                loader.classList.add('hidden');
            });

            audio.addEventListener('pause', () => {
                iconPlay.classList.remove('hidden');
                iconPause.classList.add('hidden');
            });

            currentAudio = audio;
            currentAudioBtn = btn;

            audio.play();

        } catch (e) {
            console.error(e);
            alert('音声再生に失敗しました');
            iconPlay.classList.remove('hidden');
            loader.classList.add('hidden');
        }
    }

    async function generateText(type) {
        console.log('generateText called with type:', type);
        setLoading(true);
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
        inputGroup.scrollIntoView({ behavior: 'smooth' });
    }

    function addConversationItem(data) {
        const clone = tmpl.content.cloneNode(true);
        const item = clone.querySelector('.conversation-item');
        const japanese = clone.querySelector('.japanese');
        const english = clone.querySelector('.english');
        const btnTranslate = clone.querySelector('.btn-translate');
        const btnSpeak = clone.querySelector('.btn-speak');
        const btnRepeat = clone.querySelector('.btn-repeat');
        const btnRegenerate = clone.querySelector('.btn-regenerate');

        japanese.textContent = data.japanese;
        english.textContent = data.english;

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

        // Speech
        let audioUrl = null;

        const playAudio = async (forceRegenerate = false) => {
            const iconPlay = btnSpeak.querySelector('.icon-play');
            const iconPause = btnSpeak.querySelector('.icon-pause');
            const loader = btnSpeak.querySelector('.loader');

            if (currentAudio && currentAudio.src.includes(audioUrl) && !currentAudio.paused && !forceRegenerate) {
                currentAudio.pause();
                return;
            }

            stopAudio(); // Stop other audio

            if (!audioUrl || forceRegenerate) {
                // Generate Speech
                iconPlay.classList.add('hidden');
                loader.classList.remove('hidden');

                try {
                    const speed = speedRange.value;
                    const voice = voiceSelect.value;

                    const res = await fetch('api/generate_speech.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            text: data.english,
                            voice: voice,
                            speed: speed
                        })
                    });

                    const resData = await res.json();
                    audioUrl = resData.audio_url;
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

            currentAudio.addEventListener('ended', () => {
                if (isRepeating && btnRepeat.classList.contains('active')) {
                    currentAudio.currentTime = 0;
                    currentAudio.play();
                } else {
                    iconPlay.classList.remove('hidden');
                    iconPause.classList.add('hidden');
                }
            });

            currentAudio.play();
        };

        btnSpeak.addEventListener('click', () => playAudio(false));

        btnRegenerate.addEventListener('click', () => {
            if (confirm('現在の設定（声・速度）で音声を再生成しますか？')) {
                playAudio(true);
            }
        });

        btnRepeat.addEventListener('click', () => {
            btnRepeat.classList.toggle('active');
            isRepeating = btnRepeat.classList.contains('active');
        });

        container.appendChild(clone); // Append the whole fragment (group)

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

    function setLoading(isLoading) {
        btnNew.disabled = isLoading;
        // btnContinue.disabled = isLoading; // Removed
    }
});
