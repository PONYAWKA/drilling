import os
import glob
import re
import shutil
import json
from datetime import datetime
import pandas as pd

# --- Настройки ---
INPUT_DIR = 'P:/sdf/logs13052025/surf/dry' # папка с surface-файлами и CSV
QUALITY_CSV = 'quality.csv'  # имя CSV-файла
OUTPUT_DIR = '../public/surfaces'  # папка для вывода

# --- Цвет по качеству ---
def get_color(quality):
    if quality > 39:
        return '#A259FF'  # Богатая
    elif 35.4 <= quality <= 38.9:
        return '#04bd3b'  # Целевая
    elif 30.7 <= quality <= 35.3:
        return '#2CD9C5'  # Рядовая
    else:
        return '#FFE066'   # Бедная

# --- Получение datetime из имени файла ---
def parse_surface_timestamp(filename):
    match = re.search(r'surface-tank (\d{2})\.(\d{2})\.(\d{4})\s+(\d{2})-(\d{2})-(\d{2})', filename)
    if match:
        day, month, year, h, m, s = match.groups()
        return datetime(int(year), int(month), int(day), int(h), int(m), int(s))
    raise ValueError(f"Cannot parse datetime from {filename}")

# --- Загрузка качества ---
def load_quality(csv_path):
    df = pd.read_csv(csv_path, parse_dates=['Timestamp'])
    df.sort_values('Timestamp', inplace=True)
    return df

# --- Найти качество по ближайшему прошедшему времени ---
def get_quality_for_timestamp(surface_time, quality_df):
    past = quality_df[quality_df['Timestamp'] <= surface_time]
    if past.empty:
        return None
    return past.iloc[-1]['KL_320_FINAL']

# --- Загрузка surface-файла ---
def load_surface(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    # Получаем объем из первой строки
    volume = float(lines[0].strip()) if lines else 0
    print(f"[+] Объем: {volume}")
    coords = []
    for line in lines[1:]:  # Пропускаем первую строку с объемом
        parts = line.strip().split()
        if len(parts) >= 3:  # Может быть 3 или 4 части (x y z color)
            try:
                x, y, z = map(float, parts[:3])
                # Округляем Z до десятков
             
                color = parts[3] if len(parts) > 3 else '#ffffff'
                coords.append((x, y, z, color))
            except ValueError:
                pass
    return volume, coords

# --- Основной процесс ---
def process_all():
    # Очищаем и создаем выходную директорию
    if os.path.exists(OUTPUT_DIR):
        shutil.rmtree(OUTPUT_DIR)
    os.makedirs(OUTPUT_DIR)

    quality_df = load_quality(os.path.join(INPUT_DIR, QUALITY_CSV))

    surface_files = glob.glob(os.path.join(INPUT_DIR, 'surface-tank *.txt'))
    surface_files = sorted(surface_files, key=parse_surface_timestamp)

    # Словарь для хранения накопленных изменений
    # Ключ: (x, y), Значение: (z, color)
    accumulated_changes = {}
    # Накопительный PointGrid
    accumulated_point_grid = {}
    files_info = []
    prev_volume = None

    for file in surface_files:
        surface_time = parse_surface_timestamp(file)
        quality = get_quality_for_timestamp(surface_time, quality_df)
        if quality is None:
            print(f"[!] Нет качества для {file}, пропускаем")
            continue

        current_volume, current_coords = load_surface(file)
        colored_points = []
        surface_points = []
        disappeared_points_quality = []

        prev_volume = current_volume

        for x, y, z, _ in current_coords:
            key = (x, y)
            current_z = z
            current_color = '#ffffff'

            # Проверяем, есть ли уже накопленное изменение для этой точки
            if key in accumulated_changes:
                prev_z, prev_color = accumulated_changes[key]
                # Если текущая точка выше накопленной
                if current_z > prev_z:
                    # Обновляем накопленное изменение
                    accumulated_changes[key] = (current_z, get_color(quality))
                    current_color = get_color(quality)
                else:
                    # Используем накопленный цвет
                    current_color = prev_color
            else:
                # Первое появление точки
                accumulated_changes[key] = (current_z, '#ffffff')

            # Добавляем точку с накопленным цветом
            colored_points.append(f"{x:.2f} {y:.2f} {current_z:.2f} {current_color}")

            # Добавляем точку в накопительный PointGrid
            if x not in accumulated_point_grid:
                accumulated_point_grid[x] = {}
            if y not in accumulated_point_grid[x]:
                accumulated_point_grid[x][y] = []
            
            point = {
                'x': x,
                'y': y,
                'z': current_z,
                'quality': quality,
                'color': current_color
            }

            # Получаем текущий массив точек для координаты
            points = accumulated_point_grid[x][y]

            if points and current_z < max(p['z'] for p in points):          
                # Если новая точка ниже накопленных — удаляем все точки выше неё
                color_counts = {}  # Словарь для подсчета точек по цветам
                for p in points:
                    if p['z'] >= current_z and p['quality'] >= 1:
                        disappeared_points_quality.append(p['quality'])
                        # Подсчитываем количество точек каждого цвета
                        color = p['color']
                        color_counts[color] = color_counts.get(color, 0) + 1
                
                # Удаляем точки выше текущей
                points = [p for p in points if p['z'] < current_z]
                
                # Проверяем каждый цвет на нечетное количество
                for color, count in color_counts.items():
                    if count % 2 != 0:  # Если количество нечетное
                        # Находим последнюю точку этого цвета
                        last_point = next((p for p in reversed(points) if p['color'] == color), None)
                        if last_point:
                            # Создаем дубликат точки под новой точкой
                            duplicate_point = {
                                'x': last_point['x'],
                                'y': last_point['y'],
                                'z': current_z - 0.1,  # Размещаем чуть ниже новой точки
                                'quality': last_point['quality'],
                                'color': color
                            }
                            points.append(duplicate_point)
                            # Сортируем точки по z
                            points.sort(key=lambda p: p['z'])
            else:
                # Если новая точка выше или равна — обычная логика с цветом
                if len(points) > 2 and points[-1]['color'] == current_color and points[-2]['color'] == current_color:
                    # Удаляем предпоследнюю точку
                    points.pop(-1)
                # --- Новая логика для перехода цвета ---
                if points:
                    prev_point = points[-1]
                    # Новая точка выше предыдущей и цвет отличается
                    if current_z > prev_point['z'] and current_color != prev_point['color']:
                        # Проверяем, есть ли точка-пара под предыдущей (с тем же цветом и z < prev_point['z'])
                        has_pair = any(
                            p['color'] == prev_point['color'] and p['z'] < prev_point['z']
                            for p in points[:-1]
                        )
                        if not has_pair:
                            # Добавляем точку такого же цвета как предыдущая чуть выше предыдущей
                            pair_point = {
                                'x': prev_point['x'],
                                'y': prev_point['y'],
                                'z': prev_point['z'] + 0.1,  # немного выше
                                'quality': prev_point['quality'],
                                'color': prev_point['color']
                            }
                            points.append(pair_point)
                            points.sort(key=lambda p: p['z'])

            # Добавляем новую точку
            points.append(point)
            # Сортируем точки по z
            points.sort(key=lambda p: p['z'])

            # Оптимизация: удаляем среднюю из трёх подряд точек одного цвета по z сверху вниз
            points_sorted = sorted(points, key=lambda p: -p['z'])
            optimized_points = []
            i = 0
            while i < len(points_sorted):
                if i >= 2 and \
                   points_sorted[i]['color'] == points_sorted[i-1]['color'] == points_sorted[i-2]['color']:
                    # Удаляем среднюю точку (i-1)
                    optimized_points.pop()
                    optimized_points.append(points_sorted[i])
                else:
                    optimized_points.append(points_sorted[i])
                i += 1
            # Сохраняем обратно (сортировка по z по возрастанию, если нужно)
            accumulated_point_grid[x][y] = sorted(optimized_points, key=lambda p: p['z'])

        # После обработки всех точек, формируем surface_points
        for x in accumulated_point_grid:
            for y in accumulated_point_grid[x]:
                if accumulated_point_grid[x][y]:  # Если есть точки для этой координаты
                    # Берем самую верхнюю точку
                    surface_points.append(accumulated_point_grid[x][y][-1])

        # Создаем имя выходного файла
        output_filename = os.path.basename(file)
        output_path = os.path.join(OUTPUT_DIR, output_filename)

        # Считаем среднее качество пропавших точек
        avg_disappeared_quality = None
        if disappeared_points_quality:
            avg_disappeared_quality = sum(disappeared_points_quality) / len(disappeared_points_quality)

        # Сохраняем JSON с нужной структурой
        json_output_path = os.path.join(OUTPUT_DIR, f"{os.path.splitext(output_filename)[0]}.json")
        with open(json_output_path, 'w') as f:
            json.dump({
                'surface_points': surface_points,
                'array': accumulated_point_grid,
                'avg_disappeared_quality': avg_disappeared_quality
            }, f, indent=2)

        print(f"[+] Обработан: {file} -> {output_path} и {json_output_path}")
        print(f"[+] Количество surface_points: {len(surface_points)}")
        if avg_disappeared_quality is not None:
            print(f"[+] Среднее качество пропавших точек: {avg_disappeared_quality:.2f}")

if __name__ == '__main__':
    process_all()
