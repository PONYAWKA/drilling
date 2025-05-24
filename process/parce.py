import os
import glob
import re
import shutil
import json
from datetime import datetime
import pandas as pd

# --- Настройки ---
INPUT_DIR = 'P:/sdf/logs13052025/surf/16.04.2025' # папка с surface-файлами и CSV
QUALITY_CSV = 'quality.csv'  # имя CSV-файла
OUTPUT_DIR = '../public/surfaces'  # папка для вывода

# --- Цвет по качеству ---
def get_color(quality):
    if quality > 40:
        return '#a059e0'  # фиолетовый
    elif 37 <= quality <= 39:
        return '#04a29e'  # серый
    else:
        return '#d7ca7b'   # коричневый

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
    coords = []
    for line in lines:
        parts = line.strip().split()
        if len(parts) >= 3:  # Может быть 3 или 4 части (x y z color)
            try:
                x, y, z = map(float, parts[:3])
                # Округляем Z до десятков
                z = round(z / 10) * 10
                color = parts[3] if len(parts) > 3 else '#ffffff'
                coords.append((x, y, z, color))
            except ValueError:
                pass
    return coords

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

    for file in surface_files:
        surface_time = parse_surface_timestamp(file)
        quality = get_quality_for_timestamp(surface_time, quality_df)
        if quality is None:
            print(f"[!] Нет качества для {file}, пропускаем")
            continue

        current_coords = load_surface(file)
        colored_points = []
        surface_points = []

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
                points = [p for p in points if p['z'] < current_z]
            else:
                # Если новая точка выше или равна — обычная логика с цветом
                if len(points) > 2 and points[-1]['color'] == current_color and points[-2]['color'] == current_color:
                    # Удаляем предпоследнюю точку
                    points.pop(-1)

            # Добавляем новую точку
            points.append(point)
            # Сортируем точки по z
            points.sort(key=lambda p: p['z'])

            # Обновляем массив в grid
            accumulated_point_grid[x][y] = points

        # После обработки всех точек, формируем surface_points
        for x in accumulated_point_grid:
            for y in accumulated_point_grid[x]:
                if accumulated_point_grid[x][y]:  # Если есть точки для этой координаты
                    # Берем самую верхнюю точку
                    surface_points.append(accumulated_point_grid[x][y][-1])

        # Создаем имя выходного файла
        output_filename = os.path.basename(file)
        output_path = os.path.join(OUTPUT_DIR, output_filename)

        # Сохраняем JSON с нужной структурой
        json_output_path = os.path.join(OUTPUT_DIR, f"{os.path.splitext(output_filename)[0]}.json")
        with open(json_output_path, 'w') as f:
            json.dump({
                'surface_points': surface_points,
                'array': accumulated_point_grid
            }, f, indent=2)

        print(f"[+] Обработан: {file} -> {output_path} и {json_output_path}")
        print(f"[+] Количество surface_points: {len(surface_points)}")

if __name__ == '__main__':
    process_all()
