import * as THREE from 'three';
import { BaseObject } from './base-object';

interface SpriteLinePair {
    sprite: THREE.Sprite;
    line: THREE.Line;
}

export class GridLines extends BaseObject {
    private textSprites: THREE.Sprite[] = [];
    private spriteLinePairs: SpriteLinePair[] = [];
    private prevSelectedLine: THREE.Line | null = null;

    create(): THREE.Object3D[] {
        const objects: THREE.Object3D[] = [];

        for (let i = 0; i < 23; i++) {
            const line = this.makeLine(i * -500, i % 4 === 0 ? 0xffffff : 0xa1a1a1);
            objects.push(line);
        }

        // Добавляем все спрайты в массив объектов
        objects.push(...this.textSprites);

        return objects;
    }

    getTextSprites(): THREE.Sprite[] {
        return this.textSprites;
    }

    getSpriteLinePairs(): SpriteLinePair[] {
        return this.spriteLinePairs;
    }

    selectLine(sprite: THREE.Sprite): void {
        const pair = this.spriteLinePairs.find(p => p.sprite === sprite);
        if (pair) {
            // Сбросить цвет предыдущей выбранной линии, если есть
            if (this.prevSelectedLine && this.prevSelectedLine !== pair.line) {
                (this.prevSelectedLine.material as THREE.LineBasicMaterial).color.set(0xffffff);
            }
            // Установить цвет новой выбранной линии
            (pair.line.material as THREE.LineBasicMaterial).color.set(0xff0000);
            this.prevSelectedLine = pair.line;
        }
    }

    private makeLine(iteration: number, color: number): THREE.Line {
        const linePoints: THREE.Vector3[] = [
            new THREE.Vector3(1882 + iteration, -1960, 2100),
            new THREE.Vector3(1882 + iteration, -1560, 2100),
            new THREE.Vector3(1882 + iteration, -1560, 0),
            new THREE.Vector3(1882 + iteration, 1560, 280),
            new THREE.Vector3(1882 + iteration, 1560, -400),
        ];

        const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
        const lineMaterial = new THREE.LineBasicMaterial({
            color: color,
            transparent: false,
            linewidth: 2
        });

        const line = new THREE.Line(lineGeometry, lineMaterial);

        if ((iteration / -500) % 2 === 0) {
            const textSprite = this.createTextSprite(String(26 - (iteration / -500)), '#aaacad', true);
            if (textSprite) {
                textSprite.position.set(1882 + iteration, -1960, 2500);
                this.textSprites.push(textSprite);
                this.spriteLinePairs.push({ sprite: textSprite, line });
            }

            const sprite = this.createTextSprite(String((iteration / -300) * 3), '#aaacad', false);
            if (sprite) {
                sprite.position.set(1882 + iteration, 1600, -600);
                this.textSprites.push(sprite);
            }
        }

        return line;
    }

    private createTextSprite(message: string, color: string, enable: boolean): THREE.Sprite | null {
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
            context.fillStyle = '#343a3a';
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
            opacity: 0.4
        });

        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(500, 250, 1);

        return sprite;
    }
} 