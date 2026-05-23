// ==========================================================================
// 3D SPACETIME GRAVITY WARP SIMULATOR (Three.js WebGL)
// Especialización en la Enseñanza de la Física - UTP
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('spacetime-canvas-container');
    const heroSection = document.getElementById('hero-section');
    if (!container || !heroSection) return;

    // --- Scene, Camera, Renderer Setup ---
    const scene = new THREE.Scene();
    
    // Perspective Camera looking down at a beautiful scientific angle
    const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, -9, 11);
    camera.lookAt(0, 1, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // --- Geometry & Materials (Mesh + Points Grid) ---
    // Large grid spanning the view
    const segmentsX = 40;
    const segmentsY = 30;
    const gridWidth = 36;
    const gridHeight = 26;
    const geometry = new THREE.PlaneGeometry(gridWidth, gridHeight, segmentsX, segmentsY);

    // Deep blue / cyan wireframe material for sci-fi holographic look
    const meshMaterial = new THREE.MeshBasicMaterial({
        color: 0x33B5E5, // Cian EEF
        wireframe: true,
        transparent: true,
        opacity: 0.16,
        depthWrite: false
    });
    const gridMesh = new THREE.Mesh(geometry, meshMaterial);
    scene.add(gridMesh);

    // Add glowing quantum points (nodes) at each grid intersection
    const pointsMaterial = new THREE.PointsMaterial({
        color: 0x003D6D, // Azul UTP
        size: 0.08,
        transparent: true,
        opacity: 0.5,
        depthWrite: false
    });
    const gridPoints = new THREE.Points(geometry, pointsMaterial);
    scene.add(gridPoints);

    // --- Interactive Telemetry Variables ---
    const telemetryText = document.getElementById('lab-telemetry-text');

    // --- Interaction Physics Setup (Raycasting mouse coordinate to 3D space) ---
    const raycaster = new THREE.Raycaster();
    const mouse2D = new THREE.Vector2();
    const targetPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // Flat XY plane
    
    // Mouse 3D vectors
    let targetMouse3D = new THREE.Vector3(999, 999, 0); // Offscreen initially
    let lerpedMouse3D = new THREE.Vector3(999, 999, 0);
    let isMouseOver = false;

    // Parallax Tilting variables
    let targetRotationX = -0.55; // baseline tilt
    let targetRotationY = 0.0;
    let currentRotationX = -0.55;
    let currentRotationY = 0.0;

    // Track mouse coordinate over the hero section
    heroSection.addEventListener('mousemove', (event) => {
        isMouseOver = true;
        
        const rect = heroSection.getBoundingClientRect();
        mouse2D.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse2D.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Raycast to find the 3D coordinate on our flat XY grid plane
        raycaster.setFromCamera(mouse2D, camera);
        raycaster.ray.intersectPlane(targetPlane, targetMouse3D);

        // Subtle camera/grid tilt based on mouse position (Parallax)
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        
        targetRotationX = -0.55 - py * 0.15;
        targetRotationY = px * 0.15;
    });

    heroSection.addEventListener('mouseleave', () => {
        isMouseOver = false;
        targetMouse3D.set(999, 999, 0); // Push offscreen
        targetRotationX = -0.55; // Reset tilt
        targetRotationY = 0.0;
    });

    // Handle touch interactions on mobile
    heroSection.addEventListener('touchmove', (event) => {
        isMouseOver = true;
        if (event.touches.length > 0) {
            const touch = event.touches[0];
            const rect = heroSection.getBoundingClientRect();
            mouse2D.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
            mouse2D.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
            
            raycaster.setFromCamera(mouse2D, camera);
            raycaster.ray.intersectPlane(targetPlane, targetMouse3D);
        }
    });

    heroSection.addEventListener('touchend', () => {
        isMouseOver = false;
        targetMouse3D.set(999, 999, 0);
    });

    // --- Clock for gravitational waves animation ---
    const clock = new THREE.Clock();

    // --- Render Loop (60fps) ---
    function animate() {
        requestAnimationFrame(animate);

        const time = clock.getElapsedTime();

        // 1. Smoothly interpolate mouse coordinate for inertia (sluggish massive gravity)
        if (isMouseOver) {
            lerpedMouse3D.lerp(targetMouse3D, 0.08); // lag factor
        } else {
            lerpedMouse3D.lerp(targetMouse3D, 0.08);
        }

        // 2. Smoothly interpolate grid tilting (parallax)
        currentRotationX += (targetRotationX - currentRotationX) * 0.05;
        currentRotationY += (targetRotationY - currentRotationY) * 0.05;
        
        gridMesh.rotation.x = currentRotationX;
        gridMesh.rotation.z = currentRotationY;
        gridPoints.rotation.x = currentRotationX;
        gridPoints.rotation.z = currentRotationY;

        // 3. Deform spacetime mesh geometry vertices
        const positionAttribute = geometry.attributes.position;
        const gravityForce = 2.4; // Max depth of dent
        const gravityRange = 5.5; // Radius of dent influence

        for (let i = 0; i < positionAttribute.count; i++) {
            const x = positionAttribute.getX(i);
            const y = positionAttribute.getY(i);

            // Gravitational Wave ripples traveling outwards from center
            const dCenter = Math.sqrt(x*x + y*y);
            const waveZ = Math.sin(dCenter * 0.35 - time * 1.3) * 0.28;

            // Gravitational Warp Dent (Einstein gravity well)
            let warpZ = 0;
            if (isMouseOver && lerpedMouse3D.x < 900) {
                const distToMouse = Math.sqrt((x - lerpedMouse3D.x)**2 + (y - lerpedMouse3D.y)**2);
                if (distToMouse < gravityRange) {
                    const t = distToMouse / gravityRange;
                    // Smooth bell-curve deformation: -Force * (1 - t^2)^2
                    warpZ = -gravityForce * Math.pow(1.0 - t*t, 2);
                }
            }

            // Set final z position (wave ripple + gravity warp)
            positionAttribute.setZ(i, waveZ + warpZ);
        }

        // Flag to recalculate mesh normals and vertices
        positionAttribute.needsUpdate = true;

        // 4. Update Telemetry text in case the user hovers space-time
        const isBohrActive = document.getElementById('sim-bohr').classList.contains('active');
        if (isMouseOver && !isBohrActive && telemetryText) {
            const distFromCenter = Math.sqrt(lerpedMouse3D.x**2 + lerpedMouse3D.y**2);
            if (distFromCenter < 900) {
                telemetryText.textContent = `Gravedad: Curvatura Gμν • M = ${(1.0 + Math.sin(time)*0.05).toFixed(2)} M☉`;
            }
        }

        renderer.render(scene, camera);
    }

    // Start rendering
    animate();

    // --- Responsive Resize Handler ---
    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
});
