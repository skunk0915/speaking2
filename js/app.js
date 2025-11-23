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
    settingsOverlay.addEventListener('click', () => toggleSettings(false));

    // Settings Inputs
    speedRange.addEventListener('input', (e) => speedVal.textContent = e.target.value);
    lengthRange.addEventListener('input', (e) => lengthVal.textContent = e.target.value);

    // Slider Progress Coloring
    const rangeInputs = document.querySelectorAll('input[type="range"]');

    function updateSlider(range) {
        const min = parseFloat(range.min) || 0;
        const max = parseFloat(range.max) || 100;
        const val = parseFloat(range.value);
        const percentage = (val - min) * 100 / (max - min);
        range.style.setProperty('--value', percentage + '%');
    }

    rangeInputs.forEach(range => {
        updateSlider(range);
        range.addEventListener('input', () => updateSlider(range));
    });

    // Initial Load
    generateText('new');

    // Button Events
    btnNew.addEventListener('click', () => {
        if (confirm('新しい会話を始めますか？今の会話は消えます。')) {
            container.innerHTML = '';
            conversationHistory = [];
            stopAudio();
            generateText('new');
        }
    });

    // User Input Logic
    userInput.addEventListener('input', () => {
        btnSend.disabled = userInput.value.trim() === '';
        // Auto-resize textarea
        userInput.style.height = 'auto';
        userInput.style.height = userInput.scrollHeight + 'px';
    });

    // Hint Button Logic
    btnHint.addEventListener('click', () => {
        if (currentSampleAnswer) {
            hintText.textContent = currentSampleAnswer;
            hintDisplay.classList.toggle('hidden');
        }
    });

    btnSend.addEventListener('click', async () => {
        const text = userInput.value.trim();
        if (!text) return;

        // Add user message to UI
        const lastItem = container.lastElementChild;
        // If input group is appended, the last element might be input group.
        // We need to find the last conversation item.
        // Actually, we should insert the user message BEFORE the input group.

        // Create User Message Bubble
        const userMsgDiv = document.createElement('div');
        userMsgDiv.className = 'user-message';
        userMsgDiv.innerHTML = `<p class="user-text">${text}</p>`;

        // Insert before input group
        container.insertBefore(userMsgDiv, inputGroup);

        // Scroll to show message
        userMsgDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });

        userInput.value = '';
        userInput.style.height = 'auto';
        btnSend.disabled = true;
        hintDisplay.classList.add('hidden'); // Hide hint after sending

        // Call Correction API
        // We need to pass the element where feedback should be appended.
        // Let's create a feedback container and insert it after user message.
        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'feedback-section hidden';
        feedbackDiv.innerHTML = `
            <div class="feedback-content">
                <h3>添削</h3>
                <p class="correction"></p>
                <h3>提案</h3>
                <ul class="suggestions-list"></ul>
            </div>
        `;
        container.insertBefore(feedbackDiv, inputGroup);

        await getCorrection(text, feedbackDiv);
    });

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
                li.innerHTML = `
                    <span>${suggestion}</span>
                    <button class="btn-play-suggestion" title="再生">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    </button>
                `;

                // Add play event for suggestion
                const btnPlay = li.querySelector('.btn-play-suggestion');
                btnPlay.addEventListener('click', () => playSuggestionAudio(suggestion, btnPlay));

                suggestionsList.appendChild(li);
            });

            feedbackElement.classList.remove('hidden');
            feedbackElement.scrollIntoView({ behavior: 'smooth', block: 'end' });

        } catch (error) {
            console.error(error);
            alert('添削の取得に失敗しました。');
        }
    }

    async function playSuggestionAudio(text, btn) {
        try {
            // Use current settings
            const speed = speedRange.value;
            const voice = voiceSelect.value;

            // Visual feedback
            const originalIcon = btn.innerHTML;
            btn.innerHTML = '<div class="loader" style="width:16px;height:16px;border-width:2px;"></div>';

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

            // Handle Repeat
            // We need to check the global repeat state. 
            // But the repeat button is per conversation item. 
            // The requirement says "reflect controller settings (Repeat ON/OFF)".
            // Let's assume there's a global repeat setting or we check the last active repeat button?
            // Actually, the user said "回答例も会話英文と同様の機能（リピートON/OFF...）を備える".
            // Since suggestions are separate, maybe we should just respect the loop if the user wants?
            // For now, let's just play once. If we want repeat, we'd need a UI toggle for it on the suggestion or global.
            // But wait, the previous code had `isRepeating` toggled by `btnRepeat` on the conversation item.
            // Let's use a global `isRepeating` flag if we want, but `btnRepeat` is specific to that item.
            // Let's just play it once for now, as adding repeat to suggestions might clutter UI unless requested.
            // Wait, user said "リピートON/OFF...を備える". 
            // Maybe we can check if ANY repeat button is active? Or just add a repeat toggle to suggestions?
            // Let's keep it simple: Play once. If user wants repeat, they click again. 
            // Or if we want to support repeat, we need to know if "Repeat Mode" is on.
            // Let's check if the LAST conversation item's repeat button is active.
            const lastItem = container.querySelector('.conversation-item:last-of-type');
            if (lastItem) {
                const btnRepeat = lastItem.querySelector('.btn-repeat');
                if (btnRepeat && btnRepeat.classList.contains('active')) {
                    audio.loop = true;
                }
            }

            audio.addEventListener('ended', () => {
                if (!audio.loop) {
                    btn.innerHTML = originalIcon;
                }
            });

            // If looping, we need a way to stop. Clicking again?
            // For now, simple play.

            audio.play();

            audio.addEventListener('play', () => {
                btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
            });

            audio.addEventListener('pause', () => {
                btn.innerHTML = originalIcon;
            });

            // Allow stopping by clicking again?
            // The current implementation creates a new Audio each time.
            // To support toggle stop, we need to track current suggestion audio.
            if (currentAudio) {
                currentAudio.pause();
            }
            currentAudio = audio;
            currentAudioBtn = btn;

        } catch (e) {
            console.error(e);
            alert('音声再生に失敗しました');
            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
        }
    }

    async function generateText(type) {
        setLoading(true);
        try {
            const length = lengthRange.value;
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
                throw new Error('API Error: ' + response.status);
            }

            const data = await response.json();

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
            console.error(error);
            alert('文章の生成に失敗しました。');
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
