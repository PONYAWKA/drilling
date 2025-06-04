import * as THREE from 'three';
import { BaseObject } from './base-object';

export class StructuralObjects extends BaseObject {
    private SCALE: number;

    constructor(scale: number = -3) {
        super();
        this.SCALE = scale;
    }

    create(): THREE.Object3D[] {
        const objects: THREE.Object3D[] = [];

        // Пол
        objects.push(this.createFloor());
        
        // Основная стена
        objects.push(this.createMainWall());
        
        // Левая стена
        objects.push(this.createLeftWall());
        
        // Задняя стена
        objects.push(this.createBackWall());
        
        // Откос пола
        objects.push(this.createFloorBack());

        return objects;
    }

    private createFloor(): THREE.Mesh {
        const floorGeometry = new THREE.PlaneGeometry(3764 * this.SCALE, 2100);
        const floorMaterial = new THREE.MeshBasicMaterial({
            color: 0xcccccc,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.3
        });

        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.position.set(((3764 * this.SCALE) + 3764) / 2, -1560, 1050);
        floor.rotation.x = -Math.PI / 2;
        return floor;
    }

    private createMainWall(): THREE.Mesh {
        const wallGeometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            // Первый треугольник
            -1870 * -(this.SCALE - 2), -1560, 0,
            1882, -1560, 0,
            -1870 * -(this.SCALE - 2), 1560, 280,

            // Второй треугольник
            1882, -1560, 0,
            1882, 1560, 280,
            -1870 * -(this.SCALE - 2), 1560, 280,
        ]);
        wallGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        wallGeometry.computeVertexNormals();

        const wallMaterial = new THREE.MeshBasicMaterial({
            color: 0xccccff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.2,
            depthWrite: true,
            depthTest: true
        });

        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.rotation.y = 0;
        return wall;
    }

    private createLeftWall(): THREE.Mesh {
        const leftWallGeometry = new THREE.BufferGeometry();
        const leftWallPoints = new Float32Array([
            -1870 * -(this.SCALE - 3), -1560, -1050,
            -1870 * -(this.SCALE - 3), -1560, 1050,
            -1870 * -(this.SCALE - 3), 1560, -770,
            -1870 * -(this.SCALE - 3), 1560, 1050
        ]);

        const indices = new Uint16Array([
            0, 1, 2,
            2, 1, 3
        ]);

        leftWallGeometry.setAttribute('position', new THREE.BufferAttribute(leftWallPoints, 3));
        leftWallGeometry.setIndex(new THREE.BufferAttribute(indices, 1));
        leftWallGeometry.computeVertexNormals();

        const leftWallMaterial = new THREE.MeshBasicMaterial({
            color: 0xccccff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.2
        });

        const leftWall = new THREE.Mesh(leftWallGeometry, leftWallMaterial);
        leftWall.position.set(1882, 0, 1050);
        return leftWall;
    }

    private createBackWall(): THREE.Mesh {
        const backWallGeometry = new THREE.PlaneGeometry(3764 * this.SCALE, 400);
        const backWallMaterial = new THREE.MeshBasicMaterial({
            color: 0xccccff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.2
        });

        const backWall = new THREE.Mesh(backWallGeometry, backWallMaterial);
        backWall.position.set(((3764 * this.SCALE) + 3764) / 2, -1760, 2100);
        backWall.rotation.x = Math.PI;
        return backWall;
    }

    private createFloorBack(): THREE.Mesh {
        const floorBackGeometry = new THREE.PlaneGeometry(3764 * this.SCALE, 680);
        const floorBackMaterial = new THREE.MeshBasicMaterial({
            color: 0xcccccc,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.3
        });

        const floorBack = new THREE.Mesh(floorBackGeometry, floorBackMaterial);
        floorBack.position.set(((3764 * this.SCALE) + 3764) / 2, 1560, -60);
        floorBack.rotation.x = Math.PI / 2;
        floorBack.renderOrder = 0;
        return floorBack;
    }
} 