import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Three.js 火焰粒子效果
 * 
 * 用法：
 * <FlameEffect width={400} height={300} particleCount={500} />
 */
interface FlameEffectProps {
  width?: number;
  height?: number;
  particleCount?: number;
}

export function FlameEffect({
  width = 400,
  height = 300,
  particleCount = 500,
}: FlameEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // 场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f); // 深渊黑

    // 相机
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 2, 5);
    camera.lookAt(0, 0, 0);

    // 渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.borderRadius = '12px';
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 火焰粒子系统
    const particles: {
      position: THREE.Vector3;
      velocity: THREE.Vector3;
      life: number;
      maxLife: number;
      size: number;
    }[] = [];

    // 初始化粒子
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          Math.random() * 3,
          (Math.random() - 0.5) * 2
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          Math.random() * 0.05 + 0.02,
          (Math.random() - 0.5) * 0.02
        ),
        life: Math.random(),
        maxLife: 1 + Math.random() * 2,
        size: Math.random() * 0.15 + 0.05,
      });
    }

    // 粒子几何体
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // 粒子材质
    const material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.8,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // 火焰底部光源
    const light = new THREE.PointLight(0xff4500, 2, 10);
    light.position.set(0, 0.5, 0);
    scene.add(light);

    // 动画
    let time = 0;
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      time += 0.016;

      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];

        // 更新位置
        p.position.add(p.velocity);
        p.life += 0.016;

        // 重置死亡的粒子
        if (p.life > p.maxLife || p.position.y > 4) {
          p.position.set(
            (Math.random() - 0.5) * 1.5,
            0,
            (Math.random() - 0.5) * 1.5
          );
          p.velocity.set(
            (Math.random() - 0.5) * 0.02,
            Math.random() * 0.05 + 0.02,
            (Math.random() - 0.5) * 0.02
          );
          p.life = 0;
          p.size = Math.random() * 0.15 + 0.05;
        }

        // 更新位置数组
        positions[i * 3] = p.position.x;
        positions[i * 3 + 1] = p.position.y;
        positions[i * 3 + 2] = p.position.z;

        // 颜色：从底部黄色到顶部红色
        const lifeRatio = p.life / p.maxLife;
        const r = 1;
        const g = Math.max(0, 0.6 - lifeRatio * 0.6);
        const b = Math.max(0, 0.2 - lifeRatio * 0.3);

        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;

        // 大小随生命周期变化
        sizes[i] = p.size * (1 - lifeRatio * 0.5) * (1 + Math.sin(time * 3 + i) * 0.2);
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      geometry.attributes.size.needsUpdate = true;

      // 光源闪烁
      light.intensity = 2 + Math.sin(time * 5) * 0.5;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [width, height, particleCount]);

  return (
    <div
      ref={containerRef}
      style={{ width, height }}
      className="rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(255,69,0,0.3)]"
    />
  );
}
