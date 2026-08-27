import * as THREE from 'three';

export interface ThreeSceneInstance {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  update: (freq: Uint8Array, time: Uint8Array, t: number, intensity: number) => void;
  resize: (width: number, height: number) => void;
  destroy: () => void;
  handlePointerDown: (e: MouseEvent | TouchEvent) => void;
  handlePointerMove: (e: MouseEvent | TouchEvent) => void;
  handlePointerUp: () => void;
  handleWheel: (e: WheelEvent) => void;
  resetCamera: () => void;
}

function getAvg(arr: Uint8Array, start = 0, end = arr.length) {
  if (end <= start) return 0;
  let sum = 0;
  for (let i = start; i < end; i++) sum += arr[i];
  return sum / (end - start);
}

// 1. Cyberpunk 3D Flight & Infinite Grid
export function createCyberDiveScene(canvas: HTMLCanvasElement): ThreeSceneInstance {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050014, 0.0018);

  const camera = new THREE.PerspectiveCamera(65, canvas.width / canvas.height, 0.1, 2000);
  camera.position.set(0, 30, 120);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(canvas.width, canvas.height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const ambLight = new THREE.AmbientLight(0x222244, 1.5);
  scene.add(ambLight);

  const mainLight = new THREE.PointLight(0x00ffff, 4, 600);
  mainLight.position.set(0, 80, 0);
  scene.add(mainLight);

  const bassLight = new THREE.PointLight(0xff0077, 3, 500);
  bassLight.position.set(0, 20, -100);
  scene.add(bassLight);

  const gridHelper = new THREE.GridHelper(1000, 80, 0x00ffff, 0x8800ff);
  gridHelper.position.y = -10;
  scene.add(gridHelper);

  const gridHelper2 = new THREE.GridHelper(1000, 80, 0x00ffff, 0x8800ff);
  gridHelper2.position.y = -10;
  gridHelper2.position.z = -1000;
  scene.add(gridHelper2);

  const buildingCount = 40;
  const buildings: { mesh: THREE.Mesh; baseHeight: number; freqIdx: number }[] = [];
  const boxGeo = new THREE.BoxGeometry(12, 1, 12);

  for (let i = 0; i < buildingCount; i++) {
    const isLeft = i % 2 === 0;
    const x = isLeft ? -50 - Math.random() * 120 : 50 + Math.random() * 120;
    const z = -Math.random() * 900;
    const baseHeight = 20 + Math.random() * 80;

    const mat = new THREE.MeshStandardMaterial({
      color: 0x0a0a1a,
      emissive: isLeft ? 0x00ffff : 0xff0077,
      emissiveIntensity: 0.2 + Math.random() * 0.4,
      metalness: 0.8,
      roughness: 0.2,
      wireframe: Math.random() > 0.6
    });

    const mesh = new THREE.Mesh(boxGeo, mat);
    mesh.position.set(x, baseHeight / 2 - 10, z);
    mesh.scale.set(1, baseHeight, 1);
    scene.add(mesh);

    buildings.push({
      mesh,
      baseHeight,
      freqIdx: Math.floor(Math.random() * 64)
    });
  }

  // Horizon Sun / Portal
  const sunGeo = new THREE.SphereGeometry(60, 32, 32);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xff0055, wireframe: true });
  const sun = new THREE.Mesh(sunGeo, sunMat);
  sun.position.set(0, 40, -900);
  scene.add(sun);

  let isDragging = false;
  let prevMouseX = 0;
  let prevMouseY = 0;
  let rotX = 0;
  let rotY = 0;
  let camDistance = 120;

  return {
    scene,
    camera,
    renderer,
    update: (freq, _time, t, intensity) => {
      const bass = (getAvg(freq, 0, 8) / 255) * intensity;
      const speed = (2.5 + bass * 8);

      gridHelper.position.z += speed;
      gridHelper2.position.z += speed;
      if (gridHelper.position.z >= 1000) gridHelper.position.z = -1000;
      if (gridHelper2.position.z >= 1000) gridHelper2.position.z = -1000;

      for (let i = 0; i < buildings.length; i++) {
        const b = buildings[i];
        b.mesh.position.z += speed;
        if (b.mesh.position.z > 200) {
          b.mesh.position.z = -800 - Math.random() * 200;
        }

        const audioVal = (freq[b.freqIdx] / 255) * intensity;
        const currentScaleY = b.baseHeight * (1 + audioVal * 2.2);
        b.mesh.scale.y = currentScaleY;
        b.mesh.position.y = currentScaleY / 2 - 10;
        (b.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2 + audioVal * 2.5;
      }

      sun.scale.set(1 + bass * 0.4, 1 + bass * 0.4, 1 + bass * 0.4);
      sun.rotation.z = t * 0.0005;

      camera.position.x = Math.sin(rotY) * Math.cos(rotX) * camDistance;
      camera.position.y = 30 + Math.sin(rotX) * camDistance + (Math.sin(t * 0.002) * 2 + bass * 3);
      camera.position.z = Math.cos(rotY) * Math.cos(rotX) * camDistance;
      camera.lookAt(0, 20 + bass * 5, -300);

      renderer.render(scene, camera);
    },
    resize: (w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    },
    handlePointerDown: (e) => {
      isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      prevMouseX = clientX;
      prevMouseY = clientY;
    },
    handlePointerMove: (e) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const dx = clientX - prevMouseX;
      const dy = clientY - prevMouseY;
      prevMouseX = clientX;
      prevMouseY = clientY;

      rotY -= dx * 0.006;
      rotX = Math.max(-0.4, Math.min(0.6, rotX + dy * 0.006));
    },
    handlePointerUp: () => {
      isDragging = false;
    },
    handleWheel: (e) => {
      camDistance = Math.max(50, Math.min(300, camDistance + e.deltaY * 0.2));
    },
    resetCamera: () => {
      rotX = 0;
      rotY = 0;
      camDistance = 120;
    },
    destroy: () => {
      renderer.dispose();
      scene.clear();
    }
  };
}

// 2. Cosmic Particle Nebula & Spiral Galaxy
export function createGalaxyParticleScene(canvas: HTMLCanvasElement): ThreeSceneInstance {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, canvas.width / canvas.height, 0.1, 3000);
  camera.position.set(0, 50, 160);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(canvas.width, canvas.height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const particleCount = 4500;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const basePositions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const colorObj = new THREE.Color();

  const arms = 4;
  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    const r = Math.pow(Math.random(), 2) * 160 + 5;
    const armAngle = ((i % arms) * (Math.PI * 2)) / arms;
    const spinAngle = r * 0.04;
    const randomX = (Math.random() - 0.5) * (30 + r * 0.15);
    const randomY = (Math.random() - 0.5) * (20 + r * 0.1);
    const randomZ = (Math.random() - 0.5) * (30 + r * 0.15);

    const x = Math.cos(armAngle + spinAngle) * r + randomX;
    const y = randomY;
    const z = Math.sin(armAngle + spinAngle) * r + randomZ;

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    basePositions[i3] = x;
    basePositions[i3 + 1] = y;
    basePositions[i3 + 2] = z;

    const mixedColor = colorObj.setHSL(0.55 + (r / 200) * 0.35, 0.9, 0.5 + (1 - r / 200) * 0.4);
    colors[i3] = mixedColor.r;
    colors[i3 + 1] = mixedColor.g;
    colors[i3 + 2] = mixedColor.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const pMaterial = new THREE.PointsMaterial({
    size: 2.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending
  });

  const particleSystem = new THREE.Points(geometry, pMaterial);
  scene.add(particleSystem);

  const coreGeo = new THREE.SphereGeometry(12, 32, 32);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
  const core = new THREE.Mesh(coreGeo, coreMat);
  scene.add(core);

  let isDragging = false;
  let prevMouseX = 0;
  let prevMouseY = 0;
  let rotX = 0.35;
  let rotY = 0;
  let camDistance = 180;

  return {
    scene,
    camera,
    renderer,
    update: (freq, _time, t, intensity) => {
      const bass = (getAvg(freq, 0, 10) / 255) * intensity;
      const treble = (getAvg(freq, 50, 120) / 255) * intensity;

      particleSystem.rotation.y = t * 0.0003;
      particleSystem.rotation.z = Math.sin(t * 0.0002) * 0.15;

      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const freqVal = (freq[i % 64] / 255) * intensity;
        const distFromCenter = Math.sqrt(
          basePositions[i3] * basePositions[i3] + basePositions[i3 + 2] * basePositions[i3 + 2]
        );

        const wave = Math.sin(distFromCenter * 0.1 - t * 0.004) * (freqVal * 25 + bass * 15);
        posArray[i3 + 1] = basePositions[i3 + 1] + wave;

        const expand = 1 + bass * 0.4 + freqVal * 0.3;
        posArray[i3] = basePositions[i3] * expand;
        posArray[i3 + 2] = basePositions[i3 + 2] * expand;
      }
      posAttr.needsUpdate = true;

      const cScale = 1 + bass * 1.5;
      core.scale.set(cScale, cScale, cScale);
      core.rotation.y = t * 0.002;

      camera.position.x = Math.sin(rotY) * Math.cos(rotX) * camDistance;
      camera.position.y = Math.sin(rotX) * camDistance + (treble * 10);
      camera.position.z = Math.cos(rotY) * Math.cos(rotX) * camDistance;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    },
    resize: (w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    },
    handlePointerDown: (e) => {
      isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      prevMouseX = clientX;
      prevMouseY = clientY;
    },
    handlePointerMove: (e) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const dx = clientX - prevMouseX;
      const dy = clientY - prevMouseY;
      prevMouseX = clientX;
      prevMouseY = clientY;

      rotY -= dx * 0.008;
      rotX = Math.max(-1.4, Math.min(1.4, rotX + dy * 0.008));
    },
    handlePointerUp: () => {
      isDragging = false;
    },
    handleWheel: (e) => {
      camDistance = Math.max(40, Math.min(450, camDistance + e.deltaY * 0.2));
    },
    resetCamera: () => {
      rotX = 0.35;
      rotY = 0;
      camDistance = 180;
    },
    destroy: () => {
      renderer.dispose();
      scene.clear();
    }
  };
}

// 3. Chrome Monolith Arena
export function createMonolithArenaScene(canvas: HTMLCanvasElement): ThreeSceneInstance {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0a14, 0.0025);

  const camera = new THREE.PerspectiveCamera(60, canvas.width / canvas.height, 0.1, 1500);
  camera.position.set(0, 25, 110);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(canvas.width, canvas.height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const ambLight = new THREE.AmbientLight(0x111122, 2.0);
  scene.add(ambLight);

  const centerLight = new THREE.PointLight(0x00ffff, 5, 300);
  centerLight.position.set(0, 15, 0);
  scene.add(centerLight);

  const floorGeo = new THREE.CircleGeometry(150, 64);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x05050d,
    metalness: 0.95,
    roughness: 0.05
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const pillarCount = 64;
  const pillars: { mesh: THREE.Mesh; angle: number; radius: number; freqIdx: number }[] = [];
  const pGeo = new THREE.BoxGeometry(3, 1, 3);

  for (let i = 0; i < pillarCount; i++) {
    const angle = (i / pillarCount) * Math.PI * 2;
    const radius = 55;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const color = new THREE.Color().setHSL(i / pillarCount, 0.9, 0.5);
    const pMat = new THREE.MeshStandardMaterial({
      color: 0x111118,
      emissive: color,
      emissiveIntensity: 0.3,
      metalness: 0.9,
      roughness: 0.1
    });

    const mesh = new THREE.Mesh(pGeo, pMat);
    mesh.position.set(x, 0.5, z);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);

    pillars.push({ mesh, angle, radius, freqIdx: i });
  }

  const prismGeo = new THREE.OctahedronGeometry(10, 0);
  const prismMat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: 0x00ffff,
    emissiveIntensity: 0.8,
    wireframe: true
  });
  const prism = new THREE.Mesh(prismGeo, prismMat);
  prism.position.set(0, 20, 0);
  scene.add(prism);

  let isDragging = false;
  let prevMouseX = 0;
  let prevMouseY = 0;
  let rotX = 0.3;
  let rotY = 0;
  let camDistance = 110;

  return {
    scene,
    camera,
    renderer,
    update: (freq, _time, t, intensity) => {
      const bass = (getAvg(freq, 0, 10) / 255) * intensity;
      const treble = (getAvg(freq, 80, 140) / 255) * intensity;

      rotY += 0.002;

      prism.rotation.x = t * 0.001;
      prism.rotation.y = t * 0.0015;
      const prismScale = 1 + bass * 0.8;
      prism.scale.set(prismScale, prismScale, prismScale);

      centerLight.intensity = 2 + bass * 10;
      centerLight.color.setHSL((t * 0.0003) % 1, 1, 0.6);

      for (const p of pillars) {
        const val = (freq[p.freqIdx] / 255) * intensity;
        const height = Math.max(1, val * 65);
        p.mesh.scale.y = height;
        p.mesh.position.y = height / 2;
        (p.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.1 + val * 2.0;
      }

      camera.position.x = Math.sin(rotY) * Math.cos(rotX) * camDistance;
      camera.position.y = Math.sin(rotX) * camDistance + 20;
      camera.position.z = Math.cos(rotY) * Math.cos(rotX) * camDistance;
      camera.lookAt(0, 15 + treble * 10, 0);

      renderer.render(scene, camera);
    },
    resize: (w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    },
    handlePointerDown: (e) => {
      isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      prevMouseX = clientX;
      prevMouseY = clientY;
    },
    handlePointerMove: (e) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const dx = clientX - prevMouseX;
      const dy = clientY - prevMouseY;
      prevMouseX = clientX;
      prevMouseY = clientY;

      rotY -= dx * 0.008;
      rotX = Math.max(0.05, Math.min(1.2, rotX + dy * 0.008));
    },
    handlePointerUp: () => {
      isDragging = false;
    },
    handleWheel: (e) => {
      camDistance = Math.max(40, Math.min(250, camDistance + e.deltaY * 0.2));
    },
    resetCamera: () => {
      rotX = 0.3;
      rotY = 0;
      camDistance = 110;
    },
    destroy: () => {
      renderer.dispose();
      scene.clear();
    }
  };
}

// 4. NEW: Synthwave Neon Grid & Horizon Mountains
export function createSynthwaveHorizonScene(canvas: HTMLCanvasElement): ThreeSceneInstance {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x1a0033, 0.0015);

  const camera = new THREE.PerspectiveCamera(65, canvas.width / canvas.height, 0.1, 2000);
  camera.position.set(0, 20, 100);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(canvas.width, canvas.height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Audio-reactive terrain grid
  const terrainWidth = 600;
  const terrainDepth = 800;
  const gridX = 40;
  const gridY = 50;
  const terrainGeo = new THREE.PlaneGeometry(terrainWidth, terrainDepth, gridX, gridY);
  terrainGeo.rotateX(-Math.PI / 2);

  const terrainMat = new THREE.MeshBasicMaterial({
    color: 0xff007f,
    wireframe: true
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.position.set(0, -10, -300);
  scene.add(terrainMesh);

  // Synthwave Striped Sun in the Horizon
  const sunGroup = new THREE.Group();
  const sunRadius = 90;
  const sliceCount = 12;
  for (let i = 0; i < sliceCount; i++) {
    const sliceH = (sunRadius * 2) / sliceCount;
    const yPos = -sunRadius + (i + 0.5) * sliceH;
    const r = Math.sqrt(Math.max(0, sunRadius * sunRadius - yPos * yPos));
    if (r > 0) {
      const sliceGeo = new THREE.CylinderGeometry(r, r, sliceH * 0.75, 32);
      const sliceMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.08 + (i / sliceCount) * 0.08, 1, 0.55)
      });
      const sliceMesh = new THREE.Mesh(sliceGeo, sliceMat);
      sliceMesh.position.y = yPos;
      sunGroup.add(sliceMesh);
    }
  }
  sunGroup.position.set(0, 60, -750);
  scene.add(sunGroup);

  // Floating neon pyramids along the road
  const pyramids: THREE.Mesh[] = [];
  const pyrGeo = new THREE.ConeGeometry(8, 20, 4);
  for (let i = 0; i < 20; i++) {
    const isLeft = i % 2 === 0;
    const mat = new THREE.MeshBasicMaterial({
      color: isLeft ? 0x00ffff : 0xffaa00,
      wireframe: true
    });
    const pyr = new THREE.Mesh(pyrGeo, mat);
    pyr.position.set(isLeft ? -70 - Math.random() * 80 : 70 + Math.random() * 80, 0, -i * 40);
    scene.add(pyr);
    pyramids.push(pyr);
  }

  let isDragging = false;
  let prevMouseX = 0;
  let prevMouseY = 0;
  let rotX = 0;
  let rotY = 0;
  let camDistance = 100;

  return {
    scene,
    camera,
    renderer,
    update: (freq, _time, t, intensity) => {
      const bass = (getAvg(freq, 0, 8) / 255) * intensity;
      const mids = (getAvg(freq, 10, 40) / 255) * intensity;

      // Deform terrain with audio
      const pos = terrainGeo.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let i = 0; i < pos.count; i++) {
        const x = arr[i * 3];
        const distFromCenter = Math.abs(x);
        // Only deform mountains on the sides, leave middle road smooth
        if (distFromCenter > 40) {
          const freqVal = (freq[(i + Math.floor(t * 0.05)) % 64] / 255) * intensity;
          const mountainBase = Math.sin(x * 0.05 + t * 0.002) * (distFromCenter * 0.4);
          arr[i * 3 + 1] = mountainBase + freqVal * 35 * (distFromCenter / 150);
        } else {
          arr[i * 3 + 1] = Math.sin(t * 0.005 + arr[i * 3 + 2] * 0.02) * (bass * 4);
        }
      }
      pos.needsUpdate = true;

      // Animate pyramids
      for (const p of pyramids) {
        p.position.z += 2 + bass * 6;
        if (p.position.z > 150) p.position.z = -750;
        p.rotation.y = t * 0.002;
        p.scale.set(1 + mids * 0.8, 1 + bass * 1.2, 1 + mids * 0.8);
      }

      sunGroup.scale.set(1 + bass * 0.25, 1 + bass * 0.25, 1 + bass * 0.25);

      camera.position.x = Math.sin(rotY) * Math.cos(rotX) * camDistance;
      camera.position.y = 20 + Math.sin(rotX) * camDistance + bass * 4;
      camera.position.z = Math.cos(rotY) * Math.cos(rotX) * camDistance;
      camera.lookAt(0, 30 + bass * 5, -500);

      renderer.render(scene, camera);
    },
    resize: (w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    },
    handlePointerDown: (e) => {
      isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      prevMouseX = clientX;
      prevMouseY = clientY;
    },
    handlePointerMove: (e) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const dx = clientX - prevMouseX;
      const dy = clientY - prevMouseY;
      prevMouseX = clientX;
      prevMouseY = clientY;

      rotY -= dx * 0.006;
      rotX = Math.max(-0.3, Math.min(0.5, rotX + dy * 0.006));
    },
    handlePointerUp: () => {
      isDragging = false;
    },
    handleWheel: (e) => {
      camDistance = Math.max(40, Math.min(250, camDistance + e.deltaY * 0.2));
    },
    resetCamera: () => {
      rotX = 0;
      rotY = 0;
      camDistance = 100;
    },
    destroy: () => {
      renderer.dispose();
      scene.clear();
    }
  };
}

// 5. NEW: Hyperdrive Quantum Warp Tunnel
export function createHyperdriveTunnelScene(canvas: HTMLCanvasElement): ThreeSceneInstance {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x00020a, 0.002);

  const camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 3000);
  camera.position.set(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(canvas.width, canvas.height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Geometric Rings Tunnel
  const ringCount = 60;
  const rings: { mesh: THREE.Mesh; baseZ: number; sides: number; freqIdx: number }[] = [];

  for (let i = 0; i < ringCount; i++) {
    const sides = 6 + (i % 3) * 2; // Hexagons, Octagons, Decagons
    const ringGeo = new THREE.RingGeometry(35, 38, sides);
    const color = new THREE.Color().setHSL((i / ringCount) * 0.8, 1, 0.55);
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      wireframe: true
    });
    const mesh = new THREE.Mesh(ringGeo, ringMat);
    const z = -i * 30;
    mesh.position.set(0, 0, z);
    scene.add(mesh);

    rings.push({ mesh, baseZ: z, sides, freqIdx: i % 48 });
  }

  // Warp star streaks
  const starCount = 1500;
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 120;
    starPos[i * 3] = Math.cos(angle) * dist;
    starPos[i * 3 + 1] = Math.sin(angle) * dist;
    starPos[i * 3 + 2] = -Math.random() * 1800;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0x00ffff,
    size: 2.5,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  });
  const starPoints = new THREE.Points(starGeo, starMat);
  scene.add(starPoints);

  let isDragging = false;
  let prevMouseX = 0;
  let prevMouseY = 0;
  let lookOffsetX = 0;
  let lookOffsetY = 0;

  return {
    scene,
    camera,
    renderer,
    update: (freq, _time, t, intensity) => {
      const bass = (getAvg(freq, 0, 8) / 255) * intensity;
      const speed = 4 + bass * 18;

      for (let i = 0; i < rings.length; i++) {
        const r = rings[i];
        r.mesh.position.z += speed;
        if (r.mesh.position.z > 50) {
          r.mesh.position.z = -((ringCount - 1) * 30);
        }

        const freqVal = (freq[r.freqIdx] / 255) * intensity;
        r.mesh.rotation.z = t * 0.001 * (i % 2 === 0 ? 1 : -1) + freqVal * 2;
        const scale = 1 + freqVal * 0.6 + bass * 0.4;
        r.mesh.scale.set(scale, scale, 1);
      }

      // Move star particles
      const starAttr = starGeo.attributes.position as THREE.BufferAttribute;
      const sArr = starAttr.array as Float32Array;
      for (let i = 0; i < starCount; i++) {
        sArr[i * 3 + 2] += speed * 2.2;
        if (sArr[i * 3 + 2] > 50) {
          sArr[i * 3 + 2] = -1800;
        }
      }
      starAttr.needsUpdate = true;

      // Camera dynamic roll & curve
      camera.rotation.z = Math.sin(t * 0.001) * 0.2 + (freq[10] / 255) * 0.2;
      camera.position.x = lookOffsetX + Math.sin(t * 0.002) * 8;
      camera.position.y = lookOffsetY + Math.cos(t * 0.002) * 8;
      camera.lookAt(lookOffsetX * 2, lookOffsetY * 2, -600);

      renderer.render(scene, camera);
    },
    resize: (w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    },
    handlePointerDown: (e) => {
      isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      prevMouseX = clientX;
      prevMouseY = clientY;
    },
    handlePointerMove: (e) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const dx = clientX - prevMouseX;
      const dy = clientY - prevMouseY;
      prevMouseX = clientX;
      prevMouseY = clientY;

      lookOffsetX -= dx * 0.08;
      lookOffsetY += dy * 0.08;
    },
    handlePointerUp: () => {
      isDragging = false;
    },
    handleWheel: () => {},
    resetCamera: () => {
      lookOffsetX = 0;
      lookOffsetY = 0;
    },
    destroy: () => {
      renderer.dispose();
      scene.clear();
    }
  };
}

// 6. NEW: Liquid Audio Sphere (Ferrofluid Blob)
export function createLiquidBlobScene(canvas: HTMLCanvasElement): ThreeSceneInstance {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, canvas.width / canvas.height, 0.1, 1000);
  camera.position.set(0, 0, 90);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(canvas.width, canvas.height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const ambLight = new THREE.AmbientLight(0x330066, 2.0);
  scene.add(ambLight);

  const keyLight = new THREE.PointLight(0x00ffff, 5, 300);
  keyLight.position.set(50, 50, 50);
  scene.add(keyLight);

  const fillLight = new THREE.PointLight(0xff007f, 4, 300);
  fillLight.position.set(-50, -50, 50);
  scene.add(fillLight);

  // Deformable Icosahedron
  const sphereGeo = new THREE.IcosahedronGeometry(25, 5);
  const basePos = sphereGeo.attributes.position.clone();
  
  const sphereMat = new THREE.MeshStandardMaterial({
    color: 0x050510,
    emissive: 0x1a0033,
    emissiveIntensity: 0.5,
    metalness: 0.95,
    roughness: 0.1,
    wireframe: false
  });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  scene.add(sphere);

  // Outer Wireframe Glow Cage
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    wireframe: true,
    transparent: true,
    opacity: 0.4
  });
  const wireSphere = new THREE.Mesh(sphereGeo.clone(), wireMat);
  scene.add(wireSphere);

  // Orbiting Electron Rings
  const ringGeo = new THREE.TorusGeometry(38, 0.6, 16, 100);
  const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x00ffff });
  const ring1 = new THREE.Mesh(ringGeo, ringMat1);
  scene.add(ring1);

  const ringMat2 = new THREE.MeshBasicMaterial({ color: 0xff007f });
  const ring2 = new THREE.Mesh(ringGeo, ringMat2);
  ring2.rotation.x = Math.PI / 2;
  scene.add(ring2);

  let isDragging = false;
  let prevMouseX = 0;
  let prevMouseY = 0;
  let rotX = 0;
  let rotY = 0;
  let camDistance = 90;

  return {
    scene,
    camera,
    renderer,
    update: (freq, _time, t, intensity) => {
      const bass = (getAvg(freq, 0, 8) / 255) * intensity;
      const treble = (getAvg(freq, 60, 120) / 255) * intensity;

      sphere.rotation.x = t * 0.0005;
      sphere.rotation.y = t * 0.0008;
      wireSphere.rotation.x = -t * 0.0004;
      wireSphere.rotation.y = -t * 0.0006;

      ring1.rotation.x = t * 0.001;
      ring1.rotation.y = t * 0.0015;
      ring2.rotation.y = -t * 0.0012;
      ring2.rotation.z = t * 0.0009;

      // Mathematical simplex/spherical harmonic displacement
      const pos = sphereGeo.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      const bArr = basePos.array as Float32Array;

      for (let i = 0; i < pos.count; i++) {
        const i3 = i * 3;
        const bx = bArr[i3];
        const by = bArr[i3 + 1];
        const bz = bArr[i3 + 2];

        const fIdx = (i % 64);
        const fVal = (freq[fIdx] / 255) * intensity;

        const noise = Math.sin(bx * 0.15 + t * 0.003) * Math.cos(by * 0.15 + t * 0.003) * Math.sin(bz * 0.15);
        const spike = 1 + bass * 0.6 + noise * (0.3 + fVal * 0.8);

        arr[i3] = bx * spike;
        arr[i3 + 1] = by * spike;
        arr[i3 + 2] = bz * spike;
      }
      pos.needsUpdate = true;
      sphereGeo.computeVertexNormals();

      const cageScale = 1.05 + bass * 0.3;
      wireSphere.scale.set(cageScale, cageScale, cageScale);

      keyLight.intensity = 3 + bass * 12;
      fillLight.intensity = 3 + treble * 10;

      camera.position.x = Math.sin(rotY) * Math.cos(rotX) * camDistance;
      camera.position.y = Math.sin(rotX) * camDistance;
      camera.position.z = Math.cos(rotY) * Math.cos(rotX) * camDistance;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    },
    resize: (w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    },
    handlePointerDown: (e) => {
      isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      prevMouseX = clientX;
      prevMouseY = clientY;
    },
    handlePointerMove: (e) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const dx = clientX - prevMouseX;
      const dy = clientY - prevMouseY;
      prevMouseX = clientX;
      prevMouseY = clientY;

      rotY -= dx * 0.008;
      rotX = Math.max(-1.4, Math.min(1.4, rotX + dy * 0.008));
    },
    handlePointerUp: () => {
      isDragging = false;
    },
    handleWheel: (e) => {
      camDistance = Math.max(35, Math.min(220, camDistance + e.deltaY * 0.2));
    },
    resetCamera: () => {
      rotX = 0;
      rotY = 0;
      camDistance = 90;
    },
    destroy: () => {
      renderer.dispose();
      scene.clear();
    }
  };
}
