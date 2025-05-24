import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
    request: Request,
    { params }: { params: { filename: string } }
) {
    try {
        const filePath = path.join(process.cwd(), 'public', 'surfaces', params.filename);
        
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        return new NextResponse(content);
    } catch (error) {
        console.error('Error reading surface file:', error);
        return NextResponse.json({ error: 'Failed to read surface file' }, { status: 500 });
    }
} 