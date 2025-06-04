import * as THREE from 'three';
import { BaseObject } from './base-object';

export class CombinedGeometry extends BaseObject {
    private SCALE: number;

    constructor(scale: number = -3) {
        super();
        this.SCALE = scale;
    }

    create(): THREE.Object3D[] {
        const objects: THREE.Object3D[] = [];

        // Комбинированный меш
        objects.push(this.createCombinedMesh());
        
        // Сетка
        objects.push(this.createGridMesh());

        return objects;
    }

    private createCombinedMesh(): THREE.Mesh {
        const combinedGeometry = new THREE.BufferGeometry();
        combinedGeometry.setAttribute('position', new THREE.BufferAttribute(this.createCombinedGeometryVertices(), 3));
        combinedGeometry.computeVertexNormals();

        const combinedMaterial = new THREE.MeshBasicMaterial({
            color: 0xd0a49be,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });

        const combinedMesh = new THREE.Mesh(combinedGeometry, combinedMaterial);
        combinedMesh.castShadow = true;
        combinedMesh.receiveShadow = true;
        combinedMesh.renderOrder = 0;

        return combinedMesh;
    }

    private createGridMesh(): THREE.Mesh {
        const gridGeometry = new THREE.BufferGeometry();
        gridGeometry.setAttribute('position', new THREE.BufferAttribute(this.createGridGeometryVertices(), 3));
        gridGeometry.computeVertexNormals();

        const gridMaterial = new THREE.MeshBasicMaterial({
            color: 0xc2c2c2,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.3,
            depthWrite: false,
            depthTest: true
        });

        const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
        gridMesh.renderOrder = 1;

        return gridMesh;
    }

    private createCombinedGeometryVertices(): Float32Array {
        const baseX = ((3764 * this.SCALE) + 3764) / 2;
        const combinedVertices = [
            // Плоскость
            baseX + 250, -1560, 2100,
            baseX + 250, 1560, 400,
            baseX - 250, 1560, 400,
            baseX + 250, -1560, 2100,
            baseX - 250, 1560, 400,
            baseX - 250, -1560, 2100,

            // Верхняя грань параллелепипеда
            baseX + 250, 1760, 400,
            baseX + 250, 1760, 0,
            baseX - 250, 1760, 0,
            baseX + 250, 1760, 400,
            baseX - 250, 1760, 0,
            baseX - 250, 1760, 400,

            // Нижняя грань параллелепипеда
            baseX + 250, 1570, 400,
            baseX + 250, 1570, 0,
            baseX - 250, 1570, 0,
            baseX + 250, 1570, 400,
            baseX - 250, 1570, 0,
            baseX - 250, 1570, 400,

            // Передняя грань параллелепипеда
            baseX + 250, 1760, 400,
            baseX + 250, 1570, 400,
            baseX - 250, 1570, 400,
            baseX + 250, 1760, 400,
            baseX - 250, 1570, 400,
            baseX - 250, 1760, 400,

            // Задняя грань параллелепипеда
            baseX + 250, 1760, 0,
            baseX + 250, 1570, 0,
            baseX - 250, 1570, 0,
            baseX + 250, 1760, 0,
            baseX - 250, 1570, 0,
            baseX - 250, 1570, 400,

            // Левая грань параллелепипеда
            baseX + 250, 1760, 400,
            baseX + 250, 1760, 0,
            baseX + 250, 1570, 0,
            baseX + 250, 1760, 400,
            baseX + 250, 1570, 0,
            baseX + 250, 1570, 400,

            // Правая грань параллелепипеда
            baseX - 250, 1760, 400,
            baseX - 250, 1760, 0,
            baseX - 250, 1570, 0,
            baseX - 250, 1760, 400,
            baseX - 250, 1570, 0,
            baseX - 250, 1570, 400,
        ];

        return new Float32Array(combinedVertices);
    }

    private createGridGeometryVertices(): Float32Array {
        const allVertices: number[] = [];
        const baseX = ((3764 * this.SCALE) + 3764) / 2;

        const topLeft = { x: baseX + 250, y: -1560, z: 2100 };
        const topRight = { x: baseX + 250, y: 1560, z: 405 };
        const bottomLeft = { x: baseX - 250, y: -1560, z: 2100 };
        const bottomRight = { x: baseX - 250, y: 1560, z: 405 };

        const minY = -1560;
        const maxY = 1560;

        for (let y = minY; y <= maxY; y += 150) {
            const t = (y - minY) / (maxY - minY);

            const nearPoint = {
                x: baseX + 250,
                y: y,
                z: topLeft.z + t * (topRight.z - topLeft.z)
            };

            const farPoint = {
                x: baseX - 250,
                y: y,
                z: bottomLeft.z + t * (bottomRight.z - bottomLeft.z)
            };

            const planeHeight = 100;
            const tapering = 0.3;
            const lineWidth = Math.abs(farPoint.x - nearPoint.x);
            const taperAmount = lineWidth * tapering / 2;

            const topNearPoint = {
                x: nearPoint.x + (farPoint.x > nearPoint.x ? taperAmount : -taperAmount),
                y: nearPoint.y,
                z: nearPoint.z + planeHeight
            };

            const topFarPoint = {
                x: farPoint.x + (farPoint.x > nearPoint.x ? -taperAmount : taperAmount),
                y: farPoint.y,
                z: farPoint.z + planeHeight
            };

            // Добавляем треугольники плоскости сетки
            const planeVertices = [
                // Первый треугольник
                nearPoint.x, nearPoint.y, nearPoint.z,
                farPoint.x, farPoint.y, farPoint.z,
                topNearPoint.x, topNearPoint.y, topNearPoint.z,
                // Второй треугольник
                farPoint.x, farPoint.y, farPoint.z,
                topFarPoint.x, topFarPoint.y, topFarPoint.z,
                topNearPoint.x, topNearPoint.y, topNearPoint.z
            ];

            allVertices.push(...planeVertices);
        }

        return new Float32Array(allVertices);
    }
} 