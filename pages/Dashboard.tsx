import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { TaskStatus } from '../types';
import { 
  Layout, 
  ArrowUpFromLine,
  BarChart3,
  ListTodo
} from 'lucide-react';
import { Scene3D } from '../components/Scene3D';
import { TaskList } from '../components/Dashboard/TaskList';

export const Dashboard: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { getProjectDetails, updateTaskStatus } = useProject();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const { project, levels, elements, tasks } = getProjectDetails(projectId || '');

  if (!project) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-900">Project Not Found</h2>
        <Link to="/" className="text-blue-600 hover:underline mt-4 inline-block">Return Home</Link>
      </div>
    );
  }

  // Calculate stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === TaskStatus.DONE).length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Handler for 3D Interaction
  const handleElementClick = (elementId: string) => {
    const task = tasks.find(t => t.elementId === elementId);
    if (task) {
      setSelectedTaskId(task.id);
    }
  };

  const handleTaskStatusUpdate = (taskId: string, status: TaskStatus) => {
    updateTaskStatus(taskId, status);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
      {/* Header Stats Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/" className="hover:text-blue-600">Projects</Link> 
            <span>/</span>
            <span className="text-gray-900 font-medium">Dashboard</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            {project.name}
            <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-md flex items-center gap-1">
              <Layout className="h-3 w-3" /> {project.structureType.replace('_', ' ')}
            </span>
          </h1>
        </div>
        
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-gray-500 uppercase font-semibold">Progress</div>
                <div className="text-xl font-bold text-blue-600">{progressPercentage}%</div>
              </div>
              <div className="h-10 w-10">
                 <svg className="w-full h-full transform -rotate-90">
                    <circle className="text-gray-200" strokeWidth="4" stroke="currentColor" fill="transparent" r="18" cx="20" cy="20" />
                    <circle 
                      className="text-blue-600 transition-all duration-1000 ease-out" 
                      strokeWidth="4" 
                      strokeDasharray={113} 
                      strokeDashoffset={113 - (113 * progressPercentage) / 100} 
                      strokeLinecap="round" 
                      stroke="currentColor" 
                      fill="transparent" 
                      r="18" cx="20" cy="20" 
                    />
                 </svg>
              </div>
           </div>
           <div className="h-8 w-px bg-gray-200"></div>
           <div className="flex gap-4 text-sm">
              <div className="flex flex-col">
                 <span className="text-gray-500 text-xs">Elements</span>
                 <span className="font-bold">{elements.length}</span>
              </div>
              <div className="flex flex-col">
                 <span className="text-gray-500 text-xs">Tasks</span>
                 <span className="font-bold">{tasks.length}</span>
              </div>
           </div>
        </div>
      </div>

      {/* Main Split View */}
      <div className="flex-grow flex flex-col lg:flex-row gap-4 overflow-hidden">
        
        {/* Left: 3D Scene */}
        <div className="flex-grow lg:w-2/3 bg-gray-900 rounded-xl overflow-hidden shadow-lg relative min-h-[400px]">
           <Scene3D 
              elements={elements} 
              tasks={tasks}
              onElementClick={handleElementClick}
           />
           <div className="absolute top-4 left-4 bg-black/50 backdrop-blur text-white px-3 py-1.5 rounded-full text-xs font-medium border border-white/20 flex items-center gap-2">
              <ArrowUpFromLine className="h-3 w-3" />
              Interactive 3D View
           </div>
        </div>

        {/* Right: Task List */}
        <div className="lg:w-1/3 flex flex-col min-w-[320px]">
          <TaskList 
             tasks={tasks}
             elements={elements}
             levels={levels}
             highlightedTaskId={selectedTaskId}
             onUpdateStatus={handleTaskStatusUpdate}
          />
        </div>

      </div>
    </div>
  );
};
