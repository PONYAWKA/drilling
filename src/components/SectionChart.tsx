import { useMemo } from 'react';
import { Point } from '@/types/surface';

interface SectionChartProps {
    points: Point[];
}

// Фиксированные границы для осей
const AXIS_BOUNDS = {
    Y: { min: -1560, max: 1560 },
    Z: {
        min: 0, max: 2100
    }
};

interface ColorZone {
    color: string;
    points: Point[];
}

export function SectionChart({ points }: SectionChartProps) {
    // Нормализуем координаты для SVG
    const normalizeY = (y: number) => {
        const range = AXIS_BOUNDS.Y.max - AXIS_BOUNDS.Y.min;
        return ((y - AXIS_BOUNDS.Y.min) / range) * 500;
    };

    const normalizeZ = (z: number) => {
        const range = AXIS_BOUNDS.Z.max - AXIS_BOUNDS.Z.min;
        return ((z - AXIS_BOUNDS.Z.min) / range) * 500;
    };

    // Группируем точки по цветам и сортируем их
    const colorZones = useMemo(() => {
        // Сортируем все точки по y
        const sortedPoints = [...points].sort((a, b) => a.y - b.y);

        // Группируем точки по цветам
        const zones: ColorZone[] = [];
        const colorMap = new Map<string, Point[]>();

        // Сначала группируем все точки по цветам
        sortedPoints.forEach(point => {
            const color = point.color || '#ffffff';
            if (!colorMap.has(color)) {
                colorMap.set(color, []);
            }
            colorMap.get(color)!.push(point);
        });

        // Создаем зоны из сгруппированных точек
        colorMap.forEach((points, color) => {
            // Сортируем точки по y для каждого цвета
            const sortedPoints = [...points].sort((a, b) => a.y - b.y);
            zones.push({
                color,
                points: sortedPoints
            });
        });

        return zones;
    }, [points]);

    // Создаем деления для осей
    const yTicks = useMemo(() => {
        const ticks = [];
        const step = (AXIS_BOUNDS.Y.max - AXIS_BOUNDS.Y.min) / 5;
        for (let i = 0; i <= 5; i++) {
            const value = AXIS_BOUNDS.Y.min + step * i;
            ticks.push({
                value: Math.round(value),
                position: 50 + normalizeY(value)
            });
        }
        return ticks;
    }, []);

    const zTicks = useMemo(() => {
        const ticks = [];
        const step = (AXIS_BOUNDS.Z.max - AXIS_BOUNDS.Z.min) / 5;
        for (let i = 0; i <= 5; i++) {
            const value = AXIS_BOUNDS.Z.min + step * i;
            ticks.push({
                value: Math.round(value),
                position: 550 - normalizeZ(value)
            });
        }
        return ticks;
    }, []);

    if (points.length === 0) {
        return (
            <div className="w-[600px] h-[600px] flex items-center justify-center text-gray-500">
                Выберите X для отображения среза
            </div>
        );
    }

    return (
        <svg
            width={600}
            height={600}
            viewBox="0 0 600 600"
            className="border border-gray-700"
        >
            {/* Оси */}
            <line x1="50" y1="550" x2="550" y2="550" stroke="gray" />
            <line x1="50" y1="50" x2="50" y2="550" stroke="gray" />

            {/* Подписи осей */}
            <text x="300" y="580" textAnchor="middle" fill="gray">
                Y
            </text>
            <text x="20" y="300" textAnchor="middle" fill="gray" transform="rotate(-90, 20, 300)">
                Z
            </text>

            {/* Деления оси Y */}
            {yTicks.map(({ value, position }) => (
                <g key={`y-${value}`}>
                    <line x1={position} y1="550" x2={position} y2="555" stroke="gray" />
                    <text x={position} y="570" textAnchor="middle" fill="gray" fontSize="12">
                        {value}
                    </text>
                </g>
            ))}

            {/* Деления оси Z */}
            {zTicks.map(({ value, position }) => (
                <g key={`z-${value}`}>
                    <line x1="45" y1={position} x2="50" y2={position} stroke="gray" />
                    <text x="35" y={position + 4} textAnchor="end" fill="gray" fontSize="12">
                        {value}
                    </text>
                </g>
            ))}

            {/* Отображаем зоны */}
            {colorZones.map((zone, zoneIndex) => {
                const points = zone.points;
                if (points.length < 2) return null;

                return (
                    <g key={`zone-${zoneIndex}`}>
                        {/* Линия зоны */}

                        {/* Точки зоны */}
                        {points.map((point, pointIndex) => (
                            <circle
                                key={`point-${zoneIndex}-${pointIndex}`}
                                cx={50 + normalizeY(point.y)}
                                cy={550 - normalizeZ(point.z)}
                                r="4"
                                fill={zone.color}
                            />
                        ))}
                    </g>
                );
            })}
        </svg>
    );
} 