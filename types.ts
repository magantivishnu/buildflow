
export enum StructureType {
  RCC_FRAMED = 'RCC_Framed',
  SHEAR_WALL = 'Shear_Wall',
  PREFAB = 'PreFab'
}

export enum ElementType {
  FOOTING = 'Footing',
  COLUMN = 'Column',
  BEAM = 'Beam',
  SLAB = 'Slab'
}

export enum ElementStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In_Progress',
  COMPLETED = 'Completed'
}

export enum TaskStatus {
  TODO = 'Todo',
  IN_PROGRESS = 'In_Progress',
  DONE = 'Done'
}

export interface Project {
  id: string;
  name: string;
  structureType: StructureType;
  floorsAboveGround: number;
  floorHeight: number; // in meters
  createdAt: Date;
}

export interface Level {
  id: string;
  projectId: string;
  name: string;
  elevation: number; // in meters relative to ground
  order: number; // helpful for sorting
}

export interface Coordinates {
  x: number;
  y: number;
  z: number;
}

export interface Element {
  id: string;
  levelId: string;
  projectId: string; // Denormalized for easier access
  type: ElementType;
  label: string; // e.g., C1, B2
  gridLocation: string; // e.g., A-1
  coordinates: Coordinates;
  status: ElementStatus;
  rotation?: number; // Rotation in radians around Y-axis (vertical)
  length?: number; // Length of the element in meters (for Beams)
  connected?: boolean; // Whether the element was successfully snapped to grid
}

export interface Task {
  id: string;
  elementId: string;
  name: string;
  assignedTo?: string;
  startDate?: string;
  endDate?: string;
  status: TaskStatus;
}

export interface Drawing {
  id: string;
  projectId: string;
  name: string;
  fileUrl: string; // Blob URL
  scaleFactor?: number; // pixels per meter at 100% zoom
  createdAt: Date;
}
