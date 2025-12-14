import React, { useMemo, useState, useEffect } from 'react';
import { RealEstateCase, CalendarEvent, CaseStatus } from '../types';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Bell, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarProps {
  cases: RealEstateCase[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onTaskClick: (taskId: string, caseId: string) => void;
  onTaskToggle: (caseId: string, taskId: string) => void;
  onTaskDateChange: (caseId: string, taskId: string, newDate: string) => void;
}

const Calendar: React.FC<CalendarProps> = ({ cases, currentDate, onDateChange, onTaskClick, onTaskToggle, onTaskDateChange }) => {
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [holidays, setHolidays] = useState<Record<string, string>>({});
  const [showHolidays, setShowHolidays] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  useEffect(() => {
    // Fetch Japanese holidays
    const fetchHolidays = async () => {
      try {
        const res = await fetch('https://holidays-jp.github.io/api/v1/date.json');
        if (res.ok) {
          const data = await res.json();
          setHolidays(data);
        }
      } catch (error) {
        console.error('Failed to fetch holidays:', error);
      }
    };
    fetchHolidays();
  }, []);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent['tasks']> = {};
    
    cases.forEach(c => {
      c.tasks.forEach(t => {
        if (!map[t.date]) {
          map[t.date] = [];
        }
        map[t.date].push({
          taskId: t.id,
          caseId: c.id,
          caseName: c.propertyName,
          title: t.title,
          status: c.status,
          isCompleted: t.isCompleted,
          hasReminder: t.reminder && t.reminder !== 'none'
        });
      });
    });
    return map;
  }, [cases]);

  const prevMonth = () => onDateChange(new Date(year, month - 1, 1));
  const nextMonth = () => onDateChange(new Date(year, month + 1, 1));
  const today = () => onDateChange(new Date());

  const handleDragStart = (e: React.DragEvent, caseId: string, taskId: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ caseId, taskId }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    setDragOverDate(dateStr);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverDate(null);
  };

  const handleDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    setDragOverDate(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.caseId && data.taskId) {
        onTaskDateChange(data.caseId, data.taskId, dateStr);
      }
    } catch (err) {
      console.error('Failed to parse drag data', err);
    }
  };

  const renderDays = () => {
    const days = [];
    const emptyDays = firstDayOfMonth;

    // Previous month empty slots
    for (let i = 0; i < emptyDays; i++) {
      days.push(<div key={`empty-${i}`} className="h-32 bg-gray-50/50 border-r border-b border-gray-100"></div>);
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = eventsByDate[dateStr] || [];
      const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
      const isDragOver = dragOverDate === dateStr;
      
      // Holiday Logic
      const holidayName = holidays[dateStr];
      const isHoliday = showHolidays && !!holidayName;
      // Get day of week (0 is Sunday, 6 is Saturday)
      const dateObj = new Date(year, month, day);
      const dayOfWeek = dateObj.getDay();
      const isSunday = dayOfWeek === 0;
      const isSaturday = dayOfWeek === 6;

      days.push(
        <div 
          key={day} 
          onDragOver={(e) => handleDragOver(e, dateStr)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, dateStr)}
          className={`min-h-[8rem] border-r border-b border-gray-100 p-1 transition-all relative
            ${isDragOver ? 'bg-brand-50 ring-2 ring-inset ring-brand-300' : isToday ? 'bg-blue-50/30' : (isHoliday || isSunday) ? 'bg-red-50/10' : 'bg-white hover:bg-gray-50'}
          `}
        >
          <div className="flex justify-between items-start mb-1 pointer-events-none">
            <div className="flex items-center gap-1">
              <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full 
                ${isToday ? 'bg-brand-600 text-white' : 
                  (isHoliday || isSunday) ? 'text-red-500' : 
                  isSaturday ? 'text-blue-500' : 'text-gray-700'
                }`}>
                {day}
              </span>
              {isHoliday && (
                <span className="text-[10px] text-red-500 font-medium bg-red-50 px-1 rounded truncate max-w-[5rem]">
                  {holidayName}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 overflow-y-auto max-h-24 no-scrollbar">
            {dayEvents.map((evt) => (
              <div 
                key={`${evt.caseId}-${evt.taskId}`}
                draggable
                onDragStart={(e) => handleDragStart(e, evt.caseId, evt.taskId)}
                className={`group flex items-center gap-1.5 text-xs p-1.5 rounded border cursor-grab active:cursor-grabbing shadow-sm transition-all hover:shadow-md hover:scale-[1.02]
                  ${evt.isCompleted ? 'bg-gray-100 border-gray-200 text-gray-500 line-through decoration-gray-400' : 'bg-white border-l-4 border-l-brand-500 border-gray-100 text-gray-800'}
                `}
                onClick={(e) => {
                  e.stopPropagation();
                  onTaskClick(evt.taskId, evt.caseId);
                }}
              >
                <div 
                  className="shrink-0 cursor-pointer text-gray-400 hover:text-brand-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTaskToggle(evt.caseId, evt.taskId);
                  }}
                >
                  {evt.isCompleted ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                </div>
                <div className="truncate pointer-events-none flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold truncate">{evt.title}</span>
                    {evt.hasReminder && !evt.isCompleted && <Bell size={10} className="text-brand-500 shrink-0" fill="currentColor" />}
                  </div>
                  <div className="text-[10px] text-gray-500 truncate">{evt.caseName}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
      <div className="p-4 flex items-center justify-between border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-gray-800">
            {year}年 {month + 1}月
          </h2>
          <div className="flex items-center rounded-md border border-gray-200 bg-white shadow-sm">
            <button onClick={prevMonth} className="p-1.5 hover:bg-gray-50 text-gray-600"><ChevronLeft size={20} /></button>
            <div className="w-[1px] h-5 bg-gray-200"></div>
            <button onClick={nextMonth} className="p-1.5 hover:bg-gray-50 text-gray-600"><ChevronRight size={20} /></button>
          </div>
          <button onClick={today} className="text-sm font-medium text-brand-600 hover:bg-brand-50 px-3 py-1.5 rounded-md transition-colors">
            今日
          </button>
        </div>
        
        <div className="flex items-center gap-2">
            <label className="text-xs flex items-center gap-2 cursor-pointer text-gray-600 hover:text-gray-900 select-none">
                <input 
                  type="checkbox" 
                  checked={showHolidays} 
                  onChange={(e) => setShowHolidays(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4 border-gray-300" 
                />
                日本の祝日を表示
            </label>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
          <div key={d} className={`py-2 text-center text-xs font-semibold ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}`}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 flex-1 overflow-y-auto">
        {renderDays()}
      </div>
    </div>
  );
};

export default Calendar;