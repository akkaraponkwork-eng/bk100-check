import React from 'react';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import type { KanbanTask } from '@/types';
import { getTaskTotal } from './TaskCard';

export const ROUTINE_TITLES = [
  'บก.ร้อย',
  'คลังผ้า',
  'คลังโยธา',
  'รถไถ',
  'ตัดหญ้า',
  'ตัดแต่ง',
  'ทั่วไป (กองร้อย)',
  'ชุดช่าง บก.พัน',
  'ป่วย',
  'ตร.ศบบ.',
  'บ้านพัก ผบ.ศบบ.',
];

interface PrintFormProps {
  tasks: KanbanTask[];
  date: string;
  totalCompany: number | '';
}

export default function PrintForm({ tasks, date, totalCompany }: PrintFormProps) {
  const dateDisplay = date ? format(parseISO(date), 'd MMMM yyyy', { locale: th }) : format(new Date(), 'd MMMM yyyy', { locale: th });
  const totalDistributed = tasks.reduce((s, t) => s + getTaskTotal(t), 0);
  const totalSenior = tasks.reduce((s, t) => s + (Number(t.countSenior) || 0), 0);
  const totalJunior = tasks.reduce((s, t) => s + (Number(t.countJunior) || 0), 0);
  const remaining = typeof totalCompany === 'number' ? totalCompany - totalDistributed : '';

  const isMorning = new Date().getHours() < 12;
  const shiftText = isMorning ? 'ยอดจ่ายงานเช้า' : 'ยอดจ่ายงานบ่าย';

  // Routine tasks mapping (always render all 11 fixed rows)
  const routineList = ROUTINE_TITLES.map(title => {
    const t = tasks.find(x => x.title === title);
    return {
      title,
      location: t?.location || '',
      countSenior: t?.countSenior !== undefined && t?.countSenior !== '' ? Number(t.countSenior) : '',
      countJunior: t?.countJunior !== undefined && t?.countJunior !== '' ? Number(t.countJunior) : '',
      remark: t?.remark || '',
    };
  });

  // Other/Outside tasks mapping
  const otherTasksList = tasks.filter(t => !ROUTINE_TITLES.includes(t.title));
  const emptyRowsNeeded = Math.max(0, 6 - otherTasksList.length);
  const emptyRows = Array.from({ length: emptyRowsNeeded }, (_, i) => i);

  return (
    <div
      id="print-form-container"
      className="print-only"
      style={{
        width: '100%',
        maxWidth: '800px',
        margin: '0 auto',
        padding: '24px 32px',
        backgroundColor: '#ffffff',
        fontFamily: '"Sarabun", "TH Sarabun PSK", "Angsana New", sans-serif',
        color: '#000000',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        @media screen { .print-only { display: none !important; } }
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
        .official-table {
          width: 100%;
          border-collapse: collapse;
          border: 2px solid #000000;
          font-size: 14px;
          color: #000000;
        }
        .official-table th, .official-table td {
          border: 1px solid #000000;
          padding: 5px 8px;
          vertical-align: middle;
        }
        .official-table th {
          font-weight: bold;
          text-align: center;
          background-color: #ffffff;
        }
      `}</style>

      {/* Official Header */}
      <div style={{ textAlign: 'center', marginBottom: '14px', lineHeight: 1.5, color: '#000000' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
          แบบรายชื่อการจ่ายงานตามหน้าที่ ร้อย.บก.พัน.บร.กบร.ศบบ.
        </div>
        <div style={{ fontSize: '15px' }}>
          ประจำวันที่ {dateDisplay}
        </div>
        <div style={{ fontSize: '15px' }}>
          ยอดรวมกองร้อย {totalCompany !== '' ? `${totalCompany} นาย` : '......................นาย'}
        </div>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px' }}>
          {shiftText}
        </div>
      </div>

      {/* Official Table */}
      <table className="official-table">
        <thead>
          <tr>
            <th rowSpan={2} style={{ width: '24%' }}>รูปแบบงาน</th>
            <th rowSpan={2} style={{ width: '34%' }}>สถานที่ทำงาน/จำหน่าย</th>
            <th colSpan={2} style={{ width: '18%' }}>จำนวนยอด</th>
            <th rowSpan={2} style={{ width: '24%' }}>หมายเหตุ</th>
          </tr>
          <tr>
            <th style={{ width: '9%' }}>รุ่นพี่</th>
            <th style={{ width: '9%' }}>รุ่นน้อง</th>
          </tr>
        </thead>
        <tbody>
          {/* Routine 11 Rows */}
          {routineList.map(r => (
            <tr key={r.title}>
              <td style={{ textAlign: 'left' }}>{r.title}</td>
              <td style={{ textAlign: 'left' }}>{r.location}</td>
              <td style={{ textAlign: 'center' }}>{r.countSenior !== '' ? r.countSenior : ''}</td>
              <td style={{ textAlign: 'center' }}>{r.countJunior !== '' ? r.countJunior : ''}</td>
              <td style={{ textAlign: 'left' }}>{r.remark}</td>
            </tr>
          ))}

          {/* Table 2 Header: งานนอก/อื่นๆ */}
          <tr>
            <th rowSpan={2} style={{ textAlign: 'center', fontWeight: 'bold' }}>งานนอก/อื่นๆ</th>
            <th rowSpan={2} style={{ textAlign: 'center', fontWeight: 'bold' }}>สถานที่ทำงาน/จำหน่าย</th>
            <th colSpan={2} style={{ textAlign: 'center', fontWeight: 'bold' }}>จำนวนยอด</th>
            <th rowSpan={2} style={{ textAlign: 'center', fontWeight: 'bold' }}>หมายเหตุ</th>
          </tr>
          <tr>
            <th style={{ textAlign: 'center', fontWeight: 'bold' }}>รุ่นพี่</th>
            <th style={{ textAlign: 'center', fontWeight: 'bold' }}>รุ่นน้อง</th>
          </tr>

          {/* Other tasks rows */}
          {otherTasksList.map(t => {
            const s = t.countSenior !== undefined && t.countSenior !== '' ? t.countSenior : '';
            const j = t.countJunior !== undefined && t.countJunior !== '' ? t.countJunior : '';
            return (
              <tr key={t.id}>
                <td style={{ textAlign: 'left' }}>{t.title}</td>
                <td style={{ textAlign: 'left' }}>{t.location || ''}</td>
                <td style={{ textAlign: 'center' }}>{s}</td>
                <td style={{ textAlign: 'center' }}>{j}</td>
                <td style={{ textAlign: 'left' }}>{t.remark || ''}</td>
              </tr>
            );
          })}

          {/* Empty padded rows */}
          {emptyRows.map(i => (
            <tr key={`empty-${i}`}>
              <td>&nbsp;</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          ))}

          {/* Summary Rows */}
          <tr>
            <td colSpan={2} style={{ fontWeight: 'bold', textAlign: 'left' }}>รวมยอดจำหน่าย</td>
            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{totalSenior || ''}</td>
            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{totalJunior || ''}</td>
            <td style={{ fontWeight: 'bold', textAlign: 'left' }}>{totalDistributed ? `${totalDistributed} นาย` : ''}</td>
          </tr>
          <tr>
            <td colSpan={2} style={{ fontWeight: 'bold', textAlign: 'left' }}>ยอดคงเหลือ</td>
            <td colSpan={2} style={{ textAlign: 'center', fontWeight: 'bold' }}>{typeof totalCompany === 'number' ? `${remaining} นาย` : ''}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
