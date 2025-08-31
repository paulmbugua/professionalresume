// apps/web/src/pages/RobotExport.web.tsx
import React, { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, ThreeElements } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

function useDownloadBlob() {
  return (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
}

/** Strip HDR env/background + any non-DOM textures (esp. envMap) for clean export */
function prepareSceneForExport(scene: THREE.Scene) {
  const prev = { background: scene.background, environment: scene.environment };
  scene.background = null;
  scene.environment = null;

  const isValidImage = (img: any) =>
    img instanceof HTMLImageElement ||
    img instanceof HTMLCanvasElement ||
    (typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap) ||
    (typeof OffscreenCanvas !== 'undefined' && img instanceof OffscreenCanvas);

  const TEX_KEYS = [
    'map','normalMap','roughnessMap','metalnessMap','emissiveMap','aoMap','lightMap',
    'bumpMap','displacementMap','alphaMap','clearcoatMap','clearcoatNormalMap',
    'clearcoatRoughnessMap','sheenColorMap','sheenRoughnessMap','specularIntensityMap',
    'specularColorMap','transmissionMap','thicknessMap','anisotropyMap','iridescenceMap',
    'iridescenceThicknessMap','envMap'
  ] as const;

  // lock light direction
  scene.traverse((obj) => {
    const anyObj = obj as any;
    if (anyObj.isDirectionalLight || anyObj.isSpotLight) {
      const light = obj as THREE.DirectionalLight | THREE.SpotLight;
      if (!light.target.parent || light.target.parent !== light) light.add(light.target);
      light.target.position.set(0, 0, -1);
    }
  });

  // remove non-exportable textures
  scene.traverse((obj) => {
    const mesh = obj as any;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of materials) {
      if (!mat) continue;
      let touched = false;
      for (const key of TEX_KEYS) {
        const tex: THREE.Texture | undefined = mat[key];
        if (!tex) continue;
        const img: any = (tex as any).image ?? (tex as any).source?.data;
        if (!isValidImage(img) || key === 'envMap') {
          mat[key] = null;
          touched = true;
        }
      }
      if (touched) mat.needsUpdate = true;
    }
  });

  return () => {
    scene.background = prev.background as any;
    scene.environment = prev.environment as any;
  };
}

/** ----------------- Human-like Robot with facial features & hands ----------------- */
function HumanLikeRobot(props: ThreeElements['group']) {
  const group = useRef<THREE.Group>(null!);

  // facial refs
  const jaw = useRef<THREE.Mesh>(null!);
  const eyelidL = useRef<THREE.Mesh>(null!);
  const eyelidR = useRef<THREE.Mesh>(null!);
  const eyesGroup = useRef<THREE.Group>(null!);

  // Materials
  const matCeramic = useMemo(
    () => new THREE.MeshPhysicalMaterial({
      color: '#e7eaee', roughness: 0.28, metalness: 0.06,
      clearcoat: 1, clearcoatRoughness: 0.18
    }),
    []
  );
  const matMetal = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: '#0e1319', roughness: 0.45, metalness: 0.95
    }),
    []
  );
  const matChrome = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: '#cfd5de', roughness: 0.16, metalness: 1
    }),
    []
  );
  const matHair = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2b2f38', roughness: 0.55, metalness: 0.2 }),
    []
  );
  const matSclera = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#f7f9fb', roughness: 0.45 }),
    []
  );
  const matIris = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#5fb4ff', emissive: '#457bff', emissiveIntensity: 0.35 }),
    []
  );
  const matCornea = useMemo(
    () => new THREE.MeshPhysicalMaterial({
      color: '#ffffff', transparent: true, opacity: 0.1,
      transmission: 0.95, thickness: 0.2, roughness: 0.04
    }),
    []
  );
  const matLips = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#e7a0b0', roughness: 0.5, metalness: 0.1 }),
    []
  );
  const matMouthCavity = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0b0b0f', roughness: 0.9 }),
    []
  );

  // Subtle life
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    group.current.rotation.y = Math.sin(t * 0.25) * 0.05;
    group.current.rotation.x = Math.sin(t * 0.18) * 0.02;

    // blink motion
    const blink = (Math.sin(t * 1.3) + Math.sin(t * 0.7 + 1.7)) * 0.25 + 0.5;
    const lidScale = THREE.MathUtils.clamp(1 - Math.pow(blink, 6), 0.02, 1);
    eyelidL.current.scale.y = THREE.MathUtils.lerp(eyelidL.current.scale.y, lidScale, 0.28);
    eyelidR.current.scale.y = THREE.MathUtils.lerp(eyelidR.current.scale.y, lidScale, 0.28);

    // slight eye look-around
    const eyeYaw = Math.sin(t * 0.35) * 0.05;
    const eyePitch = Math.sin(t * 0.22) * 0.03;
    eyesGroup.current.rotation.y = THREE.MathUtils.lerp(eyesGroup.current.rotation.y, eyeYaw, 0.2);
    eyesGroup.current.rotation.x = THREE.MathUtils.lerp(eyesGroup.current.rotation.x, eyePitch, 0.2);

    // gentle jaw motion
    const mouthOpen = 0.03 + Math.sin(t * 0.9) * 0.01;
    jaw.current.rotation.x = THREE.MathUtils.lerp(jaw.current.rotation.x, mouthOpen, 0.2);
  });

  // Torso via Lathe (organic hourglass)
  const torsoGeom = useMemo(() => {
    const pts = [
      new THREE.Vector2(0.0, -0.95),
      new THREE.Vector2(0.55, -0.95),
      new THREE.Vector2(0.62, -0.7),
      new THREE.Vector2(0.42, -0.1),
      new THREE.Vector2(0.55,  0.35),
      new THREE.Vector2(0.50,  0.55),
      new THREE.Vector2(0.40,  0.65),
    ];
    return new THREE.LatheGeometry(pts, 64);
  }, []);

  // Helper: simple hand with 5 fingers
  const Hand = ({ side = 1 }: { side?: 1 | -1 }) => (
    <group position={[0.82 * side, 0.1, 0.08]} rotation={[0, side > 0 ? Math.PI / 16 : -Math.PI / 16, 0]}>
      {/* palm */}
      <mesh material={matCeramic}>
        <boxGeometry args={[0.14, 0.09, 0.04]} />
      </mesh>
      {/* thumb */}
      <mesh position={[0.09 * side, -0.02, 0]} rotation={[0, 0, -side * Math.PI/8]} material={matCeramic}>
        <capsuleGeometry args={[0.018, 0.06, 6, 12]} />
      </mesh>
      {/* fingers (index → pinky) */}
      {[0.035, 0.012, -0.011, -0.034].map((y, i) => (
        <mesh key={i} position={[0.02 * side, y, 0.02]} material={matCeramic}>
          <capsuleGeometry args={[0.014, 0.08 - i*0.01, 6, 12]} />
        </mesh>
      ))}
    </group>
  );

  return (
    <group ref={group} {...props}>
      {/* Torso */}
      <mesh geometry={torsoGeom} material={matCeramic} position={[0, -0.2, 0]} />

      {/* Clavicle band */}
      <mesh position={[0, 0.42, 0]} rotation={[Math.PI/2, 0, 0]} material={matChrome}>
        <torusGeometry args={[0.48, 0.045, 18, 80]} />
      </mesh>

      {/* Shoulders + upper arms */}
      <group>
        {/* Left */}
        <mesh position={[-0.58, 0.30, 0]} material={matCeramic}>
          <capsuleGeometry args={[0.16, 0.24, 8, 16]} />
        </mesh>
        <mesh position={[-0.78, 0.15, 0]} rotation={[0, 0, Math.PI/16]} material={matCeramic}>
          <capsuleGeometry args={[0.09, 0.34, 8, 16]} />
        </mesh>
        {/* Right */}
        <mesh position={[0.58, 0.30, 0]} material={matCeramic}>
          <capsuleGeometry args={[0.16, 0.24, 8, 16]} />
        </mesh>
        <mesh position={[0.78, 0.15, 0]} rotation={[0, 0, -Math.PI/16]} material={matCeramic}>
          <capsuleGeometry args={[0.09, 0.34, 8, 16]} />
        </mesh>
      </group>

      {/* Hands */}
      <Hand side={-1} />
      <Hand side={1} />

      {/* Neck ring & column */}
      <mesh position={[0, 0.62, 0]} rotation={[Math.PI/2, 0, 0]} material={matChrome}>
        <torusGeometry args={[0.18, 0.035, 16, 64]} />
      </mesh>
      <mesh position={[0, 0.52, 0]} material={matMetal}>
        <cylinderGeometry args={[0.14, 0.16, 0.22, 28]} />
      </mesh>

      {/* Head shell (elongated) */}
      <mesh position={[0, 0.98, 0]} material={matCeramic} scale={[0.95, 1.06, 0.95]}>
        <sphereGeometry args={[0.58, 96, 96]} />
      </mesh>

      {/* Hair cap (dark shell segment) */}
      <mesh position={[0, 1.06, -0.02]} material={matHair} rotation={[0, 0, 0]}>
        <sphereGeometry args={[0.585, 64, 64, 0, Math.PI*2, Math.PI/2.35, Math.PI/1.75]} />
      </mesh>

      {/* Ears (simplified) */}
      <mesh position={[-0.46, 0.98, 0]} rotation={[0, 0, Math.PI/2]} material={matCeramic}>
        <torusGeometry args={[0.07, 0.018, 10, 32]} />
      </mesh>
      <mesh position={[0.46, 0.98, 0]} rotation={[0, 0, Math.PI/2]} material={matCeramic}>
        <torusGeometry args={[0.07, 0.018, 10, 32]} />
      </mesh>

      {/* Face plate */}
      <mesh position={[0, 0.98, 0.34]} material={matCeramic}>
        <sphereGeometry args={[0.56, 96, 96, 0, Math.PI * 2, 0, Math.PI/1.9]} />
      </mesh>

      {/* Eyes group (allows look-around) */}
      <group ref={eyesGroup}>
        {/* Left eye */}
        <group position={[-0.12, 0.99, 0.60]}>
          <mesh material={matSclera}><sphereGeometry args={[0.065, 32, 32]} /></mesh>
          <mesh position={[0, 0, 0.033]} material={matIris}><cylinderGeometry args={[0.03, 0.03, 0.002, 24]} /></mesh>
          <mesh material={matCornea} scale={[1.03,1.03,1.03]}><sphereGeometry args={[0.065, 32, 32]} /></mesh>
        </group>
        {/* Right eye */}
        <group position={[0.12, 0.99, 0.60]}>
          <mesh material={matSclera}><sphereGeometry args={[0.065, 32, 32]} /></mesh>
          <mesh position={[0, 0, 0.033]} material={matIris}><cylinderGeometry args={[0.03, 0.03, 0.002, 24]} /></mesh>
          <mesh material={matCornea} scale={[1.03,1.03,1.03]}><sphereGeometry args={[0.065, 32, 32]} /></mesh>
        </group>
      </group>

      {/* Eyelids (scale Y for blink) */}
      <mesh ref={eyelidL} position={[-0.12, 1.00, 0.615]} material={matCeramic} scale={[1, 1, 1]}>
        <boxGeometry args={[0.14, 0.06, 0.012]} />
      </mesh>
      <mesh ref={eyelidR} position={[0.12, 1.00, 0.615]} material={matCeramic} scale={[1, 1, 1]}>
        <boxGeometry args={[0.14, 0.06, 0.012]} />
      </mesh>

      {/* Nose (bridge + nostrils) */}
      <mesh position={[0, 1.03, 0.59]} rotation={[Math.PI/2, 0, 0]} material={matCeramic}>
        <cylinderGeometry args={[0.02, 0.015, 0.09, 12]} />
      </mesh>
      <mesh position={[-0.018, 0.97, 0.62]} material={matCeramic}><sphereGeometry args={[0.01, 12, 12]} /></mesh>
      <mesh position={[0.018, 0.97, 0.62]} material={matCeramic}><sphereGeometry args={[0.01, 12, 12]} /></mesh>

      {/* Mouth cavity + lips */}
      <mesh position={[0, 0.91, 0.62]} material={matMouthCavity}>
        <boxGeometry args={[0.18, 0.05, 0.03]} />
      </mesh>
      <mesh position={[0, 0.90, 0.635]} rotation={[Math.PI / 2, 0, 0]} material={matLips} scale={[0.7, 0.55, 0.55]}>
        <torusGeometry args={[0.08, 0.011, 8, 60]} />
      </mesh>

      {/* Jaw (separate for future lipsync) */}
      <mesh ref={jaw} position={[0, 0.86, 0.55]} material={matCeramic}>
        <boxGeometry args={[0.34, 0.14, 0.20]} />
      </mesh>

      {/* Decorative forehead seam */}
      <mesh position={[0, 1.12, 0.20]} material={matChrome}>
        <torusGeometry args={[0.31, 0.006, 12, 128]} />
      </mesh>
    </group>
  );
}

type GLTFExportOptions = {
  binary?: boolean;
  trs?: boolean;
  onlyVisible?: boolean;
  truncateDrawRange?: boolean;
  embedImages?: boolean;
  maxTextureSize?: number;
  includeCustomExtensions?: boolean;
  animations?: THREE.AnimationClip[];
  forceIndices?: boolean;
  forcePowerOfTwoTextures?: boolean;
};

export default function RobotExportPage() {
  const sceneRef = useRef<THREE.Scene | null>(null);
  const exportBlob = useDownloadBlob();

  const handleExport = () => {
    if (!sceneRef.current) return;
    const exporter = new GLTFExporter();
    const scene = sceneRef.current;

    const restore = prepareSceneForExport(scene);

    const options: GLTFExportOptions = {
      binary: true,
      trs: true,
      onlyVisible: true,
      embedImages: true,
      maxTextureSize: 4096,
    };

    exporter.parse(
      scene,
      (gltf: ArrayBuffer | object) => {
        restore();
        if (gltf instanceof ArrayBuffer) {
          exportBlob(new Blob([gltf], { type: 'model/gltf-binary' }), 'human_robot.glb');
        } else {
          const json = JSON.stringify(gltf, null, 2);
          exportBlob(new Blob([json], { type: 'model/gltf+json' }), 'human_robot.gltf');
        }
      },
      (err) => {
        restore();
        console.error('GLTF export failed:', err);
        alert(`GLTF export failed: ${err?.message ?? err}`);
      },
      options as any
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0b1220] text-white">
      <div className="p-3 flex items-center gap-3 border-b border-white/10">
        <h1 className="text-lg font-bold">Human-Like Robot → Export GLB</h1>
        <button
          onClick={handleExport}
          className="ml-auto rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 font-semibold"
        >
          Export human_robot.glb
        </button>
      </div>

      <div className="flex-1">
        <Canvas
          camera={{ position: [0, 1.55, 3.1], fov: 40 }}
          onCreated={({ scene }) => { sceneRef.current = scene; }}
        >
          <color attach="background" args={['#0b1220']} />
          <hemisphereLight args={[0xffffff, 0x222222, 0.7]} />
          <directionalLight position={[5, 5, 6]} intensity={1.25} />

          <Suspense fallback={null}>
            <HumanLikeRobot position={[0, 0, 0]} />
            {/* Kept for lookdev; sanitized during export */}
            <Environment preset="city" />
          </Suspense>

          <ContactShadows position={[0, -1.0, 0]} opacity={0.45} blur={1.6} far={3.5} />
          <OrbitControls enablePan={false} />
        </Canvas>
      </div>
    </div>
  );
}
