import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Project, Level, Element, Task, Drawing, StructureType, ElementType, ElementStatus, TaskStatus } from '../types';

interface ProjectContextType {
  projects: Project[];
  levels: Level[];
  elements: Element[];
  tasks: Task[];
  drawings: Drawing[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>; // Exposed for manual WBS generation
  addProject: (projectData: Omit<Project, 'id' | 'createdAt'>) => string;
  addDrawing: (drawingData: Omit<Drawing, 'id' | 'createdAt'>) => void;
  updateDrawingScale: (drawingId: string, scaleFactor: number) => void;
  getProjectDetails: (projectId: string) => { project?: Project; levels: Level[]; elements: Element[]; drawings: Drawing[]; tasks: Task[] };
  addElements: (newElements: Element[]) => void;
  generateWBS: (projectId: string) => void;
  updateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const DUMMY_PROJECT_ID = 'proj-001';
const DUMMY_LEVEL_GROUND = 'lvl-g';
const DUMMY_LEVEL_1 = 'lvl-1';

const INITIAL_PROJECTS: Project[] = [
  {
    id: DUMMY_PROJECT_ID,
    name: 'Skyline Plaza',
    structureType: StructureType.RCC_FRAMED,
    floorsAboveGround: 2,
    floorHeight: 3.5,
    createdAt: new Date()
  }
];

const INITIAL_LEVELS: Level[] = [
  { id: DUMMY_LEVEL_GROUND, projectId: DUMMY_PROJECT_ID, name: 'Ground Floor', elevation: 0, order: 0 },
  { id: DUMMY_LEVEL_1, projectId: DUMMY_PROJECT_ID, name: 'Level 1', elevation: 3.5, order: 1 }
];

const INITIAL_ELEMENTS: Element[] = [
  { id: 'el-1', levelId: DUMMY_LEVEL_GROUND, projectId: DUMMY_PROJECT_ID, type: ElementType.COLUMN, label: 'C1', gridLocation: 'A-1', coordinates: { x: 0, y: 0, z: 0 }, status: ElementStatus.COMPLETED },
  { id: 'el-2', levelId: DUMMY_LEVEL_GROUND, projectId: DUMMY_PROJECT_ID, type: ElementType.COLUMN, label: 'C2', gridLocation: 'A-5', coordinates: { x: 5, y: 0, z: 0 }, status: ElementStatus.IN_PROGRESS },
  { id: 'el-3', levelId: DUMMY_LEVEL_GROUND, projectId: DUMMY_PROJECT_ID, type: ElementType.COLUMN, label: 'C3', gridLocation: 'B-1', coordinates: { x: 0, y: 5, z: 0 }, status: ElementStatus.PENDING },
  { id: 'el-4', levelId: DUMMY_LEVEL_GROUND, projectId: DUMMY_PROJECT_ID, type: ElementType.COLUMN, label: 'C4', gridLocation: 'B-5', coordinates: { x: 5, y: 5, z: 0 }, status: ElementStatus.PENDING },
  { id: 'el-5', levelId: DUMMY_LEVEL_1, projectId: DUMMY_PROJECT_ID, type: ElementType.COLUMN, label: 'C1', gridLocation: 'A-1', coordinates: { x: 0, y: 0, z: 3.5 }, status: ElementStatus.PENDING },
];

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [levels, setLevels] = useState<Level[]>(INITIAL_LEVELS);
  const [elements, setElements] = useState<Element[]>(INITIAL_ELEMENTS);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [drawings, setDrawings] = useState<Drawing[]>([]);

  const addProject = (data: Omit<Project, 'id' | 'createdAt'>) => {
    const newProjectId = `proj-${Date.now()}`;
    
    const newProject: Project = {
      ...data,
      id: newProjectId,
      createdAt: new Date(),
    };

    setProjects(prev => [...prev, newProject]);

    // Auto-generate levels
    const newLevels: Level[] = [];
    
    // Always add Ground Floor
    newLevels.push({
      id: `lvl-${newProjectId}-0`,
      projectId: newProjectId,
      name: 'Ground Floor',
      elevation: 0,
      order: 0
    });

    // Add subsequent floors
    for (let i = 1; i <= data.floorsAboveGround; i++) {
      newLevels.push({
        id: `lvl-${newProjectId}-${i}`,
        projectId: newProjectId,
        name: `Level ${i}`,
        elevation: i * data.floorHeight,
        order: i
      });
    }

    setLevels(prev => [...prev, ...newLevels]);

    return newProjectId;
  };

  const addDrawing = (data: Omit<Drawing, 'id' | 'createdAt'>) => {
    const newDrawing: Drawing = {
      ...data,
      id: `dwg-${Date.now()}`,
      createdAt: new Date()
    };
    setDrawings(prev => [...prev, newDrawing]);
  };

  const updateDrawingScale = (drawingId: string, scaleFactor: number) => {
    setDrawings(prev => prev.map(d => d.id === drawingId ? { ...d, scaleFactor } : d));
  };

  const addElements = (newElements: Element[]) => {
    setElements(prev => [...prev, ...newElements]);
  };

  const generateWBS = (projectId: string) => {
    // Filter elements for this project
    const projectElements = elements.filter(e => e.projectId === projectId);
    
    // Identify elements that don't have tasks yet
    const existingElementIds = new Set(tasks.map(t => t.elementId));
    
    const newTasks: Task[] = [];
    
    projectElements.forEach((el) => {
      if (!existingElementIds.has(el.id)) {
        newTasks.push({
          id: `task-${el.id}`,
          elementId: el.id,
          name: `Cast ${el.type} ${el.label}`,
          status: TaskStatus.TODO,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 86400000 * 7).toISOString() // +7 days default
        });
      }
    });

    if (newTasks.length > 0) {
      setTasks(prev => [...prev, ...newTasks]);
    }
  };

  const updateTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );

    // Sync Element Status based on Task Status
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      let elementStatus = ElementStatus.PENDING;
      if (newStatus === TaskStatus.IN_PROGRESS) elementStatus = ElementStatus.IN_PROGRESS;
      if (newStatus === TaskStatus.DONE) elementStatus = ElementStatus.COMPLETED;

      setElements(prevElements => 
        prevElements.map(el => 
          el.id === task.elementId ? { ...el, status: elementStatus } : el
        )
      );
    }
  };

  const getProjectDetails = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    const projectLevels = levels.filter(l => l.projectId === projectId).sort((a, b) => a.order - b.order);
    const projectElements = elements.filter(e => e.projectId === projectId);
    const projectDrawings = drawings.filter(d => d.projectId === projectId);
    const projectTasks = tasks.filter(t => projectElements.some(e => e.id === t.elementId));

    return { 
      project, 
      levels: projectLevels, 
      elements: projectElements, 
      drawings: projectDrawings,
      tasks: projectTasks
    };
  };

  return (
    <ProjectContext.Provider value={{ 
      projects, levels, elements, tasks, drawings, setTasks,
      addProject, addDrawing, updateDrawingScale, getProjectDetails,
      addElements, generateWBS, updateTaskStatus
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};