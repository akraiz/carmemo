import React, { useState } from 'react';
import axios from 'axios';
import { SaudiRecallInfo } from '../types';
import { TextField, Button } from '@mui/material';

const formatDate = (dateStr: string) => {
  // Format DD/MM/YYYY to Arabic locale
  try {
    const [day, month, year] = dateStr.split('/');
    if (!day || !month || !year) return dateStr;
    const date = new Date(`${year}-${month}-${day}`);
    return new Intl.DateTimeFormat('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
  } catch {
    return dateStr;
  }
};

const RecallsTest: React.FC = () => {
  const [vin, setVin] = useState('');
  const [loading, setLoading] = useState(false);
  const [recalls, setRecalls] = useState<SaudiRecallInfo[]>([]);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRecalls([]);
    if (!vin || vin.length < 5) {
      setError('يرجى إدخال رقم هيكل صحيح');
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/recall/${encodeURIComponent(vin)}`);
      if (!data || data.length === 0) {
        setError('لا توجد بيانات استدعاء لهذا الرقم التسلسلي');
        setRecalls([]);
      } else {
        setRecalls(data);
      }
    } catch (_err) {
      setError('حدث خطأ أثناء جلب البيانات.');
      setRecalls([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-lg shadow-lg" dir="rtl" lang="ar">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 text-right">🔍 أداة فحص الاستدعاءات السعودية</h2>
      <form onSubmit={handleSubmit} className="mb-6 flex flex-col items-end gap-4">
        <TextField
          fullWidth
          value={vin}
          onChange={e => setVin(e.target.value)}
          placeholder="أدخل رقم الهيكل (VIN)..."
          variant="outlined"
          size="small"
          inputProps={{ dir: 'ltr' }}
        />
        <Button
          type="submit"
          disabled={loading}
          variant="contained"
          color="primary"
          sx={{ fontWeight: 'bold' }}
        >
          {loading ? 'جاري البحث...' : 'بحث'}
        </Button>
      </form>
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md text-right">
          <strong>خطأ:</strong> {error}
        </div>
      )}
      {recalls.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300 text-right" dir="rtl">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border">الرقم المرجعي</th>
                <th className="px-4 py-2 border">تاريخ الاستدعاء</th>
                <th className="px-4 py-2 border">العلامة التجارية</th>
                <th className="px-4 py-2 border">الموديل</th>
                <th className="px-4 py-2 border">حالة الإصلاح</th>
                <th className="px-4 py-2 border">تفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {recalls.map((recall) => (
                <tr key={recall.reference || recall.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border font-mono">{recall.reference || recall.id}</td>
                  <td className="px-4 py-2 border">{formatDate(recall.date || recall.recallDate)}</td>
                  <td className="px-4 py-2 border">{recall.brand || recall.manufacturer}</td>
                  <td className="px-4 py-2 border">{recall.model}</td>
                  <td className="px-4 py-2 border">{recall.status}</td>
                  <td className="px-4 py-2 border">
                    {recall.detailUrl ? (
                      <a
                        href={recall.detailUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                      >
                        عرض التفاصيل
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {recalls.length === 0 && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-[#a0a0a0] text-center">
          <span className="text-5xl mb-3">🎉</span>
          <span className="text-lg font-semibold mb-2">No recalls found for this VIN. You're all clear!</span>
        </div>
      )}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md text-right">
        <h4 className="font-semibold text-blue-800 mb-2">تعليمات:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• أدخل رقم الهيكل (VIN) ثم اضغط "بحث".</li>
          <li>• سيتم عرض نتائج الاستدعاء إن وجدت في الجدول أدناه.</li>
          <li>• في حال عدم وجود استدعاءات، ستظهر رسالة بذلك.</li>
        </ul>
      </div>
    </div>
  );
};

export default RecallsTest; 