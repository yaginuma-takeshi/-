import React, { useState, useEffect } from 'react';
import { RealEstateCase, CaseStatus, Task, ConsiderationCase } from './types';
import Calendar from './components/Calendar';
import CaseModal from './components/CaseModal';
import TaskList from './components/TaskList';
import TaskDetailModal from './components/TaskDetailModal';
import ConsiderationModal from './components/ConsiderationModal';
import SettingsModal from './components/SettingsModal';
import { parseFreeTextTasks } from './services/geminiService';
import { initFirebase, subscribeToCollection, saveDocument, deleteDocument } from './services/firebaseService';
import { LayoutDashboard, CalendarDays, Plus, Search, Building2, User, CheckCircle2, ListTodo, Sparkles, Send, FileQuestion, ArrowRight, AlertCircle, Coins, Clock, Menu, Settings, Cloud } from 'lucide-react';

// Mock Initial Data including a "General" case container
const INITIAL_DATA: RealEstateCase[] = [
  {
    id: 'general',
    propertyName: '一般タスク', // Hidden container for general tasks
    address: '',
    clientPhone: '',
    purchasePrice: 0,
    sellingPrice: 0,
    lender: '',
    status: CaseStatus.LEAD,
    createdAt: new Date().toISOString(),
    notes: '案件に紐づかないタスク',
    tasks: [
      { 
        id: 'g1', 
        title: '銀行振込確認', 
        date: new Date().toISOString().split('T')[0], 
        time: '10:00', 
        isCompleted: false,
        createdAt: new Date(Date.now() - 10000000).toISOString(),
        reminder: '30_min',
        comments: []
      },
    ]
  },
  {
    id: '1',
    propertyName: '赤坂グランドタワー 2501',
    address: '東京都港区赤坂...',
    clientPhone: '090-1234-5678',
    purchasePrice: 9800,
    sellingPrice: 12800,
    lender: '東京中央銀行 赤坂支店',
    status: CaseStatus.NEGOTIATION,
    createdAt: new Date().toISOString(),
    notes: '内覧希望あり',
    tasks: [
      { 
        id: 't1', 
        title: '仕入決済', 
        date: new Date().toISOString().split('T')[0], 
        isCompleted: false,
        createdAt: new Date(Date.now() - 5000000).toISOString(),
        comments: [
          { id: 'cm1', content: '司法書士の手配完了しました。', createdAt: new Date(Date.now() - 100000).toISOString(), author: '自分' }
        ]
      },
      { 
        id: 't2', 
        title: '建築確認取得', 
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0], 
        isCompleted: false,
        createdAt: new Date(Date.now() - 4000000).toISOString(),
        reminder: '1_day',
        comments: []
      },
    ]
  },
  {
    id: '2',
    propertyName: '渋谷青山レジデンス',
    address: '東京都渋谷区渋谷...',
    clientPhone: '080-9876-5432',
    purchasePrice: 5000,
    sellingPrice: 6500,
    lender: '三井住友銀行 渋谷支店',
    status: CaseStatus.LEAD,
    createdAt: new Date().toISOString(),
    notes: '投資用物件を探している',
    tasks: [
      { 
        id: 't6', 
        title: '物件資料送付', 
        date: new Date().toISOString().split('T')[0], 
        isCompleted: false,
        createdAt: new Date(Date.now() - 1000000).toISOString(),
        comments: []
      }
    ]
  }
];

// Mock Initial Data for Consideration Cases
const INITIAL_CONSIDERATION_DATA: ConsiderationCase[] = [
  {
    id: 'c1',
    propertyName: '中野区中央5丁目 戸建用地',
    source: '田中不動産',
    askingPrice: 5800,
    offerPrice: 5200,
    replyDeadline: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    notes: 'セットバック要確認。古家あり。',
    createdAt: new Date().toISOString()
  },
  {
    id: 'c2',
    propertyName: '品川区大井 マンション用地',
    source: 'レインズ',
    askingPrice: 12000,
    offerPrice: 0,
    replyDeadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    notes: '容積率緩和の可能性あり',
    createdAt: new Date(Date.now() - 86400000).toISOString()
  }
];

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'dashboard' | 'calendar'>('dashboard');
  const [dashboardTab, setDashboardTab] = useState<'cases' | 'consideration' | 'tasks'>('cases');
  const [cases, setCases] = useState<RealEstateCase[]>(INITIAL_DATA);
  const [considerationCases, setConsiderationCases] = useState<ConsiderationCase[]>(INITIAL_CONSIDERATION_DATA);
  
  // Modals
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
  const [isConsiderationModalOpen, setIsConsiderationModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Selection State
  const [selectedCase, setSelectedCase] = useState<RealEstateCase | null>(null);
  const [selectedConsideration, setSelectedConsideration] = useState<ConsiderationCase | null>(null);
  const [selectedTaskInfo, setSelectedTaskInfo] = useState<{task: Task, caseId: string, caseName: string} | null>(null);
  
  // Promotion State
  const [promotingConsiderationId, setPromotingConsiderationId] = useState<string | null>(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  
  // AI Task Generator State
  const [quickTaskInput, setQuickTaskInput] = useState('');
  const [isGeneratingTask, setIsGeneratingTask] = useState(false);

  // Sync State
  const [firebaseConfig, setFirebaseConfig] = useState('');
  const [isCloudMode, setIsCloudMode] = useState(false);

  // Initialize Config from LocalStorage and Setup Firebase
  useEffect(() => {
    const savedConfig = localStorage.getItem('estateflow_firebase_config');
    if (savedConfig) {
      setFirebaseConfig(savedConfig);
      const success = initFirebase(savedConfig);
      setIsCloudMode(success);
    }
  }, []);

  // Subscribe to collections if cloud mode is active
  useEffect(() => {
    if (!isCloudMode) return;

    const unsubscribeCases = subscribeToCollection('cases', (data) => {
      // Basic merge strategy: Remote wins. 
      // Ensure we convert data to proper types if needed
      setCases(data as RealEstateCase[]);
    });

    const unsubscribeConsiderations = subscribeToCollection('considerationCases', (data) => {
      setConsiderationCases(data as ConsiderationCase[]);
    });

    return () => {
      unsubscribeCases();
      unsubscribeConsiderations();
    };
  }, [isCloudMode]);

  const handleSaveConfig = (config: string) => {
    setFirebaseConfig(config);
    if (!config.trim()) {
      localStorage.removeItem('estateflow_firebase_config');
      setIsCloudMode(false);
      alert('設定を解除しました。ローカルモードに戻ります。');
      // Reset to initial data or keep current data? Keeping current local data is safer for now.
      return;
    }

    try {
      const success = initFirebase(config);
      if (success) {
        localStorage.setItem('estateflow_firebase_config', config);
        setIsCloudMode(true);
        alert('接続に成功しました。クラウドモードに切り替わります。');
      } else {
        alert('接続に失敗しました。設定を確認してください。');
        setIsCloudMode(false);
      }
    } catch (e) {
      alert('無効なJSON形式です。');
    }
  };

  // Derived state
  const visibleCases = cases.filter(c => c.id !== 'general');
  const filteredCases = visibleCases.filter(c => 
    c.propertyName.includes(searchTerm)
  );
  const filteredConsiderations = considerationCases.filter(c => 
    c.propertyName.includes(searchTerm)
  );

  const stats = {
    total: visibleCases.length,
    consideration: considerationCases.length,
    active: visibleCases.filter(c => c.status !== CaseStatus.CLOSED).length,
    urgentTasks: cases.flatMap(c => c.tasks).filter(t => !t.isCompleted && t.date <= new Date().toISOString().split('T')[0]).length
  };

  // --- Data Helpers: Switch between Cloud and Local ---

  const saveData = async (type: 'cases' | 'considerationCases', data: any) => {
    if (isCloudMode) {
      await saveDocument(type, data);
    } else {
      if (type === 'cases') {
        setCases(prev => {
          const exists = prev.find(c => c.id === data.id);
          return exists ? prev.map(c => c.id === data.id ? data : c) : [...prev, data];
        });
      } else {
        setConsiderationCases(prev => {
          const exists = prev.find(c => c.id === data.id);
          return exists ? prev.map(c => c.id === data.id ? data : c) : [...prev, data];
        });
      }
    }
  };

  const deleteData = async (type: 'cases' | 'considerationCases', id: string) => {
    if (isCloudMode) {
      await deleteDocument(type, id);
    } else {
      if (type === 'cases') {
        setCases(prev => prev.filter(c => c.id !== id));
      } else {
        setConsiderationCases(prev => prev.filter(c => c.id !== id));
      }
    }
  };

  // Case Handlers
  const handleSaveCase = (caseData: RealEstateCase) => {
    saveData('cases', caseData);

    // If this was a promotion from consideration, delete the consideration case
    if (promotingConsiderationId) {
      deleteData('considerationCases', promotingConsiderationId);
      setPromotingConsiderationId(null);
      setDashboardTab('cases');
    }
    setSelectedCase(null);
  };

  const handleDeleteCase = (id: string) => {
    deleteData('cases', id);
    setIsCaseModalOpen(false);
    setSelectedCase(null);
  };

  const openNewCaseModal = () => {
    setSelectedCase(null);
    setPromotingConsiderationId(null);
    setIsCaseModalOpen(true);
  };

  const openEditCaseModal = (c: RealEstateCase) => {
    setSelectedCase(c);
    setPromotingConsiderationId(null);
    setIsCaseModalOpen(true);
  };

  // Consideration Handlers
  const openNewConsiderationModal = () => {
    setSelectedConsideration(null);
    setIsConsiderationModalOpen(true);
  };

  const openEditConsiderationModal = (c: ConsiderationCase) => {
    setSelectedConsideration(c);
    setIsConsiderationModalOpen(true);
  };

  const handleSaveConsideration = (data: ConsiderationCase) => {
    saveData('considerationCases', data);
    setSelectedConsideration(null);
  };

  const handleDeleteConsideration = (id: string) => {
    deleteData('considerationCases', id);
    setIsConsiderationModalOpen(false);
    setSelectedConsideration(null);
  };

  const promoteToCase = (e: React.MouseEvent, consideration: ConsiderationCase) => {
    e.stopPropagation();
    const newCase: RealEstateCase = {
      id: crypto.randomUUID(),
      propertyName: consideration.propertyName,
      address: '',
      clientPhone: '',
      purchasePrice: consideration.offerPrice || consideration.askingPrice,
      sellingPrice: 0,
      lender: '',
      status: CaseStatus.LEAD,
      tasks: [
        { 
          id: crypto.randomUUID(), 
          title: '契約書作成', 
          date: new Date().toISOString().split('T')[0], 
          isCompleted: false,
          createdAt: new Date().toISOString(),
          comments: []
        }
      ],
      createdAt: new Date().toISOString(),
      notes: `${consideration.notes}\n\n(情報元: ${consideration.source} から移行)`,
      attachments: []
    };

    setSelectedCase(newCase);
    setPromotingConsiderationId(consideration.id);
    setIsCaseModalOpen(true);
  };

  // Task Detail Handlers
  const handleTaskClick = (caseId: string, taskId: string) => {
    const foundCase = cases.find(c => c.id === caseId);
    if (!foundCase) return;
    const foundTask = foundCase.tasks.find(t => t.id === taskId);
    if (!foundTask) return;

    setSelectedTaskInfo({
      task: foundTask,
      caseId: caseId,
      caseName: foundCase.propertyName
    });
    setIsTaskDetailModalOpen(true);
  };

  const handleSaveTaskDetail = (updatedTask: Task) => {
    if (!selectedTaskInfo) return;
    const caseData = cases.find(c => c.id === selectedTaskInfo.caseId);
    if (!caseData) return;

    const updatedCase = {
      ...caseData,
      tasks: caseData.tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
    };
    saveData('cases', updatedCase);
  };

  const handleDeleteTaskDetail = (taskId: string) => {
    if (!selectedTaskInfo) return;
    const caseData = cases.find(c => c.id === selectedTaskInfo.caseId);
    if (!caseData) return;

    const updatedCase = {
      ...caseData,
      tasks: caseData.tasks.filter(t => t.id !== taskId)
    };
    saveData('cases', updatedCase);
    setIsTaskDetailModalOpen(false);
  };

  const toggleTask = (caseId: string, taskId: string) => {
    const caseData = cases.find(c => c.id === caseId);
    if (!caseData) return;

    const updatedCase = {
      ...caseData,
      tasks: caseData.tasks.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t)
    };
    saveData('cases', updatedCase);
  };

  // Drag and drop task date update
  const handleTaskDateUpdate = (caseId: string, taskId: string, newDate: string) => {
    const caseData = cases.find(c => c.id === caseId);
    if (!caseData) return;

    const updatedCase = {
      ...caseData,
      tasks: caseData.tasks.map(t => t.id === taskId ? { ...t, date: newDate } : t)
    };
    saveData('cases', updatedCase);
  };

  const handleQuickTaskGenerate = async () => {
    if (!quickTaskInput.trim()) return;
    setIsGeneratingTask(true);
    try {
      const parsedTasks = await parseFreeTextTasks(quickTaskInput);
      
      const newTasks = parsedTasks.map(pt => ({
        id: crypto.randomUUID(),
        title: pt.title,
        date: pt.date,
        time: pt.time,
        isCompleted: false,
        createdAt: new Date().toISOString(),
        comments: []
      }));

      // Find 'general' case
      const generalCase = cases.find(c => c.id === 'general');
      if (generalCase) {
        const updatedGeneralCase = {
          ...generalCase,
          tasks: [...generalCase.tasks, ...newTasks]
        };
        saveData('cases', updatedGeneralCase);
      } else {
        // If local mock data was cleared or general case missing
        const newGeneralCase = {
           id: 'general',
            propertyName: '一般タスク',
            address: '',
            clientPhone: '',
            purchasePrice: 0,
            sellingPrice: 0,
            lender: '',
            status: CaseStatus.LEAD,
            createdAt: new Date().toISOString(),
            notes: '案件に紐づかないタスク',
            tasks: newTasks
        } as RealEstateCase;
        saveData('cases', newGeneralCase);
      }
      
      setQuickTaskInput('');
      setDashboardTab('tasks');
    } catch (e) {
      console.error(e);
      alert("タスク生成に失敗しました");
    } finally {
      setIsGeneratingTask(false);
    }
  };

  // Status Badge Helper
  const getStatusColor = (status: CaseStatus) => {
    switch (status) {
      case CaseStatus.LEAD: return 'bg-blue-100 text-blue-700 border-blue-200';
      case CaseStatus.NEGOTIATION: return 'bg-amber-100 text-amber-700 border-amber-200';
      case CaseStatus.CONTRACT: return 'bg-purple-100 text-purple-700 border-purple-200';
      case CaseStatus.SETTLEMENT: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case CaseStatus.CLOSED: return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getDeadlineColor = (date: string) => {
    const today = new Date().toISOString().split('T')[0];
    if (date < today) return 'text-red-600 font-bold';
    if (date === today) return 'text-amber-600 font-bold';
    return 'text-gray-600';
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute left-0 top-0 h-full w-64 bg-white p-4 shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold text-brand-700 flex items-center gap-2">
                  <Building2 className="text-brand-500" />
                  EstateFlow
                </h1>
                {isCloudMode && <Cloud size={16} className="text-emerald-500" />}
             </div>
             <nav className="flex-1 space-y-2">
              <button
                onClick={() => { setActiveView('dashboard'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeView === 'dashboard' ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <LayoutDashboard size={20} />
                ダッシュボード
              </button>
              <button
                onClick={() => { setActiveView('calendar'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeView === 'calendar' ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <CalendarDays size={20} />
                カレンダー
              </button>
              <button
                onClick={() => { setIsSettingsModalOpen(true); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all text-gray-600 hover:bg-gray-50`}
              >
                <Settings size={20} />
                設定・同期
              </button>
            </nav>
             <div className="p-4 bg-brand-900 rounded-xl text-white mt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-200 mb-2">本日のタスク</h3>
                <div className="text-3xl font-bold">{stats.urgentTasks}</div>
                <p className="text-xs text-brand-200 mt-1">未完了の期限切れ・当日タスク</p>
              </div>
          </div>
        </div>
      )}

      {/* Sidebar Navigation (Desktop) */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-brand-700 flex items-center gap-2">
            <Building2 className="text-brand-500" />
            EstateFlow
            {isCloudMode && <div className="w-2 h-2 rounded-full bg-emerald-500" title="Online" />}
          </h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeView === 'dashboard' ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <LayoutDashboard size={20} />
            ダッシュボード
          </button>
          <button
            onClick={() => setActiveView('calendar')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeView === 'calendar' ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <CalendarDays size={20} />
            カレンダー
          </button>
        </nav>

        <div className="px-4 pb-4">
           <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all text-gray-500 hover:bg-gray-50 hover:text-gray-800"
          >
            <Settings size={20} />
            設定・同期
          </button>
        </div>

        <div className="p-4 m-4 bg-brand-900 rounded-xl text-white">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-200 mb-2">本日のタスク</h3>
          <div className="text-3xl font-bold">{stats.urgentTasks}</div>
          <p className="text-xs text-brand-200 mt-1">未完了の期限切れ・当日タスク</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-4 md:hidden">
             <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
             >
               <Menu size={24} />
             </button>
             {isCloudMode && <Cloud size={18} className="text-emerald-500" />}
          </div>
          
          <div className="flex-1 max-w-xl mx-auto md:mx-0 flex items-center px-4 md:px-0">
            {activeView === 'dashboard' && (
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="物件名で検索..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-brand-500 transition-all outline-none"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {activeView === 'dashboard' && dashboardTab === 'consideration' ? (
              <button 
                onClick={openNewConsiderationModal}
                className="bg-brand-600 hover:bg-brand-700 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-all"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">検討登録</span>
                <span className="sm:hidden">追加</span>
              </button>
            ) : (
              <button 
                onClick={openNewCaseModal}
                className="bg-brand-600 hover:bg-brand-700 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-all"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">新規案件</span>
                <span className="sm:hidden">追加</span>
              </button>
            )}
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          {activeView === 'dashboard' ? (
            <div className="space-y-6">
              
              {/* Quick Task Generator */}
              <div className="bg-gradient-to-r from-brand-600 to-indigo-600 rounded-xl p-5 text-white shadow-lg">
                <div className="flex flex-col md:flex-row items-start gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm shrink-0">
                      <Sparkles size={24} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg mb-1">AI クイックタスク登録</h3>
                      <p className="text-brand-100 text-xs mb-3 hidden sm:block">「来週の水曜14時に銀行面談」のように入力すると、自動で日時と内容を解析して登録します。</p>
                      <div className="flex gap-2 w-full">
                        <input 
                          type="text" 
                          value={quickTaskInput}
                          onChange={(e) => setQuickTaskInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleQuickTaskGenerate()}
                          placeholder="例: 明日までに契約書作成..."
                          className="flex-1 px-4 py-2.5 rounded-lg bg-white text-gray-800 text-sm focus:ring-2 focus:ring-white/50 outline-none w-full min-w-0"
                        />
                        <button 
                          onClick={handleQuickTaskGenerate}
                          disabled={isGeneratingTask}
                          className="bg-white text-brand-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-brand-50 transition-colors flex items-center gap-2 disabled:opacity-70 shrink-0"
                        >
                          {isGeneratingTask ? '...' : <><Send size={16} /> <span className="hidden sm:inline">登録</span></>}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {[
                   { label: '進行中案件', value: stats.active, color: 'text-brand-600' },
                   { label: '検討中案件', value: stats.consideration, color: 'text-indigo-600' },
                   { label: '今月の成約', value: cases.filter(c => c.status === CaseStatus.CLOSED).length, color: 'text-emerald-600' },
                   { label: 'タスク残', value: stats.urgentTasks, color: 'text-red-500' },
                 ].map((stat, idx) => (
                   <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                     <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                     <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                   </div>
                 ))}
              </div>

              {/* View Switcher Tabs */}
              <div className="border-b border-gray-200">
                <div className="flex gap-6 overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setDashboardTab('cases')}
                    className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${dashboardTab === 'cases' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                    <LayoutDashboard size={18} /> 案件ボード
                  </button>
                  <button
                    onClick={() => setDashboardTab('consideration')}
                    className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${dashboardTab === 'consideration' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                    <FileQuestion size={18} /> 検討案件
                  </button>
                  <button
                    onClick={() => setDashboardTab('tasks')}
                    className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${dashboardTab === 'tasks' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                    <ListTodo size={18} /> タスク一覧
                  </button>
                </div>
              </div>

              {/* View Content */}
              {dashboardTab === 'cases' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-300">
                  {filteredCases.map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => openEditCaseModal(c)}
                      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col"
                    >
                      <div className="p-5 flex-1">
                        <div className="flex justify-between items-start mb-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStatusColor(c.status)}`}>
                            {c.status}
                          </span>
                          <div className="text-right flex flex-col items-end">
                            <div className="text-xs text-gray-500 mb-0.5">
                              仕入: {c.purchasePrice ? `¥${c.purchasePrice.toLocaleString()}` : '-'}
                            </div>
                            <div className="text-lg font-bold text-gray-900">
                              <span className="text-xs mr-1 text-gray-500 font-normal">販売:</span>
                               {c.sellingPrice ? `¥${c.sellingPrice.toLocaleString()}` : '-'}
                               <span className="text-xs font-normal text-gray-500 ml-1">万円</span>
                            </div>
                          </div>
                        </div>
                        
                        <h3 className="text-base font-bold text-gray-800 mb-1 group-hover:text-brand-600 transition-colors line-clamp-1">{c.propertyName}</h3>
                        <div className="flex flex-col gap-1 mb-4">
                           <div className="flex items-center text-xs text-gray-500 gap-2">
                             <Building2 size={12} className="shrink-0"/> <span className="truncate">{c.lender || '借入先未定'}</span>
                           </div>
                        </div>
                        
                        <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
                          <p className="text-[10px] text-gray-400 font-semibold uppercase">直近のタスク</p>
                          {c.tasks.slice(0, 2).map(t => (
                             <div key={t.id} className="flex items-center gap-2 text-xs">
                               <div 
                                 onClick={(e) => { e.stopPropagation(); toggleTask(c.id, t.id); }}
                                 className={`cursor-pointer ${t.isCompleted ? 'text-green-500' : 'text-gray-400'}`}
                               >
                                  <CheckCircle2 size={14} />
                               </div>
                               <span className={`truncate ${t.isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}>{t.title}</span>
                               <span className="ml-auto text-gray-400 text-[10px]">{t.date.slice(5)}</span>
                             </div>
                          ))}
                           {c.tasks.length === 0 && <span className="text-xs text-gray-400 italic">タスクなし</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredCases.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-400">
                       条件に一致する案件がありません
                    </div>
                  )}
                </div>
              ) : dashboardTab === 'consideration' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-300">
                  {filteredConsiderations.map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => openEditConsiderationModal(c)}
                      className="bg-white rounded-xl border border-indigo-100 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group flex flex-col relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                      <div className="p-5 flex-1">
                         <div className="flex justify-between items-start mb-2">
                           <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                             <User size={10} /> {c.source || '情報元不明'}
                           </span>
                           <div className="text-right">
                              <span className={`text-xs flex items-center gap-1 ${getDeadlineColor(c.replyDeadline)}`}>
                                <Clock size={12} /> {c.replyDeadline.slice(5)} 期限
                              </span>
                           </div>
                         </div>

                         <h3 className="text-base font-bold text-gray-800 mb-4 group-hover:text-indigo-600 transition-colors line-clamp-1">{c.propertyName}</h3>
                         
                         <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-gray-50 rounded p-2">
                              <span className="text-[10px] text-gray-500 block mb-0.5">希望価格</span>
                              <span className="text-sm font-bold text-gray-700">{c.askingPrice ? `¥${c.askingPrice}` : '-'} <span className="text-[10px] font-normal">万円</span></span>
                            </div>
                            <div className="bg-indigo-50/50 rounded p-2 border border-indigo-100">
                              <span className="text-[10px] text-indigo-600 block mb-0.5 font-bold">回答価格</span>
                              <span className="text-sm font-bold text-indigo-700">{c.offerPrice ? `¥${c.offerPrice}` : '-'} <span className="text-[10px] font-normal">万円</span></span>
                            </div>
                         </div>

                         <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded mb-4 line-clamp-2 min-h-[3em]">
                            {c.notes || '備考なし'}
                         </div>

                         <button
                           onClick={(e) => promoteToCase(e, c)}
                           className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                         >
                           <ArrowRight size={16} />
                           案件化 (成約)
                         </button>
                      </div>
                    </div>
                  ))}
                  {filteredConsiderations.length === 0 && (
                     <div className="col-span-full py-12 text-center text-gray-400">
                       <p className="mb-2">検討中の案件がありません</p>
                       <button onClick={openNewConsiderationModal} className="text-brand-600 hover:underline text-sm">
                         新しい検討案件を登録する
                       </button>
                     </div>
                  )}
                </div>
              ) : (
                <TaskList cases={cases} onToggleTask={toggleTask} onTaskClick={handleTaskClick} />
              )}
            </div>
          ) : (
            <div className="h-full">
              <Calendar 
                cases={cases}
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                onTaskClick={(taskId, caseId) => handleTaskClick(caseId, taskId)}
                onTaskToggle={toggleTask}
                onTaskDateChange={handleTaskDateUpdate}
              />
            </div>
          )}
        </div>
      </main>

      {/* Case Management Modal */}
      <CaseModal 
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
        onSave={handleSaveCase}
        onDelete={handleDeleteCase}
        initialData={selectedCase}
      />

      {/* Consideration Management Modal */}
      <ConsiderationModal 
        isOpen={isConsiderationModalOpen}
        onClose={() => setIsConsiderationModalOpen(false)}
        onSave={handleSaveConsideration}
        onDelete={handleDeleteConsideration}
        initialData={selectedConsideration}
      />

      {/* Single Task Detail Modal */}
      <TaskDetailModal 
        isOpen={isTaskDetailModalOpen}
        onClose={() => setIsTaskDetailModalOpen(false)}
        task={selectedTaskInfo?.task || null}
        caseName={selectedTaskInfo?.caseName}
        onSave={handleSaveTaskDetail}
        onDelete={handleDeleteTaskDetail}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSaveConfig={handleSaveConfig}
        currentConfig={firebaseConfig}
        isCloudMode={isCloudMode}
      />
    </div>
  );
};

export default App;