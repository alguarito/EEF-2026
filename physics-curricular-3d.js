// ==========================================================================
// 3D CURRICULAR TOPOLOGY MESH SIMULATOR (Three.js WebGL)
// Especialización en la Enseñanza de la Física - UTP
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('curricular-canvas-container');
    const modulesSection = document.getElementById('curricular');
    const sessionCards = document.querySelectorAll('.session-card');
    if (!container || !modulesSection || sessionCards.length === 0) return;

    // --- Scene, Camera, Renderer Setup ---
    const scene = new THREE.Scene();
    
    // Perspective Camera tilted slightly for depth perception
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, -8, 12);
    camera.lookAt(0, 1.5, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // --- Geometry & Materials (Topological Mesh + Node Points) ---
    // Fine-tuned grid segments for high performance and sharp details
    const segmentsX = 40;
    const segmentsY = 30;
    const gridWidth = 38;
    const gridHeight = 28;
    const geometry = new THREE.PlaneGeometry(gridWidth, gridHeight, segmentsX, segmentsY);

    // Clean cyan wireframe material for sci-fi scientific holographic grid
    const meshMaterial = new THREE.MeshBasicMaterial({
        color: 0x33B5E5, // Cian EEF / UTP
        wireframe: true,
        transparent: true,
        opacity: 0.14,
        depthWrite: false
    });
    const gridMesh = new THREE.Mesh(geometry, meshMaterial);
    scene.add(gridMesh);

    // Glowing blue node points (matching the first segment) at each grid intersection
    const pointsMaterial = new THREE.PointsMaterial({
        color: 0x003D6D, // Azul UTP (matching the first block)
        size: 0.08,
        transparent: true,
        opacity: 0.5,
        depthWrite: false
    });
    const gridPoints = new THREE.Points(geometry, pointsMaterial);
    scene.add(gridPoints);

    // --- Interactive Coordinates & Physics Setup ---
    const targetMouse3D = new THREE.Vector3(999, 999, 0); // Offscreen initially
    const lerpedMouse3D = new THREE.Vector3(999, 999, 0);
    let isHovered = false;
    let activeCardIndex = -1;

    // Relative mouse vectors for subtle section parallax tilt
    let targetRotationX = -0.5; // baseline tilt
    let targetRotationY = 0.0;
    let currentRotationX = -0.5;
    let currentRotationY = 0.0;

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

        // Project from screen space into 3D world space at z = 0
        const tempVector = new THREE.Vector3(ndcX, ndcY, 0.5);
        tempVector.unproject(camera);
        
        // Intersect projection ray with the Z = 0 plane where the mesh lives
        const dir = tempVector.sub(camera.position).normalize();
        const distance = -camera.position.z / dir.z;
        targetMouse3D.copy(camera.position).add(dir.multiplyScalar(distance));
        
        // Offset slightly forward in 3D for visible elevation peak
        targetMouse3D.z = 0;
    }

    // Attach hover listeners to all session cards
    sessionCards.forEach((card, idx) => {
        card.addEventListener('mouseenter', () => {
            isHovered = true;
            activeCardIndex = idx;
            mapCardTo3D(card);
            
            // If it was previously offscreen, snap it close first to avoid massive jumps
            if (lerpedMouse3D.x > 900) {
                lerpedMouse3D.copy(targetMouse3D);
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
        isHovered = false;
        activeCardIndex = -1;
        targetMouse3D.set(999, 999, 0); // push offscreen
        targetRotationX = -0.5; // reset tilt
        targetRotationY = 0.0;
    });

    // Capture mouse movements over the section for camera/grid parallax tilting
    modulesSection.addEventListener('mousemove', (event) => {
        const rect = modulesSection.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        
        targetRotationX = -0.5 - py * 0.12;
        targetRotationY = px * 0.12;
    });

    // --- Performance Optimization: Viewport Visibility Check ---
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

        // Performance check: stop render loop when not visible in screen view
        if (!isCurricularInViewport) return;

        const time = clock.getElapsedTime();

        // 1. Smoothly interpolate topological peak target coordinate (inertia weight)
        lerpedMouse3D.lerp(targetMouse3D, 0.08);

        // 2. Smoothly interpolate grid tilting (parallax)
        currentRotationX += (targetRotationX - currentRotationX) * 0.05;
        currentRotationY += (targetRotationY - currentRotationY) * 0.05;
        
        gridMesh.rotation.x = currentRotationX;
        gridMesh.rotation.z = currentRotationY;
        gridPoints.rotation.x = currentRotationX;
        gridPoints.rotation.z = currentRotationY;

        // 3. Deform grid geometry vertices (harmonic waves + elevating milestone peaks)
        const positionAttribute = geometry.attributes.position;
        const peakHeight = 2.0; // Height of the upward relief mountain
        const peakRange = 5.2;  // Radius of the hill elevation

        for (let i = 0; i < positionAttribute.count; i++) {
            const x = positionAttribute.getX(i);
            const y = positionAttribute.getY(i);

            // A: Gentle scientific harmonic waves (topological terrain breathing)
            const wave1 = Math.sin(x * 0.25 - time * 0.7) * Math.cos(y * 0.25 - time * 0.7) * 0.22;
            const wave2 = Math.cos(Math.sqrt(x*x + y*y) * 0.15 - time * 1.0) * 0.12;
            const baseZ = wave1 + wave2;

            // B: Uplifting milestone peak (Einstein inverted gravity well/relief hill)
            let peakZ = 0;
            if (isHovered && lerpedMouse3D.x < 900) {
                const distToMouse = Math.sqrt((x - lerpedMouse3D.x)**2 + (y - lerpedMouse3D.y)**2);
                if (distToMouse < peakRange) {
                    const t = distToMouse / peakRange;
                    // Smooth bell-curve mountain deformation: Height * (1 - t^2)^2
                    peakZ = peakHeight * Math.pow(1.0 - t*t, 2);
                }
            }

            // Apply total deformation on Z axis
            positionAttribute.setZ(i, baseZ + peakZ);
        }

        // Notify Three.js that vertices have mutated to re-upload to GPU
        positionAttribute.needsUpdate = true;

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

    // Re-check card layouts on window resize to map coordinates perfectly
    window.addEventListener('resize', () => {
        if (activeCardIndex !== -1 && sessionCards[activeCardIndex]) {
            mapCardTo3D(sessionCards[activeCardIndex]);
        }
    });
});
