"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  MeshTransmissionMaterial,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";

/*
 * Loads /public/logo3d.glb. The mesh is split at world-space x = 0 into a
 * LEFT half (x < 0) and a RIGHT half (x > 0). On hover, the halves slide
 * apart like double doors. Material is a dark "liquid glass":
 * transmissive, slightly dispersive, smooth — picks up the HDR env so the
 * silhouette reads even against a black background.
 *
 * Idle motion: a constant slow texture flow + breathing distortion +
 * orbiting highlights, so the silhouette stays perfectly still while
 * the surface inside it visibly moves.
 */

const GLB_PATH = "/logo3d.glb";
useGLTF.preload(GLB_PATH);

export interface LogoHandle {
  open: () => void;
  close: () => void;
}

/* ----------------------------------------------------------- Geometry split */

function splitGeometryByX(
  geometry: THREE.BufferGeometry,
): [THREE.BufferGeometry, THREE.BufferGeometry, number] {
  const src = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const posAttr = src.getAttribute("position") as THREE.BufferAttribute;
  const normAttr = src.getAttribute("normal") as THREE.BufferAttribute | undefined;
  const uvAttr = src.getAttribute("uv") as THREE.BufferAttribute | undefined;

  const triCount = posAttr.count / 3;
  const leftPos: number[] = [];
  const rightPos: number[] = [];
  const leftNorm: number[] = [];
  const rightNorm: number[] = [];
  const leftUv: number[] = [];
  const rightUv: number[] = [];

  let xMin = Infinity;
  let xMax = -Infinity;

  for (let t = 0; t < triCount; t++) {
    const i0 = t * 3;
    const i1 = t * 3 + 1;
    const i2 = t * 3 + 2;
    const x0 = posAttr.getX(i0);
    const x1 = posAttr.getX(i1);
    const x2 = posAttr.getX(i2);
    xMin = Math.min(xMin, x0, x1, x2);
    xMax = Math.max(xMax, x0, x1, x2);

    const cx = (x0 + x1 + x2) / 3;
    const target = cx < 0 ? leftPos : rightPos;
    const tnorm = cx < 0 ? leftNorm : rightNorm;
    const tuv = cx < 0 ? leftUv : rightUv;

    for (const i of [i0, i1, i2]) {
      target.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
      if (normAttr)
        tnorm.push(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i));
      if (uvAttr) tuv.push(uvAttr.getX(i), uvAttr.getY(i));
    }
  }

  const build = (pos: number[], norm: number[], uv: number[]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    if (norm.length)
      g.setAttribute("normal", new THREE.Float32BufferAttribute(norm, 3));
    if (uv.length) g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    if (!norm.length) g.computeVertexNormals();
    return g;
  };

  const halfWidth = Math.max(Math.abs(xMin), Math.abs(xMax));

  return [
    build(leftPos, leftNorm, leftUv),
    build(rightPos, rightNorm, rightUv),
    halfWidth,
  ];
}

/* ------------------------------------------------------------------- Logo */

function SplitLogo({
  openRef,
}: {
  openRef: React.MutableRefObject<LogoHandle | null>;
}) {
  const { scene } = useGLTF(GLB_PATH);
  const leftRef = useRef<THREE.Group>(null);
  const rightRef = useRef<THREE.Group>(null);
  // Refs to the transmission materials so we can modulate their
  // distortion / aberration / texture-UV-offset over time — visible
  // motion of the surface texture inside a stationary silhouette.
  const leftMatRef = useRef<
    THREE.Material & {
      distortion?: number;
      chromaticAberration?: number;
      temporalDistortion?: number;
      normalMap?: THREE.Texture | null;
      roughnessMap?: THREE.Texture | null;
    }
  >(null);
  const rightMatRef = useRef<
    THREE.Material & {
      distortion?: number;
      chromaticAberration?: number;
      temporalDistortion?: number;
      normalMap?: THREE.Texture | null;
      roughnessMap?: THREE.Texture | null;
    }
  >(null);

  // Procedural noise normal map — generated once, shared by both halves.
  // Each frame we slide its UV offset, so the surface micro-detail visibly
  // flows across the glass without the logo itself moving.
  const flowTex = useMemo(() => buildFlowNormalTexture(512), []);

  const [leftGeom, rightGeom, halfWidth] = useMemo(() => {
    let mesh: THREE.Mesh | null = null;
    scene.traverse((obj) => {
      if (!mesh && (obj as THREE.Mesh).isMesh) mesh = obj as THREE.Mesh;
    });
    if (!mesh) {
      return [
        new THREE.BufferGeometry(),
        new THREE.BufferGeometry(),
        1,
      ] as const;
    }
    const m = mesh as THREE.Mesh;
    const baked = m.geometry.clone();
    m.updateMatrixWorld(true);
    baked.applyMatrix4(m.matrixWorld);

    // Recenter on origin, then scale uniformly so the LARGEST dimension
    // equals TARGET_SIZE. This makes the visual size of the logo
    // independent of how the GLB was authored, and we can pick a target
    // large enough to fill the canvas at the camera's z = 3.6 / fov = 38°
    // framing.
    baked.computeBoundingBox();
    const bb = baked.boundingBox!;
    const center = new THREE.Vector3();
    bb.getCenter(center);
    baked.translate(-center.x, -center.y, -center.z);

    const size = new THREE.Vector3();
    bb.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    // 15 % larger than the original 1.7 baseline so the logo dominates
    // more of the landing viewport — feels like big gates.
    const TARGET_SIZE = 1.955;
    const s = TARGET_SIZE / maxDim;
    baked.scale(s, s, s);

    baked.computeVertexNormals();
    return splitGeometryByX(baked);
  }, [scene]);

  // Open distance is proportional to half-width: each half slides
  // outward just enough that the "Duel Agents" wordmark doesn't touch
  // the inner edges of the two halves.
  const openDistance = halfWidth * 0.7;

  useEffect(() => {
    const open = () => {
      if (leftRef.current) {
        gsap.to(leftRef.current.position, {
          x: -openDistance,
          duration: 1.0,
          ease: "expo.out",
          overwrite: true,
        });
      }
      if (rightRef.current) {
        gsap.to(rightRef.current.position, {
          x: openDistance,
          duration: 1.0,
          ease: "expo.out",
          overwrite: true,
        });
      }
    };
    const close = () => {
      if (leftRef.current) {
        gsap.to(leftRef.current.position, {
          x: 0,
          duration: 0.75,
          ease: "expo.inOut",
          overwrite: true,
        });
      }
      if (rightRef.current) {
        gsap.to(rightRef.current.position, {
          x: 0,
          duration: 0.75,
          ease: "expo.inOut",
          overwrite: true,
        });
      }
    };
    openRef.current = { open, close };
    return () => {
      openRef.current = null;
    };
  }, [openRef, openDistance]);

  // Per-frame: the LOGO SILHOUETTE stays perfectly stationary. We only
  // modulate material parameters + scroll the noise normal-map UVs so the
  // surface texture inside the glass visibly flows over time. Combined
  // with the orbiting highlights and breathing distortion this gives a
  // strong sense of liquid moving inside the still vessel.
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const dist = 0.6 + Math.sin(t * 0.55) * 0.45;
    const ab = 0.07 + Math.sin(t * 0.7 + 1.2) * 0.055;
    const temp = 0.35 + Math.sin(t * 0.4 + 0.5) * 0.25;
    flowTex.offset.x = (t * 0.04) % 1;
    flowTex.offset.y = (t * 0.025) % 1;
    flowTex.needsUpdate = true;
    for (const ref of [leftMatRef, rightMatRef]) {
      const m = ref.current;
      if (!m) continue;
      if ("distortion" in m) m.distortion = dist;
      if ("chromaticAberration" in m) m.chromaticAberration = ab;
      if ("temporalDistortion" in m) m.temporalDistortion = temp;
    }
  });

  return (
    <group>
      <group ref={leftRef}>
        <mesh geometry={leftGeom}>
          <LiquidGlass materialRef={leftMatRef} flowMap={flowTex} />
        </mesh>
      </group>
      <group ref={rightRef}>
        <mesh geometry={rightGeom}>
          <LiquidGlass materialRef={rightMatRef} flowMap={flowTex} />
        </mesh>
      </group>
    </group>
  );
}

/* ----------------------------------------------- Procedural flow texture */

function buildFlowNormalTexture(size: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);

  const seeded = (n: number) => {
    const x = Math.sin(n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
  const noise = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const a = seeded(xi + yi * 57.0);
    const b = seeded(xi + 1 + yi * 57.0);
    const c = seeded(xi + (yi + 1) * 57.0);
    const d = seeded(xi + 1 + (yi + 1) * 57.0);
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
  };
  const fbm = (x: number, y: number) => {
    let sum = 0;
    let amp = 0.5;
    let freq = 1;
    for (let i = 0; i < 4; i++) {
      sum += noise(x * freq, y * freq) * amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum;
  };

  const scale = 6;
  const height = (x: number, y: number) =>
    fbm((x / size) * scale, (y / size) * scale);

  const data = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xL = (x - 1 + size) % size;
      const xR = (x + 1) % size;
      const yU = (y - 1 + size) % size;
      const yD = (y + 1) % size;
      const dx = height(xR, y) - height(xL, y);
      const dy = height(x, yD) - height(x, yU);
      const strength = 4.0;
      const nx = -dx * strength;
      const ny = -dy * strength;
      const nz = 1.0;
      const len = Math.hypot(nx, ny, nz) || 1;
      const i = (y * size + x) * 4;
      data[i] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      data[i + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      data[i + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

function LiquidGlass({
  materialRef,
  flowMap,
}: {
  materialRef?: React.MutableRefObject<
    | (THREE.Material & {
        distortion?: number;
        chromaticAberration?: number;
        temporalDistortion?: number;
      })
    | null
  >;
  flowMap?: THREE.Texture;
}) {
  return (
    <MeshTransmissionMaterial
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={materialRef as unknown as React.Ref<any>}
      normalMap={flowMap}
      normalScale={new THREE.Vector2(0.55, 0.55)}
      roughnessMap={flowMap}
      color="#1a1a1d"
      thickness={1.6}
      roughness={0.28}
      attenuationColor="#1a1a22"
      attenuationDistance={0.9}
      transmission={1}
      ior={1.2}
      chromaticAberration={0.04}
      distortion={0.4}
      distortionScale={0.6}
      temporalDistortion={0.15}
      reflectivity={0.35}
      backside={false}
      resolution={1024}
      samples={24}
      envMapIntensity={1}
    />
  );
}

/* ----------------------------------------------------------------- Canvas */

interface Props {
  controlsRef: React.MutableRefObject<LogoHandle | null>;
}

export function Logo3D({ controlsRef }: Props) {
  return (
    <Canvas
      camera={{ position: [0, 0, 3.6], fov: 38 }}
      dpr={[1, 2.5]}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        stencil: false,
      }}
      style={{ width: "100%", height: "100%" }}
    >
      {/* Neutral lighting only — no green accents on the landing. */}
      <ambientLight intensity={0.32} />
      <directionalLight position={[3, 4, 5]} intensity={1.0} />
      <directionalLight
        position={[-4, 2, -2]}
        intensity={0.55}
        color="#ffffff"
      />

      {/* Two counter-orbiting WHITE highlights so spec sweeps across the
          glass surface even though the silhouette doesn't move. */}
      <OrbitingHighlight color="#ffffff" intensity={5.5} radius={2.6} speed={0.55} tilt={1.3} />
      <OrbitingHighlight color="#ffffff" intensity={3.2} radius={2.4} speed={-0.38} tilt={0.9} phase={Math.PI} />

      <Suspense fallback={null}>
        <SplitLogo openRef={controlsRef} />
        <Environment preset="night" background={false} />
      </Suspense>
    </Canvas>
  );
}

/* ---------------------------------------------------- Orbiting highlight */

interface OrbitProps {
  color: string;
  intensity: number;
  radius: number;
  speed: number;
  tilt: number;
  phase?: number;
}

function OrbitingHighlight({
  color,
  intensity,
  radius,
  speed,
  tilt,
  phase = 0,
}: OrbitProps) {
  const lightRef = useRef<THREE.PointLight>(null);
  useFrame((state) => {
    if (!lightRef.current) return;
    const t = state.clock.elapsedTime + phase;
    lightRef.current.position.set(
      Math.cos(t * speed) * radius,
      Math.sin(t * speed * 0.6) * tilt,
      Math.sin(t * speed) * radius,
    );
  });
  return (
    <pointLight
      ref={lightRef}
      intensity={intensity}
      color={color}
      distance={9}
      decay={1.2}
    />
  );
}
