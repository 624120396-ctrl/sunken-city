import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

type FishingSceneState = 'idle' | 'casting' | 'waiting' | 'biting' | 'reeling' | 'result';

interface FishingCanvasProps {
  state: FishingSceneState;
}

const rodTip = new THREE.Vector3(-2.15, 1.25, 0.92);

function getBobberPosition(state: FishingSceneState, elapsed = 0) {
  const base = new THREE.Vector3(0.85, -0.08, -0.4);
  if (state === 'idle') return new THREE.Vector3(-0.72, 0.28, 1.05);
  if (state === 'casting') return new THREE.Vector3(0.1 + elapsed * 0.24, 0.15 + Math.sin(elapsed * 6) * 0.08, 0.42 - elapsed * 0.28);
  if (state === 'biting') return base.add(new THREE.Vector3(Math.sin(elapsed * 20) * 0.08, -0.1 + Math.sin(elapsed * 16) * 0.08, Math.cos(elapsed * 17) * 0.06));
  if (state === 'reeling') return new THREE.Vector3(0.28 + Math.sin(elapsed * 9) * 0.05, 0.18 + Math.sin(elapsed * 12) * 0.05, 0.34);
  return base.add(new THREE.Vector3(0, Math.sin(elapsed * 2.2) * 0.045, Math.cos(elapsed * 1.6) * 0.035));
}

function CameraRig({ state }: FishingCanvasProps) {
  const { camera } = useThree();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const targetZ = state === 'biting' || state === 'reeling' ? 4.9 : 5.45;
    const targetY = state === 'result' ? 3.35 : 3.08;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, -0.24 + Math.sin(t * 0.18) * 0.08, 0.035);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.035);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.035);
    camera.lookAt(-0.18, 0.05, 0.2);
  });

  return null;
}

function WaterPlane({ state }: FishingCanvasProps) {
  const waterRef = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>>(null);
  const lightRef = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (waterRef.current) {
      waterRef.current.position.y = -0.21 + Math.sin(t * 1.4) * 0.012;
      waterRef.current.rotation.z = Math.sin(t * 0.36) * 0.015;
      waterRef.current.material.color.set(state === 'biting' ? '#314760' : '#10475a');
      waterRef.current.material.emissive.set(state === 'biting' ? '#58121e' : '#0a3a4c');
    }
    if (lightRef.current) {
      lightRef.current.position.x = Math.sin(t * 0.28) * 0.22;
      lightRef.current.material.opacity = state === 'biting' ? 0.34 + Math.sin(t * 10) * 0.08 : 0.28;
    }
  });

  return (
    <group>
      <mesh ref={waterRef} rotation-x={-Math.PI / 2} position={[0, -0.22, 0]} receiveShadow>
        <planeGeometry args={[9.2, 6.4, 32, 16]} />
        <meshStandardMaterial color="#10475a" emissive="#0a3a4c" emissiveIntensity={0.58} roughness={0.34} metalness={0.08} transparent opacity={0.92} />
      </mesh>
      <mesh ref={lightRef} rotation-x={-Math.PI / 2} position={[0.1, -0.205, -0.25]}>
        <planeGeometry args={[4.8, 2.8]} />
        <meshBasicMaterial color={state === 'biting' ? '#b42a36' : '#8fd3df'} transparent opacity={0.28} depthWrite={false} />
      </mesh>
      {Array.from({ length: 9 }).map((_, index) => (
        <mesh key={index} rotation-x={-Math.PI / 2} position={[-4 + index * 1.05, -0.19, -0.55 + (index % 3) * 0.22]}>
          <planeGeometry args={[0.55 + (index % 2) * 0.5, 0.012]} />
          <meshBasicMaterial color="#d6f4ef" transparent opacity={0.12} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function DistantHarbor() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.x = Math.sin(clock.getElapsedTime() * 0.16) * 0.04;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.18, -2.9]}>
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[5.8, 0.2, 0.08]} />
        <meshStandardMaterial color="#07131d" emissive="#102938" emissiveIntensity={0.45} transparent opacity={0.7} />
      </mesh>
      {[-2.4, -1.6, -0.7, 0.18, 1.15, 2.05].map((x, index) => (
        <mesh key={x} position={[x, 0.34 + (index % 3) * 0.2, 0]}>
          <boxGeometry args={[0.18 + (index % 2) * 0.08, 0.72 + (index % 3) * 0.28, 0.1]} />
          <meshStandardMaterial color="#081520" emissive="#163446" emissiveIntensity={0.42} transparent opacity={0.66} />
        </mesh>
      ))}
      <mesh position={[0.85, 0.58, 0.02]}>
        <torusGeometry args={[0.42, 0.035, 10, 32, Math.PI]} />
        <meshStandardMaterial color="#0a1721" emissive="#1a3b4e" emissiveIntensity={0.36} transparent opacity={0.62} />
      </mesh>
    </group>
  );
}

function PierAndRod({ state }: FishingCanvasProps) {
  const rodRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!rodRef.current) return;
    const t = clock.getElapsedTime();
    const stress = state === 'biting' || state === 'reeling' ? Math.sin(t * 14) * 0.035 : Math.sin(t * 1.4) * 0.01;
    rodRef.current.rotation.z = -0.68 + stress;
  });

  return (
    <group>
      <mesh position={[-2.05, -0.05, 1.25]} rotation-y={0.22}>
        <boxGeometry args={[2.7, 0.26, 1.2]} />
        <meshStandardMaterial color="#19120e" emissive="#120907" emissiveIntensity={0.25} roughness={0.86} metalness={0.03} />
      </mesh>
      {[-2.9, -2.25, -1.6].map((x) => (
        <mesh key={x} position={[x, -0.24, 1.25]}>
          <boxGeometry args={[0.08, 0.62, 1.2]} />
          <meshStandardMaterial color="#0d0908" roughness={0.95} />
        </mesh>
      ))}
      <group ref={rodRef} position={[-2.15, 0.1, 1.05]}>
        <mesh position={[0, 0.62, 0]} rotation-z={0.08}>
          <cylinderGeometry args={[0.018, 0.045, 2.4, 10]} />
          <meshStandardMaterial color="#24130d" emissive="#5a2d17" emissiveIntensity={0.18} roughness={0.68} />
        </mesh>
        <mesh position={[0.03, 1.27, 0]}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshStandardMaterial color="#e8d4a0" emissive="#c9a227" emissiveIntensity={0.42} />
        </mesh>
      </group>
    </group>
  );
}

function Bobber({ state }: FishingCanvasProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const position = getBobberPosition(state, t);
    groupRef.current.position.lerp(position, state === 'casting' ? 0.08 : 0.22);
    groupRef.current.rotation.z = Math.sin(t * (state === 'biting' ? 18 : 2.4)) * 0.18;
  });

  return (
    <group ref={groupRef} position={[-0.72, 0.28, 1.05]}>
      <mesh position={[0, 0.05, 0]}>
        <sphereGeometry args={[0.095, 18, 18]} />
        <meshStandardMaterial color={state === 'biting' ? '#e63b45' : '#f2e1b0'} emissive={state === 'biting' ? '#8f1422' : '#6f5a1a'} emissiveIntensity={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[0, -0.045, 0]}>
        <sphereGeometry args={[0.088, 18, 18]} />
        <meshStandardMaterial color="#321018" emissive="#5e101d" emissiveIntensity={state === 'biting' ? 0.72 : 0.28} roughness={0.5} />
      </mesh>
      <pointLight color={state === 'biting' ? '#c42a36' : '#d8b84b'} intensity={state === 'biting' ? 1.4 : 0.28} distance={1.6} />
    </group>
  );
}

function FishingLine({ state }: FishingCanvasProps) {
  const lineRef = useRef<THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>>(null);
  const geometry = useMemo(() => new THREE.BufferGeometry(), []);
  const material = useMemo(() => new THREE.LineBasicMaterial({ color: '#d8c48f', transparent: true, opacity: 0.82 }), []);
  const lineObject = useMemo(() => new THREE.Line(geometry, material), [geometry, material]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const bobber = getBobberPosition(state, t);
    const sag = state === 'reeling' || state === 'biting' ? 0.06 : -0.16;
    const mid = new THREE.Vector3((rodTip.x + bobber.x) / 2, (rodTip.y + bobber.y) / 2 + sag, (rodTip.z + bobber.z) / 2);
    geometry.setFromPoints([rodTip, mid, bobber]);
    geometry.computeBoundingSphere();
    material.opacity = state === 'idle' ? 0.42 : 0.86;
    material.color.set(state === 'biting' ? '#f1b1a8' : '#d8c48f');
  });

  return <primitive object={lineObject} ref={lineRef} />;
}

function BiteRings({ state }: FishingCanvasProps) {
  const rings = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!rings.current) return;
    const t = clock.getElapsedTime();
    const bobber = getBobberPosition(state, t);
    rings.current.position.set(bobber.x, -0.18, bobber.z);
    rings.current.children.forEach((child, index) => {
      const mesh = child as THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
      const pulse = ((t * 1.8 + index * 0.35) % 1) || 0.001;
      const scale = state === 'biting' ? 0.55 + pulse * 1.75 : 0.28 + pulse * 0.55;
      mesh.scale.setScalar(scale);
      mesh.material.opacity = state === 'biting' ? (1 - pulse) * 0.5 : 0.08;
    });
  });

  return (
    <group ref={rings} rotation-x={-Math.PI / 2}>
      {[0, 1, 2].map((index) => (
        <mesh key={index}>
          <torusGeometry args={[0.26, 0.006, 8, 48]} />
          <meshBasicMaterial color={state === 'biting' ? '#c92b36' : '#9edce5'} transparent opacity={0.1} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function HarborParticles({ state }: FishingCanvasProps) {
  const particles = useMemo(
    () =>
      Array.from({ length: 28 }, (_, index) => ({
        x: -3.8 + ((index * 37) % 76) / 10,
        y: 0.18 + ((index * 19) % 24) / 18,
        z: -2.5 + ((index * 23) % 44) / 12,
        speed: 0.45 + (index % 5) * 0.08,
      })),
    []
  );

  return (
    <group>
      {particles.map((particle, index) => (
        <FloatingParticle key={index} particle={particle} danger={state === 'biting'} />
      ))}
    </group>
  );
}

function FloatingParticle({ particle, danger }: { particle: { x: number; y: number; z: number; speed: number }; danger: boolean }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * particle.speed;
    ref.current.position.set(particle.x + Math.sin(t * 0.37) * 0.12, particle.y + Math.sin(t) * 0.04, particle.z + Math.cos(t * 0.29) * 0.1);
  });

  return (
    <mesh ref={ref} position={[particle.x, particle.y, particle.z]}>
      <sphereGeometry args={[0.014, 8, 8]} />
      <meshBasicMaterial color={danger ? '#d6414b' : '#bce7e4'} transparent opacity={danger ? 0.38 : 0.22} depthWrite={false} />
    </mesh>
  );
}

function HarborScene({ state }: FishingCanvasProps) {
  return (
    <>
      <color attach="background" args={['#06101a']} />
      <fog attach="fog" args={['#06101a', 5.8, 10.5]} />
      <ambientLight intensity={1.05} color="#a8dce4" />
      <directionalLight position={[-3.5, 4.6, 4.2]} intensity={2.05} color="#e8d4a0" />
      <pointLight position={[1.2, 0.4, -0.8]} intensity={state === 'biting' ? 3.1 : 1.35} color={state === 'biting' ? '#b52a36' : '#35b8d1'} distance={5.8} />
      <CameraRig state={state} />
      <DistantHarbor />
      <WaterPlane state={state} />
      <PierAndRod state={state} />
      <FishingLine state={state} />
      <Bobber state={state} />
      <BiteRings state={state} />
      <HarborParticles state={state} />
    </>
  );
}

export function FishingCanvas({ state }: FishingCanvasProps) {
  return (
    <div className="fishing-canvas-shell" role="img" aria-label="黑水港深海钓鱼游戏场景">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [-0.24, 3.08, 5.45], fov: 40, near: 0.1, far: 32 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <HarborScene state={state} />
      </Canvas>
      <div className="fishing-canvas-vignette" />
      <div className="fishing-canvas-label">
        <span>BLACKWATER HARBOR</span>
        <strong>{state === 'biting' ? '深渊咬钩' : state === 'reeling' ? '钓线绷紧' : '冷雾潮位稳定'}</strong>
      </div>
    </div>
  );
}
