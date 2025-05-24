import { SurfaceFile, Point } from '@/types/surface';

interface SurfaceContent {
    surface_points: Point[];
    array: number[][][];
}

export async function loadSurfaceFiles(): Promise<SurfaceFile[]> {
    try {
        const response = await fetch('/api/surfaces');
        if (!response.ok) {
            throw new Error('Failed to load surface files');
        }
        const files = await response.json();
        return files;
    } catch (error) {
        console.error('Error loading surface files:', error);
        return [];
    }
}

export async function loadSurfaceFileContent(filename: string): Promise<SurfaceContent> {
    try {
        const response = await fetch(`/api/surfaces/${encodeURIComponent(filename)}`);
        if (!response.ok) {
            throw new Error('Failed to load surface file content');
        }
        const content = await response.json();
        return content;
    } catch (error) {
        console.error('Error loading surface file content:', error);
        throw error;
    }
} 

export async function loadSurface(filename: string): Promise<SurfaceFile> {
    try {
        const response = await fetch('/api/surfaces/parse', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: filename
            })
        });
        if (!response.ok) {
            throw new Error('Failed to load surface files');
        }
        const surface = await response.json();
        return surface;
    } catch (error) {
        console.error('Error loading surface files:', error);
        throw error;
    }
}
