import { useEffect, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls.js';
import { Point, SurfaceFile, getTopPoints } from '@/types/surface';
interface VisualizeProps {
    points: Point[];
    mountRef: React.RefObject<HTMLDivElement>;
    onSectionXChange: (x: number | null) => void;
    selectedSectionX: number | null;
    surface: SurfaceFile;
}

function createTextSprite(message: string, color: string, enable: boolean) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
        console.error('Не удалось получить контекст canvas');
        return null;
    }

    // Устанавливаем размер canvas
    canvas.width = 256;
    canvas.height = 128;

    // Настраиваем текст
    context.font = 'Bold 72px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Очищаем canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Рисуем круглый фон
    if (enable) {
        context.beginPath();
        context.arc(canvas.width / 2, canvas.height / 2, 60, 0, Math.PI * 2);
        context.fillStyle = '#343a3a'; // Полупрозрачный черный фон
        context.fill();
    }
    // Рисуем текст
    context.fillStyle = color;
    context.fillText(message, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(500, 250, 1);

    return sprite;
}

const SCALE = -3;

export function useVisualize({ points, mountRef, onSectionXChange, selectedSectionX, surface }: VisualizeProps) {
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const meshRef = useRef<THREE.Mesh | null>(null);
    const sectionLinesRef = useRef<THREE.Group | null>(null);

    useLayoutEffect(() => {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x202528);
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        const aspect = width / height;

        // Создаем ортографическую камеру
        const camera = new THREE.PerspectiveCamera(
            75, // fov
            aspect, // aspect
            0.1, // near
            1000000 // far
        );

        camera.position.set(3126.94, 3356.79, 3210.10);
        camera.up.set(0, 1, 0);
        camera.quaternion.set(0.19145882081487056, 0.4884, 0.7728, 0.3570);
        cameraRef.current = camera;
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
        scene.add(ambientLight)
        const light = new THREE.DirectionalLight()
        light.position.set(2.5, 2, 2)
        light.castShadow = true
        light.shadow.mapSize.width = 512
        light.shadow.mapSize.height = 512
        light.shadow.camera.near = 0.5
        light.shadow.camera.far = 100
        light.shadow.camera.lookAt(new THREE.Vector3(0, 0, 0))
        scene.add(light)
        // Сохраняем камеру в window для доступа из других компонентов
        if (typeof window !== 'undefined') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).__drillCameraRef = camera;
        }

        const floorGeometry = new THREE.PlaneGeometry(3764 * SCALE, 2100)
        const floorMaterial = new THREE.MeshBasicMaterial({
            color: 0xcccccc,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.3
        });

        //Пол
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.position.set(((3764 * SCALE) + 3764) / 2, -1560, 1050);
        floor.rotation.x = -Math.PI / 2; // поворачиваем чтобы лежал по XY
        scene.add(floor);

        // Стена слева
        const wallGeometry = new THREE.PlaneGeometry(3764 * SCALE, 3120);
        const wallMaterial = new THREE.MeshBasicMaterial({
            color: 0xccccff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.2
        });
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(((3764 * SCALE) + 3764) / 2, 0, 0); // позиционируем по Y на -1560 и по Z на половину высоты
        wall.rotation.y = 0; // по ZX
        scene.add(wall);

        // Стена дальняя
        const leftWallGeometry = new THREE.PlaneGeometry(2100, 3120); // высота и глубина
        const leftWallMaterial = new THREE.MeshBasicMaterial({
            color: 0xf8f8ffee,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.2
        });
        const leftWall = new THREE.Mesh(leftWallGeometry, leftWallMaterial);
        leftWall.position.set(1882 * (SCALE - 2), 0, 1050); // x: -1882 (левый край), y: 0, z: половина высоты
        leftWall.rotation.y = Math.PI / 2; // поворачиваем на 90 градусов
        scene.add(leftWall);

        //откос левой стены
        const backWallGeometry = new THREE.PlaneGeometry(3764 * SCALE, 400); // ширина и высота как у основной стены
        const backWallMaterial = new THREE.MeshBasicMaterial({
            color: 0xccccff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.2
        });
        const backWall = new THREE.Mesh(backWallGeometry, backWallMaterial);
        backWall.position.set(((3764 * SCALE) + 3764) / 2, -1760, 2100); // x: 0, y: -1560 (задняя стенка), z: половина высоты
        backWall.rotation.x = Math.PI; // поворачиваем на 90 градусов в сторону -y
        scene.add(backWall);

        //откос пола
        const floorBackGeometry = new THREE.PlaneGeometry(3764 * SCALE, 400); // ширина как у пола, высота 400
        const floorBackMaterial = new THREE.MeshBasicMaterial({
            color: 0xcccccc,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.3
        });
        const floorBack = new THREE.Mesh(floorBackGeometry, floorBackMaterial);
        floorBack.position.set(((3764 * SCALE) + 3764) / 2, 1560, -200); // x: 0, y: -1560 (задняя стенка), z: 0
        floorBack.rotation.x = Math.PI / 2; // поворачиваем на 180 градусов
        scene.add(floorBack);

        const makeLine = (iteration: number, color: number) => {

            const linePoints: THREE.Vector3[] = [
                new THREE.Vector3(1882 + iteration, -1960, 2100),
                new THREE.Vector3(1882 + iteration, -1560, 2100),
                new THREE.Vector3(1882 + iteration, -1560, 0),
                new THREE.Vector3(1882 + iteration, 1560, 0),
                new THREE.Vector3(1882 + iteration, 1560, -400),
            ];
            const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
            const lineMaterial = new THREE.LineBasicMaterial({
                color: color,
                linewidth: 2
            });
            const line = new THREE.Line(lineGeometry, lineMaterial);
            if ((iteration / -500) % 2 === 0) {
                const textSprite = createTextSprite(String(27 + (iteration / -500)), '#aaacad', true);
                if (textSprite) {
                    textSprite.position.set(1882 + iteration, -1960, 2250);
                    scene.add(textSprite);

                }
                const sprite = createTextSprite(String((iteration / -300) * 3), '#aaacad', false);
                if (sprite) {
                    sprite.position.set(1882 + iteration, 1600, -600);
                    scene.add(sprite);
                }

            }

            return line;
        }
        for (let i = 0; i < 23; i++) {
            if (i % 4 === 0) {
                scene.add(makeLine(i * -500, 0xffffff));

            } else {
                scene.add(makeLine(i * -500, 0xa1a1a1));
            }
        }


        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const controls = new FlyControls(camera, renderer.domElement);
        controls.movementSpeed = 1000;
        controls.rollSpeed = Math.PI / 24;
        controls.autoForward = false;
        controls.dragToLook = true;

        sceneRef.current = scene;
        sectionLinesRef.current = new THREE.Group();
        scene.add(sectionLinesRef.current);

        let lastTime = performance.now();
        const animate = () => {
            requestAnimationFrame(animate);
            const now = performance.now();
            const delta = (now - lastTime) / 1000;
            lastTime = now;
            controls.update(delta);
            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            if (!mountRef.current || !camera || !renderer) return;
            camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        const handleClick = (event: MouseEvent) => {
            if (!mountRef.current || !cameraRef.current || !sceneRef.current) return;
            const rect = mountRef.current.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

            // Находим mesh поверхности
            const mesh = meshRef.current;
            if (!mesh) return;

            const intersects = raycaster.intersectObject(mesh);
            if (intersects.length > 0) {
                const intersect = intersects[0];
                const intersectX = intersect.point.x;

                // @ts-expect-error: глобальный pointGrid
                const pointGrid = window.__drillPointGrid;
                const topPoints = getTopPoints(pointGrid);
                const uniqueX = Array.from(new Set(topPoints.map(p => p.x)));
                const closestX = uniqueX.reduce((closest, x) => {
                    const distance = Math.abs(x - intersectX);
                    return distance < Math.abs(closest - intersectX) ? x : closest;
                }, uniqueX[0]);
                onSectionXChange(closestX);
            }
        };
        mountRef.current.addEventListener('click', handleClick);

        return () => {
            window.removeEventListener('resize', handleResize);
            mountRef.current?.removeEventListener('click', handleClick);
            if (renderer.domElement && mountRef.current?.contains(renderer.domElement)) {
                mountRef.current.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, [mountRef, onSectionXChange]);

    useEffect(() => {
        const scene = sceneRef.current;
        if (!scene) return;

        // Добавляем группу для линий сечения
        if (!sectionLinesRef.current) {
            sectionLinesRef.current = new THREE.Group();
            scene.add(sectionLinesRef.current);
        }
        while (sectionLinesRef.current.children.length > 0) {
            const obj = sectionLinesRef.current.children[0];
            if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
                obj.geometry?.dispose();
                if (obj.material instanceof THREE.Material) obj.material.dispose();
                else if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            }
            sectionLinesRef.current.remove(obj);
        }

        if (points.length === 0) return;

        if (meshRef.current) {
            scene.remove(meshRef.current);
        }

        const loadedObject = new THREE.ObjectLoader().parse(surface);
        if (loadedObject instanceof THREE.Mesh) {
            loadedObject.receiveShadow = true;
            loadedObject.castShadow = true;
            meshRef.current = loadedObject;
            scene.add(loadedObject);
        } else {
            console.error('Loaded object is not a mesh:', loadedObject);
        }

        while (sectionLinesRef.current.children.length > 0) {
            const obj = sectionLinesRef.current.children[0];
            if (obj instanceof THREE.Line) {
                obj.geometry?.dispose();
                if (obj.material instanceof THREE.Material) obj.material.dispose();
                else if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            }
            sectionLinesRef.current.remove(obj);
        }
        console.log('selectedSectionX', selectedSectionX)
        if (selectedSectionX !== null) {
            // @ts-expect-error: глобальный pointGrid
            const pointGrid = window.__drillPointGrid;
            const topPoints: Point[] = getTopPoints(pointGrid).filter(p => p.x === selectedSectionX);
            if (topPoints.length > 1) {
                const sorted = [...topPoints].sort((a, b) => a.y - b.y);
                const lineGeometry = new THREE.BufferGeometry();
                const lineVertices: number[] = [];
                sorted.forEach(p => {
                    lineVertices.push(p.x, p.y, p.z);
                });
                lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lineVertices, 3));
                const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 4, depthTest: false, transparent: true, opacity: 0.5 });
                const line = new THREE.Line(lineGeometry, lineMaterial);
                line.renderOrder = 9999; // поверх всего
                sectionLinesRef.current.add(line);
            }
        }
        // --- конец белой линии ---
    }, [points, selectedSectionX, surface]);
}
