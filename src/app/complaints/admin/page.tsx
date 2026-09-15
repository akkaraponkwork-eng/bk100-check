'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { useToast } from '@/hooks/useToast';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Clock, CheckCircle2, AlertCircle, RefreshCcw, SearchX, XCircle, User, Trash2 } from 'lucide-react';

interface Complaint {
  id: string;
  topic: string;
  detail: string;
  status: 'pending' | 'progress' | 'resolved' | 'rejected';
  createdAt: string;
  senderName?: string;
  senderId?: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; colorClass: string; bgClass: string; selectClass: string }> = {
  pending: { 
    label: 'รอดำเนินการ', 
    icon: AlertCircle, 
    colorClass: 'text-red-700', 
    bgClass: 'bg-red-50 border-red-200',
    selectClass: 'focus:ring-red-500/20 focus:border-red-500 text-red-700'
  },
  progress: { 
    label: 'กำลังแก้ไข', 
    icon: RefreshCcw, 
    colorClass: 'text-amber-700', 
    bgClass: 'bg-amber-50 border-amber-200',
    selectClass: 'focus:ring-amber-500/20 focus:border-amber-500 text-amber-700'
  },
  resolved: { 
    label: 'เรียบร้อยแล้ว', 
    icon: CheckCircle2, 
    colorClass: 'text-emerald-700', 
    bgClass: 'bg-emerald-50 border-emerald-200',
    selectClass: 'focus:ring-emerald-500/20 focus:border-emerald-500 text-emerald-700'
  },
  rejected: { 
    label: 'ปฏิเสธ', 
    icon: XCircle, 
    colorClass: 'text-gray-700', 
    bgClass: 'bg-gray-100 border-gray-300',
    selectClass: 'focus:ring-gray-500/20 focus:border-gray-500 text-gray-700'
  },
};

type TabValue = 'all' | 'pending' | 'progress' | 'resolved' | 'rejected';

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const { showToast } = useToast();

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const res = await fetch('/api/complaints');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      const sorted = (data.complaints || []).sort((a: Complaint, b: Complaint) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setComplaints(sorted);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: newStatus as any } : c));
    
    try {
      const res = await fetch('/api/complaints', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      showToast('อัปเดตสถานะเรียบร้อยแล้ว', 'success');
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการอัปเดต', 'error');
      fetchComplaints();
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('คุณต้องการลบเรื่องร้องเรียนนี้ใช่หรือไม่?')) return;

    // Optimistic update
    const previous = [...complaints];
    setComplaints(prev => prev.filter(c => c.id !== id));
    
    try {
      const res = await fetch(`/api/complaints?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete complaint');
      showToast('ลบเรื่องร้องเรียนเรียบร้อยแล้ว', 'success');
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการลบ', 'error');
      setComplaints(previous); // Revert
    }
  };

  const filteredComplaints = complaints.filter(c => {
    if (activeTab === 'all') return true;
    return c.status === activeTab;
  });

  return (
    <div className="pb-24 lg:pb-20 min-h-screen bg-gray-50/50">
      <PageHeader
        title="รับเรื่องร้องเรียน"
        description="รายการเรื่องร้องเรียนทั้งหมดจากกำลังพล"
      />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-8 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 flex-1 ${
              activeTab === 'all' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            ทั้งหมด ({complaints.length})
          </button>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => {
            const count = complaints.filter(c => c.status === key).length;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key as TabValue)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 flex-1 ${
                  activeTab === key 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {config.label} ({count})
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 shadow-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <SearchX className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">ยังไม่มีเรื่องร้องเรียนในสถานะนี้</h3>
            <p className="text-gray-500 text-sm">ข้อมูลเรื่องร้องเรียนจะแสดงที่นี่เมื่อมีผู้ส่งเข้ามา</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredComplaints.map((c) => {
              const currentConfig = STATUS_CONFIG[c.status || 'pending'];
              const StatusIcon = currentConfig.icon;
              
              return (
                <div 
                  key={c.id} 
                  className={`bg-white p-6 rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md ${
                    c.status === 'resolved' || c.status === 'rejected' ? 'border-gray-200 opacity-80' : 'border-gray-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                    <div className="flex-grow pr-4">
                      <h3 className="text-lg font-semibold text-gray-900 leading-tight mb-2">
                        {c.topic}
                      </h3>
                      <div className="flex flex-wrap items-center text-xs text-gray-500 font-medium gap-3">
                        <div className="flex items-center">
                          <User className="w-3.5 h-3.5 mr-1.5" />
                          <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-semibold">
                            {c.senderName || 'ไม่ระบุชื่อ'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1.5" />
                          {c.createdAt ? format(new Date(c.createdAt), 'dd MMM yyyy HH:mm', { locale: th }) : 'ไม่ระบุเวลา'}
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0 w-full sm:w-auto flex items-center gap-2">
                      <div className="relative w-full sm:w-auto">
                        <select
                          value={c.status || 'pending'}
                          onChange={(e) => handleStatusChange(c.id, e.target.value)}
                          className={`appearance-none w-full sm:w-[160px] pl-10 pr-8 py-2.5 rounded-xl border font-semibold text-sm transition-colors cursor-pointer outline-none ring-offset-1 focus:ring-2 ${currentConfig.bgClass} ${currentConfig.selectClass}`}
                        >
                          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                            <option key={key} value={key} className="text-gray-900 bg-white font-medium">
                              {config.label}
                            </option>
                          ))}
                        </select>
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                          <StatusIcon className={`w-4 h-4 ${currentConfig.colorClass}`} />
                        </div>
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                          <svg className={`w-4 h-4 ${currentConfig.colorClass} opacity-60`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
                        title="ลบข้อมูล"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-4 bg-gray-50/80 rounded-xl border border-gray-100">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {c.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
