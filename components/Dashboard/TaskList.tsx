import React, { useState, useEffect, useRef } from 'react';
import { Task, Level, Element, TaskStatus } from '../../types';
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Clock, Check } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  elements: Element[];
  levels: Level[];
  highlightedTaskId?: string | null;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
}

export const TaskList: React.FC<TaskListProps> = ({ 
  tasks, 
  elements, 
  levels, 
  highlightedTaskId,
  onUpdateStatus 
}) => {
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Initialize with all levels expanded
  useEffect(() => {
    const allLevelIds = levels.map(l => l.id);
    setExpandedLevels(new Set(allLevelIds));
  }, [levels]);

  // Scroll to highlighted task
  useEffect(() => {
    if (highlightedTaskId) {
      // Ensure the level containing this task is expanded
      const task = tasks.find(t => t.id === highlightedTaskId);
      const element = elements.find(e => e.id === task?.elementId);
      if (element && !expandedLevels.has(element.levelId)) {
        setExpandedLevels(prev => new Set(prev).add(element.levelId));
      }

      // Scroll into view
      const ref = itemRefs.current.get(highlightedTaskId);
      if (ref) {
        ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add a temporary flash effect
        ref.classList.add('bg-blue-50');
        setTimeout(() => ref.classList.remove('bg-blue-50'), 1500);
      }
    }
  }, [highlightedTaskId, tasks, elements]);

  const toggleLevel = (levelId: string) => {
    const newExpanded = new Set(expandedLevels);
    if (newExpanded.has(levelId)) {
      newExpanded.delete(levelId);
    } else {
      newExpanded.add(levelId);
    }
    setExpandedLevels(newExpanded);
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.DONE: return 'text-green-600 bg-green-50';
      case TaskStatus.IN_PROGRESS: return 'text-amber-600 bg-amber-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.DONE: return <CheckCircle2 className="h-4 w-4" />;
      case TaskStatus.IN_PROGRESS: return <Clock className="h-4 w-4" />;
      default: return <Circle className="h-4 w-4" />;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-900">Project Tasks</h3>
        <p className="text-xs text-gray-500 mt-1">{tasks.length} tasks scheduled</p>
      </div>
      
      <div className="flex-grow overflow-y-auto">
        {levels.length === 0 ? (
           <div className="p-8 text-center text-gray-500">No tasks generated yet.</div>
        ) : (
          levels.map(level => {
            // Find tasks for this level
            const levelElements = elements.filter(e => e.levelId === level.id);
            const levelElementIds = new Set(levelElements.map(e => e.id));
            const levelTasks = tasks.filter(t => levelElementIds.has(t.elementId));

            if (levelTasks.length === 0) return null;

            const isExpanded = expandedLevels.has(level.id);

            return (
              <div key={level.id} className="border-b border-gray-100 last:border-0">
                <button 
                  onClick={() => toggleLevel(level.id)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50/50 hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="font-medium text-sm text-gray-800 flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                    {level.name}
                  </span>
                  <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                    {levelTasks.filter(t => t.status === TaskStatus.DONE).length} / {levelTasks.length}
                  </span>
                </button>

                {isExpanded && (
                  <div className="divide-y divide-gray-100">
                    {levelTasks.map(task => {
                       const isSelected = highlightedTaskId === task.id;
                       return (
                        <div 
                          key={task.id} 
                          ref={el => { if(el) itemRefs.current.set(task.id, el); }}
                          className={`p-3 pl-8 hover:bg-gray-50 transition-colors flex items-center justify-between group ${isSelected ? 'bg-blue-50/50' : ''}`}
                        >
                          <div className="flex flex-col gap-1">
                            <span className={`text-sm font-medium ${task.status === TaskStatus.DONE ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                              {task.name}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full w-fit flex items-center gap-1 ${getStatusColor(task.status)}`}>
                              {getStatusIcon(task.status)}
                              {task.status.replace('_', ' ')}
                            </span>
                          </div>

                          {task.status !== TaskStatus.DONE && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateStatus(task.id, TaskStatus.DONE);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity bg-green-100 hover:bg-green-200 text-green-700 p-1.5 rounded-md"
                              title="Mark Complete"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                       );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
