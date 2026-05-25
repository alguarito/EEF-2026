// ==========================================================================
// 3D CRYSTALLINE BLOCKS SIMULATOR (Three.js WebGL)
// Especialización en la Enseñanza de la Física - UTP
// Sesión 2: Ecosistemas Inteligentes y Arquitectura Web (El Aula Ubicua)
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('session2-canvas-container');
    const mainSection = document.querySelector('main');
    const interactiveElements = document.querySelectorAll('.card, .insight-card, .btn-primary, .btn-secondary, .btn-watch, .media-wrapper, .checklist-box, h2, h1');
    if (!container || !mainSection) return;

    // --- Scene, Camera, Renderer Setup ---
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 15);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // --- Geometric Crystalline Modules Setup ---
    const crystalCount = 8;
    const crystals = [];
    const restPositions = [];
    const velocities = [];

    // Distinct geometric polyhedra representing units of information
    const geometries = [
        new THREE.IcosahedronGeometry(0.85, 0),
        new THREE.OctahedronGeometry(0.95, 0),
        new THREE.TetrahedronGeometry(1.05, 0),
        new THREE.BoxGeometry(0.8, 0.8, 0.8)
    ];

    // Glassmorphic materials
    const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0x003D6D, // Azul UTP
        transparent: true,
        opacity: 0.14,
        depthWrite: false
    });

    const shellMaterial = new THREE.MeshBasicMaterial({
        color: 0x33B5E5, // Cian UTP
        wireframe: true,
        transparent: true,
        opacity: 0.42,
        depthWrite: false
    });

    const crystalGroup = new THREE.Group();
    scene.add(crystalGroup);

    for (let i = 0; i < crystalCount; i++) {
        const geo = geometries[i % geometries.length];

        // Construct dual-layer holographic crystal
        const core = new THREE.Mesh(geo, coreMaterial);
        const shell = new THREE.Mesh(geo, shellMaterial);

        const group = new THREE.Group();
        group.add(core);
        group.add(shell);

        // Distribute in a beautiful floating volume
        const x = (Math.random() - 0.5) * 26;
        const y = (Math.random() - 0.5) * 16;
        const z = (Math.random() - 0.5) * 4;

        group.position.set(x, y, z);
        crystalGroup.add(group);

        crystals.push({
            mesh: group,
            restX: x,
            restY: y,
            restZ: z,
            vx: 0,
            vy: 0,
            vz: 0,
            rotSpeedX: (Math.random() - 0.5) * 0.012,
            rotSpeedY: (Math.random() - 0.5) * 0.012,
            rotSpeedZ: (Math.random() - 0.5) * 0.012
        });
    }

    // --- Vertical Binding Ray (Structural Laser Axis) ---
    const lineGeo = new THREE.BufferGeometry();
    const lineVerts = new Float32Array([0, -18, -2, 0, 18, -2]); // Spans vertical viewport
    lineGeo.setAttribute('position', new THREE.BufferAttribute(lineVerts, 3));
    const lineMat = new THREE.LineBasicMaterial({
        color: 0x33B5E5, // Cian
        transparent: true,
        opacity: 0.0, // Initially invisible
        depthWrite: false
    });
    const bindingRay = new THREE.Line(lineGeo, lineMat);
    scene.add(bindingRay);

    // --- Interactive Attraction & Physics Setup ---
    let attractorTarget3D = new THREE.Vector3(0, 0, -999);
    let lerpedAttractor3D = new THREE.Vector3(0, 0, -999);
    let isHovered = false;
    let activeCardIndex = -1;

    // Relative mouse vectors for subtle section parallax tilt
    let targetRotationX = 0;
    let targetRotationY = 0;
    let currentRotationX = 0;
    let currentRotationY = 0;

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
        
        // Calculate projection vector on the XY plane (where our crystals live)
        const dir = tempVector.sub(camera.position).normalize();
        const distance = -camera.position.z / dir.z;
        attractorTarget3D.copy(camera.position).add(dir.multiplyScalar(distance));
        
        // Set target depth slightly behind cards
        attractorTarget3D.z = -2.0;
    }

    // Attach hover listeners to all interactive elements
    interactiveElements.forEach((card, idx) => {
        card.addEventListener('mouseenter', () => {
            isHovered = true;
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
    mainSection.addEventListener('mouseleave', () => {
        isHovered = false;
        activeCardIndex = -1;
        attractorTarget3D.set(0, 0, -999); // push attractor away
    });

    // Capture mouse movements over the section for camera/scene parallax tilting
    document.addEventListener('mousemove', (event) => {
        const px = event.clientX / window.innerWidth - 0.5;
        const py = event.clientY / window.innerHeight - 0.5;
        
        targetRotationX = py * 0.15;
        targetRotationY = px * 0.15;
    });

    // --- Performance Optimization: Viewport Visibility Check ---
    let isVisible = true;
    const observerOptions = { root: null, threshold: 0.05 };
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            isVisible = entry.isIntersecting;
        });
    }, observerOptions);
    sectionObserver.observe(mainSection);

    // --- Clock & Animation Loop (60fps) ---
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);

        // Performance check: stop render loop when not visible in screen view
        if (!isVisible) return;

        const time = clock.getElapsedTime();

        // 1. Smoothly interpolate attractor position (inertia lag)
        if (isHovered) {
            lerpedAttractor3D.lerp(attractorTarget3D, 0.08);
        } else {
            lerpedAttractor3D.lerp(attractorTarget3D, 0.05);
        }

        // 2. Smoothly interpolate scene tilting (parallax)
        currentRotationX += (targetRotationX - currentRotationX) * 0.05;
        currentRotationY += (targetRotationY - currentRotationY) * 0.05;
        
        crystalGroup.rotation.x = currentRotationX;
        crystalGroup.rotation.y = currentRotationY;
        bindingRay.rotation.x = currentRotationX;
        bindingRay.rotation.y = currentRotationY;

        // 3. Animate the vertical binding laser ray (blueprint axis)
        if (isHovered && lerpedAttractor3D.z > -100) {
            bindingRay.position.x = lerpedAttractor3D.x;
            bindingRay.position.z = lerpedAttractor3D.z;
            lineMat.opacity += (0.28 - lineMat.opacity) * 0.08; // fade in
        } else {
            lineMat.opacity += (0.0 - lineMat.opacity) * 0.08; // fade out
        }

        // 4. Update Crystals Physics: drift bounce vs snap stacking
        const boundaryX = 16.0;
        const boundaryY = 9.0;
        const boundaryZ = 3.0;

        for (let i = 0; i < crystalCount; i++) {
            const crystal = crystals[i];
            const mesh = crystal.mesh;

            if (isHovered && lerpedAttractor3D.z > -100) {
                // STACK MODE: Pull crystals to snap together into a vertical structural column
                const tx = lerpedAttractor3D.x;
                const ty = lerpedAttractor3D.y + (i - (crystalCount - 1) / 2) * 1.55; // vertical offset
                const tz = lerpedAttractor3D.z;

                // Strong spring-like snap forces
                crystal.vx += (tx - mesh.position.x) * 0.06;
                crystal.vy += (ty - mesh.position.y) * 0.06;
                crystal.vz += (tz - mesh.position.z) * 0.06;

                // Aligned, elegant synchronization spin when stacked
                mesh.rotation.x += (0.01 - mesh.rotation.x) * 0.08;
                mesh.rotation.y += (time * 0.65 + i * 0.15 - mesh.rotation.y) * 0.08;
                mesh.rotation.z += (0.02 - mesh.rotation.z) * 0.08;
            } else {
                // DRIFT MODE: Floating freely inside boundary constraints
                crystal.vx += (crystal.restX - mesh.position.x) * 0.02;
                crystal.vy += (crystal.restY - mesh.position.y) * 0.02;
                crystal.vz += (crystal.restZ - mesh.position.z) * 0.02;

                // Drifting boundaries check (bouncing edges off viewport volume)
                if (Math.abs(mesh.position.x) > boundaryX) crystal.vx *= -1;
                if (Math.abs(mesh.position.y) > boundaryY) crystal.vy *= -1;
                if (Math.abs(mesh.position.z) > boundaryZ) crystal.vz *= -1;

                // Slow, independent random rotations
                mesh.rotation.x += crystal.rotSpeedX;
                mesh.rotation.y += crystal.rotSpeedY;
                mesh.rotation.z += crystal.rotSpeedZ;
            }

            // Apply friction/drag to prevent infinite speeds
            crystal.vx *= 0.86;
            crystal.vy *= 0.86;
            crystal.vz *= 0.86;

            // Apply calculated velocity adjustments
            mesh.position.x += crystal.vx;
            mesh.position.y += crystal.vy;
            mesh.position.z += crystal.vz;
        }

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
        if (activeCardIndex !== -1 && interactiveElements[activeCardIndex]) {
            mapCardTo3D(interactiveElements[activeCardIndex]);
        }
    });
});
