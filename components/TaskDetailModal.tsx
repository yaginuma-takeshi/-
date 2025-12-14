import React, { useState, useEffect, useRef } from 'react';
import { Task, Attachment, ReminderSetting, Comment } from '../types';
import { X, Calendar as CalendarIcon, Clock, AlignLeft, CheckCircle2, Circle, Trash2, ChevronDown, Bell, MessageSquare, Send } from 'lucide-react';
import FileUploader from './FileUploader';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  caseName?: string;
  onSave: (updatedTask: Task) => void;
  onDelete: (taskId: string) => void;
}

const REMINDER_OPTIONS: { value: ReminderSetting; label: string }[] = [
  { value: 'none', label: 'なし' },
  { value: '15_min', label: '15分前' },
  { value: '30_min', label: '30分前' },
  { value: '1_hour', label: '1時間前' },
  { value: '1_day', label: '1日前' },
  { value: '2_days', label: '2日前' },
  { value: '1_week', label: '1週間前' },
];

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ isOpen, onClose, task, caseName, onSave, onDelete }) => {
  const [formData, setFormData] = useState<Task | null>(null);
  const [newComment, setNewComment] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (task) {
      setFormData({ 
        ...task,
        attachments: task.attachments || [],
        comments: task.comments || []
      });
    }
  }, [task, isOpen]);

  // Scroll to bottom of comments when they change
  useEffect(() => {
    if (formData?.comments?.length) {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [formData?.comments]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      onSave(formData);
      onClose();
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !formData) return;

    const comment: Comment = {
      id: crypto.randomUUID(),
      content: newComment,
      createdAt: new Date().toISOString(),
      author: '自分' // In a real app, this would be the logged-in user
    };

    setFormData({
      ...formData,
      comments: [...(formData.comments || []), comment]
    });
    setNewComment('');
  };

  // Time Dropdown Options
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  const handleTimeChange = (type: 'hour' | 'minute', value: string) => {
    if (!formData) return;

    let [currentHour, currentMinute] = formData.time ? formData.time.split(':') : ['', ''];
    
    // Default values if setting for the first time
    if (!currentHour) currentHour = '10'; 
    if (!currentMinute) currentMinute = '00';

    if (type === 'hour') currentHour = value;
    if (type === 'minute') currentMinute = value;

    setFormData({ ...formData, time: `${currentHour}:${currentMinute}` });
  };

  const clearTime = () => {
    if (formData) {
      setFormData({ ...formData, time: undefined });
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen || !formData) return null;

  const [selectedHour, selectedMinute] = formData.time ? formData.time.split(':') : ['', ''];

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-start bg-gray-50 shrink-0">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">タスク詳細</span>
            {caseName && (
              <span className="text-xs font-medium text-brand-700 bg-brand-50 px-2 py-0.5 rounded inline-block w-fit">
                {caseName}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <div className="p-6 overflow-y-auto flex-1">
            {/* Title Input - Prominent */}
            <div className="mb-6">
              <input
                type="text"
                required
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full text-xl font-bold text-gray-900 placeholder-gray-400 border-none p-0 focus:ring-0 bg-transparent"
                placeholder="タスクのタイトルを入力"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Main Content (Left Column) */}
              <div className="md:col-span-2 space-y-8">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                    <AlignLeft size={14} /> 詳細・メモ
                  </label>
                  <textarea
                    rows={4}
                    value={formData.description || ''}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all resize-none text-sm text-gray-700 leading-relaxed"
                    placeholder="タスクの詳細、連絡事項、メモなどを入力してください..."
                  />
                </div>

                <div>
                  <FileUploader 
                    attachments={formData.attachments} 
                    onAttachmentsChange={(newAttachments) => setFormData({...formData, attachments: newAttachments})}
                    label="添付ファイル"
                  />
                </div>

                {/* Comment Section */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                    <MessageSquare size={14} /> コメント・履歴
                  </label>
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                    {/* List */}
                    <div className="space-y-4 mb-4 max-h-[200px] overflow-y-auto">
                      {formData.comments && formData.comments.length > 0 ? (
                        formData.comments.map(comment => (
                          <div key={comment.id} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-xs shrink-0">
                              {comment.author.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-gray-700">{comment.author}</span>
                                <span className="text-[10px] text-gray-400">{formatDate(comment.createdAt)}</span>
                              </div>
                              <div className="text-sm text-gray-600 bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm">
                                {comment.content}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-gray-400 text-xs py-4">
                          まだコメントはありません
                        </div>
                      )}
                      <div ref={commentsEndRef} />
                    </div>

                    {/* Input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment();
                          }
                        }}
                        placeholder="コメントを入力..."
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        className="bg-brand-600 text-white p-2 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar (Right Column) */}
              <div className="md:col-span-1 space-y-6">
                {/* Status Card */}
                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-3">ステータス</label>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, isCompleted: !formData.isCompleted})}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${formData.isCompleted 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                      : 'bg-white border-gray-200 text-gray-600 hover:border-brand-300'}`}
                  >
                    {formData.isCompleted ? <CheckCircle2 size={20} className="text-emerald-600" /> : <Circle size={20} />}
                    <span className="font-medium text-sm">{formData.isCompleted ? '完了済' : '未完了'}</span>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1">
                      <CalendarIcon size={14} /> 期日
                    </label>
                    <div className="relative group">
                      <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                        onClick={(e) => e.currentTarget.showPicker()}
                        className="w-full pl-3 pr-10 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm font-medium text-gray-700 cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
                      />
                      <CalendarIcon 
                        size={18} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                        <Clock size={14} /> 時間 <span className="text-gray-400 font-normal ml-1">(任意)</span>
                      </label>
                      {formData.time && (
                        <button 
                          type="button"
                          onClick={clearTime}
                          className="text-[10px] text-red-500 hover:text-red-600 hover:underline"
                        >
                          クリア
                        </button>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <select
                          value={selectedHour}
                          onChange={(e) => handleTimeChange('hour', e.target.value)}
                          className={`w-full appearance-none px-3 py-2 bg-white border rounded-lg outline-none transition-all text-sm font-medium pr-8
                            ${selectedHour ? 'text-gray-700 border-gray-300 focus:ring-2 focus:ring-brand-500' : 'text-gray-400 border-gray-200'}`}
                        >
                          <option value="" disabled>時</option>
                          {hours.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                      
                      <span className="text-gray-400 font-bold">:</span>
                      
                      <div className="relative flex-1">
                        <select
                          value={selectedMinute}
                          onChange={(e) => handleTimeChange('minute', e.target.value)}
                          className={`w-full appearance-none px-3 py-2 bg-white border rounded-lg outline-none transition-all text-sm font-medium pr-8
                             ${selectedMinute ? 'text-gray-700 border-gray-300 focus:ring-2 focus:ring-brand-500' : 'text-gray-400 border-gray-200'}`}
                        >
                          <option value="" disabled>分</option>
                          {minutes.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Reminder Setting */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1">
                      <Bell size={14} /> 通知
                    </label>
                    <div className="relative">
                      <select
                        value={formData.reminder || 'none'}
                        onChange={(e) => setFormData({ ...formData, reminder: e.target.value as ReminderSetting })}
                        className={`w-full appearance-none px-3 py-2 bg-white border rounded-lg outline-none transition-all text-sm font-medium pr-8
                          ${formData.reminder && formData.reminder !== 'none' ? 'text-brand-700 border-brand-300 bg-brand-50' : 'text-gray-700 border-gray-300 focus:ring-2 focus:ring-brand-500'}`}
                      >
                        {REMINDER_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
             <button
              type="button"
              onClick={() => {
                if(window.confirm('このタスクを削除しますか？')) onDelete(formData.id);
              }}
              className="text-red-500 text-sm hover:text-red-600 font-medium px-3 py-2 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1"
            >
              <Trash2 size={16} /> 削除
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition-colors text-sm"
              >
                キャンセル
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className="px-6 py-2.5 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 shadow-md hover:shadow-lg transition-all text-sm"
              >
                更新する
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskDetailModal;