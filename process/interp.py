import os
import numpy as np
from scipy.interpolate import griddata
import matplotlib.colors as mcolors
from pathlib import Path

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

    # Интерполяция Z
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
        # Ближайший цвет (без сглаживания)
        grid_rgb = []
        for i in range(3):
            chan = griddata((x, y), colors[:, i], (grid_x, grid_y), method='nearest')
            chan[np.isnan(chan)] = 0  # на всякий случай
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

def process_folder(input_dir, output_dir, base_resolution=200, scale=0.5, interpolate_colors=False):
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    for file in input_path.glob("*.txt"):
        print(f"Обработка {file.name}...")
        data, colors = load_points(file)
        if data.shape[0] < 4:
            print(f"Пропущено (мало точек): {file.name}")
            continue
        try:
            gx, gy, gz, grgb = interpolate_points(data, colors, base_resolution, scale, interpolate_colors)
            output_file = output_path / file.name
            save_interpolated_points(output_file, gx, gy, gz, grgb)
        except Exception as e:
            print(f"Ошибка при обработке {file.name}: {e}")

# === Заменить пути ниже ===
input_folder = "./inputFiles"
output_folder = "./output"
process_folder(input_folder, output_folder, base_resolution=200, scale=0.5, interpolate_colors=True)
