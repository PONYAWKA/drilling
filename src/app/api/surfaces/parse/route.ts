import { NextResponse } from 'next/server';
import { validatePoints } from '@/utils/pointParser';
import * as THREE from 'three';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
    try {
        const { filename } = await request.json();
        
        if (!filename) {
            return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
        }

        // Декодируем имя файла
        const decodedFilename = decodeURIComponent(filename);
        const filePath = path.join(process.cwd(), 'public', 'surfaces', decodedFilename);
        
        console.log('Looking for file:', filePath); // Отладочная информация
        
        if (!fs.existsSync(filePath)) {
            console.error('File not found:', filePath); // Отладочная информация
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        // Читаем содержимое файла
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Парсим точки
        const points = JSON.parse(content).surface_points;
        
        // Фильтруем невалидные точки
        const isPointsValid = validatePoints(points)

        if (!isPointsValid) {
            return NextResponse.json({ error: 'Invalid points' }, { status: 400 });
        }

        // Создаем геометрию для поверхности
        const geometry = new THREE.BufferGeometry();
        const vertices: number[] = [];
        const colors: number[] = [];
        const xCoords = Array.from(new Set(points.map(p => p.x))).sort((a, b) => a - b);
        const yCoords = Array.from(new Set(points.map(p => p.y))).sort((a, b) => a - b);
        for (let i = 0; i < xCoords.length - 1; i++) {
            for (let j = 0; j < yCoords.length - 1; j++) {
                const x1 = xCoords[i];
                const x2 = xCoords[i + 1];
                const y1 = yCoords[j];
                const y2 = yCoords[j + 1];
                const p1 = points.find(p => p.x === x1 && p.y === y1);
                const p2 = points.find(p => p.x === x2 && p.y === y1);
                const p3 = points.find(p => p.x === x1 && p.y === y2);
                const p4 = points.find(p => p.x === x2 && p.y === y2);
                if (p1 && p2 && p3 && p4) {
                    vertices.push(p1.x, p1.y, p1.z);
                    vertices.push(p2.x, p2.y, p2.z);
                    vertices.push(p3.x, p3.y, p3.z);
                    vertices.push(p2.x, p2.y, p2.z);
                    vertices.push(p4.x, p4.y, p4.z);
                    vertices.push(p3.x, p3.y, p3.z);    
                    const color1 = new THREE.Color(p1.color || '#ffffff');
                    const color2 = new THREE.Color(p2.color || '#ffffff');
                    const color3 = new THREE.Color(p3.color || '#ffffff');
                    const color4 = new THREE.Color(p4.color || '#ffffff');
                    colors.push(color1.r, color1.g, color1.b);
                    colors.push(color2.r, color2.g, color2.b);
                    colors.push(color3.r, color3.g, color3.b);
                    colors.push(color2.r, color2.g, color2.b);
                    colors.push(color4.r, color4.g, color4.b);
                    colors.push(color3.r, color3.g, color3.b);
                }
            }
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeVertexNormals()
        const material = new THREE.MeshPhongMaterial({ vertexColors: true,
            // wireframe: true,
            side: THREE.DoubleSide,
            })
        const mesh = new THREE.Mesh(geometry, material);
      

        return NextResponse.json(mesh.toJSON());
    } catch (error) {
        console.error('Error parsing surface file:', error);
        return NextResponse.json({ error: 'Failed to parse surface file' }, { status: 500 });
    }
} 