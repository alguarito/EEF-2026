document.addEventListener('DOMContentLoaded', () => {
    const mobileMenu = document.getElementById('mobile-menu');
    const navLinks = document.getElementById('nav-list');
    const header = document.querySelector('header');

    // Toggle Mobile Menu
    mobileMenu.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        mobileMenu.querySelector('i').classList.toggle('fa-bars');
        mobileMenu.querySelector('i').classList.toggle('fa-times');
    });

    // Close menu when clicking a link
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            if (!link.parentElement.classList.contains('dropdown')) {
                navLinks.classList.remove('active');
                mobileMenu.querySelector('i').classList.add('fa-bars');
                mobileMenu.querySelector('i').classList.remove('fa-times');
            }
        });
    });

    // Scrolled Header Effect - TOGGLE CLASS FOR PREMIUM CSS TRANSITION
    window.addEventListener('scroll', () => {
        if (window.scrollY > 30) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Mobile Dropdown Toggle
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
        dropdown.addEventListener('click', (e) => {
            if (window.innerWidth <= 992) {
                e.stopPropagation();
                dropdown.classList.toggle('active');
            }
        });
    });

    // Back to top button functionality
    const scrollTopBtn = document.getElementById('scroll-top-btn');
    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // ==========================================================================
    // VIRTUAL LAB CONSOLE LOGIC (QUANTUM LAB & WAVE INTERFERENCE)
    // ==========================================================================
    const labTabBtns = document.querySelectorAll('.lab-tab-btn');
    const simBohr = document.getElementById('sim-bohr');
    const simWaves = document.getElementById('sim-waves');
    const controlsBohr = document.getElementById('controls-bohr');
    const controlsWaves = document.getElementById('controls-waves');
    const telemetryText = document.getElementById('lab-telemetry-text');

    let waveAnimationActive = false;

    // Tabs switching
    if (labTabBtns.length > 0) {
        labTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                labTabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const target = btn.getAttribute('data-target');
                if (target === 'bohr') {
                    simBohr.classList.add('active');
                    simWaves.classList.remove('active');
                    controlsBohr.classList.add('active');
                    controlsWaves.classList.remove('active');
                    waveAnimationActive = false;
                    updateBohrTelemetry();
                } else if (target === 'waves') {
                    simBohr.classList.remove('active');
                    simWaves.classList.add('active');
                    controlsBohr.classList.remove('active');
                    controlsWaves.classList.add('active');
                    waveAnimationActive = true;
                    initWaveLab();
                }
            });
        });
    }

    // --- BOHR INTERACTIVE ATOM SIMULATION ---
    const orbits = document.querySelectorAll('.orbit-interactive');
    const electron = document.getElementById('electron-active');
    const electronWrapper = document.getElementById('electron-wrapper-id');
    const nucleus = document.getElementById('nucleus-active');
    const btnExcite = document.getElementById('btn-excite');
    const btnEmit = document.getElementById('btn-emit');
    const sliderBohrSpeed = document.getElementById('slider-bohr-speed');
    const valBohrSpeed = document.getElementById('val-bohr-speed');
    const photonWave = document.getElementById('photon-wave');

    let currentOrbit = 1;

    function updateBohrTelemetry() {
        if (!telemetryText) return;
        if (currentOrbit === 1) {
            telemetryText.textContent = "Bohr: Fundamental (n=1) • E = -13.6 eV";
        } else if (currentOrbit === 2) {
            telemetryText.textContent = "Bohr: Excitado 1 (n=2) • E = -3.4 eV";
        } else if (currentOrbit === 3) {
            telemetryText.textContent = "Bohr: Excitado 2 (n=3) • E = -1.5 eV";
        }
    }

    function setOrbit(orbitNum) {
        if (!electron) return;
        
        // Remove active class from all orbits
        orbits.forEach(orb => orb.classList.remove('active-orbit'));
        
        // Find and highlight orbit circle
        const activeOrb = document.querySelector(`.orbit-i${orbitNum}`);
        if (activeOrb) activeOrb.classList.add('active-orbit');

        // Transition electron radius
        electron.className = `electron-interactive level-${orbitNum}`;
        currentOrbit = orbitNum;
        updateBohrTelemetry();
    }

    if (orbits.length > 0) {
        orbits.forEach(orb => {
            orb.addEventListener('click', () => {
                const num = parseInt(orb.getAttribute('data-orbit'));
                // If dropping energy level, emit photon!
                if (num < currentOrbit) {
                    triggerPhotonEmission();
                }
                setOrbit(num);
            });
        });
    }

    if (btnExcite) {
        btnExcite.addEventListener('click', () => {
            setOrbit(3);
        });
    }

    if (btnEmit) {
        btnEmit.addEventListener('click', () => {
            if (currentOrbit > 1) {
                triggerPhotonEmission();
                setOrbit(1);
            }
        });
    }

    function triggerPhotonEmission() {
        if (!photonWave || !nucleus) return;
        
        // Flash nucleus
        nucleus.classList.remove('flash');
        void nucleus.offsetWidth; // Trigger reflow
        nucleus.classList.add('flash');

        // Shoot photon SVG wave package
        photonWave.classList.remove('emit-active');
        void photonWave.offsetWidth; // Trigger reflow
        photonWave.classList.add('emit-active');
    }

    if (sliderBohrSpeed && valBohrSpeed && electronWrapper) {
        sliderBohrSpeed.addEventListener('input', () => {
            const val = parseFloat(sliderBohrSpeed.value);
            valBohrSpeed.textContent = `${(val/2 + 0.25).toFixed(2)}x`;
            // CSS spin duration: higher speed = shorter spin duration
            const duration = (8 / val).toFixed(1);
            electronWrapper.style.animationDuration = `${duration}s`;
        });
    }

    // --- REAL-TIME WAVE SUPERPOSITION LABORATORY ---
    const canvas = document.getElementById('wave-canvas');
    const sliderFreq = document.getElementById('slider-freq');
    const sliderPhase = document.getElementById('slider-phase');
    const valFreq = document.getElementById('val-freq');
    const valPhase = document.getElementById('val-phase');

    let ctx = null;
    let waveTime = 0;

    function initWaveLab() {
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        
        // Match canvas dimensions to client size for retina display crispness
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Run animation frame loop
        requestAnimationFrame(animateWaves);
    }

    function resizeCanvas() {
        if (!canvas) return;
        const rect = canvas.parentNode.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    }

    function animateWaves() {
        if (!waveAnimationActive || !ctx || !canvas) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const width = canvas.width;
        const height = canvas.height;
        const centerY = height / 2;

        // Read sliders
        const freq = sliderFreq ? parseFloat(sliderFreq.value) : 2.0;
        const phaseDeg = sliderPhase ? parseFloat(sliderPhase.value) : 0;
        const phaseRad = (phaseDeg * Math.PI) / 180;

        if (valFreq) valFreq.textContent = `${freq.toFixed(1)} Hz`;
        if (valPhase) valPhase.textContent = `${phaseDeg}°`;

        // Update telemetry diagnostic based on phase
        if (telemetryText) {
            const diff = Math.min(Math.abs(phaseDeg - 180), Math.abs(phaseDeg - 540));
            if (phaseDeg === 0 || phaseDeg === 360) {
                telemetryText.textContent = "Ondas: Interferencia Constructiva (Máxima)";
            } else if (diff < 15) {
                telemetryText.textContent = "Ondas: Interferencia Destructiva (Cancelación)";
            } else {
                telemetryText.textContent = `Ondas: Fase Δφ = ${phaseDeg}° • Superposición`;
            }
        }

        // Draw center baseline axis
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        const amplitude = 30; // Max visual amplitude of individual wave
        const k = 0.05; // Wavenumber
        const speed = 0.15; // Animation time step

        // Render Wave 1 (Red line)
        ctx.beginPath();
        ctx.strokeStyle = '#ef4444'; // Red
        ctx.lineWidth = 1.5;
        for (let x = 0; x < width; x++) {
            const y = centerY + amplitude * Math.sin(k * x - waveTime * freq);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Render Wave 2 (Blue line)
        ctx.beginPath();
        ctx.strokeStyle = '#3b82f6'; // Blue
        ctx.lineWidth = 1.5;
        for (let x = 0; x < width; x++) {
            const y = centerY + amplitude * Math.sin(k * x - waveTime * freq + phaseRad);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Render Wave 3 (Bold Green, Superposition Wave!)
        ctx.beginPath();
        ctx.strokeStyle = '#10b981'; // Green
        ctx.lineWidth = 3.5;
        ctx.shadowColor = 'rgba(16, 185, 129, 0.4)';
        ctx.shadowBlur = 10;
        for (let x = 0; x < width; x++) {
            const y1 = amplitude * Math.sin(k * x - waveTime * freq);
            const y2 = amplitude * Math.sin(k * x - waveTime * freq + phaseRad);
            const ySuper = centerY + y1 + y2;
            if (x === 0) ctx.moveTo(x, ySuper);
            else ctx.lineTo(x, ySuper);
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset shadows

        // Increment time coordinate
        waveTime += speed;

        // Loop animation
        requestAnimationFrame(animateWaves);
    }
});
