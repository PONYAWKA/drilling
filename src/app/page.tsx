'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { loadSurfaceFileContent, loadSurface } from '@/utils/fileManager';
import { useVisualize } from '@/components/use-visualize/use-visualize';
import { PointGrid, getTopPoints, getAllSectionPoints, Point, convertToPointGrid, SurfaceFile } from '@/types/surface';
import * as THREE from 'three';
import styles from './page.module.css';
import { SectionChart3 } from '@/components/section-chart/SectionChart3';

interface SurfaceContent {
  surface_points: Point[];
  array: number[][][];
  avg_disappeared_quality: number | null;
}

export default function Home() {
  const [pointGrid, setPointGrid] = useState<PointGrid>(new Map());
  const [currentFile, setCurrentFile] = useState<string>('');
  const [sectionX, setSectionX] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const mountRef = useRef<HTMLDivElement>(null);
  const [surface, setSurface] = useState<SurfaceFile | null>(null);
  const [avgDisappearedQuality, setAvgDisappearedQuality] = useState<number | null>(null);

  const handleFileSelect = useCallback(async (filename: string) => {
    try {
      const content = await loadSurfaceFileContent(filename) as SurfaceContent;

      const surfaceData = await loadSurface(filename);
      let parsedPoints = content.surface_points;
      if (!isPlaying) {
        return
      }
      // Фильтрация невалидных точек
      const validPoints = parsedPoints.filter(p =>
        typeof p.x === 'number' && !isNaN(p.x) &&
        typeof p.y === 'number' && !isNaN(p.y) &&
        typeof p.z === 'number' && !isNaN(p.z)
      );
      if (validPoints.length !== parsedPoints.length) {
        console.warn('Некорректные точки были отброшены:', parsedPoints.length - validPoints.length);
      }
      parsedPoints = validPoints;

      setSurface(surfaceData);
      // Преобразуем массив в формат PointGridJSON
      //@ts-expect-error: convertToPointGrid принимает PointGridJSON, но content.array - это number[][][]
      const grid = convertToPointGrid(content.array);
      setAvgDisappearedQuality(content.avg_disappeared_quality);
      setPointGrid(grid);
      setCurrentFile(filename);
    } catch (error) {
      console.error('Ошибка при загрузке файла:', error);
      setIsPlaying(false);
    }
  }, [isPlaying]);

  const fetchNextFile = useCallback(async () => {
    try {
      const url = currentFile ? `/api/surfaces/next?current=${encodeURIComponent(currentFile)}` : '/api/surfaces/next';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Ошибка при получении следующего файла');
      }
      const data = await response.json();


      await handleFileSelect(data.filename);
    } catch (error) {
      console.error('Ошибка при загрузке файла:', error);
      setIsPlaying(false);
    }
  }, [currentFile, handleFileSelect]);


  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(fetchNextFile, 500);
    return () => clearInterval(interval);
  }, [fetchNextFile, isPlaying]);


  // Получаем все точки для 3D (только верхние)
  const allPoints = useMemo(() => getTopPoints(pointGrid), [pointGrid]);


  // Получаем все точки для выбранного X (все слои)
  const sectionPoints = useMemo(() => {
    if (sectionX === null) return [];
    return getAllSectionPoints(pointGrid, sectionX);
  }, [pointGrid, sectionX]);

  // Получаем всю инфу о камере из useVisualize
  useEffect(() => {
    const interval = setInterval(() => {
      // @ts-expect-error: доступ к window.__drillCameraRef для получения камеры из three.js
      const cam = window.__drillCameraRef as THREE.PerspectiveCamera | undefined;
      if (cam) {
        const pos = cam.position.clone();
        const up = cam.up.clone();
        const dir = new THREE.Vector3();
        cam.getWorldDirection(dir);
        const target = pos.clone().add(dir);
        const quaternion = cam.quaternion.clone();
        // Сохраняем информацию о камере для отладки
        if (process.env.NODE_ENV === 'development') {
          console.log('Camera position:', pos);
          console.log('Camera target:', target);
          console.log('Camera up:', up);
          console.log('Camera quaternion:', quaternion);
        }
      }
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // @ts-expect-error: сохраняем pointGrid глобально для 3D линии
    window.__drillPointGrid = pointGrid;
  }, [pointGrid]);

  useVisualize({
    points: allPoints,
    mountRef: mountRef as React.RefObject<HTMLDivElement>,
    onSectionXChange: setSectionX,
    selectedSectionX: sectionX,
    surface: surface!,
  });

  // Функция для извлечения времени из имени файла
  const extractTimeFromFileName = (fileName: string): string => {
    // Ищем паттерн времени в формате ЧЧ-ММ-СС
    const timeMatch = fileName.match(/(\d{2})-(\d{2})-(\d{2})/);
    if (timeMatch) {
      // Возвращаем только часы и минуты
      return `${timeMatch[1]}:${timeMatch[2]}`;
    }
    return fileName; // Если паттерн не найден, возвращаем исходное имя
  };

  return (
    <main className={styles.main}>
      {/* --- Легенда из скриншота --- */}
      <div className={styles.legendBlock}>
        <div className={styles.legendTitle}>Склад 320. Секция №1</div>
        <div className={styles.legendRow}>
          <img src="/fingers.svg" alt="legend-1" />
          <span className={styles.legendDot} style={{ background: '#A259FF' }}></span>
          <span className={styles.legendText}>Богатая, &gt; 39%</span>
        </div>
        <div className={styles.legendRow}>
          <img src="/fingers.svg" alt="legend-1" />

          <span className={styles.legendDot} style={{ background: '#04bd3b' }}></span>
          <span className={styles.legendText}>Целевая 35.4 - 38.9%</span>
        </div>
        <div className={styles.legendRow}>
          <img src="/fingers.svg" alt="legend-1" />

          <span className={styles.legendDot} style={{ background: '#2CD9C5' }}></span>
          <span className={styles.legendText}>Рядовая, 30.7 - 35.3%</span>
        </div>
        <div className={styles.legendRow}>
          <img src="/fingers.svg" alt="legend-1" />

          <span className={styles.legendDot} style={{ background: '#FFE066' }}></span>
          <span className={styles.legendText}>Бедная, &lt;30.6%</span>
        </div>
      </div>

      <div className={styles.content}>

      </div>

      <div ref={mountRef} className={styles.visualizer} />
      <div className={styles.sidePanel}>
        <div className={styles.time}>{extractTimeFromFileName(currentFile)}</div>
        <div className={styles.chart}>
          <div className={styles.chartTitle}>Разрез оси в #11 / 55м</div>
          <div className={styles.chartContent}>
            <SectionChart3 points={sectionPoints.filter(p => p.color !== '#ffffff')} />
          </div>
        </div>
        <div className={styles.infoBlock}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Раб. зона тележки</span>
            <span className={styles.infoValue}>#14–18</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Положение тележки</span>
            <span className={styles.infoValue}>#16 / 40м</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Скорость транспортера</span>
            <span className={styles.infoValue}>0.6 м/с</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>KCI из тележки</span>
            <span className={styles.infoValue}>
              37% <span className={styles.infoDot}></span>
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Качество собираемой руды</span>
            <span className={styles.infoValue}>
              {(avgDisappearedQuality ?? 0).toFixed(2)} <span className={styles.infoDot}></span>
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Раб. зона реклаймера</span>
            <span className={styles.infoValue}>55–75м</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabelRed}>Положение реклаймера</span>
            <span className={styles.infoValueRed}>40м</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Скорость транспортера</span>
            <span className={styles.infoValue}>0.6 м/с</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Угол стрелы реклаймера</span>
            <span className={styles.infoValue}>25°</span>
          </div>
        </div>
        {/* <div className={styles.hotlineBlock}>
          <div className={styles.hotline}>
            ГОРЯЧАЯ ЛИНИЯ <span className={styles.hotlineNumber}>8 (914) 920 18 89</span>
          </div>
        </div> */}
      </div>

    </main>
  );
}