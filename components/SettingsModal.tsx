import React, { useState, useEffect } from 'react';
import { X, Cloud, CloudOff, AlertCircle, Save, ExternalLink } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveConfig: (config: string) => void;
  currentConfig: string;
  isCloudMode: boolean;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSaveConfig, currentConfig, isCloudMode }) => {
  const [configInput, setConfigInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfigInput(currentConfig);
    }
  }, [isOpen, currentConfig]);

  const handleSave = () => {
    onSaveConfig(configInput);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-800">同期設定</h2>
            {isCloudMode ? (
              <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                <Cloud size={12} /> 接続中
              </span>
            ) : (
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                <CloudOff size={12} /> 未接続
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <h4 className="font-bold text-blue-800 text-sm mb-2 flex items-center gap-2">
              <AlertCircle size={16} />
              Firebase設定
            </h4>
            <p className="text-xs text-blue-700 leading-relaxed mb-3">
              チームでデータを共有するには、Firebaseプロジェクトを作成し、ウェブアプリの構成設定を以下に貼り付けてください。
              <br/>
              設定が空の場合は、ブラウザ内のローカルデータが使用されます。
            </p>
            <a 
              href="https://console.firebase.google.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-white bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Firebaseコンソールを開く <ExternalLink size={12} />
            </a>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              firebaseConfig
            </label>
            <textarea
              rows={8}
              value={configInput}
              onChange={(e) => setConfigInput(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all font-mono text-xs text-gray-600 leading-relaxed"
              placeholder={`// Firebaseコンソールのコードをそのまま貼り付けられます
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  ...
};`}
            />
             <p className="text-[10px] text-gray-400 mt-2">
               ※ JavaScript形式(const firebaseConfig = ...) または JSON形式に対応しています。
             </p>
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition-colors text-sm"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 shadow-md hover:shadow-lg transition-all text-sm flex items-center gap-2"
          >
            <Save size={16} /> 設定を保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;