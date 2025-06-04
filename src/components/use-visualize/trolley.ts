import * as THREE from 'three';
import { BaseObject } from './base-object';

export class Trolley extends BaseObject {
    private trolley: THREE.Mesh | null = null;
    private redRectOnWall: THREE.Mesh | null = null;
    private targetX: number | null = null;
    private animationSpeed = 0.009;
    private redRectX: number = 0; // Конфигурируемая позиция красного прямоугольника по X

    create(): THREE.Object3D[] {
        const objects: THREE.Object3D[] = [];

        // Создаем тележку
        const trolleyGeometry = new THREE.BoxGeometry(800, 400, 200);
        const trolleyMaterial = new THREE.MeshBasicMaterial({
            color: 0x2CD9C5,
            transparent: true,
            opacity: 0.5
        });

        this.trolley = new THREE.Mesh(trolleyGeometry, trolleyMaterial);
        this.trolley.position.set(0, -1760, 2200);
        objects.push(this.trolley);

        // Создаем красный прямоугольник на задней стене
        this.redRectOnWall = this.createRedRectangleOnWall();
        objects.push(this.redRectOnWall);

        return objects;
    }

    private createRedRectangleOnWall(): THREE.Mesh {
        const redRectGeometry = new THREE.PlaneGeometry(2000, 500); 
        const redRectMaterial = new THREE.MeshBasicMaterial({
            color: 0x2CD9C5, // Тот же цвет что и в arrow-system
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });

        const redRect = new THREE.Mesh(redRectGeometry, redRectMaterial);
        // Позиционируем на задней стене (z = 2100, y = -1760 как у backWall)
        redRect.position.set(this.redRectX + 400, -1800, 2105);
        redRect.rotation.x = Math.PI; // Тот же поворот что и у задней стены
        redRect.renderOrder = 3; // Поверх задней стены

        return redRect;
    }

    moveToX(x: number): void {
        this.targetX = x;
    }

    setRedRectangleX(x: number): void {
        this.redRectX = x;
        if (this.redRectOnWall) {
            this.redRectOnWall.position.x = x;
        }
    }

    getRedRectangleX(): number {
        return this.redRectX;
    }

    update(): void {
        if (this.trolley && this.targetX !== null) {
            const dx = this.targetX - this.trolley.position.x;
            
            // Если близко к цели — фиксируем позицию и сбрасываем цель
            if (Math.abs(dx) < 1) {
                this.trolley.position.x = this.targetX;
                this.targetX = null;
            } else {
                this.trolley.position.x += dx * this.animationSpeed;
            }
        }
    }

    getTrolley(): THREE.Mesh | null {
        return this.trolley;
    }

    setAnimationSpeed(speed: number): void {
        this.animationSpeed = speed;
    }
} 