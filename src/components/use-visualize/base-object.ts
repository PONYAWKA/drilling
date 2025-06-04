import * as THREE from 'three';

export abstract class BaseObject {
    protected objects: THREE.Object3D[] = [];

    abstract create(): THREE.Object3D | THREE.Object3D[];

    addToScene(scene: THREE.Scene): void {
        const result = this.create();
        const objectsToAdd = Array.isArray(result) ? result : [result];
        
        objectsToAdd.forEach(obj => {
            scene.add(obj);
            this.objects.push(obj);
        });
    }

    removeFromScene(scene: THREE.Scene): void {
        this.objects.forEach(obj => {
            scene.remove(obj);
            this.disposeObject(obj);
        });
        this.objects = [];
    }

    protected disposeObject(obj: THREE.Object3D): void {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
            obj.geometry?.dispose();
            if (obj.material instanceof THREE.Material) {
                obj.material.dispose();
            } else if (Array.isArray(obj.material)) {
                obj.material.forEach(m => m.dispose());
            }
        }
        
        // Рекурсивно очищаем дочерние объекты
        obj.children.forEach(child => this.disposeObject(child));
    }

    getObjects(): THREE.Object3D[] {
        return this.objects;
    }
} 