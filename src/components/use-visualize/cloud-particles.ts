import * as THREE from 'three';
import { BaseObject } from './base-object';

export class CloudParticles extends BaseObject {
    private particles: THREE.Points | null = null;

    create(): THREE.Points {
        this.particles = this.createCloudParticles();
        return this.particles;
    }

    update(now: number): void {
        if (!this.particles) return;
        
        const positions = this.particles.geometry.attributes.position.array as Float32Array;
        const sizes = this.particles.geometry.attributes.size.array as Float32Array;

        for (let i = 0; i < positions.length; i += 3) {
            // ОЧЕНЬ медленное движение частиц вверх-вниз
            positions[i + 1] += Math.sin(now * 0.0002 + i * 0.001) * 0.1;
            // ОЧЕНЬ медленное движение по Z
            positions[i + 2] += Math.cos(now * 0.0001 + i * 0.0008) * 0.05;

            // Очень медленная пульсация размера
            const sizeIndex = i / 3;
            const distanceFromNear = (positions[i] - (-11292)) / ((-2000) - (-11292));
            const densityFactor = Math.pow(distanceFromNear, 2.0);

            // Учитываем высоту для размера частиц (туман у пола по Z-оси)
            const heightFactor = (positions[i + 2] - 100) / (3000 - 100);
            const baseSizeFromDistance = 28 + densityFactor * 18;
            const floorSizeReduction = heightFactor * 10;
            const baseSizeValue = baseSizeFromDistance - floorSizeReduction;

            const pulsation = Math.sin(now * 0.0003 + i * 0.002) * 0.02 + 1;
            sizes[sizeIndex] = baseSizeValue * pulsation;
        }

        this.particles.geometry.attributes.position.needsUpdate = true;
        this.particles.geometry.attributes.size.needsUpdate = true;
    }

    setVisible(visible: boolean): void {
        if (this.particles) {
            this.particles.visible = visible;
        }
    }

    private createCloudParticles(): THREE.Points {
        const particleCount = 100000;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);

        // Boundaries of area without data (before X = -2000)
        const minX = -11292; // 3764 * SCALE = -11292
        const maxX = -2000;
        const minY = -1560;
        const maxY = 1560;
        const minZ = 100;
        const maxZ = 3000;

        const totalWidth = maxX - minX;

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;

            // Generate X with MUCH higher probability for distant areas (condensation)
            const randomFactor = Math.random();
            const densityBias = Math.pow(randomFactor, 0.7);
            const x = minX + densityBias * totalWidth;

            positions[i3] = x;
            positions[i3 + 1] = Math.random() * (maxY - minY) + minY;

            // DENSE fog at floor but with more distribution upward
            const zRandomFactor = Math.random();
            const floorBias = Math.pow(zRandomFactor, 0.25);
            const z = maxZ - floorBias * (maxZ - minZ);
            positions[i3 + 2] = z;

            // Calculate distance from nearest point (normalized 0-1)
            const distanceFromNear = (x - minX) / totalWidth;
            const densityFactor = Math.pow(distanceFromNear, 2.0);

            // Consider height for particle sizes (fog at floor along Z-axis)
            const heightFactor = (z - minZ) / (maxZ - minZ);
            const baseSizeFromDistance = 28 + densityFactor * 18;
            const floorSizeReduction = heightFactor * 10;
            sizes[i] = baseSizeFromDistance - floorSizeReduction;

            // Color becomes more intense with distance AND at floor
            const intensity = 0.6 + densityFactor * 0.8 + heightFactor * 0.3;
            const baseColor = { r: 0.2, g: 0.2, b: 0.25 };
            colors[i3] = baseColor.r + intensity * 0.4;
            colors[i3 + 1] = baseColor.g + intensity * 0.4;
            colors[i3 + 2] = baseColor.b + intensity * 0.5;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const vertexShader = `
            attribute float size;
            varying vec3 vColor;
            
            void main() {
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (450.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `;

        const fragmentShader = `
            varying vec3 vColor;
            
            void main() {
                float distance = length(gl_PointCoord - vec2(0.5));
                if (distance > 0.5) discard;
                
                float alpha = 1.0 - (distance * 2.0);
                alpha = pow(alpha, 3.0);
                
                gl_FragColor = vec4(vColor, alpha * 1.5);
            }
        `;

        const material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            blending: THREE.AdditiveBlending,
            vertexColors: true,
            depthWrite: false,
            depthTest: true
        });

        return new THREE.Points(geometry, material);
    }
} 