// ==========================================================================
// 3D NEURAL SYNAPTIC WEB SIMULATOR (Three.js WebGL)
// Especialización en la Enseñanza de la Física - UTP
// Sesión 1: Fundamentos de la Inteligencia Artificial
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('session1-canvas-container');
    const mainSection = document.querySelector('main');
    const interactiveElements = document.querySelectorAll('.card, .insight-card, .btn-primary, .btn-secondary, .action-box, .step-label, h2, h1');
    if (!container || !mainSection) return;

    // --- Scene, Camera, Renderer Setup ---
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 15);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // --- Graph-based Neural Network Topology Setup ---
    const nodeCount = 55;
    const nodes = [];
    const restPositions = [];
    const velocities = [];
    const nodeColors = new Float32Array(nodeCount * 3);

    // Color definitions
    const colorCian = new THREE.Color(0x33B5E5);
    const colorBlue = new THREE.Color(0x003D6D);
    const colorPulse = new THREE.Color(0xffffff); // Highlight color

    // Distribute nodes in a clean 3D volume (representing a neural mesh)
    for (let i = 0; i < nodeCount; i++) {
        const x = (Math.random() - 0.5) * 32;
        const y = (Math.random() - 0.5) * 20;
        const z = (Math.random() - 0.5) * 8;

        const pos = new THREE.Vector3(x, y, z);
        nodes.push(pos);
        restPositions.push(pos.clone());

        // Slow floating current velocities
        velocities.push(new THREE.Vector3(
            (Math.random() - 0.5) * 0.008,
            (Math.random() - 0.5) * 0.008,
            (Math.random() - 0.5) * 0.003
        ));

        // Initial default cian/blue color gradient based on position
        const t = (x + 16) / 32;
        const col = new THREE.Color().copy(colorBlue).lerp(colorCian, t);
        nodeColors[i * 3] = col.r;
        nodeColors[i * 3 + 1] = col.g;
        nodeColors[i * 3 + 2] = col.b;
    }

    // Build connections/edges between close nodes to form a stable graph
    const adjacency = Array.from({ length: nodeCount }, () => []);
    const connections = [];
    const maxConnectionDistance = 6.2;
    const minConnectionDistance = 2.8;

    for (let i = 0; i < nodeCount; i++) {
        for (let j = i + 1; j < nodeCount; j++) {
            const dist = nodes[i].distanceTo(nodes[j]);
            if (dist > minConnectionDistance && dist < maxConnectionDistance) {
                connections.push({ i, j });
                adjacency[i].push(j);
                adjacency[j].push(i);
            }
        }
    }

    // --- WebGL Mesh Representations ---
    // 1. Line Segments for Connections
    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(connections.length * 2 * 3);
    const lineColors = new Float32Array(connections.length * 2 * 3);
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

    // Initialize line colors with highly transparent cian
    for (let i = 0; i < connections.length * 2; i++) {
        lineColors[i * 3] = colorCian.r;
        lineColors[i * 3 + 1] = colorCian.g;
        lineColors[i * 3 + 2] = colorCian.b;
    }

    const lineMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.16,
        depthWrite: false
    });
    const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lineSegments);

    // 2. Glowing Nodes Points
    const pointsGeometry = new THREE.BufferGeometry();
    const pointsPositions = new Float32Array(nodeCount * 3);
    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(pointsPositions, 3));
    pointsGeometry.setAttribute('color', new THREE.BufferAttribute(nodeColors, 3));

    const pointsMaterial = new THREE.PointsMaterial({
        size: 0.16,
        vertexColors: true,
        transparent: true,
        opacity: 0.65,
        depthWrite: false
    });
    const pointSystem = new THREE.Points(pointsGeometry, pointsMaterial);
    scene.add(pointSystem);

    // --- Synaptic Pulse / Signal Spawning ---
    const activePulses = [];
    const pulseMeshGroup = new THREE.Group();
    scene.add(pulseMeshGroup);

    // Reusable pulse sphere visual indicator
    const pulseGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const pulseMaterial = new THREE.MeshBasicMaterial({
        color: 0x8AD2F0, // Bright glowing cian
        transparent: true,
        opacity: 0.95
    });

    // Function to launch a pulse of light that travels through the network
    function spawnSynapticPulse() {
        if (activePulses.length > 25) return; // Cap maximum active signals

        const startNodeIdx = Math.floor(Math.random() * nodeCount);
        const mesh = new THREE.Mesh(pulseGeometry, pulseMaterial);
        pulseMeshGroup.add(mesh);

        activePulses.push({
            currentNode: startNodeIdx,
            nextNode: null,
            progress: 0,
            speed: 0.05 + Math.random() * 0.05,
            mesh: mesh,
            visited: new Set([startNodeIdx]),
            life: 3 + Math.floor(Math.random() * 4) // travels 3 to 6 hops
        });
    }

    // Attach trigger listeners: Hovering elements fires neural pulses!
    interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', () => {
            // Spawn multiple pulses on hover to show heavy computational activity!
            const spawnCount = 2 + Math.floor(Math.random() * 3);
            for (let i = 0; i < spawnCount; i++) {
                setTimeout(spawnSynapticPulse, i * 150);
            }
        });
    });

    // Occasional baseline pulse triggers to keep the web organically alive
    setInterval(() => {
        if (Math.random() > 0.4) spawnSynapticPulse();
    }, 2500);

    // --- Mouse Parallax & Gravity Distortion ---
    let targetRotationX = 0;
    let targetRotationY = 0;
    let currentRotationX = 0;
    let currentRotationY = 0;

    const mouse2D = new THREE.Vector2(999, 999); // Offscreen initially
    const targetMouse3D = new THREE.Vector3(999, 999, 0);
    const lerpedMouse3D = new THREE.Vector3(999, 999, 0);
    const targetPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const raycaster = new THREE.Raycaster();

    document.addEventListener('mousemove', (e) => {
        const px = e.clientX / window.innerWidth - 0.5;
        const py = e.clientY / window.innerHeight - 0.5;
        targetRotationX = py * 0.15;
        targetRotationY = px * 0.15;

        // Map mouse to NDC coordinates for 3D physics raycasting
        const rect = container.getBoundingClientRect();
        mouse2D.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse2D.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });

    // --- Performance Optimization: Viewport Visibility Check ---
    let isVisible = true;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            isVisible = entry.isIntersecting;
        });
    }, { threshold: 0.05 });
    observer.observe(mainSection);

    // --- Clock & Animation Loop (60fps) ---
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);

        // performance safeguard
        if (!isVisible) return;

        const time = clock.getElapsedTime();
        const delta = clock.getDelta();

        // 1. Raycast mouse to 3D XY plane
        if (mouse2D.x < 10) {
            raycaster.setFromCamera(mouse2D, camera);
            raycaster.ray.intersectPlane(targetPlane, targetMouse3D);
            lerpedMouse3D.lerp(targetMouse3D, 0.08);
        }

        // 2. Smoothly interpolate parallax tilting
        currentRotationX += (targetRotationX - currentRotationX) * 0.05;
        currentRotationY += (targetRotationY - currentRotationY) * 0.05;
        
        scene.rotation.x = currentRotationX;
        scene.rotation.y = currentRotationY;

        // 3. Update Node Physics: Gentle float drift + mouse gravity push
        const nodePosAttr = pointsGeometry.attributes.position;
        const nodeColorAttr = pointsGeometry.attributes.color;
        const linePosAttr = lineGeometry.attributes.position;
        const lineColorAttr = lineGeometry.attributes.color;

        // Slowly decay node highlights back to base cian-blue color
        for (let i = 0; i < nodeCount; i++) {
            const x = restPositions[i].x;
            const t = (x + 16) / 32;
            const baseCol = new THREE.Color().copy(colorBlue).lerp(colorCian, t);

            // Interpolate color back to base state
            nodeColors[i * 3] += (baseCol.r - nodeColors[i * 3]) * 0.08;
            nodeColors[i * 3 + 1] += (baseCol.g - nodeColors[i * 3 + 1]) * 0.08;
            nodeColors[i * 3 + 2] += (baseCol.b - nodeColors[i * 3 + 2]) * 0.08;
        }

        const pushRadius = 4.5;
        const pushForce = 0.08;

        for (let i = 0; i < nodeCount; i++) {
            const pos = nodes[i];
            const rest = restPositions[i];
            const vel = velocities[i];

            // A: Apply floating current velocity
            pos.add(vel);

            // B: Drag boundaries (bounce off bounds)
            if (Math.abs(pos.x) > 17) vel.x *= -1;
            if (Math.abs(pos.y) > 11) vel.y *= -1;
            if (Math.abs(pos.z) > 4) vel.z *= -1;

            // C: Gentle home pull towards rest position to prevent dispersion
            const homePull = new THREE.Vector3().subVectors(rest, pos).multiplyScalar(0.005);
            vel.add(homePull);

            // D: Mouse gravitational push (repulsion/distortion under cursor)
            if (lerpedMouse3D.x < 900) {
                const distToMouse = pos.distanceTo(lerpedMouse3D);
                if (distToMouse < pushRadius) {
                    const dir = new THREE.Vector3().subVectors(pos, lerpedMouse3D).normalize();
                    const strength = (1.0 - distToMouse / pushRadius) * pushForce;
                    pos.add(dir.multiplyScalar(strength));
                }
            }

            // Write positions into WebGL Point attributes
            nodePosAttr.setXYZ(i, pos.x, pos.y, pos.z);
        }
        nodePosAttr.needsUpdate = true;

        // 4. Update Electrical Synaptic Pulses
        for (let p = activePulses.length - 1; p >= 0; p--) {
            const pulse = activePulses[p];
            
            // If next node is not set, choose a random neighbor index
            if (pulse.nextNode === null) {
                const neighbors = adjacency[pulse.currentNode];
                const unvisited = neighbors.filter(n => !pulse.visited.has(n));

                if (unvisited.length > 0) {
                    pulse.nextNode = unvisited[Math.floor(Math.random() * unvisited.length)];
                    pulse.visited.add(pulse.nextNode);
                } else if (neighbors.length > 0) {
                    pulse.nextNode = neighbors[Math.floor(Math.random() * neighbors.length)];
                } else {
                    // Dead end: remove immediately
                    pulseMeshGroup.remove(pulse.mesh);
                    pulse.mesh.geometry.dispose();
                    activePulses.splice(p, 1);
                    continue;
                }
            }

            // Move the pulse sphere along the segment
            pulse.progress += pulse.speed;
            
            const pStart = nodes[pulse.currentNode];
            const pEnd = nodes[pulse.nextNode];
            pulse.mesh.position.copy(pStart).lerp(pEnd, pulse.progress);

            // Make nodes it touches GLOW intensely (white/light cyan)
            const curIdx = pulse.currentNode;
            nodeColors[curIdx * 3] = colorPulse.r;
            nodeColors[curIdx * 3 + 1] = colorPulse.g;
            nodeColors[curIdx * 3 + 2] = colorPulse.b;

            const nextIdx = pulse.nextNode;
            nodeColors[nextIdx * 3] = 0.54;
            nodeColors[nextIdx * 3 + 1] = 0.82;
            nodeColors[nextIdx * 3 + 2] = 0.94;

            // If hop completes, step to next node
            if (pulse.progress >= 1.0) {
                pulse.currentNode = pulse.nextNode;
                pulse.nextNode = null;
                pulse.progress = 0;
                pulse.life--;

                if (pulse.life <= 0) {
                    // Signal died: clean visual elements
                    pulseMeshGroup.remove(pulse.mesh);
                    pulse.mesh.geometry.dispose();
                    activePulses.splice(p, 1);
                }
            }
        }
        nodeColorAttr.needsUpdate = true;

        // 5. Update Connection Line Vertices and highlight active channels
        let lineVertIdx = 0;
        for (let c = 0; c < connections.length; c++) {
            const conn = connections[c];
            const p1 = nodes[conn.i];
            const p2 = nodes[conn.j];

            linePosAttr.setXYZ(lineVertIdx, p1.x, p1.y, p1.z);
            linePosAttr.setXYZ(lineVertIdx + 1, p2.x, p2.y, p2.z);

            // Determine if a pulse is currently traveling along this connection
            let isChannelActive = false;
            for (let p = 0; p < activePulses.length; p++) {
                const pulse = activePulses[p];
                if (pulse.nextNode !== null) {
                    if ((pulse.currentNode === conn.i && pulse.nextNode === conn.j) ||
                        (pulse.currentNode === conn.j && pulse.nextNode === conn.i)) {
                        isChannelActive = true;
                        break;
                    }
                }
            }

            // Animate line connection glow opacity/color
            if (isChannelActive) {
                // Active line segment glows bright white-cyan
                lineColorAttr.setXYZ(lineVertIdx, 1.0, 1.0, 1.0);
                lineColorAttr.setXYZ(lineVertIdx + 1, 1.0, 1.0, 1.0);
            } else {
                // Rest state uses the cian-blue gradient based on horizontal position
                const x1 = p1.x;
                const x2 = p2.x;
                const t1 = (x1 + 16) / 32;
                const t2 = (x2 + 16) / 32;
                const c1 = new THREE.Color().copy(colorBlue).lerp(colorCian, t1);
                const c2 = new THREE.Color().copy(colorBlue).lerp(colorCian, t2);

                lineColorAttr.setXYZ(lineVertIdx, c1.r, c1.g, c1.b);
                lineColorAttr.setXYZ(lineVertIdx + 1, c2.r, c2.g, c2.b);
            }

            lineVertIdx += 2;
        }
        linePosAttr.needsUpdate = true;
        lineColorAttr.needsUpdate = true;

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
