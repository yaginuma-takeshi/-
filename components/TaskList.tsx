import React, { useState, useMemo } from 'react';
import { RealEstateCase, Task } from '../types';
import { CheckCircle2, Circle, Calendar as CalendarIcon, Briefcase, Clock, ArrowUpDown, Filter, Bell } from 'lucide-react';

interface TaskListProps {
  cases: RealEstateCase[];
  onToggleTask: (caseId: string, taskId: string) => void;
  onTaskClick: (caseId: string, taskId: string) => void;
}

type SortType = 'deadline_asc' | 'created_desc' | 'case_group';

const TaskList: React.FC<TaskListProps> = ({ cases, onToggleTask, onTaskClick }) => {
  const [sortType, setSortType] = useState<SortType>('deadline_asc');

  // Flatten all tasks
  const allTasks = useMemo(() => {
    return cases.flatMap(c => 
      c.tasks.map(t => ({
        ...t,
        caseId: c.id,
        caseName: c.propertyName,
        isGeneral: c.id === 'general'
      }))
    );
  }, [cases]);

  const sortedTasks = useMemo(() => {
    const tasks = [...allTasks];
    
    switch (sortType) {
      case 'created_desc':
        return tasks.sort((a, b) => {
          // Fallback to title if createdAt is missing for some reason
          const aCreated = a.createdAt || '';
          const bCreated = b.createdAt || '';
          return bCreated.localeCompare(aCreated);
        });
      
      case 'case_group':
        return tasks.sort((a, b) => {
          // 1. General tasks first
          if (a.isGeneral && !b.isGeneral) return -1;
          if (!a.isGeneral && b.isGeneral) return 1;
          
          // 2. Sort by Case Name
          if (a.caseName !== b.caseName) {
            return a.caseName.localeCompare(b.caseName);
          }
          
          // 3. Sort by Date/Time within same case
          const dateA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
          const dateB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
          return dateA - dateB;
        });

      case 'deadline_asc':
      default:
        return tasks.sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
          const dateB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
          return dateA - dateB;
        });
    }
  }, [allTasks, sortType]);

  const getStatusColor = (date: string, isCompleted: boolean) => {
    if (isCompleted) return 'text-gray-400';
    const today = new Date().toISOString().split('T')[0];
    if (date < today) return 'text-red-600 font-medium'; // Overdue
    if (date === today) return 'text-amber-600 font-medium'; // Due today
    return 'text-gray-500';
  };

  const getItemStyles = (date: string, isCompleted: boolean) => {
     if (isCompleted) return 'hover:bg-gray-50 border-l-4 border-transparent opacity-70';
     const today = new Date().toISOString().split('T')[0];
     if (date < today) return 'bg-red-50/50 border-l-4 border-red-500 hover:bg-red-50'; // Overdue
     if (date === today) return 'bg-amber-50/50 border-l-4 border-amber-500 hover:bg-amber-50'; // Due today
     return 'hover:bg-gray-50 border-l-4 border-transparent';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <h3 className="font-bold text-gray-700">全タスク一覧</h3>
          <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
            未完了: {allTasks.filter(t => !t.isCompleted).length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown size={14} className="text-gray-400" />
          <select 
            value={sortType} 
            onChange={(e) => setSortType(e.target.value as SortType)}
            className="text-xs border-none bg-transparent font-medium text-gray-600 focus:ring-0 cursor-pointer pr-8 pl-0 hover:text-brand-600"
          >
            <option value="deadline_asc">期限が近い順</option>
            <option value="created_desc">登録が新しい順</option>
            <option value="case_group">案件・カテゴリ順</option>
          </select>
        </div>
      </div>
      
      <div className="divide-y divide-gray-100 overflow-y-auto flex-1">
        {sortedTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">タスクがありません</div>
        ) : (
          sortedTasks.map((task) => (
            <div 
              key={`${task.caseId}-${task.id}`} 
              onClick={() => onTaskClick(task.caseId, task.id)}
              className={`p-4 transition-colors flex items-center gap-4 group cursor-pointer ${getItemStyles(task.date, task.isCompleted)}`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTask(task.caseId, task.id);
                }}
                className={`shrink-0 transition-colors ${task.isCompleted ? 'text-emerald-500' : 'text-gray-300 hover:text-emerald-500'}`}
              >
                {task.isCompleted ? <CheckCircle2 size={20} /> : <Circle size={20} />}
              </button>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-medium truncate ${task.isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {task.title}
                  </span>
                  {!task.isGeneral && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-brand-50 text-brand-700 truncate max-w-[150px]">
                      <Briefcase size={10} />
                      {task.caseName}
                    </span>
                  )}
                   {task.isGeneral && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600">
                      一般
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className={`flex items-center gap-1 ${getStatusColor(task.date, task.isCompleted)}`}>
                    <CalendarIcon size={12} />
                    {task.date}
                  </span>
                  {task.time && (
                    <span className={`flex items-center gap-1 ${getStatusColor(task.date, task.isCompleted)}`}>
                      <Clock size={12} />
                      {task.time}
                    </span>
                  )}
                  {task.reminder && task.reminder !== 'none' && (
                    <span className={`flex items-center gap-1 ${task.isCompleted ? 'text-gray-300' : 'text-brand-500'}`}>
                      <Bell size={12} />
                    </span>
                  )}
                  {task.description && (
                     <span className="text-gray-400 truncate max-w-[200px] hidden sm:inline">
                       - {task.description}
                     </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TaskList;