document.addEventListener('DOMContentLoaded', () => {
    const timerDisplay = document.getElementById('timer');
    const startPauseBtn = document.getElementById('startPauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const sessionInfo = document.getElementById('sessionInfo');
    const statsDisplay = document.getElementById('stats');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const controls = document.querySelectorAll('.controls .btn');

    // Default durations
    const DEFAULT_WORK_DURATION = 25 * 60;
    const DEFAULT_BREAK_DURATION = 5 * 60;
    const DEFAULT_LONG_BREAK_DURATION = 15 * 60;

    // Load state from localStorage or use defaults
    let workDuration = parseInt(localStorage.getItem('workDuration')) || DEFAULT_WORK_DURATION;
    let breakDuration = parseInt(localStorage.getItem('breakDuration')) || DEFAULT_BREAK_DURATION;
    let longBreakDuration = parseInt(localStorage.getItem('longBreakDuration')) || DEFAULT_LONG_BREAK_DURATION;
    let timeLeft = parseInt(localStorage.getItem('timeLeft')) || workDuration;
    let isRunning = localStorage.getItem('isRunning') === 'true';
    let isWorkSession = localStorage.getItem('isWorkSession') !== 'false'; // default to true
    let sessionCount = parseInt(localStorage.getItem('sessionCount')) || 1;
    let totalWorkTime = parseInt(localStorage.getItem('totalWorkTime')) || 0;
    let sessionIndicator = parseInt(localStorage.getItem('sessionIndicator')) || 1;
    
    let timerInterval = null;

    const notificationSound = new Audio('notification.mp3');
    notificationSound.volume = 0.5;

    // Save state to localStorage
    function saveState() {
        localStorage.setItem('workDuration', workDuration);
        localStorage.setItem('breakDuration', breakDuration);
        localStorage.setItem('longBreakDuration', longBreakDuration);
        localStorage.setItem('timeLeft', timeLeft);
        localStorage.setItem('isRunning', isRunning);
        localStorage.setItem('isWorkSession', isWorkSession);
        localStorage.setItem('sessionCount', sessionCount);
        localStorage.setItem('totalWorkTime', totalWorkTime);
        localStorage.setItem('sessionIndicator', sessionIndicator);
    }

    function setStartButtonIcon(isPlaying) {
        startPauseBtn.innerHTML = isPlaying
            ? `<i class="fas fa-pause me-2"></i>Pause`
            : `<i class="fas fa-play me-2"></i>Start`;
    }

    function updateDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        if (isWorkSession) {
            sessionInfo.textContent = `Work Session ${sessionCount} (${sessionIndicator}/4)`;
            document.body.classList.remove('break-mode');
            controls.forEach(btn => {
                btn.classList.remove('break-button');
                btn.classList.add('work-button');
            });
            statsDisplay.textContent = '';
        } else {
            const isLongBreak = sessionIndicator === 4;
            sessionInfo.textContent = isLongBreak ? 'Long Break Time' : 'Short Break Time';
            document.body.classList.add('break-mode');
            controls.forEach(btn => {
                btn.classList.remove('work-button');
                btn.classList.add('break-button');
            });

            const hours = Math.floor(totalWorkTime / 3600);
            const mins = Math.floor((totalWorkTime % 3600) / 60);
            statsDisplay.textContent = `Total work time: ${hours > 0 ? hours + 'h ' : ''}${mins}m`;
        }
        
        // Save display state
        saveState();
    }

    function playNotificationWithVibration() {
        try {
            notificationSound.play().catch(e => console.log('Audio play failed:', e));
            if ('vibrate' in navigator) {
                navigator.vibrate([500, 300, 500]);
            }
        } catch (e) {
            console.log('Notification failed:', e);
        }
    }

    function playNotification() {
        try {
            notificationSound.play().catch(e => console.log('Audio play failed:', e));
        } catch (e) {
            console.log('Notification failed:', e);
        }
    }

    function switchSession() {
        playNotificationWithVibration();

        if (isWorkSession) {
            // Work session ended, start break
            isWorkSession = false;
            // Check if this is the 4th session (long break)
            timeLeft = (sessionIndicator === 4) ? longBreakDuration : breakDuration;
            totalWorkTime += workDuration;
        } else {
            // Break ended, start work session
            isWorkSession = true;
            timeLeft = workDuration;
            sessionCount++;
            
            // Update session indicator (reset after 4)
            sessionIndicator = sessionIndicator === 4 ? 1 : sessionIndicator + 1;
        }

        updateDisplay();

        if (isRunning) {
            startTimer();
        }
    }

    function startTimer() {
        clearInterval(timerInterval);
        isRunning = true;
        setStartButtonIcon(true);
        saveState();

        timerInterval = setInterval(() => {
            timeLeft--;
            updateDisplay();

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                switchSession();
            }
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timerInterval);
        isRunning = false;
        setStartButtonIcon(false);
        saveState();
    }

    function resetTimer() {
        stopTimer();
        isWorkSession = true;
        sessionCount = 1;
        totalWorkTime = 0;
        sessionIndicator = 1; // Reset session indicator (1/4, 2/4, etc.)
        timeLeft = workDuration;
        updateDisplay();
        // Clear only the necessary state
        localStorage.removeItem('timeLeft');
        localStorage.removeItem('isRunning');
        localStorage.removeItem('isWorkSession');
        localStorage.removeItem('sessionIndicator');
    }

    function toggleTimer() {
        if (isRunning) {
            stopTimer();
        } else {
            playNotification();
            startTimer();
        }
    }

    startPauseBtn.addEventListener('click', toggleTimer);
    resetBtn.addEventListener('click', resetTimer);

    fullscreenBtn.addEventListener('click', () => {
        const elem = document.documentElement;
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    });

    // Initialize the display based on loaded state
    setStartButtonIcon(isRunning);
    updateDisplay();

    // If timer was running when page was closed, restart it
    if (isRunning) {
        startTimer();
    }

    // Save state before page unload
    window.addEventListener('beforeunload', saveState);
});