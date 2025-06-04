import * as THREE from 'three';
import { Point, SurfaceFile, getTopPoints } from '@/types/surface';
import { StructuralObjects } from './structural-objects';
import { ArrowSystem } from './arrow-system';
import { Trolley } from './trolley';
import { CombinedGeometry } from './combined-geometry';
import { CloudParticles } from './cloud-particles';
import { GridLines } from './grid-lines';

export class SceneManager {
    private scene: THREE.Scene;
    private structuralObjects: StructuralObjects;
    private arrowSystem: ArrowSystem;
    private trolley: Trolley;
    private combinedGeometry: CombinedGeometry;
    private cloudParticles: CloudParticles;
    private gridLines: GridLines;
    private surfaceMesh: THREE.Mesh | null = null;
    private sectionLines: THREE.Group | null = null;

    constructor(scene: THREE.Scene, scale: number = -3) {
        this.scene = scene;
        this.structuralObjects = new StructuralObjects(scale);
        this.arrowSystem = new ArrowSystem(scale);
        this.trolley = new Trolley();
        this.combinedGeometry = new CombinedGeometry(scale);
        this.cloudParticles = new CloudParticles();
        this.gridLines = new GridLines();
        
        this.sectionLines = new THREE.Group();
        this.scene.add(this.sectionLines);
    }

    initializeScene(): void {
        // Добавляем все объекты в сцену
        this.structuralObjects.addToScene(this.scene);
        this.arrowSystem.addToScene(this.scene);
        this.trolley.addToScene(this.scene);
        this.combinedGeometry.addToScene(this.scene);
        this.cloudParticles.addToScene(this.scene);
        this.gridLines.addToScene(this.scene);
    }

    updateSurface(points: Point[], surface: SurfaceFile): void {
        // Удаляем старый меш поверхности
        if (this.surfaceMesh) {
            this.scene.remove(this.surfaceMesh);
            this.surfaceMesh = null;
        }

        if (points.length === 0) {
            // Если нет точек данных, показываем облако частиц
            this.cloudParticles.setVisible(true);
            return;
        }

        // Если есть данные поверхности, скрываем облако частиц в областях с данными
        const hasDataInCloudArea = points.some(point => point.x < -2000);
        this.cloudParticles.setVisible(!hasDataInCloudArea);

        // Загружаем новую поверхность
        const loadedObject = new THREE.ObjectLoader().parse(surface);
        if (loadedObject instanceof THREE.Mesh) {
            loadedObject.receiveShadow = true;
            loadedObject.castShadow = true;
            this.surfaceMesh = loadedObject;
            this.scene.add(loadedObject);
        } else {
            console.error('Loaded object is not a mesh:', loadedObject);
        }
    }

    updateSectionLines(selectedSectionX: number | null): void {
        if (!this.sectionLines) return;

        // Очищаем старые линии сечения
        while (this.sectionLines.children.length > 0) {
            const obj = this.sectionLines.children[0];
            if (obj instanceof THREE.Line) {
                obj.geometry?.dispose();
                if (obj.material instanceof THREE.Material) obj.material.dispose();
                else if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            }
            this.sectionLines.remove(obj);
        }

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
                const lineMaterial = new THREE.LineBasicMaterial({ 
                    color: 0xffffff, 
                    linewidth: 4, 
                    depthTest: false, 
                    transparent: true, 
                    opacity: 0.5 
                });
                
                const line = new THREE.Line(lineGeometry, lineMaterial);
                line.renderOrder = 9999;
                this.sectionLines.add(line);
            }
        }
    }

    handleSpriteClick(sprite: THREE.Sprite): boolean {
        const textSprites = this.gridLines.getTextSprites();
        if (textSprites.includes(sprite)) {
            if (this.trolley.getTrolley()) {
                this.trolley.moveToX(sprite.position.x);
            }
            this.gridLines.selectLine(sprite);
            return true;
        }
        return false;
    }

    handleMeshClick(intersectX: number, onSectionXChange: (x: number | null) => void): void {
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

    update(now: number): void {
        this.trolley.update();
        this.cloudParticles.update(now);
    }

    getTextSprites(): THREE.Sprite[] {
        return this.gridLines.getTextSprites();
    }

    getSurfaceMesh(): THREE.Mesh | null {
        return this.surfaceMesh;
    }

    dispose(): void {
        this.structuralObjects.removeFromScene(this.scene);
        this.arrowSystem.removeFromScene(this.scene);
        this.trolley.removeFromScene(this.scene);
        this.combinedGeometry.removeFromScene(this.scene);
        this.cloudParticles.removeFromScene(this.scene);
        this.gridLines.removeFromScene(this.scene);

        if (this.surfaceMesh) {
            this.scene.remove(this.surfaceMesh);
            this.surfaceMesh = null;
        }

        if (this.sectionLines) {
            this.scene.remove(this.sectionLines);
            this.sectionLines = null;
        }
    }
} 