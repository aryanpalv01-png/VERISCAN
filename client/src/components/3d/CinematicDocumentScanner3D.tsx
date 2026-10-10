import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export interface CinematicDocumentScanner3DProps {
  progress: number; // 0.0 to 1.0 controlled by GSAP ScrollTrigger
  activeSpecimenType?: "genuine" | "forged";
}

/**
 * Procedural texture generator for high-res security document card
 */
function createDocumentTexture(isForged = false): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 646; // Standard ID-1 aspect ratio ~ 1.585
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // 1. Sleek obsidian / midnight gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, 1024, 646);
  bgGrad.addColorStop(0, "#0b0f19");
  bgGrad.addColorStop(0.5, "#111827");
  bgGrad.addColorStop(1, "#0f172a");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 646);

  // 2. Guilloche security wave patterns
  ctx.save();
  ctx.strokeStyle = "rgba(99, 102, 241, 0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 30; i++) {
    ctx.beginPath();
    for (let x = 0; x < 1024; x += 10) {
      const y = 320 + Math.sin(x * 0.015 + i * 0.3) * (40 + i * 4) + Math.cos(x * 0.008) * 30;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();

  // 3. Fine grid matrix
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
  ctx.lineWidth = 1;
  for (let x = 40; x < 1024; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 40);
    ctx.lineTo(x, 606);
    ctx.stroke();
  }
  for (let y = 40; y < 646; y += 32) {
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(984, y);
    ctx.stroke();
  }
  ctx.restore();

  // 4. Header Bar & Emblem
  ctx.fillStyle = "rgba(79, 70, 229, 0.25)";
  ctx.fillRect(40, 40, 944, 70);
  ctx.strokeStyle = "rgba(129, 140, 248, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(40, 40, 944, 70);

  // Header Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("REPUBLIC OF INDIA · NATIONAL DIGITAL IDENTITY", 64, 84);

  ctx.fillStyle = "rgba(165, 180, 252, 0.9)";
  ctx.font = "bold 13px 'JetBrains Mono', monospace";
  ctx.fillText("VERISCAN INSTITUTIONAL FORENSIC SPECIMEN // ISO 7810 ID-1", 64, 102);

  // Status Badge
  const badgeText = isForged ? "ANOMALY FLAGGED" : "CRYPTOGRAPHICALLY VERIFIED";
  const badgeColor = isForged ? "#f43f5e" : "#10b981";
  ctx.fillStyle = badgeColor;
  ctx.beginPath();
  ctx.roundRect(740, 56, 224, 38, 8);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 12px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText(badgeText, 852, 80);
  ctx.textAlign = "left";

  // 5. Specimen Photo Frame
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(64, 150, 190, 240);
  ctx.strokeStyle = "rgba(99, 102, 241, 0.6)";
  ctx.lineWidth = 2;
  ctx.strokeRect(64, 150, 190, 240);

  // Photo Silhouette / Biometric Reticle
  ctx.strokeStyle = "rgba(129, 140, 248, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(159, 235, 45, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(159, 340, 70, Math.PI * 1.2, Math.PI * 1.8);
  ctx.stroke();

  // Face reticle corners
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2.5;
  const corners = [
    [114, 190, 15, 0, 0, 15],
    [204, 190, -15, 0, 0, 15],
    [114, 280, 15, 0, 0, -15],
    [204, 280, -15, 0, 0, -15],
  ];
  corners.forEach(([x, y, dx1, dy1, dx2, dy2]) => {
    ctx.beginPath();
    ctx.moveTo(x + dx1, y + dy1);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx2, y + dy2);
    ctx.stroke();
  });

  // 6. Gold Metallic Smart Chip
  ctx.fillStyle = "#eab308";
  ctx.fillRect(290, 150, 96, 76);
  ctx.strokeStyle = "#ca8a04";
  ctx.lineWidth = 2;
  ctx.strokeRect(290, 150, 96, 76);

  // Chip contact pads
  ctx.strokeStyle = "#a16207";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(338, 150);
  ctx.lineTo(338, 226);
  ctx.moveTo(290, 188);
  ctx.lineTo(386, 188);
  ctx.moveTo(314, 150);
  ctx.lineTo(314, 226);
  ctx.moveTo(362, 150);
  ctx.lineTo(362, 226);
  ctx.stroke();

  // 7. Demographic & Security Data Fields
  ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
  ctx.font = "bold 11px 'JetBrains Mono', monospace";
  ctx.fillText("LEGAL NAME / HOLDER", 420, 164);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(isForged ? "PRIYA R. SHARMA" : "RAHUL K. SHARMA", 420, 190);

  ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
  ctx.font = "bold 11px 'JetBrains Mono', monospace";
  ctx.fillText("SPECIMEN NUMBER / REGISTRY", 420, 230);
  ctx.fillStyle = isForged ? "#f87171" : "#38bdf8";
  ctx.font = "bold 20px 'JetBrains Mono', monospace";
  ctx.fillText(isForged ? "9182 3412 8891 [SPLICED]" : "9182 3412 8891 [VALID]", 420, 256);

  ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
  ctx.font = "bold 11px 'JetBrains Mono', monospace";
  ctx.fillText("DOB / GENDER", 420, 296);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("12/08/1992 · MALE", 420, 318);

  ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
  ctx.font = "bold 11px 'JetBrains Mono', monospace";
  ctx.fillText("ISSUING AUTHORITY", 420, 356);
  ctx.fillStyle = "#a5b4fc";
  ctx.font = "bold 14px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("GOVT OF INDIA · MINISTRY OF ELECTRONICS & IT", 420, 376);

  // 8. Holographic Security Foil Strip (Right margin)
  const foilGrad = ctx.createLinearGradient(910, 140, 960, 480);
  foilGrad.addColorStop(0, "rgba(236, 72, 153, 0.7)");
  foilGrad.addColorStop(0.25, "rgba(99, 102, 241, 0.7)");
  foilGrad.addColorStop(0.5, "rgba(6, 182, 212, 0.7)");
  foilGrad.addColorStop(0.75, "rgba(16, 185, 129, 0.7)");
  foilGrad.addColorStop(1, "rgba(234, 179, 8, 0.7)");
  ctx.fillStyle = foilGrad;
  ctx.fillRect(914, 140, 48, 340);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.lineWidth = 1;
  ctx.strokeRect(914, 140, 48, 340);

  // 9. Machine Readable Zone (MRZ)
  ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
  ctx.fillRect(40, 500, 944, 106);
  ctx.strokeStyle = "rgba(99, 102, 241, 0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(40, 500, 944, 106);

  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 20px 'JetBrains Mono', monospace";
  ctx.fillText("P<INDSHARMA<<RAHUL<<<<<<<<<<<<<<<<<<<<<<<<<<<", 64, 544);
  ctx.fillText("A928371928IND9208122M3208129<<<<<<<<<<<<<<<04", 64, 584);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  return tex;
}

/**
 * Procedural texture for ELA compression heatmap layer
 */
function createElaHeatmapTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 646;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Transparent dark base
  ctx.fillStyle = "rgba(11, 15, 25, 0.82)";
  ctx.fillRect(0, 0, 1024, 646);

  // 8x8 DCT grid
  ctx.strokeStyle = "rgba(99, 102, 241, 0.25)";
  ctx.lineWidth = 1;
  for (let x = 0; x < 1024; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 646);
    ctx.stroke();
  }
  for (let y = 0; y < 646; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // Spliced heat anomalies (amber/crimson glowing zones)
  const drawHeatZone = (cx: number, cy: number, r: number, color: string) => {
    const rad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    rad.addColorStop(0, color);
    rad.addColorStop(0.6, color.replace("1)", "0.35)"));
    rad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };

  drawHeatZone(550, 240, 130, "rgba(244, 63, 94, 0.85)"); // Spliced number zone
  drawHeatZone(160, 250, 100, "rgba(245, 158, 11, 0.75)"); // Photo boundary
  drawHeatZone(500, 180, 80, "rgba(244, 63, 94, 0.65)"); // Name boundary

  // Pristine cool zones (cyan)
  drawHeatZone(340, 180, 60, "rgba(6, 182, 212, 0.5)");
  drawHeatZone(450, 550, 160, "rgba(6, 182, 212, 0.4)");

  // Telemetry HUD text on the heatmap
  ctx.fillStyle = "#f43f5e";
  ctx.font = "bold 16px 'JetBrains Mono', monospace";
  ctx.fillText("! DCT 8x8 COMPRESSION DISCONTINUITY (Δ = 24.8)", 420, 280);
  ctx.fillStyle = "#38bdf8";
  ctx.fillText("✓ PRISTINE SENSOR NOISE MATRIX", 64, 430);

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

/**
 * Procedural texture for Checksum & Structural Validation layer
 */
function createChecksumLayerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 646;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.fillRect(0, 0, 1024, 646);

  // Cybernetic circuit vector traces
  ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(64, 100);
  ctx.lineTo(260, 100);
  ctx.lineTo(310, 150);
  ctx.lineTo(700, 150);
  ctx.lineTo(750, 200);
  ctx.lineTo(950, 200);
  ctx.stroke();

  // Verification Nodes
  const nodes = [
    { x: 310, y: 150, title: "VERHOEFF MATRIX D5", status: "PARITY VERIFIED", pass: true },
    { x: 750, y: 200, title: "ICAO 9303 WEIGHT (7-3-1)", status: "MRZ PASSED", pass: true },
    { x: 310, y: 350, title: "ISO 3166-1 ISSUER", status: "AUTH: REPUBLIC OF INDIA", pass: true },
    { x: 750, y: 450, title: "MICRO-FONT INTEGRITY", status: "NO JITTER DETECTED", pass: true },
  ];

  nodes.forEach((n) => {
    ctx.fillStyle = n.pass ? "rgba(16, 185, 129, 0.2)" : "rgba(244, 63, 94, 0.2)";
    ctx.strokeStyle = n.pass ? "#10b981" : "#f43f5e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(n.x - 140, n.y - 25, 280, 50, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(n.title, n.x, n.y - 4);
    ctx.fillStyle = n.pass ? "#34d399" : "#f87171";
    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.fillText(n.status, n.x, n.y + 14);
  });

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

/**
 * Procedural texture for 2048-bit RSA Cryptographic Proof Layer
 */
function createCryptoLayerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 646;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = "rgba(11, 15, 25, 0.88)";
  ctx.fillRect(0, 0, 1024, 646);

  // Big central glowing cryptographic shield
  ctx.strokeStyle = "#6366f1";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(512, 100);
  ctx.lineTo(660, 140);
  ctx.lineTo(660, 330);
  ctx.quadraticCurveTo(660, 470, 512, 530);
  ctx.quadraticCurveTo(364, 470, 364, 330);
  ctx.lineTo(364, 140);
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = "rgba(99, 102, 241, 0.15)";
  ctx.fill();

  // Golden padlock emblem inside
  ctx.strokeStyle = "#eab308";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(512, 280, 42, Math.PI, 0);
  ctx.lineTo(554, 330);
  ctx.lineTo(470, 330);
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = "#eab308";
  ctx.beginPath();
  ctx.roundRect(460, 330, 104, 80, 10);
  ctx.fill();

  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(512, 365, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(509, 365, 6, 20);

  // Key details
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("RSA-2048 CRYPTOGRAPHIC ANCHOR", 512, 450);

  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 13px 'JetBrains Mono', monospace";
  ctx.fillText("SHA-256 HASH: 8f49b1a0...32c7e0f2 · IMMUTABLE IMMUNITY", 512, 480);

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

export function CinematicDocumentScanner3D({
  progress,
  activeSpecimenType = "genuine",
}: CinematicDocumentScanner3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Internal lerp target
  const targetProgressRef = useRef(progress);
  targetProgressRef.current = progress;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- 1. Three.js Scene Setup ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060913, 0.08);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.2);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    container.appendChild(renderer.domElement);

    // --- 2. Lighting Rig ---
    const ambientLight = new THREE.AmbientLight(0x312e81, 1.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(4, 6, 8);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x6366f1, 3.5);
    rimLight.position.set(-6, -4, 4);
    scene.add(rimLight);

    // Orbiting colored point lights
    const pointLightIndigo = new THREE.PointLight(0x6366f1, 30, 20);
    scene.add(pointLightIndigo);

    const pointLightCyan = new THREE.PointLight(0x06b6d4, 25, 20);
    scene.add(pointLightCyan);

    const pointLightLaser = new THREE.PointLight(0x10b981, 40, 10);
    scene.add(pointLightLaser);

    // --- 3. 3D Document Multi-Slab Assembly ---
    const documentRig = new THREE.Group();
    scene.add(documentRig);

    const cardWidth = 4.8;
    const cardHeight = 3.03;

    // Layer 1: Base Document Specimen (Realistic Physical Material)
    const baseTex = createDocumentTexture(activeSpecimenType === "forged");
    const baseGeo = new THREE.BoxGeometry(cardWidth, cardHeight, 0.05);
    const baseMat = new THREE.MeshPhysicalMaterial({
      map: baseTex,
      roughness: 0.18,
      metalness: 0.15,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
      reflectivity: 0.9,
    });
    const baseCard = new THREE.Mesh(baseGeo, baseMat);
    documentRig.add(baseCard);

    // Layer 2: ELA Heatmap Slab
    const elaTex = createElaHeatmapTexture();
    const layerGeo = new THREE.PlaneGeometry(cardWidth, cardHeight);
    const elaMat = new THREE.MeshStandardMaterial({
      map: elaTex,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      roughness: 0.2,
      metalness: 0.3,
    });
    const elaSlab = new THREE.Mesh(layerGeo, elaMat);
    elaSlab.position.z = 0.05;
    documentRig.add(elaSlab);

    // Layer 3: Checksum & Verification Matrix Slab
    const checksumTex = createChecksumLayerTexture();
    const checksumMat = new THREE.MeshStandardMaterial({
      map: checksumTex,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      roughness: 0.2,
      metalness: 0.3,
    });
    const checksumSlab = new THREE.Mesh(layerGeo, checksumMat);
    checksumSlab.position.z = 0.1;
    documentRig.add(checksumSlab);

    // Layer 4: Cryptographic 2048-bit RSA Shield Slab
    const cryptoTex = createCryptoLayerTexture();
    const cryptoMat = new THREE.MeshStandardMaterial({
      map: cryptoTex,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      roughness: 0.2,
      metalness: 0.4,
    });
    const cryptoSlab = new THREE.Mesh(layerGeo, cryptoMat);
    cryptoSlab.position.z = 0.15;
    documentRig.add(cryptoSlab);

    // --- 4. Volumetric Laser Scanner Sweep Bar ---
    const laserBarGeo = new THREE.PlaneGeometry(cardWidth + 0.4, 0.08);
    const laserBarMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const laserBar = new THREE.Mesh(laserBarGeo, laserBarMat);
    laserBar.position.z = 0.04;
    documentRig.add(laserBar);

    // Subtle laser beam halo glow
    const laserGlowGeo = new THREE.PlaneGeometry(cardWidth + 0.4, 0.45);
    const laserGlowMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const laserGlow = new THREE.Mesh(laserGlowGeo, laserGlowMat);
    laserBar.add(laserGlow);

    // --- 5. Floating Constellation & Hash Block Particle Field ---
    const particleCount = 650;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const cIndigo = new THREE.Color(0x6366f1);
    const cCyan = new THREE.Color(0x06b6d4);
    const cEmerald = new THREE.Color(0x10b981);

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const rad = 3.5 + Math.random() * 6.5;

      particlePositions[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = (rad * Math.sin(phi) * Math.sin(theta)) * 0.7;
      particlePositions[i * 3 + 2] = rad * Math.cos(phi);

      const chosenColor = Math.random() > 0.6 ? cEmerald : Math.random() > 0.3 ? cCyan : cIndigo;
      particleColors[i * 3] = chosenColor.r;
      particleColors[i * 3 + 1] = chosenColor.g;
      particleColors[i * 3 + 2] = chosenColor.b;
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // --- 6. Resize Handler ---
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // --- 7. Animation Loop with Smooth Lerping ---
    let currentLerp = targetProgressRef.current;
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      const dt = clock.getDelta();
      const time = clock.getElapsedTime();

      // Smooth dampening towards target progress
      currentLerp += (targetProgressRef.current - currentLerp) * 0.09;
      const p = Math.max(0, Math.min(1, currentLerp));

      // 1. Particle rotation
      particles.rotation.y = time * 0.04 + p * 0.6;
      particles.rotation.x = Math.sin(time * 0.03) * 0.1;

      // 2. Light orbiting
      pointLightIndigo.position.set(
        Math.cos(time * 0.8) * 5,
        Math.sin(time * 0.6) * 3,
        Math.sin(time * 0.8) * 5
      );
      pointLightCyan.position.set(
        Math.cos(time * 0.8 + Math.PI) * 5,
        Math.cos(time * 0.5) * 3,
        Math.sin(time * 0.8 + Math.PI) * 5
      );

      // 3. Laser Sweep Animation
      const laserSpeed = 1.8 + p * 2.2;
      const laserY = Math.sin(time * laserSpeed) * (cardHeight * 0.46);
      laserBar.position.y = laserY;
      pointLightLaser.position.set(0, laserY, 0.4);

      // 4. Multi-Phase Camera Rig & Document Choreography based on scroll progress
      // Phase 1 (0.00 - 0.25): Intro Hero floating document
      // Phase 2 (0.25 - 0.55): Laser scan & ELA analysis angle
      // Phase 3 (0.55 - 0.85): Exploded 3D layer deconstruction
      // Phase 4 (0.85 - 1.00): Convergence into cryptographic proof

      if (p < 0.3) {
        // Phase 1: Gentle float, tilted hero
        const subP = p / 0.3;
        camera.position.x = THREE.MathUtils.lerp(0, 1.2, subP);
        camera.position.y = THREE.MathUtils.lerp(0, 0.3, subP);
        camera.position.z = THREE.MathUtils.lerp(7.2, 5.8, subP);

        documentRig.rotation.x = THREE.MathUtils.lerp(0.12, 0.25, subP) + Math.sin(time * 0.8) * 0.03;
        documentRig.rotation.y = THREE.MathUtils.lerp(-0.25, -0.45, subP) + Math.cos(time * 0.6) * 0.03;
        documentRig.rotation.z = THREE.MathUtils.lerp(0.04, 0.08, subP);

        elaMat.opacity = THREE.MathUtils.lerp(0.0, 0.2, subP);
        checksumMat.opacity = 0.0;
        cryptoMat.opacity = 0.0;

        elaSlab.position.z = 0.06;
        checksumSlab.position.z = 0.12;
        cryptoSlab.position.z = 0.18;
      } else if (p < 0.65) {
        // Phase 2: Close-up Laser inspection
        const subP = (p - 0.3) / 0.35;
        camera.position.x = THREE.MathUtils.lerp(1.2, -1.0, subP);
        camera.position.y = THREE.MathUtils.lerp(0.3, 0.1, subP);
        camera.position.z = THREE.MathUtils.lerp(5.8, 4.8, subP);

        documentRig.rotation.x = THREE.MathUtils.lerp(0.25, 0.32, subP);
        documentRig.rotation.y = THREE.MathUtils.lerp(-0.45, 0.42, subP);
        documentRig.rotation.z = THREE.MathUtils.lerp(0.08, -0.06, subP);

        elaMat.opacity = THREE.MathUtils.lerp(0.2, 0.95, subP);
        checksumMat.opacity = THREE.MathUtils.lerp(0.0, 0.3, subP);
        cryptoMat.opacity = 0.0;

        // Slight layer separation starts
        elaSlab.position.z = THREE.MathUtils.lerp(0.06, 0.35, subP);
        checksumSlab.position.z = THREE.MathUtils.lerp(0.12, 0.65, subP);
        cryptoSlab.position.z = THREE.MathUtils.lerp(0.18, 0.95, subP);
      } else if (p < 0.9) {
        // Phase 3: Exploded Isometric Multi-Layer Deconstruction
        const subP = (p - 0.65) / 0.25;
        camera.position.x = THREE.MathUtils.lerp(-1.0, 3.2, subP);
        camera.position.y = THREE.MathUtils.lerp(0.1, 1.8, subP);
        camera.position.z = THREE.MathUtils.lerp(4.8, 6.2, subP);

        documentRig.rotation.x = THREE.MathUtils.lerp(0.32, 0.45, subP);
        documentRig.rotation.y = THREE.MathUtils.lerp(0.42, -0.65, subP);
        documentRig.rotation.z = THREE.MathUtils.lerp(-0.06, 0.18, subP);

        elaMat.opacity = 0.92;
        checksumMat.opacity = THREE.MathUtils.lerp(0.3, 0.95, subP);
        cryptoMat.opacity = THREE.MathUtils.lerp(0.0, 0.85, subP);

        // Maximum exploded spacing in Z
        elaSlab.position.z = THREE.MathUtils.lerp(0.35, 0.95, subP);
        checksumSlab.position.z = THREE.MathUtils.lerp(0.65, 1.85, subP);
        cryptoSlab.position.z = THREE.MathUtils.lerp(0.95, 2.75, subP);
      } else {
        // Phase 4: Convergence into Cryptographic Locking Matrix
        const subP = (p - 0.9) / 0.1;
        camera.position.x = THREE.MathUtils.lerp(3.2, 0.0, subP);
        camera.position.y = THREE.MathUtils.lerp(1.8, 0.2, subP);
        camera.position.z = THREE.MathUtils.lerp(6.2, 5.4, subP);

        documentRig.rotation.x = THREE.MathUtils.lerp(0.45, 0.08, subP);
        documentRig.rotation.y = THREE.MathUtils.lerp(-0.65, 0.0, subP);
        documentRig.rotation.z = THREE.MathUtils.lerp(0.18, 0.0, subP);

        // Layers collapse back into solid verified card
        elaSlab.position.z = THREE.MathUtils.lerp(0.95, 0.06, subP);
        checksumSlab.position.z = THREE.MathUtils.lerp(1.85, 0.1, subP);
        cryptoSlab.position.z = THREE.MathUtils.lerp(2.75, 0.14, subP);

        elaMat.opacity = THREE.MathUtils.lerp(0.92, 0.3, subP);
        checksumMat.opacity = THREE.MathUtils.lerp(0.95, 0.2, subP);
        cryptoMat.opacity = THREE.MathUtils.lerp(0.85, 0.95, subP);

        // Burst laser color to verified emerald
        laserBarMat.color.setHex(0x10b981);
        laserGlowMat.color.setHex(0x34d399);
      }

      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };

    animate();

    // --- 8. Cleanup ---
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);

      // Dispose Geometries and Materials
      baseGeo.dispose();
      baseMat.dispose();
      baseTex.dispose();

      layerGeo.dispose();
      elaMat.dispose();
      elaTex.dispose();

      checksumMat.dispose();
      checksumTex.dispose();

      cryptoMat.dispose();
      cryptoTex.dispose();

      laserBarGeo.dispose();
      laserBarMat.dispose();
      laserGlowGeo.dispose();
      laserGlowMat.dispose();

      particleGeo.dispose();
      particleMat.dispose();

      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [activeSpecimenType]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
