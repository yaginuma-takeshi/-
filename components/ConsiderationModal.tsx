import React, { useState, useEffect } from 'react';
import { ConsiderationCase } from '../types';
import { X, Calendar as CalendarIcon, Trash2 } from 'lucide-react';

interface ConsiderationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ConsiderationCase) => void;
  onDelete: (id: string) => void;
  initialData?: ConsiderationCase | null;
}

const ConsiderationModal: React.FC<ConsiderationModalProps> = ({ isOpen, onClose, onSave, onDelete, initialData }) => {
  const [formData, setFormData] = useState<Partial<ConsiderationCase>>({
    propertyName: '',
    source: '',
    askingPrice: 0,
    offerPrice: 0,
    replyDeadline: '',
    notes: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        id: crypto.randomUUID(),
        propertyName: '',
        source: '',
        askingPrice: 0,
        offerPrice: 0,
        replyDeadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], // Default 1 week later
        notes: '',
        createdAt: new Date().toISOString()
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.propertyName) {
      onSave(formData as ConsiderationCase);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {initialData ? '検討案件の編集' : '検討案件の登録'}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              仕入検討中の物件情報を管理します
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">物件名 <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={formData.propertyName}
              onChange={e => setFormData({ ...formData, propertyName: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
              placeholder="例: 世田谷区代田 土地"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">情報元</label>
            <input
              type="text"
              value={formData.source || ''}
              onChange={e => setFormData({ ...formData, source: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
              placeholder="例: レインズ, XX不動産 田中様"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-sm font-semibold text-gray-700 mb-1.5">希望価格 (万円)</label>
               <input
                type="number"
                value={formData.askingPrice || ''}
                onChange={e => setFormData({ ...formData, askingPrice: Number(e.target.value) })}
                className="w-full px-3 py-2.5 rounded-lg bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                placeholder="例: 4500"
              />
            </div>
            <div>
               <label className="block text-sm font-semibold text-gray-700 mb-1.5">回答価格 (万円)</label>
               <input
                type="number"
                value={formData.offerPrice || ''}
                onChange={e => setFormData({ ...formData, offerPrice: Number(e.target.value) })}
                className="w-full px-3 py-2.5 rounded-lg bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                placeholder="例: 4200"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">回答期限</label>
            <div className="relative">
              <input
                type="date"
                value={formData.replyDeadline}
                onChange={e => setFormData({ ...formData, replyDeadline: e.target.value })}
                onClick={(e) => e.currentTarget.showPicker()}
                className="w-full px-3 py-2.5 rounded-lg bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all cursor-pointer"
              />
              <CalendarIcon size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">備考</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all resize-none"
              placeholder="道路付け、セットバックなど..."
            />
          </div>

          {/* Footer */}
          <div className="pt-4 flex justify-between items-center">
            {initialData ? (
               <button 
                type="button"
                onClick={() => {
                  if(window.confirm('本当に削除しますか？')) onDelete(initialData.id);
                }}
                className="text-red-500 text-sm font-medium hover:bg-red-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
              >
                <Trash2 size={16} /> 削除
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
                type="submit"
                className="px-6 py-2.5 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 shadow-md hover:shadow-lg transition-all text-sm"
              >
                保存する
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConsiderationModal;