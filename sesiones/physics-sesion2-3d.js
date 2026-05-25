// ==========================================================================
// 3D ELECTROMAGNETIC VECTOR FIELD SIMULATOR (Three.js WebGL)
// Especialización en la Enseñanza de la Física - UTP
// Sesión 2: Ecosistemas Inteligentes y Arquitectura Web
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

    // --- Grid Layout of Vector Needles ---
    const cols = 22;
    const rows = 15;
    const spacingX = 1.7;
    const spacingY = 1.35;
    const lineCount = cols * rows;
    
    const needles = [];
    
    // Compiling all vector lines in a single BufferGeometry for maximum GPU rendering efficiency
    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(lineCount * 2 * 3); // 2 vertices per segment, 3 coordinates per vertex
    const lineColors = new Float32Array(lineCount * 2 * 3);

    // Compiling glowing tip nodes for each needle vector
    const pointsGeometry = new THREE.BufferGeometry();
    const pointsPositions = new Float32Array(lineCount * 3); // 1 point per needle, 3 coordinates

    // Color definitions
    const colorTail = new THREE.Color(0x003D6D); // Azul UTP
    const colorTip = new THREE.Color(0x33B5E5);  // Cian UTP
    
    const glowColorTail = new THREE.Color(0x1EA6D9); // Glowing intermediate cian
    const glowColorTip = new THREE.Color(0xffffff);  // Incandescent white-cyan

    // Initialize positions and gradient colors inside buffer arrays
    let needleIdx = 0;
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            const cx = (c - (cols - 1) / 2) * spacingX;
            const cy = (r - (rows - 1) / 2) * spacingY;
            const cz = -2.0; // Placed slightly behind cards for deep glass depth of field

            needles.push({
                cx: cx,
                cy: cy,
                cz: cz,
                currentAngle: Math.random() * Math.PI * 2,
                index: needleIdx
            });

            // Set static gradient colors: tail is UTP blue, tip is cian UTP
            const colorVertOffset = needleIdx * 6;
            lineColors[colorVertOffset] = colorTail.r;
            lineColors[colorVertOffset + 1] = colorTail.g;
            lineColors[colorVertOffset + 2] = colorTail.b;

            lineColors[colorVertOffset + 3] = colorTip.r;
            lineColors[colorVertOffset + 4] = colorTip.g;
            lineColors[colorVertOffset + 5] = colorTip.b;

            needleIdx++;
        }
    }

    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

    // Material with high-tech glowing wireframe details
    const lineMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.25,
        depthWrite: false
    });
    const vectorFieldSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(vectorFieldSegments);

    // Glowing tip points system
    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(pointsPositions, 3));
    const pointsMaterial = new THREE.PointsMaterial({
        color: 0x8AD2F0, // Bright glowing cian
        size: 0.08,
        transparent: true,
        opacity: 0.55,
        depthWrite: false
    });
    const vectorFieldPoints = new THREE.Points(pointsGeometry, pointsMaterial);
    scene.add(vectorFieldPoints);

    // --- Interactive Attraction & Dipole Setup ---
    let attractorTarget3D = new THREE.Vector3(0, 0, -999);
    let lerpedAttractor3D = new THREE.Vector3(0, 0, -999);
    let isHovered = false;
    let activeCardIndex = -1;

    // Relative mouse vectors for subtle scene parallax tilt
    let targetRotationX = 0;
    let targetRotationY = 0;
    let currentRotationX = 0;
    let currentRotationY = 0;

    const mouse2D = new THREE.Vector2(999, 999); // Offscreen initially
    const targetMouse3D = new THREE.Vector3(999, 999, 0); // Declared missing variable for mouse raycasting
    const targetPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const raycaster = new THREE.Raycaster();

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
        
        // Calculate projection vector on the XY plane
        const dir = tempVector.sub(camera.position).normalize();
        const distance = -camera.position.z / dir.z;
        attractorTarget3D.copy(camera.position).add(dir.multiplyScalar(distance));
        
        attractorTarget3D.z = -2.0;
    }

    // Attach hover listeners to all interactive elements
    interactiveElements.forEach((card, idx) => {
        card.addEventListener('mouseenter', () => {
            isHovered = true;
            activeCardIndex = idx;
            mapCardTo3D(card);
            
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

    // Capture mouse movements over the viewport for camera parallax tilting
    document.addEventListener('mousemove', (event) => {
        const px = event.clientX / window.innerWidth - 0.5;
        const py = event.clientY / window.innerHeight - 0.5;
        
        targetRotationX = py * 0.15;
        targetRotationY = px * 0.15;

        // Map mouse coordinates to NDC for 3D physics raycasting
        const rect = container.getBoundingClientRect();
        mouse2D.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse2D.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
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

        // 1. Raycast mouse to 3D XY plane
        if (mouse2D.x < 10) {
            raycaster.setFromCamera(mouse2D, camera);
            raycaster.ray.intersectPlane(targetPlane, targetMouse3D);
            
            if (isHovered) {
                // Lerp towards the active card's unprojected center coordinate
                lerpedAttractor3D.lerp(attractorTarget3D, 0.08);
            } else {
                // Return to hover mouse pointer coordinates
                lerpedAttractor3D.lerp(targetMouse3D, 0.05);
            }
            // keep depth locked
            lerpedAttractor3D.z = -2.0;
        }

        // 2. Smoothly interpolate parallax tilting
        currentRotationX += (targetRotationX - currentRotationX) * 0.05;
        currentRotationY += (targetRotationY - currentRotationY) * 0.05;
        
        vectorFieldSegments.rotation.x = currentRotationX;
        vectorFieldSegments.rotation.y = currentRotationY;
        vectorFieldPoints.rotation.x = currentRotationX;
        vectorFieldPoints.rotation.y = currentRotationY;

        // 3. Deform and rotate vector needles
        const posAttr = lineGeometry.attributes.position;
        const colorAttr = lineGeometry.attributes.color;
        const ptsPosAttr = pointsGeometry.attributes.position;

        const halfLen = 0.28; // Length of each vector segment is 0.56 units

        for (let i = 0; i < lineCount; i++) {
            const needle = needles[i];
            
            let targetAngle = 0;
            let dist = 999;

            if (isHovered && lerpedAttractor3D.x < 900) {
                // DIPOLE PHYSICS CALCULATION:
                // We model a vertical magnetic dipole centered at the active card.
                // A North pole (+) is offset slightly upwards, a South pole (-) slightly downwards.
                const dyNorthX = lerpedAttractor3D.x;
                const dyNorthY = lerpedAttractor3D.y + 1.6;
                
                const dySouthX = lerpedAttractor3D.x;
                const dySouthY = lerpedAttractor3D.y - 1.6;

                // North pole vector forces
                const dxN = needle.cx - dyNorthX;
                const dyN = needle.cy - dyNorthY;
                const rN = Math.max(Math.sqrt(dxN*dxN + dyN*dyN), 0.85);

                // South pole vector forces
                const dxS = needle.cx - dySouthX;
                const dyS = needle.cy - dySouthY;
                const rS = Math.max(Math.sqrt(dxS*dxS + dyS*dyS), 0.85);

                // Net magnetic field vector B = B_north + B_south
                // Field lines emanate outwards from North (+) and loop inwards to South (-)
                const Bx = (dxN / Math.pow(rN, 3)) - (dxS / Math.pow(rS, 3));
                const By = (dyN / Math.pow(rN, 3)) - (dyS / Math.pow(rS, 3));

                targetAngle = Math.atan2(By, Bx);
                dist = Math.sqrt((needle.cx - lerpedAttractor3D.x)**2 + (needle.cy - lerpedAttractor3D.y)**2);
            } else {
                // REPOSE MODE: Needles oscillate slowly in undulating electromagnetic energy waves
                targetAngle = Math.sin(needle.cx * 0.15 + needle.cy * 0.15 - time * 0.85) * 0.45;
            }

            // Smooth angular interpolation (shortest path rotation to prevent wild spinning)
            let diff = targetAngle - needle.currentAngle;
            diff = Math.atan2(Math.sin(diff), Math.cos(diff));
            needle.currentAngle += diff * 0.08;

            // Calculate exact needle segment end coordinates in 3D XY space
            const cos = Math.cos(needle.currentAngle);
            const sin = Math.sin(needle.currentAngle);

            const px1 = needle.cx - halfLen * cos;
            const py1 = needle.cy - halfLen * sin;
            
            const px2 = needle.cx + halfLen * cos;
            const py2 = needle.cy + halfLen * sin;

            // Write vertices to segment positions
            posAttr.setXYZ(i * 2, px1, py1, needle.cz);
            posAttr.setXYZ(i * 2 + 1, px2, py2, needle.cz);

            // Write tip vertex to glowing point system
            ptsPosAttr.setXYZ(i, px2, py2, needle.cz);

            // Animate electromagnetic glow (incandescence) based on dipole proximity
            const colorVertOffset = i * 6;
            if (isHovered && lerpedAttractor3D.x < 900) {
                const maxGlowRadius = 7.5;
                const intensity = Math.max(1.0 - dist / maxGlowRadius, 0.0);

                // Linearly interpolate tail/tip color values to glowing white-cyan
                const cTail = new THREE.Color().copy(colorTail).lerp(glowColorTail, intensity);
                const cTip = new THREE.Color().copy(colorTip).lerp(glowColorTip, intensity);

                colorAttr.setXYZ(i * 2, cTail.r, cTail.g, cTail.b);
                colorAttr.setXYZ(i * 2 + 1, cTip.r, cTip.g, cTip.b);
            } else {
                colorAttr.setXYZ(i * 2, colorTail.r, colorTail.g, colorTail.b);
                colorAttr.setXYZ(i * 2 + 1, colorTip.r, colorTip.g, colorTip.b);
            }
        }
        
        posAttr.needsUpdate = true;
        colorAttr.needsUpdate = true;
        ptsPosAttr.needsUpdate = true;

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
});
