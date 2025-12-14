import React, { useEffect, useState } from 'react';
import { X, Download, FileText } from 'lucide-react';
import { Attachment } from '../types';

interface FilePreviewModalProps {
  file: Attachment | null;
  onClose: () => void;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file && file.type === 'application/pdf') {
      try {
        // Base64 Data URI to Blob
        const base64Data = file.data.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new ArrayBuffer(byteCharacters.length);
        const byteArray = new Uint8Array(byteNumbers);
        
        for (let i = 0; i < byteCharacters.length; i++) {
          byteArray[i] = byteCharacters.charCodeAt(i);
        }
        
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);

        // Cleanup on unmount or file change
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (e) {
        console.error("PDF conversion error:", e);
      }
    } else {
      setPdfUrl(null);
    }
  }, [file]);

  if (!file) return null;

  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf';

  return (
    <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            {isPdf ? <FileText size={20} className="text-red-500 shrink-0" /> : <div className="w-5" />}
            <h3 className="font-bold text-gray-800 truncate">{file.name}</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a 
              href={file.data} 
              download={file.name}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600 flex items-center gap-2 text-sm font-medium"
              title="ダウンロード"
            >
              <Download size={18} />
              <span className="hidden sm:inline">保存</span>
            </a>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-gray-100 flex items-center justify-center overflow-auto p-4 relative">
          {isImage ? (
            <img 
              src={file.data} 
              alt={file.name} 
              className="max-w-full max-h-full object-contain shadow-lg rounded-lg" 
            />
          ) : isPdf && pdfUrl ? (
            <iframe 
              src={pdfUrl} 
              title={file.name}
              className="w-full h-full rounded-lg shadow-sm bg-white"
            />
          ) : (
            <div className="text-center p-8 bg-white rounded-xl shadow-sm">
              <p className="text-gray-500 mb-4">
                {isPdf ? 'PDFの読み込みに失敗しました' : 'このファイル形式はプレビューできません'}
              </p>
              <a 
                href={file.data} 
                download={file.name}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
              >
                <Download size={18} /> ダウンロードして表示
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;