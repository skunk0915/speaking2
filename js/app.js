document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('conversation-container');
    const btnNew = document.getElementById('btn-new');
    const btnContinue = document.getElementById('btn-continue');
    const voiceSelect = document.getElementById('voice-select');
    const speedRange = document.getElementById('speed-range');
    const speedVal = document.getElementById('speed-val');
    const lengthRange = document.getElementById('length-range');
    const lengthVal = document.getElementById('length-val');
    const tmpl = document.getElementById('tmpl-conversation');

    let conversationHistory = [];
    let currentAudio = null;
    let currentAudioBtn = null;
    let isRepeating = false;

    // Settings
    speedRange.addEventListener('input', (e) => speedVal.textContent = e.target.value);
    lengthRange.addEventListener('input', (e) => lengthVal.textContent = e.target.value);

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

    btnContinue.addEventListener('click', () => generateText('continue'));

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
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                throw new Error('API Error: ' + response.status + ' ' + response.statusText);
            }

            const data = await response.json();

            if (!data || typeof data !== 'object') {
                throw new Error('Invalid data format');
            }

            if (!data.japanese) {
                console.error('Missing japanese text', data);
                data.japanese = "（テキスト生成エラー）";
            }
            if (!data.english) {
                console.error('Missing english text', data);
                data.english = "Error: No text generated";
            }

            addConversationItem(data);
            conversationHistory.push(data);

        } catch (error) {
            console.error(error);
            alert('文章の生成に失敗しました。');
        } finally {
            setLoading(false);
        }
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
            // If this audio is playing, update global repeat state
            if (currentAudio && currentAudioBtn === btnSpeak) {
                // state is already updated
            } else {
                // If other audio is playing, turn off its repeat? 
                // Requirement: "Other audio played -> stop". 
                // Requirement: "Repeat on/off button next to play button".
                // Logic: Each item has a repeat button. If active, THAT item repeats.
                // Since we only play one audio at a time, we just check the active button's repeat state on 'ended'.
            }
        });

        container.appendChild(item);

        // Auto-scroll
        item.scrollIntoView({ behavior: 'smooth' });

        // Auto-play speech immediately after text generation?
        // Requirement: "音声は生成後、ただちに再生する" -> This implies when "Speak" is clicked?
        // Or when text is generated? 
        // User request: "発話ボタンを押すとその英語の音声読み上げがされる" -> So manual trigger.
        // Wait, "音声は生成後、ただちに再生する" might mean "After clicking generate speech (which happens when clicking play?), play it immediately".
        // Yes, that's what playAudio does.
    }

    function stopAudio() {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
        if (currentAudioBtn) {
            const iconPlay = currentAudioBtn.querySelector('.icon-play');
            const iconPause = currentAudioBtn.querySelector('.icon-pause');
            iconPlay.classList.remove('hidden');
            iconPause.classList.add('hidden');
            currentAudioBtn = null;
        }
    }

    function setLoading(isLoading) {
        btnNew.disabled = isLoading;
        btnContinue.disabled = isLoading;
        if (isLoading) {
            btnContinue.textContent = '生成中...';
        } else {
            btnContinue.textContent = '会話を続ける';
        }
    }
});
