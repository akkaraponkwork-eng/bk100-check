'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { useToast } from '@/hooks/useToast';
import { Send, AlertCircle, ShieldCheck } from 'lucide-react';

export default function ComplaintsPage() {
  const [topic, setTopic] = useState('');
  const [detail, setDetail] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !detail.trim()) {
      showToast('กรุณากรอกหัวข้อและรายละเอียด', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, detail }),
      });

      if (!res.ok) throw new Error('Failed to send complaint');

      showToast('ส่งเรื่องร้องเรียนเรียบร้อยแล้ว', 'success');
      setTopic('');
      setDetail('');
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการส่งข้อมูล', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-24 lg:pb-20 min-h-screen bg-gray-50/50">
      <PageHeader
        title="ร้องเรียน"
        description="ส่งเรื่องร้องเรียนหรือข้อเสนอแนะ"
      />

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Topic Field */}
            <div className="space-y-2">
              <label htmlFor="topic" className="block text-sm font-semibold text-gray-900">
                หัวข้อเรื่อง
              </label>
              <input
                id="topic"
                type="text"
                placeholder="เช่น แจ้งปัญหาการเข้าเวร, ข้อเสนอแนะสวัสดิการ..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 
                           placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 
                           focus:border-blue-500 transition-all duration-200 disabled:opacity-50 
                           disabled:bg-gray-50"
              />
            </div>

            {/* Detail Field */}
            <div className="space-y-2">
              <label htmlFor="detail" className="block text-sm font-semibold text-gray-900">
                รายละเอียด
              </label>
              <textarea
                id="detail"
                placeholder="อธิบายรายละเอียดของเรื่องที่คุณต้องการร้องเรียนหรือเสนอแนะ..."
                rows={6}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 
                           placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 
                           focus:border-blue-500 transition-all duration-200 resize-y disabled:opacity-50 
                           disabled:bg-gray-50 leading-relaxed"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading || !topic.trim() || !detail.trim()}
                className="group relative flex items-center justify-center gap-2 w-full sm:w-auto 
                           bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 
                           rounded-xl transition-all duration-200 disabled:opacity-50 
                           disabled:cursor-not-allowed disabled:hover:bg-blue-600 shadow-sm 
                           hover:shadow-md active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>กำลังส่ง...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    <span>ส่งเรื่องร้องเรียน</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
