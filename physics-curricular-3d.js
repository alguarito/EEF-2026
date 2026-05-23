// ==========================================================================
// 3D QUANTUM PARTICLE VORTEX SIMULATOR (Three.js WebGL)
// Especialización en la Enseñanza de la Física - UTP
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('curricular-canvas-container');
    const modulesSection = document.getElementById('curricular');
    const sessionCards = document.querySelectorAll('.session-card');
    if (!container || !modulesSection || sessionCards.length === 0) return;

    // --- Scene, Camera, Renderer Setup ---
    const scene = new THREE.Scene();
    
    // Perspective Camera focusing on the curriculum board plane
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 15);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // --- Quantum Particle Field Setup ---
    const particleCount = 2500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const initialState = []; // Track resting position & velocities

    const colorScheme = [
        new THREE.Color(0x33B5E5), // Cian
        new THREE.Color(0x003D6D), // Blue
        new THREE.Color(0xA855F7), // Purple
        new THREE.Color(0x10B981)  // Green
    ];

    for (let i = 0; i < particleCount; i++) {
        // Distribute particles in a loose, wavy horizontal particle nebula
        const x = (Math.random() - 0.5) * 40;
        const y = (Math.random() - 0.5) * 20;
        const z = (Math.random() - 0.5) * 6;

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        // Assign a random quantum color from UTP palette
        const randColor = colorScheme[Math.floor(Math.random() * colorScheme.length)];
        colors[i * 3] = randColor.r;
        colors[i * 3 + 1] = randColor.g;
        colors[i * 3 + 2] = randColor.b;

        // Store custom velocity & rest state
        initialState.push({
            restX: x,
            restY: y,
            restZ: z,
            vx: 0,
            vy: 0,
            vz: 0,
            angle: Math.random() * Math.PI * 2,
            speed: 0.05 + Math.random() * 0.05
        });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Glow circle points texture
    const pointsMaterial = new THREE.PointsMaterial({
        size: 0.12,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        depthWrite: false
    });

    const particleSystem = new THREE.Points(geometry, pointsMaterial);
    scene.add(particleSystem);

    // --- Interactive Attraction Physics Setup ---
    let attractorTarget3D = new THREE.Vector3(0, 0, -999); // Offscreen initially
    let lerpedAttractor3D = new THREE.Vector3(0, 0, -999);
    let isAttracting = false;
    let activeCardIndex = -1;

    // Map DOM 2D coordinate space of a hovered card into WebGL 3D space
    function mapCardTo3D(cardElement) {
        if (!cardElement) return;

        const cardRect = cardElement.getBoundingClientRect();
        const canvasRect = container.getBoundingClientRect();

        // Find center pixel of the card relative to canvas
        const pixelX = (cardRect.left + cardRect.width / 2) - canvasRect.left;
        const pixelY = (cardRect.top + cardRect.height / 2) - canvasRect.top;

        // Convert pixel center coordinates to normalized device coordinates (NDC) (-1 to +1)
        const ndcX = (pixelX / canvasRect.width) * 2 - 1;
        const ndcY = -(pixelY / canvasRect.height) * 2 + 1;

        // Project back from screen space into 3D world space at z = 0
        const tempVector = new THREE.Vector3(ndcX, ndcY, 0.5);
        tempVector.unproject(camera);
        
        // Calculate projection vector on the XY plane (where our particles live)
        const dir = tempVector.sub(camera.position).normalize();
        const distance = -camera.position.z / dir.z;
        attractorTarget3D.copy(camera.position).add(dir.multiplyScalar(distance));
        
        // Set slightly behind the card plane in 3D
        attractorTarget3D.z = -1.5;
    }

    // Attach hover listeners to all session cards
    sessionCards.forEach((card, idx) => {
        card.addEventListener('mouseenter', () => {
            isAttracting = true;
            activeCardIndex = idx;
            mapCardTo3D(card);
            
            // If it was previously offscreen, snap it close first
            if (lerpedAttractor3D.z < -100) {
                lerpedAttractor3D.copy(attractorTarget3D);
            }
        });

        card.addEventListener('mousemove', () => {
            if (activeCardIndex === idx) {
                mapCardTo3D(card);
            }
        });
    });

    // Reset attractor on section leave
    modulesSection.addEventListener('mouseleave', () => {
        isAttracting = false;
        activeCardIndex = -1;
        attractorTarget3D.set(0, 0, -999); // push attractor away
    });

    // --- Performance Optimization: Viewport Frustum Visibility Check ---
    let isCurricularInViewport = true;
    let isHeroInViewport = true;

    const observerOptions = { root: null, threshold: 0.05 };
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.target.id === 'curricular') {
                isCurricularInViewport = entry.isIntersecting;
            } else if (entry.target.id === 'hero-section') {
                isHeroInViewport = entry.isIntersecting;
            }
        });
    }, observerOptions);

    sectionObserver.observe(modulesSection);
    const heroSec = document.getElementById('hero-section');
    if (heroSec) sectionObserver.observe(heroSec);

    // --- Clock & Animation Loop (60fps) ---
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);

        // performance check: stop loops if not visible in screen view
        if (!isCurricularInViewport) return;

        const time = clock.getElapsedTime();
        const positionsAttr = geometry.attributes.position;

        // 1. Smoothly interpolate attractor position (inertia lag)
        if (isAttracting) {
            lerpedAttractor3D.lerp(attractorTarget3D, 0.1);
        } else {
            lerpedAttractor3D.lerp(attractorTarget3D, 0.06);
        }

        // Attraction / physics parameters
        const pullRadius = 5.0; // Distance of vortex influence
        const baseSpeed = 0.02;

        for (let i = 0; i < particleCount; i++) {
            let px = positionsAttr.getX(i);
            let py = positionsAttr.getY(i);
            let pz = positionsAttr.getZ(i);
            
            const state = initialState[i];

            // Wavy background quantum noise (relaxing wave state)
            const waveX = Math.sin(state.angle + time * state.speed) * 0.02;
            const waveY = Math.cos(state.angle * 0.7 + time * state.speed) * 0.02;

            if (isAttracting && lerpedAttractor3D.z > -100) {
                // Calculate vector to the active card attractor
                const dx = lerpedAttractor3D.x - px;
                const dy = lerpedAttractor3D.y - py;
                const dz = lerpedAttractor3D.z - pz;
                const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

                if (dist < pullRadius) {
                    // Particle is within the magnetic field pull radius!
                    // 1. Attraction Force (pull towards center of card)
                    const pullForce = (1.0 - dist / pullRadius) * 0.06;
                    state.vx += (dx / dist) * pullForce;
                    state.vy += (dy / dist) * pullForce;
                    state.vz += (dz / dist) * pullForce;

                    // 2. Orbital Swirl Force (Lorentz-like vortex force around attractor)
                    // Perpendicular orbital vector: (-dy, dx)
                    const swirlStrength = (1.0 - dist / pullRadius) * 0.08;
                    state.vx += (-dy / dist) * swirlStrength;
                    state.vy += (dx / dist) * swirlStrength;
                    state.vz += (Math.sin(time + i) * 0.01); // minor spiral depth oscillation
                } else {
                    // Outside attraction range: slowly return to initial resting position
                    const restDx = state.restX - px;
                    const restDy = state.restY - py;
                    const restDz = state.restZ - pz;
                    
                    state.vx += restDx * 0.02;
                    state.vy += restDy * 0.02;
                    state.vz += restDz * 0.02;
                }
            } else {
                // No hover target active: return fully to baseline resting position
                const restDx = state.restX - px;
                const restDy = state.restY - py;
                const restDz = state.restZ - pz;
                
                state.vx += restDx * 0.04;
                state.vy += restDy * 0.04;
                state.vz += restDz * 0.04;
            }

            // Apply friction/drag to prevent particles from escaping orbit (Lorentz drag)
            state.vx *= 0.88;
            state.vy *= 0.88;
            state.vz *= 0.88;

            // Update particle coordinate (rest waves + velocity)
            px += state.vx + waveX;
            py += state.vy + waveY;
            pz += state.vz;

            positionsAttr.setXYZ(i, px, py, pz);
        }

        // Notify Three.js to re-upload vertices to GPU
        positionsAttr.needsUpdate = true;

        renderer.render(scene, camera);
    }

    animate();

    // --- Responsive Resize Handler ---
    function handleResize() {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }

    window.addEventListener('resize', handleResize);

    // Re-check card layouts on window resize or scroll to map coordinates perfectly
    window.addEventListener('resize', () => {
        if (activeCardIndex !== -1 && sessionCards[activeCardIndex]) {
            mapCardTo3D(sessionCards[activeCardIndex]);
        }
    });
});
