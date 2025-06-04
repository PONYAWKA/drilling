import { useEffect, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls.js';
import { Point, SurfaceFile } from '@/types/surface';
import { SceneManager } from './scene-manager';

interface VisualizeProps {
    points: Point[];
    mountRef: React.RefObject<HTMLDivElement>;
    onSectionXChange: (x: number | null) => void;
    selectedSectionX: number | null;
    surface: SurfaceFile;
}

const SCALE = -3;

export function useVisualize({ points, mountRef, onSectionXChange, selectedSectionX, surface }: VisualizeProps) {
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneManagerRef = useRef<SceneManager | null>(null);

    useLayoutEffect(() => {
        if (!mountRef.current) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x202528);
        sceneRef.current = scene;

        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        const aspect = width / height;

        // Создаем камеру
        const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000000);
        camera.position.set(3126.94, 3356.79, 3210.10);
        camera.up.set(0, 1, 0);
        camera.quaternion.set(0.19145882081487056, 0.4884, 0.7728, 0.3570);
        cameraRef.current = camera;

        // Освещение
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const light = new THREE.DirectionalLight();
        light.position.set(2.5, 2, 2);
        light.castShadow = true;
        light.shadow.mapSize.width = 512;
        light.shadow.mapSize.height = 512;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 100;
        light.shadow.camera.lookAt(new THREE.Vector3(0, 0, 0));
        scene.add(light);

        // Сохраняем камеру в window для доступа из других компонентов
        if (typeof window !== 'undefined') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).__drillCameraRef = camera;
        }

        // Создаем менеджер сцены и инициализируем все объекты
        const sceneManager = new SceneManager(scene, SCALE);
        sceneManager.initializeScene();
        sceneManagerRef.current = sceneManager;

        // Рендерер
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Управление
        const controls = new FlyControls(camera, renderer.domElement);
        controls.movementSpeed = 1000;
        controls.rollSpeed = Math.PI / 24;
        controls.autoForward = false;
        controls.dragToLook = true;

        // Анимация
        let lastTime = performance.now();
        const animate = () => {
            requestAnimationFrame(animate);
            const now = performance.now();
            const delta = (now - lastTime) / 1000;
            lastTime = now;

            sceneManager.update(now);
            controls.update(delta);
            renderer.render(scene, camera);
        };
        animate();

        // Обработка изменения размера
        const handleResize = () => {
            if (!mountRef.current || !camera || !renderer) return;
            camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        // Обработка кликов
        const handleClick = (event: MouseEvent) => {
            if (!mountRef.current || !cameraRef.current || !sceneRef.current || !sceneManagerRef.current) return;

            const rect = mountRef.current.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

            // Проверяем клик по спрайтам
            const textSprites = sceneManager.getTextSprites();
            const intersectsSprites = raycaster.intersectObjects(textSprites);
            if (intersectsSprites.length > 0) {
                const sprite = intersectsSprites[0].object as THREE.Sprite;
                if (sceneManager.handleSpriteClick(sprite)) {
                    return;
                }
            }

            // Проверяем клик по мешу поверхности
            const surfaceMesh = sceneManager.getSurfaceMesh();
            if (surfaceMesh) {
                const intersects = raycaster.intersectObject(surfaceMesh);
                if (intersects.length > 0) {
                    const intersect = intersects[0];
                    sceneManager.handleMeshClick(intersect.point.x, onSectionXChange);
                }
            }
        };
        mountRef.current.addEventListener('click', handleClick);

        return () => {
            window.removeEventListener('resize', handleResize);
            mountRef.current?.removeEventListener('click', handleClick);

            if (sceneManagerRef.current) {
                sceneManagerRef.current.dispose();
                sceneManagerRef.current = null;
            }

            if (renderer.domElement && mountRef.current?.contains(renderer.domElement)) {
                mountRef.current.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, [mountRef, onSectionXChange]);

    useEffect(() => {
        if (sceneManagerRef.current) {
            sceneManagerRef.current.updateSurface(points, surface);
        }
    }, [points, surface]);

    useEffect(() => {
        if (sceneManagerRef.current) {
            sceneManagerRef.current.updateSectionLines(selectedSectionX);
        }
    }, [selectedSectionX]);
}
