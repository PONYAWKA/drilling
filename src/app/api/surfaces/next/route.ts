import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SURFACES_DIR = path.join(process.cwd(), 'public', 'surfaces');

export async function GET(request: Request) {
    try {
        // Получаем список всех файлов
        const files = fs.readdirSync(SURFACES_DIR)
            .filter(file => file.endsWith('.json'))
            .sort((a, b) => {
                // Сортируем по времени создания
                const statA = fs.statSync(path.join(SURFACES_DIR, a));
                const statB = fs.statSync(path.join(SURFACES_DIR, b));
                return statA.mtime.getTime() - statB.mtime.getTime();
            });

        if (files.length === 0) {
            return NextResponse.json({ error: 'Нет доступных файлов' }, { status: 404 });
        }

        // Получаем имя текущего файла из query-параметра
        const { searchParams } = new URL(request.url);
        const current = searchParams.get('current');

        let nextIndex = 0;
        if (current) {
            const lastIndex = files.indexOf(current);
            nextIndex = (lastIndex + 1) % files.length;
        }
        const nextFile = files[nextIndex];

        return NextResponse.json({ 
            filename: nextFile,
            totalFiles: files.length,
            currentIndex: nextIndex
        });
    } catch (error) {
        console.error('Ошибка при получении следующего файла:', error);
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
    }
} 