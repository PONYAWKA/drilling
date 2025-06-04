import { Point } from "@/types/surface";
import { useMemo, useState } from 'react';
import styles from './SectionChart.module.css';
// Фиксированные границы для осей
const AXIS_BOUNDS = {
    Y: { min: -1560, max: 1560 },
    Z: { min: 0, max: 2100 }
};

interface SectionChart3Props {
    points: Point[];
}

interface TooltipData {
    x: number;
    y: number;
    z: number;
    quality: string;
    mouseX: number;
    mouseY: number;
}

export const SectionChart3 = ({ points }: SectionChart3Props) => {
    const [tooltip, setTooltip] = useState<TooltipData | null>(null);

    // Маппинг цветов к качеству руды
    const qualityNames: { [color: string]: string } = {
        '#A259FF': 'Богатая (> 39%)',
        '#04bd3b': 'Целевая (35.4 - 38.9%)',
        '#2CD9C5': 'Рядовая (30.7 - 35.3%)',
        '#FFE066': 'Бедная (< 30.6%)',
    };

    const getQualityName = (color: string): string => {
        return qualityNames[color] || 'Неизвестно';
    };

    const normalizeZ = (z: number) => {
        const range = AXIS_BOUNDS.Z.max - AXIS_BOUNDS.Z.min;
        return ((z - AXIS_BOUNDS.Z.min) / range) * 384;
    };

    // Группируем точки по Y координатам для создания столбцов из вокселей
    const chartBars = useMemo(() => {
        const yGroups: { [key: number]: Point[] } = {};

        // Группируем точки по Y координате
        points.forEach(point => {
            if (!yGroups[point.y]) {
                yGroups[point.y] = [];
            }
            yGroups[point.y].push(point);
        });

        // Получаем все уникальные Y координаты и сортируем
        const uniqueYValues = Object.keys(yGroups).map(y => parseFloat(y)).sort((a, b) => a - b);
        const barWidth = uniqueYValues.length > 0 ? 384 / uniqueYValues.length : 4;

        // Создаем воксели и заливки для каждого столбца
        const allElements: Array<{
            type: 'voxel' | 'fill';
            y: number;
            z: number;
            color: string;
            x: number;
            elementY: number;
            elementHeight: number;
            barWidth: number;
            originalPoint?: Point;
        }> = [];

        Object.entries(yGroups).forEach(([yStr, pointsGroup]) => {
            const y = parseFloat(yStr);
            const yIndex = uniqueYValues.indexOf(y);
            const x = yIndex * barWidth; // Позиция без промежутков

            // Сортируем точки по Z координате (сверху вниз)
            const sortedPoints = pointsGroup.sort((a, b) => b.z - a.z);

            // Высота одного вокселя
            const voxelHeight = 5;

            // Добавляем воксели и заливки
            sortedPoints.forEach((point, index) => {
                const normalizedZ = normalizeZ(point.z);
                const voxelY = 384 - normalizedZ - voxelHeight;

                // Добавляем воксель
                allElements.push({
                    type: 'voxel',
                    y: point.y,
                    z: point.z,
                    color: point.color || '#3b82f6',
                    x,
                    elementY: voxelY,
                    elementHeight: voxelHeight,
                    barWidth,
                    originalPoint: point
                });

                // Добавляем заливку вниз
                const nextPoint = sortedPoints[index + 1];
                const fillStartY = voxelY + voxelHeight; // Начало заливки - под вокселем
                let fillEndY = 384; // По умолчанию до дна
                let fillColor = point.color || '#3b82f6'; // Цвет заливки

                if (nextPoint) {
                    // Если есть следующий воксель снизу, заливаем до него
                    const nextNormalizedZ = normalizeZ(nextPoint.z);
                    fillEndY = 384 - nextNormalizedZ - voxelHeight;
                } else {
                    // Если это последний воксель, заливка до пола серая
                    fillColor = '#9ca3af'; // Серый цвет
                }

                const fillHeight = fillEndY - fillStartY;

                if (fillHeight > 0) {
                    allElements.push({
                        type: 'fill',
                        y: point.y,
                        z: point.z,
                        color: fillColor,
                        x,
                        elementY: fillStartY,
                        elementHeight: fillHeight,
                        barWidth
                    });
                }
            });
        });

        return allElements;
    }, [points]);

    const handleMouseEnter = (element: {
        type: 'voxel' | 'fill';
        y: number;
        z: number;
        color: string;
        x: number;
        elementY: number;
        elementHeight: number;
        barWidth: number;
        originalPoint?: Point;
    }, event: React.MouseEvent<SVGRectElement>) => {
        if (element.type === 'voxel' && element.originalPoint) {
            setTooltip({
                x: element.originalPoint.x,
                y: element.originalPoint.y,
                z: element.originalPoint.z,
                quality: getQualityName(element.originalPoint.color || ''),
                mouseX: event.clientX,
                mouseY: event.clientY
            });
        }
    };

    const handleMouseLeave = () => {
        setTooltip(null);
    };

    if (points.length === 0) {
        return (
            <div className="w-[450px] h-[410px] flex items-center justify-center text-gray-500">
                Нет данных для отображения
            </div>
        );
    }

    return (
        <div style={{ position: 'relative' }}>
            <svg
                width={450}
                height={410}
                viewBox="0 0 450 410"
                className={styles.chart}
            >
                {/* Оси */}
                <line x1="0" y1="384" x2="384" y2="384" stroke="gray" />
                <line x1="0" y1="0" x2="0" y2="384" stroke="gray" />

                {/* Шкала оси Z (справа) */}
                <g fill="gray" fontSize="12" textAnchor="start">
                    <text x="390" y="10">2100</text>
                    <text x="390" y="100">1575</text>
                    <text x="390" y="196">1050</text>
                    <text x="390" y="292">525</text>
                    <text x="390" y="388">0</text>
                </g>

                {/* Шкала оси Y (снизу) */}
                <g fill="gray" fontSize="12" textAnchor="middle">
                    <text x="25" y="400">-1560</text>
                    <text x="96" y="400">-780</text>
                    <text x="192" y="400">0</text>
                    <text x="288" y="400">780</text>
                    <text x="384" y="400">1560</text>
                </g>

                {/* Отображаем столбцы */}
                {chartBars.map((element, index) => {
                    const x = element.x;
                    const height = element.elementHeight;
                    const opacity = 0.6; // Уменьшено с 1 и 0.6 до 0.6 и 0.3

                    return (
                        <rect
                            key={`element-${index}`}
                            x={x - element.barWidth / 2}
                            y={element.elementY}
                            width={element.barWidth}
                            height={height}
                            fill={element.color}
                            stroke="none"
                            opacity={opacity}
                            style={{ cursor: element.type === 'voxel' ? 'pointer' : 'default' }}
                            onMouseEnter={(e) => handleMouseEnter(element, e)}
                            onMouseLeave={handleMouseLeave}
                        />
                    );
                })}
            </svg>

            {/* Тултип */}
            {tooltip && (
                <div
                    style={{
                        position: 'fixed',
                        left: tooltip.mouseX + 10,
                        top: tooltip.mouseY - 10,
                        background: 'rgba(0, 0, 0, 0.8)',
                        color: 'white',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        pointerEvents: 'none',
                        zIndex: 1000,
                        whiteSpace: 'nowrap'
                    }}
                >
                    <div>X: {tooltip.x}</div>
                    <div>Y: {tooltip.y}</div>
                    <div>Z: {tooltip.z}</div>
                    <div>Качество: {tooltip.quality}</div>
                </div>
            )}
        </div>
    );
}; 