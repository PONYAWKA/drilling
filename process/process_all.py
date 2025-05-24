import os
import glob
import re
from datetime import datetime
import pandas as pd
import numpy as np
from scipy.interpolate import griddata
import matplotlib.colors as mcolors
from pathlib import Path

# --- Настройки ---
INPUT_DIR = './inputFiles'  # папка с исходными файлами
QUALITY_CSV = 'quality_full.csv'  # имя CSV-файла
TEMP_DIR = './temp'  # временная папка для промежуточных результатов
OUTPUT_DIR = '../public/surfaces'  # папка для финальных результатов

# --- Функции из parce.py ---
def get_color(quality):
    if quality > 40:
        return '#a059e0'  # фиолетовый
    elif 37 <= quality <= 39:
        return '#04a29e'  # серый
    else:
        return '#d7ca7b'  # коричневый

def parse_surface_timestamp(filename):
    match = re.search(r'surface-tank (\d{2})\.(\d{2})\.(\d{4})\s+(\d{2})-(\d{2})-(\d{2})', filename)
    if match:
        day, month, year, h, m, s = match.groups()
        return datetime(int(year), int(month), int(day), int(h), int(m), int(s))
    raise ValueError(f"Cannot parse datetime from {filename}")

def load_quality(csv_path):
    df = pd.read_csv(csv_path, parse_dates=['Timestamp'])
    df.sort_values('Timestamp', inplace=True)
    return df

def get_quality_for_timestamp(surface_time, quality_df):
    past = quality_df[quality_df['Timestamp'] <= surface_time]
    if past.empty:
        return None
    return past.iloc[-1]['KL_320_FINAL']

def load_surface(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()
    coords = []
    for line in lines:
        parts = line.strip().split()
        if len(parts) == 3:
            try:
                x, y, z = map(float, parts)
                coords.append((x, y, z))
            except ValueError:
                pass
    return coords

# --- Функции из interp.py ---
def hex_from_rgb(rgb):
    return '#%02x%02x%02x' % tuple((np.clip(rgb, 0, 1) * 255).astype(int))

def load_points(file_path):
    data = []
    colors = []
    with open(file_path, 'r') as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) < 4:
                continue
            x, y, z = map(float, parts[:3])
            hex_color = parts[3]
            data.append([x, y, z])
            colors.append(mcolors.to_rgb(hex_color))
    return np.array(data), np.array(colors)

def interpolate_points(data, colors, base_resolution=200, scale=0.5, interpolate_colors=True):
    res = int(base_resolution * scale)
    x, y, z = data[:, 0], data[:, 1], data[:, 2]

    grid_x, grid_y = np.meshgrid(
        np.linspace(x.min(), x.max(), res),
        np.linspace(y.min(), y.max(), res)
    )

    grid_z = griddata((x, y), z, (grid_x, grid_y), method='cubic')

    if interpolate_colors:
        grid_rgb = []
        for i in range(3):
            chan = griddata((x, y), colors[:, i], (grid_x, grid_y), method='cubic')
            mean_val = np.nanmean(colors[:, i])
            chan[np.isnan(chan)] = mean_val
            grid_rgb.append(chan)
        grid_rgb = np.stack(grid_rgb, axis=-1)
        grid_rgb = np.clip(grid_rgb, 0, 1)
    else:
        grid_rgb = []
        for i in range(3):
            chan = griddata((x, y), colors[:, i], (grid_x, grid_y), method='nearest')
            chan[np.isnan(chan)] = 0
            grid_rgb.append(chan)
        grid_rgb = np.stack(grid_rgb, axis=-1)
        grid_rgb = np.clip(grid_rgb, 0, 1)

    return grid_x, grid_y, grid_z, grid_rgb

def save_interpolated_points(file_path, grid_x, grid_y, grid_z, grid_rgb):
    h, w = grid_z.shape
    with open(file_path, 'w') as f:
        for i in range(h):
            for j in range(w):
                z = grid_z[i, j]
                if np.isnan(z):
                    continue
                x, y = grid_x[i, j], grid_y[i, j]
                color_hex = hex_from_rgb(grid_rgb[i, j])
                f.write(f"{x:.3f} {y:.3f} {z:.3f} {color_hex}\n")

# --- Основной процесс ---
def process_all():
    # Создаем необходимые директории
    os.makedirs(TEMP_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # --- Очищаем output перед началом ---
    for f in os.listdir(OUTPUT_DIR):
        file_path = os.path.join(OUTPUT_DIR, f)
        if os.path.isfile(file_path):
            os.remove(file_path)

    # Загружаем данные о качестве
    quality_df = load_quality(QUALITY_CSV)

    # Получаем список файлов
    surface_files = glob.glob(os.path.join(INPUT_DIR, 'surface-tank *.txt'))
    surface_files = sorted(surface_files, key=parse_surface_timestamp)

    previous_coords = None

    for file in surface_files:
        print(f"\nОбработка файла: {file}")
        
        # Шаг 1: Парсинг и добавление цветов
        surface_time = parse_surface_timestamp(file)
        quality = get_quality_for_timestamp(surface_time, quality_df)
        if quality is None:
            print(f"[!] Нет качества для {file}, пропускаем")
            continue

        current_coords = load_surface(file)
        colored_points = []

        for i, (x, y, z) in enumerate(current_coords):
            color = '#ffffff'  # по умолчанию — белый
            if previous_coords and i < len(previous_coords):
                if z > previous_coords[i][2]:
                    color = get_color(quality)
            colored_points.append(f"{x:.2f} {y:.2f} {z:.2f} {color}")

        # Сохраняем промежуточный результат
        temp_file = os.path.join(TEMP_DIR, os.path.basename(file))
        with open(temp_file, 'w') as f:
            f.write('\n'.join(colored_points))
        print(f"[+] Промежуточный файл сохранен: {temp_file}")

        # Шаг 2: Интерполяция
        try:
            data, colors = load_points(temp_file)
            if data.shape[0] < 4:
                print(f"[!] Пропущено (мало точек): {file}")
                continue

            gx, gy, gz, grgb = interpolate_points(data, colors, base_resolution=50, scale=1, interpolate_colors=True)
            output_file = os.path.join(OUTPUT_DIR, os.path.basename(file))
            save_interpolated_points(output_file, gx, gy, gz, grgb)
            print(f"[+] Финальный файл сохранен: {output_file}")

        except Exception as e:
            print(f"[!] Ошибка при интерполяции {file}: {e}")

        previous_coords = current_coords

    # Очистка временных файлов
    for temp_file in glob.glob(os.path.join(TEMP_DIR, '*.txt')):
        os.remove(temp_file)
    os.rmdir(TEMP_DIR)
    print("\n[+] Обработка завершена!")

if __name__ == '__main__':
    process_all() 