'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const PARTICLE_COUNT = 120;
const MAX_DIST       = 90;
const MAX_LINKS      = PARTICLE_COUNT * PARTICLE_COUNT;

export default function BackgroundScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // ── Scene ────────────────────────────────────────────────────────────
    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);
    camera.position.z = 250;

    // ── Particles ────────────────────────────────────────────────────────
    const positions  = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 500;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 400;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 150;
      velocities[i * 3]     = (Math.random() - 0.5) * 0.25;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.25;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.08;
    }

    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
    const dotMat = new THREE.PointsMaterial({ color: 0x818cf8, size: 2.5, transparent: true, opacity: 0.7, sizeAttenuation: true });
    const dots   = new THREE.Points(dotGeo, dotMat);
    scene.add(dots);

    // ── Lines (pre-allocated buffer) ─────────────────────────────────────
    const linePositions = new Float32Array(MAX_LINKS * 6);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const lineMat  = new THREE.LineBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.12, vertexColors: false });
    const lines    = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    // ── Floating orbs (3D spheres) ────────────────────────────────────────
    const orbData: { mesh: THREE.Mesh; speed: number; axis: THREE.Vector3 }[] = [];
    const orbColors = [0x6366f1, 0x818cf8, 0x4f46e5, 0x7c3aed];
    for (let i = 0; i < 5; i++) {
      const geo  = new THREE.IcosahedronGeometry(8 + Math.random() * 12, 1);
      const mat  = new THREE.MeshBasicMaterial({ color: orbColors[i % orbColors.length], wireframe: true, transparent: true, opacity: 0.08 + Math.random() * 0.06 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set((Math.random() - 0.5) * 400, (Math.random() - 0.5) * 300, (Math.random() - 0.5) * 100);
      scene.add(mesh);
      orbData.push({ mesh, speed: 0.002 + Math.random() * 0.004, axis: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize() });
    }

    // ── Animate ───────────────────────────────────────────────────────────
    let animId: number;
    const pos = dotGeo.attributes.position.array as Float32Array;

    const tick = () => {
      animId = requestAnimationFrame(tick);

      // Move particles
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        pos[i * 3]     += velocities[i * 3];
        pos[i * 3 + 1] += velocities[i * 3 + 1];
        pos[i * 3 + 2] += velocities[i * 3 + 2];
        if (Math.abs(pos[i * 3])     > 250) velocities[i * 3]     *= -1;
        if (Math.abs(pos[i * 3 + 1]) > 200) velocities[i * 3 + 1] *= -1;
        if (Math.abs(pos[i * 3 + 2]) > 75)  velocities[i * 3 + 2] *= -1;
      }
      dotGeo.attributes.position.needsUpdate = true;

      // Build connection lines
      let linkIdx = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        for (let j = i + 1; j < PARTICLE_COUNT; j++) {
          const dx = pos[i * 3] - pos[j * 3];
          const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
          const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
          if (dx * dx + dy * dy + dz * dz < MAX_DIST * MAX_DIST) {
            linePositions[linkIdx++] = pos[i * 3];
            linePositions[linkIdx++] = pos[i * 3 + 1];
            linePositions[linkIdx++] = pos[i * 3 + 2];
            linePositions[linkIdx++] = pos[j * 3];
            linePositions[linkIdx++] = pos[j * 3 + 1];
            linePositions[linkIdx++] = pos[j * 3 + 2];
          }
        }
      }
      lineGeo.attributes.position.needsUpdate = true;
      lineGeo.setDrawRange(0, linkIdx / 3);

      // Rotate orbs
      orbData.forEach(({ mesh, speed, axis }) => mesh.rotateOnAxis(axis, speed));

      // Slow scene drift
      scene.rotation.y += 0.0003;
      scene.rotation.x += 0.0001;

      renderer.render(scene, camera);
    };
    tick();

    // ── Resize ────────────────────────────────────────────────────────────
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      dotGeo.dispose();
      lineGeo.dispose();
      dotMat.dispose();
      lineMat.dispose();
      if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="fixed inset-0 z-0 pointer-events-none" />;
}
