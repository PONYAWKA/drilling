import * as THREE from 'three';

export interface Point {
  x: number;
  y: number;
  z: number;
  color?: string;
  quality?: number;
}

export interface SurfaceLayer {
  id: string;
  name: string;
  points: Point[];
  visible: boolean;
  color?: string;
}

export interface SurfaceFile {
  name: string;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
}

// Новый PointGrid: массив точек по каждому (x, y)
export type PointGrid = Map<number, Map<number, Point[]>>;

// Тип для JSON представления PointGrid
export type PointGridJSON = {
  [x: string]: {
    [y: string]: Point[];
  };
};

// Функция для конвертации объекта в PointGrid
export function convertToPointGrid(obj: PointGridJSON): PointGrid {
  const grid = new Map<number, Map<number, Point[]>>();
  
  // Проходим по всем x координатам
  Object.entries(obj).forEach(([xStr, yMap]) => {
    const x = Number(xStr);
    const yMapObj = new Map<number, Point[]>();
    
    // Проходим по всем y координатам
    Object.entries(yMap).forEach(([yStr, points]) => {
      const y = Number(yStr);
      // Сортируем точки по z (от меньшего к большему)
      const sortedPoints = [...points].sort((a, b) => a.z - b.z);
      yMapObj.set(y, sortedPoints);
    });
    
    grid.set(x, yMapObj);
  });
  
  return grid;
}

// Функция для получения уникальных координат
export function getUniqueCoordinates(points: Point[]): { x: number[], y: number[] } {
    const uniqueX = Array.from(new Set(points.map(p => p.x))).sort((a, b) => a - b);
    const uniqueY = Array.from(new Set(points.map(p => p.y))).sort((a, b) => a - b);
    return { x: uniqueX, y: uniqueY };
}

// Функция для обновления сетки точек
export function updatePointGrid(grid: PointGrid, newPoints: Point[]): PointGrid {
    const newGrid = new Map(grid);
    newPoints.forEach(point => {
        if (!newGrid.has(point.x)) {
            newGrid.set(point.x, new Map());
        }
        const yMap = newGrid.get(point.x)!;
        if (!yMap.has(point.y)) {
            yMap.set(point.y, [point]);
        } else {
            // Получаем массив точек по этому (x, y)
            let arr = yMap.get(point.y)!;
            // Удаляем все точки выше новой
            arr = arr.filter(p => p.z <= point.z);
            // Добавляем новую точку
            arr.push(point);
            // Сортируем по z (от меньшего к большему)
            arr.sort((a, b) => a.z - b.z);
            yMap.set(point.y, arr);
        }
    });
    return newGrid;
}

// Функция для получения верхних точек (для 3D)
export function getTopPoints(grid: PointGrid): Point[] {
    const points: Point[] = [];
    grid.forEach(yMap => {
        yMap.forEach(arr => {
            if (arr.length > 0) {
                points.push(arr[arr.length - 1]); // Самая верхняя точка
            }
        });
    });
    return points;
}

// Функция для получения всех точек для среза по X (все слои)
export function getAllSectionPoints(grid: PointGrid, x: number): Point[] {
    const yMap = grid.get(x);
    if (!yMap) return [];
    let result: Point[] = [];
    yMap.forEach(arr => {
        // Добавляем все точки из массива, а не только последнюю
        result = result.concat(arr);
    });
    // Сортируем по y, затем по z
    result.sort((a, b) => a.y - b.y || a.z - b.z);
    return result;
}

// Функция для получения всех точек из сетки
export function getAllPoints(grid: PointGrid): Point[] {
    const points: Point[] = [];
    grid.forEach(yMap => {
        yMap.forEach(arr => {
            points.push(...arr);
        });
    });
    return points;
} 