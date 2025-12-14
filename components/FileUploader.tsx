import React, { useRef, useState } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Paperclip, Trash2, Eye } from 'lucide-react';
import { Attachment } from '../types';
import FilePreviewModal from './FilePreviewModal';

interface FileUploaderProps {
  attachments?: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  label?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({ attachments = [], onAttachmentsChange, label = "ファイルを添付" }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const newAttachments: Attachment[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64 = await fileToBase64(file);
        
        newAttachments.push({
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64
        });
      }
      onAttachmentsChange([...attachments, ...newAttachments]);
    } catch (error) {
      console.error("File upload error:", error);
      alert("ファイルのアップロードに失敗しました。");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = (id: string) => {
    onAttachmentsChange(attachments.filter(a => a.id !== id));
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-3">
      {label && <label className="block text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Paperclip size={12} /> {label}</label>}
      
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
          ${isDragging 
            ? 'border-brand-500 bg-brand-50' 
            : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'
          }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          multiple
        />
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <div className="p-2 bg-gray-100 rounded-full">
            <Upload size={20} className={isDragging ? 'text-brand-600' : 'text-gray-400'} />
          </div>
          <div className="text-sm font-medium">
            {isProcessing ? '処理中...' : 'クリックまたはドラッグ＆ドロップ'}
          </div>
          <div className="text-xs text-gray-400">
            PDF, 画像など
          </div>
        </div>
      </div>

      {attachments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {attachments.map(file => (
            <div 
              key={file.id} 
              onClick={() => setPreviewFile(file)}
              className="group relative flex items-center gap-3 p-2 bg-white border border-gray-200 rounded-lg hover:shadow-md hover:border-brand-300 transition-all cursor-pointer"
            >
              <div className="w-10 h-10 shrink-0 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                {file.type.startsWith('image/') ? (
                  <img src={file.data} alt={file.name} className="w-full h-full object-cover" />
                ) : file.type === 'application/pdf' ? (
                  <FileText size={20} className="text-red-500" />
                ) : (
                  <FileText size={20} className="text-gray-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate group-hover:text-brand-600 transition-colors">{file.name}</p>
                <p className="text-[10px] text-gray-400">{formatSize(file.size)}</p>
              </div>
              
              <div className="flex items-center gap-1">
                 <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewFile(file);
                  }}
                  className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-colors md:hidden"
                >
                  <Eye size={14} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(file.id);
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      <FilePreviewModal 
        file={previewFile} 
        onClose={() => setPreviewFile(null)} 
      />
    </div>
  );
};

export default FileUploader;