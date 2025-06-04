import { Point } from "@/types/surface";
import { useMemo } from 'react';

// Фиксированные границы для осей
const AXIS_BOUNDS = {
    Y: { min: -1560, max: 1560 },
    Z: { min: 0, max: 2100 }
};

interface ColorZone {
    color: string;
    points: Point[];
}

const DISTANCE_THRESHOLD = 200;

export const SectionChart2 = ({ points: rawPoints }: { points: Point[] }) => {
    // Нормализуем координаты для SVG
    const upperPoints = useMemo(() => {
        const yMap = new Map<number, Point>();
        rawPoints.forEach(point => {
            if (!yMap.has(point.y) || point.z > yMap.get(point.y)!.z) {
                yMap.set(point.y, point);
            }
        });
        return Array.from(yMap.values()).sort((a, b) => a.y - b.y);
    }, [rawPoints]);

    const points = useMemo(() => {

        const transitionPoints: Point[] = [];
        for (let i = 1; i < upperPoints.length; i++) {
            const prev = upperPoints[i - 1];
            const curr = upperPoints[i];
            if (curr.color !== prev.color) {
                // Добавляем точку перехода: координаты curr, цвет prev
                transitionPoints.push({ ...curr, color: prev.color });
            }
        }

        // 3. Объединяем исходные точки и точки перехода
        const allPoints = [...rawPoints, ...transitionPoints];

        // 4. (опционально) сортируем по Y, Z, или другому критерию
        allPoints.sort((a, b) => a.y - b.y || b.z - a.z);

        return allPoints;
    }, [rawPoints, upperPoints]);
    const normalizeY = (y: number) => {
        const range = AXIS_BOUNDS.Y.max - AXIS_BOUNDS.Y.min;
        return ((y - AXIS_BOUNDS.Y.min) / range) * 500;
    };

    const normalizeZ = (z: number) => {
        const range = AXIS_BOUNDS.Z.max - AXIS_BOUNDS.Z.min;
        return ((z - AXIS_BOUNDS.Z.min) / range) * 500;
    };

    // Группируем точки по цветам и расстоянию
    const colorZones = useMemo(() => {
        const zones: ColorZone[] = [];
        const colorMap = new Map<string, Point[]>();

        // Сначала группируем по цветам
        points.forEach(point => {
            const color = point.color || '#000000';
            if (!colorMap.has(color)) {
                colorMap.set(color, []);
            }
            colorMap.get(color)!.push(point);
        });

        // Для каждого цвета создаем подгруппы по расстоянию
        colorMap.forEach((points, color) => {
            // Сортируем точки по Y
            const sortedPoints = [...points].sort((a, b) => a.y - b.y);

            // Разделяем на подгруппы по расстоянию
            const subgroups: Point[][] = [];
            let currentGroup: Point[] = [];

            sortedPoints.forEach((point, index) => {
                if (index === 0) {
                    currentGroup.push(point);
                    return;
                }

                const prevPoint = sortedPoints[index - 1];
                const distance = Math.abs(point.y - prevPoint.y);

                if (distance <= DISTANCE_THRESHOLD) {
                    currentGroup.push(point);
                } else {
                    if (currentGroup.length >= 3) {
                        subgroups.push([...currentGroup]);
                    }
                    currentGroup = [point];
                }
            });

            if (currentGroup.length >= 3) {
                subgroups.push(currentGroup);
            }

            // Создаем зоны для каждой подгруппы
            subgroups.forEach(group => {
                zones.push({
                    color,
                    points: group
                });
            });
        });

        return zones;
    }, [points]);

    // Группируем все точки по расстоянию (смешанные группы)
    const mixedZones = useMemo(() => {
        const zones: ColorZone[] = [];

        // Сортируем все точки по Y
        const sortedPoints = [...points].sort((a, b) => a.y - b.y);

        // Разделяем на подгруппы по расстоянию
        const subgroups: Point[][] = [];
        let currentGroup: Point[] = [];

        sortedPoints.forEach((point, index) => {
            if (index === 0) {
                currentGroup.push(point);
                return;
            }

            const prevPoint = sortedPoints[index - 1];
            const distance = Math.abs(point.y - prevPoint.y);

            if (distance <= DISTANCE_THRESHOLD) {
                currentGroup.push(point);
            } else {
                if (currentGroup.length >= 3) {
                    subgroups.push([...currentGroup]);
                }
                currentGroup = [point];
            }
        });

        if (currentGroup.length >= 3) {
            subgroups.push(currentGroup);
        }

        // Для каждой подгруппы создаем зону с доминирующим цветом
        subgroups.forEach(group => {
            // Находим доминирующий цвет в группе
            const colorCount = new Map<string, number>();
            group.forEach(point => {
                const color = point.color || '#000000';
                colorCount.set(color, (colorCount.get(color) || 0) + 1);
            });

            let dominantColor = '#000000';
            let maxCount = 0;
            colorCount.forEach((count, color) => {
                if (count > maxCount) {
                    maxCount = count;
                    dominantColor = color;
                }
            });

            zones.push({
                color: dominantColor,
                points: group
            });
        });

        return zones;
    }, [points]);


    if (points.length === 0) {
        return (
            <div className="w-[600px] h-[600px] flex items-center justify-center text-gray-500">
                Нет данных для отображения
            </div>
        );
    }

    // Функция для создания полигона из точек
    const createPolygon = (points: Point[], color: string, opacity: number) => {
        const yMap = new Map<number, { max: Point, min: Point }>();
        points.forEach(point => {
            if (!yMap.has(point.y)) {
                yMap.set(point.y, { max: point, min: point });
            } else {
                const entry = yMap.get(point.y)!;
                if (point.z > entry.max.z) entry.max = point;
                if (point.z < entry.min.z) entry.min = point;
            }
        });

        const yValues = Array.from(yMap.keys()).sort((a, b) => a - b);
        const upperPoints = yValues.map(y => yMap.get(y)!.max);
        const lowerPoints = yValues.map(y => yMap.get(y)!.min).reverse();

        const areaPoints = [...upperPoints, ...lowerPoints];
        const svgPoints = areaPoints.map(point =>
            `${50 + normalizeY(point.y)},${550 - normalizeZ(point.z)}`
        ).join(' ');

        return (
            <polygon
                points={svgPoints}
                fill={color}
                fillOpacity={opacity}
                stroke={color}
                strokeWidth={1}
            />
        );
    };

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

            {/* Смешанные зоны */}
            {mixedZones.map((zone, index) => (
                <g key={`mixed-${index}`}>
                    {createPolygon(zone.points, zone.color, 0.2)}
                </g>
            ))}

            {/* Одноцветные зоны */}
            {colorZones.map((zone, index) => (
                <g key={`color-${index}`}>
                    {createPolygon(zone.points, zone.color, 0.3)}
                </g>
            ))}

            {/* Линии между верхними точками */}
            {upperPoints.length > 1 && upperPoints.map((point, index) => {
                if (index === upperPoints.length - 1) return null;
                const nextPoint = upperPoints[index + 1];
                return (
                    <line
                        key={`line-${index}`}
                        x1={50 + normalizeY(point.y)}
                        y1={550 - normalizeZ(point.z)}
                        x2={50 + normalizeY(nextPoint.y)}
                        y2={550 - normalizeZ(nextPoint.z)}
                        stroke={point.color || '#000000'}
                        strokeWidth={2}
                    />
                );
            })}

            {/* Точки */}
            {/* {points.map((point, index) => (
                <circle
                    key={`point-${index}`}
                    cx={50 + normalizeY(point.y)}
                    cy={550 - normalizeZ(point.z)}
                    r="4"
                    fill={point.color || '#000000'}
                />
            ))} */}
        </svg>
    );
}