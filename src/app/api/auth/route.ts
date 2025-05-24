import { NextResponse } from 'next/server';

const CORRECT_PASSWORD = 'drill2024';

export async function POST(request: Request) {
    try {
        const { password } = await request.json();
        
        if (password === CORRECT_PASSWORD) {
            const response = NextResponse.json({ success: true });
            response.cookies.set('authenticated', 'true', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 60 * 60 * 24 * 7 // 7 дней
            });
            return response;
        }
        
        return NextResponse.json({ success: false, error: 'Неверный пароль' }, { status: 401 });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Ошибка сервера' }, { status: 500 });
    }
} 