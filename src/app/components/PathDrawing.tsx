import { useState } from 'react';
import { LatLngExpression } from 'leaflet';

interface PathPoint {
  lat: number;
  lng: number;
}

interface PathDrawingProps {
  onPathComplete: (path: LatLngExpression[]) => void;
}

export default function PathDrawing({ onPathComplete }: PathDrawingProps) {
  const [drawMode, setDrawMode] = useState<'straight' | 'curved'>('straight');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<PathPoint[]>([]);

  const startDrawing = () => {
    setIsDrawing(true);
    setCurrentPath([]);
  };

  const finishDrawing = () => {
    setIsDrawing(false);
    if (currentPath.length > 0) {
      onPathComplete(currentPath.map((p) => [p.lat, p.lng] as LatLngExpression));
    }
  };

  const clearPath = () => {
    setCurrentPath([]);
    setIsDrawing(false);
    onPathComplete([]);
  };

  return (
    <div className="bg-[#faf6f0] rounded-[16px] border border-[#c4c8bc] p-[16px] space-y-[12px]">
      <div className="font-['Liberation_Serif:Bold',sans-serif] text-[#4a4e4a] text-[11px] tracking-[1.1px] uppercase">
        PATH DRAWING
      </div>

      {/* Mode Selection */}
      <div className="bg-[#eae6de] rounded-[9999px] border border-[#c4c8bc] p-[5px] flex">
        <button
          onClick={() => setDrawMode('straight')}
          className={`flex-1 px-[16px] py-[8px] rounded-[9999px] font-['Liberation_Serif:Bold',sans-serif] text-[11px] tracking-[1.1px] transition-all ${
            drawMode === 'straight'
              ? 'bg-[#78a886] text-white'
              : 'text-[#4a4e4a]'
          }`}
        >
          STRAIGHT
        </button>
        <button
          onClick={() => setDrawMode('curved')}
          className={`flex-1 px-[16px] py-[8px] rounded-[9999px] font-['Liberation_Serif:Bold',sans-serif] text-[11px] tracking-[1.1px] transition-all ${
            drawMode === 'curved'
              ? 'bg-[#78a886] text-white'
              : 'text-[#4a4e4a]'
          }`}
        >
          CURVED
        </button>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-[8px]">
        {!isDrawing ? (
          <button
            onClick={startDrawing}
            className="col-span-2 bg-[#78a886] text-white rounded-[12px] px-[16px] py-[12px] font-['Liberation_Serif:Bold',sans-serif] text-[11px] tracking-[1.1px] uppercase hover:bg-[#5a8066] transition-colors"
          >
            START DRAWING
          </button>
        ) : (
          <>
            <button
              onClick={finishDrawing}
              className="bg-[#78a886] text-white rounded-[12px] px-[16px] py-[12px] font-['Liberation_Serif:Bold',sans-serif] text-[11px] tracking-[1.1px] uppercase hover:bg-[#5a8066] transition-colors"
            >
              FINISH
            </button>
            <button
              onClick={clearPath}
              className="bg-[#ff3b3b] text-white rounded-[12px] px-[16px] py-[12px] font-['Liberation_Serif:Bold',sans-serif] text-[11px] tracking-[1.1px] uppercase hover:bg-[#cc2f2f] transition-colors"
            >
              CLEAR
            </button>
          </>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center gap-[8px] p-[10px] bg-[#eae6de] rounded-[8px]">
        <div className={`w-2 h-2 rounded-full ${isDrawing ? 'bg-[#78a886] animate-pulse' : 'bg-[#71717a]'}`} />
        <span className="text-[11px] font-['Liberation_Serif:Regular',sans-serif] text-[#4a4e4a]">
          {isDrawing
            ? `Drawing ${drawMode} path - ${currentPath.length} points`
            : 'Click on map to draw path'}
        </span>
      </div>
    </div>
  );
}
