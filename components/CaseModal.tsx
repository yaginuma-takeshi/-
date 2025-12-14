import React, { useState, useEffect } from 'react';
import { RealEstateCase, CaseStatus, Task, Attachment } from '../types';
import { X, Plus, Sparkles, Trash2, Calendar as CalendarIcon, GripVertical, Clock, ChevronDown } from 'lucide-react';
import { generateSuggestedTasks } from '../services/geminiService';
import FileUploader from './FileUploader';

interface CaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (caseData: RealEstateCase) => void;
  onDelete: (caseId: string) => void;
  initialData?: RealEstateCase | null;
}

const CaseModal: React.FC<CaseModalProps> = ({ isOpen, onClose, onSave, onDelete, initialData }) => {
  const [formData, setFormData] = useState<Partial<RealEstateCase>>({
    status: CaseStatus.LEAD,
    tasks: [],
    purchasePrice: 0,
    sellingPrice: 0,
    lender: '',
    attachments: []
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'tasks'>('info');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const isGeneral = initialData?.id === 'general';

  // Time constants
  const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const MINUTES = ['00', '15', '30', '45'];

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      // General tasks default to tasks view
      if (initialData.id === 'general') {
        setActiveTab('tasks');
      } else {
        setActiveTab('info');
      }
    } else {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      setFormData({
        id: crypto.randomUUID(),
        status: CaseStatus.LEAD,
        tasks: [
          { id: crypto.randomUUID(), title: '仕入決済', date: today, isCompleted: false, createdAt: now, comments: [] },
          { id: crypto.randomUUID(), title: '建築確認取得', date: today, isCompleted: false, createdAt: now, comments: [] },
          { id: crypto.randomUUID(), title: '販売契約', date: today, isCompleted: false, createdAt: now, comments: [] },
          { id: crypto.randomUUID(), title: '販売決済', date: today, isCompleted: false, createdAt: now, comments: [] },
        ],
        createdAt: now,
        propertyName: '',
        notes: '',
        purchasePrice: 0,
        sellingPrice: 0,
        lender: '',
        attachments: []
      });
      setActiveTab('info');
    }
  }, [initialData, isOpen]);

  const handleGenerateTasks = async () => {
    if (!formData.propertyName) return;
    
    setIsGenerating(true);
    try {
      const suggestions = await generateSuggestedTasks(
        formData.propertyName || 'New Case',
        formData.status || CaseStatus.LEAD,
        formData.notes || ''
      );

      const newTasks: Task[] = suggestions.map(s => {
        const date = new Date();
        date.setDate(date.getDate() + s.daysFromNow);
        return {
          id: crypto.randomUUID(),
          title: s.title,
          description: s.description,
          isCompleted: false,
          date: date.toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          comments: []
        };
      });

      setFormData(prev => ({
        ...prev,
        tasks: [...(prev.tasks || []), ...newTasks]
      }));
      setActiveTab('tasks');
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const addTask = () => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: '',
      date: new Date().toISOString().split('T')[0],
      isCompleted: false,
      createdAt: new Date().toISOString(),
      comments: []
    };
    setFormData(prev => ({
      ...prev,
      tasks: [newTask, ...(prev.tasks || [])]
    }));
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks?.map(t => t.id === id ? { ...t, ...updates } : t)
    }));
  };

  const removeTask = (id: string) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks?.filter(t => t.id !== id)
    }));
  };

  const handleTimeChange = (taskId: string, type: 'hour' | 'minute', value: string, currentTime?: string) => {
    let [h, m] = currentTime ? currentTime.split(':') : ['', ''];
    
    if (type === 'hour') {
        h = value;
        if (!m) m = '00';
    } else {
        m = value;
        if (!h) h = '10';
    }
    
    updateTask(taskId, { time: `${h}:${m}` });
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newTasks = [...(formData.tasks || [])];
    const [movedTask] = newTasks.splice(draggedIndex, 1);
    newTasks.splice(dropIndex, 0, movedTask);

    setFormData(prev => ({ ...prev, tasks: newTasks }));
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGeneral || formData.propertyName) {
      onSave(formData as RealEstateCase);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {isGeneral ? '一般タスク管理' : (initialData ? '案件編集' : '新規案件登録')}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {isGeneral ? '案件に紐づかない日々の業務タスクを管理します' : '案件の詳細情報とタスクを管理します'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>

        {/* Tabs - Hidden for General Tasks */}
        {!isGeneral && (
          <div className="flex border-b border-gray-100 px-5 pt-2">
            <button
              onClick={() => setActiveTab('info')}
              className={`pb-2 px-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'info' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              基本情報
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`pb-2 px-4 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'tasks' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              タスク ({formData.tasks?.length || 0})
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30">
          {activeTab === 'info' && !isGeneral ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">物件名 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.propertyName}
                    onChange={e => setFormData({ ...formData, propertyName: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                    placeholder="例: グランドメゾン東京 301号室"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">ステータス</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as CaseStatus })}
                    className="w-full px-3 py-2.5 rounded-lg bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                  >
                    {Object.values(CaseStatus).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-1">
                   <label className="block text-sm font-semibold text-gray-700 mb-1.5">仕入価格 (万円)</label>
                   <input
                    type="number"
                    value={formData.purchasePrice || ''}
                    onChange={e => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-lg bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                    placeholder="例: 3500"
                  />
                </div>

                <div className="col-span-1">
                   <label className="block text-sm font-semibold text-gray-700 mb-1.5">販売価格 (万円)</label>
                   <input
                    type="number"
                    value={formData.sellingPrice || ''}
                    onChange={e => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-lg bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                    placeholder="例: 4500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">借入先</label>
                  <input
                    type="text"
                    value={formData.lender || ''}
                    onChange={e => setFormData({ ...formData, lender: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                    placeholder="例: XX銀行 〇〇支店"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">備考</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all resize-none"
                    placeholder="その他メモ事項..."
                  />
                </div>

                <div className="col-span-2">
                  <FileUploader 
                    attachments={formData.attachments} 
                    onAttachmentsChange={(newAttachments) => setFormData({...formData, attachments: newAttachments})} 
                    label="案件関連ファイル (図面・契約書など)"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
               {/* AI Generator Banner - Hide for General */}
               {!isGeneral && (
                 <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-xl border border-indigo-100 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                      <Sparkles size={16} className="text-indigo-600" />
                      AIタスク提案
                    </h4>
                    <p className="text-xs text-indigo-700 mt-1">物件情報に基づき、追加タスクを提案します。</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateTasks}
                    disabled={isGenerating || !formData.propertyName}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all flex items-center gap-2
                      ${isGenerating 
                        ? 'bg-indigo-200 text-indigo-400 cursor-not-allowed' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'
                      }`}
                  >
                    {isGenerating ? '生成中...' : 'タスクを生成'}
                  </button>
                </div>
               )}

              <div className="flex justify-end">
                 <button 
                  type="button" 
                  onClick={addTask}
                  className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                >
                  <Plus size={16} /> 手動で追加
                </button>
              </div>

              <div className="space-y-3">
                {formData.tasks?.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                    タスクがまだありません
                  </div>
                )}
                {formData.tasks?.map((task, index) => (
                  <div 
                    key={task.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex gap-3 items-center group transition-all 
                      ${draggedIndex === index ? 'opacity-40 border-dashed border-gray-400' : 'opacity-100 hover:border-brand-200'}`}
                  >
                    <div className="text-gray-400 cursor-grab active:cursor-grabbing hover:text-gray-600 mr-2">
                      <GripVertical size={16} />
                    </div>
                    
                    <div className="flex-1 flex flex-col md:flex-row gap-2 md:items-center">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={task.title}
                          onChange={(e) => updateTask(task.id, { title: e.target.value })}
                          className="w-full text-sm font-medium text-gray-800 bg-transparent border-none p-0 focus:ring-0 placeholder-gray-300"
                          placeholder="タスク名"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Date Picker */}
                        <div className="flex items-center gap-1 bg-gray-50 rounded px-1.5 py-1 border border-gray-200">
                          <CalendarIcon size={13} className="text-gray-400" />
                          <input
                            type="date"
                            value={task.date}
                            onChange={(e) => updateTask(task.id, { date: e.target.value })}
                            onClick={(e) => e.currentTarget.showPicker()}
                            className="text-xs text-gray-500 bg-transparent border-none p-0 w-[85px] focus:ring-0 cursor-pointer"
                          />
                        </div>

                        {/* Time Dropdowns */}
                        <div className="flex items-center gap-1 bg-gray-50 rounded px-1.5 py-1 border border-gray-200">
                          <Clock size={13} className="text-gray-400" />
                          <div className="flex items-center">
                             <select
                                value={task.time?.split(':')[0] || ''}
                                onChange={(e) => handleTimeChange(task.id, 'hour', e.target.value, task.time)}
                                className="text-xs text-gray-500 bg-transparent border-none p-0 w-[38px] focus:ring-0 appearance-none text-center"
                             >
                                <option value="" disabled>--</option>
                                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                             </select>
                             <span className="text-gray-400 text-xs px-0.5">:</span>
                             <select
                                value={task.time?.split(':')[1] || ''}
                                onChange={(e) => handleTimeChange(task.id, 'minute', e.target.value, task.time)}
                                className="text-xs text-gray-500 bg-transparent border-none p-0 w-[38px] focus:ring-0 appearance-none text-center"
                             >
                                <option value="" disabled>--</option>
                                {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                             </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => removeTask(task.id)}
                      className="text-gray-300 hover:text-red-500 p-1 ml-2 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 bg-white flex justify-between items-center">
          {initialData && !isGeneral ? (
             <button 
              type="button"
              onClick={() => {
                if(window.confirm('本当に削除しますか？')) onDelete(initialData.id);
              }}
              className="text-red-500 text-sm font-medium hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
            >
              削除する
            </button>
          ) : <div></div>}
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition-colors text-sm"
            >
              キャンセル
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-2.5 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 shadow-md hover:shadow-lg transition-all text-sm"
            >
              保存する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseModal;