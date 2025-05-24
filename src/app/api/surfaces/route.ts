import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const surfacesDir = path.join(process.cwd(), 'public', 'surfaces');
        
        // Создаем директорию, если она не существует
        if (!fs.existsSync(surfacesDir)) {
            fs.mkdirSync(surfacesDir, { recursive: true });
        }

        const files = fs.readdirSync(surfacesDir)
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const filePath = path.join(surfacesDir, file);
                const content = fs.readFileSync(filePath, 'utf-8');
                const data = JSON.parse(content);
                return {
                    name: file,
                    ...data
                };
            });

        return NextResponse.json(files);
    } catch (error) {
        console.error('Error reading surfaces:', error);
        return NextResponse.json({ error: 'Failed to read surfaces' }, { status: 500 });
    }
} 