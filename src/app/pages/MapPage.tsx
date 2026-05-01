import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useControlMode } from '../contexts/ControlModeContext';

interface Detection {
  type: 'crack' | 'pothole';
  position: [number, number];
  timestamp: Date;
}

export default function MapPage() {
  const { isDark } = useTheme();
  const { mode } = useControlMode();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);

  const [robotPosition, setRobotPosition] = useState<[number, number]>([30.0444, 31.2357]);
  const [path, setPath] = useState<[number, number][]>([[30.0444, 31.2357]]);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [stats, setStats] = useState({ areaMapped: 452, scanRate: 12.5, confidence: 98 });
  const [totalDistance, setTotalDistance] = useState(0);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initMap = async () => {
      const L = await import('leaflet');

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      if (!containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [30.0444, 31.2357],
        zoom: 15,
        zoomControl: false,
      });

      L.tileLayer(
        isDark
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { attribution: '© OpenStreetMap', maxZoom: 19 }
      ).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const robotIcon = L.divIcon({
        html: `<div style="width:16px;height:16px;background:${isDark ? '#00d1ff' : '#10b981'};border:3px solid white;border-radius:50%;box-shadow:0 0 12px ${isDark ? 'rgba(0,209,255,0.6)' : 'rgba(16,185,129,0.6)'}"></div>`,
        className: 'custom-icon',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      markerRef.current = L.marker([30.0444, 31.2357], { icon: robotIcon }).addTo(map);
      polylineRef.current = L.polyline([], {
        color: isDark ? '#00d1ff' : '#10b981',
        weight: 3, opacity: 0.7, dashArray: '8, 4',
      }).addTo(map);

      mapRef.current = map;
      setMapReady(true);

      // Force tile loading with repeated invalidateSize
      const resizeMap = () => map.invalidateSize();
      setTimeout(resizeMap, 200);
      setTimeout(resizeMap, 600);
      setTimeout(resizeMap, 1200);

      // Also listen for resize events
      const observer = new ResizeObserver(resizeMap);
      if (containerRef.current) observer.observe(containerRef.current);
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Simulate movement
  useEffect(() => {
    if (mode !== 'auto') return;
    const interval = setInterval(() => {
      setRobotPosition((prev) => {
        const newPos: [number, number] = [
          prev[0] + (Math.random() - 0.5) * 0.0005,
          prev[1] + (Math.random() - 0.5) * 0.0005,
        ];
        setPath((p) => [...p, newPos]);
        if (markerRef.current) markerRef.current.setLatLng(newPos);
        if (polylineRef.current) polylineRef.current.addLatLng(newPos);

        if (Math.random() > 0.9) {
          setDetections((p) => [...p, {
            type: Math.random() > 0.5 ? 'crack' : 'pothole',
            position: newPos,
            timestamp: new Date(),
          }]);
        }
        return newPos;
      });
      setStats((p) => ({
        ...p,
        areaMapped: p.areaMapped + Math.floor(Math.random() * 3),
        scanRate: 10 + Math.random() * 5,
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, [mode]);

  // Distance calculation
  useEffect(() => {
    if (path.length < 2) return;
    let d = 0;
    for (let i = 1; i < path.length; i++) {
      const R = 6371e3;
      const φ1 = (path[i-1][0] * Math.PI) / 180;
      const φ2 = (path[i][0] * Math.PI) / 180;
      const Δφ = ((path[i][0] - path[i-1][0]) * Math.PI) / 180;
      const Δλ = ((path[i][1] - path[i-1][1]) * Math.PI) / 180;
      const a = Math.sin(Δφ/2)**2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2)**2;
      d += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }
    setTotalDistance(d);
  }, [path]);

  return (
    <div className="relative h-full flex flex-col overflow-hidden">
      {/* Map fills available space */}
      <div className="flex-1 relative min-h-0">
        <div
          ref={containerRef}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        {/* Distance badge */}
        <div className={`absolute top-3 left-1/2 -translate-x-1/2 z-[1000] rounded-2xl px-5 py-2 ${
          isDark ? 'bg-emerald-600/90 backdrop-blur-md' : 'bg-emerald-500 shadow-lg'
        }`}>
          <div className="text-[8px] text-white/80 font-bold tracking-wider uppercase text-center">Distance</div>
          <div className="text-lg font-black text-white font-['JetBrains_Mono',monospace] text-center">
            {totalDistance.toFixed(1)}<span className="text-sm text-white/70 ml-0.5">m</span>
          </div>
        </div>

        {/* Status badge */}
        <div className={`absolute top-3 right-3 z-[1000] rounded-xl px-3 py-2 ${
          isDark ? 'glass' : 'glass-light'
        }`}>
          <div className={`text-[8px] font-bold tracking-wider uppercase ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Status</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className={`w-2 h-2 rounded-full animate-pulse ${mode === 'auto' ? 'bg-cyan-400' : 'bg-emerald-400'}`} />
            <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-zinc-700'}`}>
              {mode === 'auto' ? 'AUTO' : 'MANUAL'}
            </span>
          </div>
        </div>

        {/* Coordinates */}
        <div className={`absolute bottom-3 left-3 z-[1000] rounded-lg px-2.5 py-1.5 ${isDark ? 'glass' : 'glass-light'}`}>
          <div className={`text-[10px] font-mono ${isDark ? 'text-cyan-400' : 'text-emerald-600'}`}>
            {robotPosition[0].toFixed(6)}°, {robotPosition[1].toFixed(6)}°
          </div>
        </div>
      </div>

      {/* Stats panel at bottom */}
      <div className={`shrink-0 border-t p-3 transition-theme ${
        isDark ? 'bg-[#0d0d14] border-[#1a1a2e]' : 'bg-white border-[#e0ddd5]'
      }`}>
        <div className={`text-[9px] font-semibold tracking-[1.5px] uppercase font-['Space_Grotesk',sans-serif] mb-2 ${
          isDark ? 'text-zinc-600' : 'text-zinc-400'
        }`}>
          TELEMETRY
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Area', value: stats.areaMapped, unit: 'm²', color: isDark ? 'text-emerald-400' : 'text-emerald-600' },
            { label: 'Rate', value: stats.scanRate.toFixed(1), unit: 'Hz', color: isDark ? 'text-cyan-400' : 'text-cyan-600' },
            { label: 'Detect', value: detections.length, unit: '', color: isDark ? 'text-red-400' : 'text-red-500' },
            { label: 'Conf', value: stats.confidence, unit: '%', color: isDark ? 'text-violet-400' : 'text-violet-600' },
          ].map((s) => (
            <div key={s.label} className={`rounded-lg p-2 text-center ${
              isDark ? 'bg-[#12121c] border border-[#1e1e32]' : 'bg-zinc-50 border border-zinc-200'
            }`}>
              <div className={`text-[7px] font-bold tracking-wider uppercase mb-0.5 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>{s.label}</div>
              <span className={`text-sm font-bold font-['JetBrains_Mono',monospace] ${s.color}`}>{s.value}</span>
              {s.unit && <span className={`text-[8px] ml-0.5 ${isDark ? 'text-zinc-700' : 'text-zinc-400'}`}>{s.unit}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
