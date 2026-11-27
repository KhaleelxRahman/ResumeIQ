import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type * as THREE from 'three';

interface PointerOffset {
  x: number;
  y: number;
}

function CalibrationPrismRig({
  pointer,
  active,
}: {
  pointer: PointerOffset;
  active: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!active || !groupRef.current) return;
    const targetRotY = pointer.x * 0.25 + Math.sin(state.clock.elapsedTime * 0.35) * 0.08;
    const targetRotX = -pointer.y * 0.18 + 0.12;
    groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * Math.min(1, delta * 4);
    groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * Math.min(1, delta * 4);
  });

  return (
    <group ref={groupRef}>
      {/* Layer 1: Raw document sheet */}
      <mesh position={[-0.18, 0.08, -0.45]}>
        <boxGeometry args={[1.65, 2.2, 0.04]} />
        <meshStandardMaterial color="#141923" roughness={0.55} metalness={0.35} />
      </mesh>
      {/* Layer 2: Parsed structured plane */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.65, 2.2, 0.04]} />
        <meshStandardMaterial color="#1B2232" roughness={0.35} metalness={0.5} wireframe={false} />
      </mesh>
      {/* Layer 3: Diagnostic verification lattice */}
      <mesh position={[0.18, -0.06, 0.45]}>
        <boxGeometry args={[1.65, 2.2, 0.03]} />
        <meshStandardMaterial color="#7C5CFF" wireframe transparent opacity={0.45} />
      </mesh>
      {/* Calibrated axis ring (<= 200 triangles) */}
      <mesh rotation={[Math.PI / 2.2, 0.2, 0]}>
        <torusGeometry args={[1.65, 0.015, 8, 48]} />
        <meshBasicMaterial color="#38BDF8" transparent opacity={0.65} />
      </mesh>
    </group>
  );
}

export default function HeroPrismCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState<PointerOffset>({ x: 0, y: 0 });
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(
    typeof document !== 'undefined' ? !document.hidden : true,
  );

  useEffect(() => {
    const onVisibility = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);

    let observer: IntersectionObserver | undefined;
    if (containerRef.current && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        ([entry]) => setInView(entry.isIntersecting),
        { threshold: 0.1 },
      );
      observer.observe(containerRef.current);
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      observer?.disconnect();
    };
  }, []);

  const updateCoordinates = (clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((clientY - rect.top) / rect.height) * 2 - 1);
    setPointer({ x, y });
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full min-h-[380px] w-full"
      onPointerMove={(e) => updateCoordinates(e.clientX, e.clientY)}
      onTouchMove={(e) => {
        if (e.touches[0]) {
          updateCoordinates(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
    >
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 4.4], fov: 42 }}
        gl={{ antialias: true, powerPreference: 'low-power' }}
        aria-label="Interactive 3D calibration prism representing structured resume layers"
        role="img"
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 4, 5]} intensity={1.4} color="#F3F5F8" />
        <pointLight position={[-3, -2, 3]} intensity={1.1} color="#38BDF8" />
        <CalibrationPrismRig pointer={pointer} active={inView && tabVisible} />
      </Canvas>
      <div className="pointer-events-none absolute bottom-3 left-4 right-4 flex flex-wrap justify-between gap-2 border-t border-[var(--border-hairline)] pt-2 font-mono-tabular text-[11px] text-[var(--text-secondary)]">
        <span>3D CALIBRATION PRISM // &lt;= 6,000 TRIS</span>
        <span>DPR [1, 1.75] // ZERO SHADOWS</span>
      </div>
    </div>
  );
}
