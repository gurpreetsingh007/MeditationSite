'use strict';

// Utility: format seconds to MM:SS
function fmt(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${m}:${ss}`;
}

// Smooth scroll for same-page anchors
function enableSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', (e) => {
            const targetId = a.getAttribute('href');
            if (targetId.length > 1) {
                const el = document.querySelector(targetId);
                if (el) {
                    e.preventDefault();
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });
}

// Modal management
function modalController() {
    const openButtons = document.querySelectorAll('[data-open-modal]');
    const closeSelectors = ['[data-close-modal]', '[data-close]'];
    const body = document.body;
    let activeModal = null;
    let lastFocused = null;

    function openModal(selector) {
        const modal = document.querySelector(selector);
        if (!modal) return;
        lastFocused = document.activeElement;
        modal.hidden = false;
        activeModal = modal;
        body.style.overflow = 'hidden';
        const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) firstFocusable.focus();
    }

    function closeModal() {
        if (!activeModal) return;
        activeModal.hidden = true;
        body.style.overflow = '';
        if (lastFocused) lastFocused.focus();
        activeModal = null;
    }

    openButtons.forEach(b => {
        b.addEventListener('click', () => {
            const selector = b.getAttribute('data-open-modal');
            const tech = b.getAttribute('data-tech');
            openModal(selector);
            if (tech) {
                const flavor = document.getElementById('flavor');
                if (flavor) { flavor.value = tech; localStorage.setItem('ss.flavor', tech); }
            }
        });
    });
    closeSelectors.forEach(sel => {
        document.addEventListener('click', (e) => {
            const t = e.target;
            if (t.matches(sel)) closeModal();
        });
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && activeModal) {
            e.preventDefault();
            closeModal();
        }
    });

    return { openModal, closeModal, get active() { return activeModal; } };
}

// Breathing practice controller
function practiceController() {
    const tempoSel = document.getElementById('tempo');
    const durSel = document.getElementById('duration');
    const flavorSel = document.getElementById('flavor');

    const circle = document.getElementById('breathCircle');
    const cue = document.getElementById('cueText');
    const timeLeftEl = document.getElementById('timeLeft');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let total = 60;       // seconds
    let tempo = 4;        // seconds per phase
    let phaseIdx = 0;     // 0 inhale, 1 hold, 2 exhale, 3 hold
    let phaseTimeLeft = tempo;
    let timeLeft = total;
    let running = false;
    let interval = null;

    const phases = [
        { key: 'inhale', label: 'Inhale', scale: 1.28 },
        { key: 'hold1', label: 'Hold', scale: 1.28 },
        { key: 'exhale', label: 'Exhale', scale: 1.00 },
        { key: 'hold2', label: 'Hold', scale: 1.00 },
    ];

    function applyTransitionDuration(sec) {
        if (prefersReduced) {
            circle.style.transition = 'none';
        } else {
            circle.style.transition = `transform ${sec}s ease-in-out`;
        }
    }

    function setPhase(p) {
        const ph = phases[p];
        cue.textContent = ph.label;
        applyTransitionDuration(tempo);
        circle.style.transform = `scale(${ph.scale})`;
    }

    function updateTime() {
        timeLeftEl.textContent = fmt(timeLeft);
    }

    function tick() {
        if (!running) return;

        // Handle phase change
        if (phaseTimeLeft <= 0) {
            phaseIdx = (phaseIdx + 1) % phases.length;
            phaseTimeLeft = tempo;
            setPhase(phaseIdx);
        }

        // End when timeLeft is 0
        if (timeLeft <= 0) {
            stop();
            cue.textContent = 'Complete';
            circle.style.transform = 'scale(1)';
            return;
        }

        phaseTimeLeft -= 1;
        timeLeft -= 1;
        updateTime();
    }

    function start() {
        if (running) return;
        running = true;
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        resetBtn.disabled = false;
        // Initialize phase animation
        setPhase(phaseIdx);
        updateTime();
        interval = setInterval(tick, 1000);
    }

    function pause() {
        if (!running) return;
        running = false;
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        clearInterval(interval);
    }

    function stop() {
        running = false;
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        clearInterval(interval);
    }

    function reset() {
        stop();
        tempo = parseInt(tempoSel.value, 10) || 4;
        total = parseInt(durSel.value, 10) || 60;
        timeLeft = total;
        phaseIdx = 0;
        phaseTimeLeft = tempo;
        circle.style.transform = 'scale(1)';
        cue.textContent = 'Ready';
        updateTime();
    }

    // Wire controls
    startBtn?.addEventListener('click', start);
    pauseBtn?.addEventListener('click', pause);
    resetBtn?.addEventListener('click', reset);
    tempoSel?.addEventListener('change', () => {
        tempo = parseInt(tempoSel.value, 10) || 4;
        phaseTimeLeft = tempo; // apply next cycle smoothly
    });
    durSel?.addEventListener('change', () => {
        total = parseInt(durSel.value, 10) || 60;
        timeLeft = Math.min(timeLeft, total);
        updateTime();
    });

    // Flavor persistence
    const savedFlavor = localStorage.getItem('ss.flavor');
    if (savedFlavor && flavorSel) {
        flavorSel.value = savedFlavor;
    }
    flavorSel?.addEventListener('change', () => {
        localStorage.setItem('ss.flavor', flavorSel.value);
    });

    // Initialize
    reset();

    return { start, pause, reset };
}

// Footer year
function setYear() {
    const y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
}

// Main init
window.addEventListener('DOMContentLoaded', () => {
    setYear();
    enableSmoothScroll();
    const modal = modalController();
    const practice = practiceController();
    // Initialize video practice handling for course weeks
    videoPracticeController();

    // Allow keyboard Enter on cards to toggle details
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const det = card.querySelector('details');
                if (det) det.open = !det.open;
            }
        });
    });

    // Focus trap inside modal (lightweight)
    document.addEventListener('keydown', (e) => {
        const m = modal.active;
        if (!m) return;
        if (e.key !== 'Tab') return;
        const focusables = m.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault(); first.focus();
        }
    });
});

// Video practice setup for course weeks
function videoPracticeController() {
    const videoModal = document.getElementById('videoModal');
    if (!videoModal) return;
    const videoEl = document.getElementById('practiceVideo');
    const sourceEl = document.getElementById('practiceVideoSource');
    const fallbackEl = document.getElementById('videoFallback');
    const titleEl = document.getElementById('vp-title');

    const map = {
        breath: 'breath-awareness.mp4',
        bodyscan: 'body-scan.mp4',
        visualization: 'visualization.mp4',
        lovingkindness: 'loving-kindness.mp4',
        mindfulness: 'mindfulness-thoughts.mp4',
        walking: 'walking.mp4'
    };

    function labelFor(tech) {
        const L = {
            breath: 'Breath Awareness',
            bodyscan: 'Body Scan',
            visualization: 'Guided Visualization',
            lovingkindness: 'Loving‑Kindness',
            mindfulness: 'Mindfulness of Thoughts & Emotions',
            walking: 'Walking Meditation'
        };
        return L[tech] || 'Practice Preview';
    }

    function openFor(btn) {
        const card = btn.closest('.week');
        const week = card?.getAttribute('data-week') || '';
        const tech = btn.getAttribute('data-tech') || '';
        const file = map[tech] || `week-${week}.mp4`;
        const src = `./assets/videos/${file}`;

        fallbackEl.hidden = true;
        titleEl.textContent = `${labelFor(tech)} — 10s`;
        sourceEl.src = src;
        videoEl.load();
        // Auto play when data is ready
        const onLoaded = () => { videoEl.play().catch(() => { /* ignore */ }); };
        videoEl.addEventListener('loadeddata', onLoaded, { once: true });
        videoEl.onerror = () => { fallbackEl.hidden = false; };
    }

    // Wire course buttons
    document.querySelectorAll('[data-open-modal="#videoModal"]').forEach(btn => {
        btn.addEventListener('click', () => openFor(btn));
    });

    // Pause when closed
    videoModal.querySelectorAll('[data-close-modal]').forEach(el => {
        el.addEventListener('click', () => { videoEl.pause(); });
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !videoModal.hidden) { videoEl.pause(); }
    });
}
