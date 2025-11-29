
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Element, ElementType, Task, TaskStatus } from '../types';

interface ExtractedItem {
  id: string;
  type: 'Column' | 'Beam' | 'Footing';
  label: string;
  x: number;
  y: number;
  rotation?: number;
  length?: number;
  connected?: boolean;
}

interface Scene3DProps {
  // Support both raw extracted items (upload phase) and domain elements (dashboard phase)
  items?: ExtractedItem[];
  elements?: Element[];
  tasks?: Task[];
  baseElevation?: number;
  onElementClick?: (elementId: string) => void;
  onItemClick?: (itemId: string) => void; // Handler for staging items (e.g., rotation toggle)
}

export const Scene3D: React.FC<Scene3DProps> = ({ 
  items, 
  elements, 
  tasks = [], 
  baseElevation = 0,
  onElementClick,
  onItemClick
}) => {
  
  // Helper to determine color based on Task Status
  const getElementColor = (elementId: string, defaultColor: string) => {
    if (!tasks.length) return defaultColor;
    
    const task = tasks.find(t => t.elementId === elementId);
    if (!task) return defaultColor;

    switch (task.status) {
      case TaskStatus.DONE: return '#22c55e'; // Green-500
      case TaskStatus.IN_PROGRESS: return '#facc15'; // Yellow-400
      case TaskStatus.TODO: return '#cccccc'; // Gray-300
      default: return defaultColor;
    }
  };

  return (
    <div className="w-full h-full bg-gray-900 rounded-lg overflow-hidden shadow-inner border border-gray-700 relative">
      <Canvas camera={{ position: [20, 20, 20], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 20, 5]} intensity={1.2} castShadow />
        
        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.2} />

        <gridHelper args={[100, 100, 0x444444, 0x222222]} position={[0, 0, 0]} />
        <axesHelper args={[5]} />

        {/* Render Extracted Items (Upload Phase) */}
        {items && items.map((item) => {
          const scaleFactor = 50;
          const x = item.x / scaleFactor;
          const z = item.y / scaleFactor;
          const rotation = item.rotation || 0;
          const isConnected = item.connected !== false;

          let geometryArgs: [number, number, number] = [0.5, 3, 0.5];
          let posY = 1.5;
          let color = '#d4d4d8'; // Light Gray (Column)
          let isWarning = false;

          switch (item.type) {
            case 'Footing':
              geometryArgs = [1.5, 0.5, 1.5]; // Wide pad
              posY = -0.25; // Below grid
              color = '#52525b'; // Dark Gray
              break;
            case 'Column':
              geometryArgs = [0.4, 3, 0.4];
              posY = 1.5;
              color = '#d4d4d8'; // Light Gray
              break;
            case 'Beam':
              const length = item.length ? item.length / scaleFactor : 2;
              geometryArgs = [length, 0.4, 0.3];
              posY = 3.0; // Ceiling
              color = isConnected ? '#f97316' : '#ef4444'; // Orange or Red
              isWarning = !isConnected;
              break;
          }

          return (
            <group 
              key={item.id} 
              onClick={(e) => {
                e.stopPropagation();
                if (onItemClick) onItemClick(item.id);
              }}
            >
              <mesh 
                position={[x, baseElevation + posY, z]}
                rotation={[0, rotation, 0]}
              >
                {isWarning ? (
                  <sphereGeometry args={[0.3]} />
                ) : (
                  <boxGeometry args={geometryArgs} />
                )}
                
                <meshStandardMaterial 
                   color={color} 
                   emissive={isWarning ? '#7f1d1d' : undefined}
                />
              </mesh>
            </group>
          );
        })}

        {/* Render Domain Elements (Dashboard Phase) */}
        {elements && elements.map((el) => {
            const isColumn = el.type === ElementType.COLUMN;
            const isFooting = el.type === ElementType.FOOTING;
            const isBeam = el.type === ElementType.BEAM;
            
            const rotation = el.rotation || 0;
            const length = el.length || 2;
            const isConnected = el.connected !== false; 

            // Calculate Geometry & Position relative to elevation
            let geometryArgs: [number, number, number] = [0.4, 3, 0.4];
            let yOffset = 1.5;
            let defaultColor = '#9ca3af';

            if (isFooting) {
              geometryArgs = [1.5, 0.5, 1.5];
              yOffset = -0.25;
              defaultColor = '#52525b';
            } else if (isBeam) {
              geometryArgs = [length, 0.4, 0.3];
              yOffset = 3.0;
              defaultColor = isConnected ? '#fb923c' : '#ef4444';
            }

            const yPos = el.coordinates.y + yOffset;
            const color = getElementColor(el.id, defaultColor);

            return (
              <group key={el.id} onClick={(e) => {
                  e.stopPropagation();
                  if (onElementClick) onElementClick(el.id);
              }}>
                 <mesh 
                    position={[el.coordinates.x, yPos, el.coordinates.z]}
                    rotation={[0, rotation, 0]}
                 >
                    {isBeam && !isConnected ? (
                       <sphereGeometry args={[0.3]} />
                    ) : (
                       <boxGeometry args={geometryArgs} />
                    )}
                    <meshStandardMaterial color={color} />
                 </mesh>
              </group>
            );
        })}
      </Canvas>
      
      {/* Legend Overlay */}
      {elements && elements.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm p-3 rounded-lg text-xs text-white space-y-2 border border-white/10 pointer-events-none select-none">
          <div className="font-semibold mb-1">Status Legend</div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#cccccc]"></span> Pending
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#facc15]"></span> In Progress
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#22c55e]"></span> Completed
          </div>
        </div>
      )}

      {/* Upload Phase Hint */}
      {items && items.length > 0 && (
        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur text-white px-3 py-1.5 rounded-full text-xs font-medium border border-white/20">
           Red Spheres = Unconnected Beams
        </div>
      )}
    </div>
  );
};
