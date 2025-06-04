import * as THREE from 'three';
import { BaseObject } from './base-object';

export class ArrowSystem extends BaseObject {
    private SCALE: number;

    constructor(scale: number = -3) {
        super();
        this.SCALE = scale;
    }

    create(): THREE.Object3D[] {
        const objects: THREE.Object3D[] = [];

        // Красный прямоугольник
        objects.push(this.createRedRectangle());
        
        // Стрелка
        objects.push(this.createArrow());

        return objects;
    }

    private createRedRectangle(): THREE.Mesh {
        const redRectGeometry = new THREE.PlaneGeometry(2000, 700);
        const redRectMaterial = new THREE.MeshBasicMaterial({
            color: 0xFA4D56,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5
        });

        const redRect = new THREE.Mesh(redRectGeometry, redRectMaterial);
        redRect.position.set(0, 1565, -60);
        redRect.rotation.x = Math.PI / 2;
        redRect.renderOrder = 1;
        
        return redRect;
    }

    private createArrow(): THREE.Group {
        const baseX = ((3764 * this.SCALE) + 3764) / 2;
        const parallelepipedCenter = new THREE.Vector3(baseX, 1565, -30);
        const redRectCenter = new THREE.Vector3(-1000, 1565, -30);

        const arrowGroup = this.buildArrow(parallelepipedCenter, redRectCenter, 0xFA4D56);
        arrowGroup.renderOrder = 3;
        
        return arrowGroup;
    }

    private buildArrow(startPos: THREE.Vector3, endPos: THREE.Vector3, color: number = 0xffffff): THREE.Group {
        const arrowGroup = new THREE.Group();

        // Создаем толстую линию от начала до конца используя цилиндр
        const direction = new THREE.Vector3().subVectors(endPos, startPos);
        const distance = direction.length();
        const lineGeometry = new THREE.CylinderGeometry(16, 16, distance, 8);
        const lineMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9
        });
        const line = new THREE.Mesh(lineGeometry, lineMaterial);

        // Позиционируем и поворачиваем цилиндр
        const midPoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
        line.position.copy(midPoint);
        line.lookAt(endPos);
        line.rotateX(Math.PI / 2);
        arrowGroup.add(line);

        // Создаем наконечник стрелки из двух толстых линий
        const normalizedDirection = direction.clone().normalize();
        const arrowLength = 300;

        // Вычисляем перпендикулярный вектор
        const perpendicular = new THREE.Vector3(-normalizedDirection.z, 0, normalizedDirection.x).normalize();

        // Точки для наконечника в виде двух линий под углом
        const arrowTip = endPos.clone();
        const arrowBack = endPos.clone().sub(normalizedDirection.clone().multiplyScalar(arrowLength));

        // Первая линия наконечника (верхняя)
        const arrowPoint1 = arrowBack.clone().add(perpendicular.clone().multiplyScalar(arrowLength * 0.6));
        const arrowLine1Direction = new THREE.Vector3().subVectors(arrowPoint1, arrowTip);
        const arrowLine1Distance = arrowLine1Direction.length();
        const arrowLine1Geometry = new THREE.CylinderGeometry(12, 12, arrowLine1Distance, 8);
        const arrowLine1 = new THREE.Mesh(arrowLine1Geometry, lineMaterial.clone());
        const arrowLine1MidPoint = new THREE.Vector3().addVectors(arrowTip, arrowPoint1).multiplyScalar(0.5);
        arrowLine1.position.copy(arrowLine1MidPoint);
        arrowLine1.lookAt(arrowPoint1);
        arrowLine1.rotateX(Math.PI / 2);
        arrowGroup.add(arrowLine1);

        // Вторая линия наконечника (нижняя)
        const arrowPoint2 = arrowBack.clone().sub(perpendicular.clone().multiplyScalar(arrowLength * 0.6));
        const arrowLine2Direction = new THREE.Vector3().subVectors(arrowPoint2, arrowTip);
        const arrowLine2Distance = arrowLine2Direction.length();
        const arrowLine2Geometry = new THREE.CylinderGeometry(12, 12, arrowLine2Distance, 8);
        const arrowLine2 = new THREE.Mesh(arrowLine2Geometry, lineMaterial.clone());
        const arrowLine2MidPoint = new THREE.Vector3().addVectors(arrowTip, arrowPoint2).multiplyScalar(0.5);
        arrowLine2.position.copy(arrowLine2MidPoint);
        arrowLine2.lookAt(arrowPoint2);
        arrowLine2.rotateX(Math.PI / 2);
        arrowGroup.add(arrowLine2);

        return arrowGroup;
    }
} 