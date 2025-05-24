import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ filename: string }> }
) {
    try {
        const {filename} = await params;
        const filePath = path.join(process.cwd(), 'public', 'surfaces', filename);
        
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        try {
            const parsedContent = JSON.parse(content);
            return NextResponse.json(parsedContent);
        } catch (parseError) {
            console.error('Error parsing surface file:', parseError);
            return NextResponse.json({ error: 'Invalid JSON format' }, { status: 400 });
        }
    } catch (error) {
        console.error('Error reading surface file:', error);
        return NextResponse.json({ error: 'Failed to read surface file' }, { status: 500 });
    }
} 