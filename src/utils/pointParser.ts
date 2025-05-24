interface Point {
  x: number;
  y: number;
  z: number;
  color?: string; // hex-цвет
}

export function parsePoints(text: string): Point[] {
  const lines = text.trim().split('\n');
  return lines.filter(line => !line.includes('#ffffff')).map(line => {
    const parts = line.trim().split(/\s+/);
    const [x, y, z] = parts.slice(0, 3).map(Number);
    const color = parts[3] || '#ffffff';
    return { x, y, z, color };
  });
}

export function validatePoints(points: Point[]): boolean {
  return points.every(point => {
    return (
      point.x >= -18820 && point.x <= 18820 &&
      point.y >= -15600 && point.y <= 15600 &&
      point.z >= 0 && point.z <= 21000
    );
  });
} 