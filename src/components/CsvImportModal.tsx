'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import { importCustomersFromCsv, getActiveBusiness } from '@/lib/storage';
import { X, UploadCloud, FileText, CheckCircle2, ArrowRight, Download, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CsvImportModal({ isOpen, onClose, onSuccess }: Props) {
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [step, setStep] = useState<'upload' | 'map' | 'result'>('upload');

  // Column Mappings
  const [colName, setColName] = useState<string>('');
  const [colPhone, setColPhone] = useState<string>('');
  const [colEmail, setColEmail] = useState<string>('');
  const [colTags, setColTags] = useState<string>('');
  const [colNotes, setColNotes] = useState<string>('');
  const [colConsent, setColConsent] = useState<string>('');

  const [importResult, setImportResult] = useState<{
    importedCount: number;
    updatedCount: number;
    skippedCount: number;
    errors: string[];
  } | null>(null);

  if (!isOpen) return null;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    Papa.parse(selected, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const detectedHeaders = results.meta.fields || [];
        setHeaders(detectedHeaders);
        setRawRows(results.data as Record<string, string>[]);

        // Auto-detect columns intelligently
        for (const h of detectedHeaders) {
          const lower = h.toLowerCase().trim();
          if (['name', 'full_name', 'customer_name', 'customer'].includes(lower)) setColName(h);
          if (['phone', 'mobile', 'tel', 'phone_number', 'whatsapp'].includes(lower)) setColPhone(h);
          if (['email', 'email_address'].includes(lower)) setColEmail(h);
          if (['tags', 'tag', 'category'].includes(lower)) setColTags(h);
          if (['notes', 'note', 'comment', 'description'].includes(lower)) setColNotes(h);
          if (['consent', 'opt_in', 'marketing_consent', 'sms_consent'].includes(lower)) setColConsent(h);
        }

        setStep('map');
      },
      error: (err) => {
        alert('Could not parse CSV file: ' + err.message);
      },
    });
  }

  function handleLoadSampleData() {
    const sampleCsv = `Full Name,Phone Number,Email,Tags,Consent,Notes
Chinedu Okafor,+234 803 123 4567,chinedu@gmail.com,"VIP, Weekend",yes,Prefers Barber Dayo
Amina Bello,+234 802 999 1122,amina@yahoo.com,"Braids",yes,Agreed on WhatsApp
Babajide Adeleke,+234 805 987 6543,adeleke.b@yahoo.com,"Beard",yes,Buys beard cream
Folake Martins,+234 818 222 3344,folake@gmail.com,"Walk-in",no,Receipt only no promo
Ngozi Eze,+234 901 333 4455,ngozi@work.ng,"Student",unconfirmed,Cash customer`;

    Papa.parse(sampleCsv, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const detectedHeaders = results.meta.fields || [];
        setHeaders(detectedHeaders);
        setRawRows(results.data as Record<string, string>[]);
        setColName('Full Name');
        setColPhone('Phone Number');
        setColEmail('Email');
        setColTags('Tags');
        setColNotes('Notes');
        setColConsent('Consent');
        setStep('map');
      },
    });
  }

  function handleProcessImport() {
    const biz = getActiveBusiness();

    const mapped = rawRows.map((row) => ({
      name: row[colName] || '',
      phone: row[colPhone] || '',
      email: colEmail ? row[colEmail] : undefined,
      tags: colTags ? row[colTags] : undefined,
      notes: colNotes ? row[colNotes] : undefined,
      consent: colConsent ? row[colConsent] : 'unconfirmed',
    }));

    const result = importCustomersFromCsv(biz.id, mapped);
    setImportResult(result);
    setStep('result');
    onSuccess();
  }

  function downloadTemplate() {
    const csvContent =
      'data:text/csv;charset=utf-8,Full Name,Phone Number,Email,Tags,Consent,Notes\n' +
      'Tunde Balogun,+234 802 111 2233,tunde@gmail.com,"VIP, Regular",yes,Agreed via counter opt-in\n' +
      'Fatima Aliu,+234 803 444 5566,fatima@yahoo.com,"Wash & Set",no,Visit record only\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'customer_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Import Customer CSV</h3>
              <p className="text-xs text-slate-400">Works with existing Excel, Google Sheets, or contacts export</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: UPLOAD */}
        {step === 'upload' && (
          <div className="p-6 space-y-5 overflow-y-auto">
            <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-8 text-center transition bg-slate-50/50 hover:bg-emerald-50/20">
              <UploadCloud className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-800">
                Choose a CSV file from your device
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Upload your customer list from Excel, Google Sheets, or WhatsApp export. We’ll guide you through mapping columns.
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-file-input"
              />
              <label
                htmlFor="csv-file-input"
                className="mt-4 inline-block px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer shadow-sm transition"
              >
                Select CSV File
              </label>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-100 rounded-xl text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Want to test immediately?</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  Template
                </button>
                <button
                  type="button"
                  onClick={handleLoadSampleData}
                  className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Load Sample Data
                </button>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
              <strong>Consent Rule:</strong> Importing a phone number does NOT grant marketing consent unless the row has an explicit consent column marked &apos;yes&apos; or &apos;agreed&apos;. Otherwise, it is safely stored as &apos;unconfirmed&apos;.
            </div>
          </div>
        )}

        {/* STEP 2: MAP COLUMNS */}
        {step === 'map' && (
          <div className="p-5 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Map CSV Columns</p>
                <p className="text-xs text-slate-500">Found {rawRows.length} customer rows in file</p>
              </div>
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                Change file
              </button>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="grid grid-cols-2 gap-3 items-center">
                <label className="text-xs font-semibold text-slate-700">Customer Name *</label>
                <select
                  value={colName}
                  onChange={(e) => setColName(e.target.value)}
                  className="text-xs px-2.5 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">-- Select Column --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <label className="text-xs font-semibold text-slate-700">Phone Number *</label>
                <select
                  value={colPhone}
                  onChange={(e) => setColPhone(e.target.value)}
                  className="text-xs px-2.5 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">-- Select Column --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <label className="text-xs text-slate-600">Email (Optional)</label>
                <select
                  value={colEmail}
                  onChange={(e) => setColEmail(e.target.value)}
                  className="text-xs px-2.5 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">-- None / Skip --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <label className="text-xs text-slate-600">Tags / Category (Optional)</label>
                <select
                  value={colTags}
                  onChange={(e) => setColTags(e.target.value)}
                  className="text-xs px-2.5 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">-- None / Skip --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <label className="text-xs text-slate-600">Notes (Optional)</label>
                <select
                  value={colNotes}
                  onChange={(e) => setColNotes(e.target.value)}
                  className="text-xs px-2.5 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">-- None / Skip --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-xs font-semibold text-emerald-800">Consent Column</label>
                  <p className="text-[10px] text-slate-500">Maps &apos;yes&apos;/&apos;agreed&apos; to consented</p>
                </div>
                <select
                  value={colConsent}
                  onChange={(e) => setColConsent(e.target.value)}
                  className="text-xs px-2.5 py-2 rounded-lg border border-emerald-300 bg-white"
                >
                  <option value="">-- None (Keep unconfirmed) --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-600">
              <strong>Duplicate detection:</strong> If a phone number already exists in this business, the customer record will be updated without creating a duplicate.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!colName || !colPhone}
                onClick={handleProcessImport}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>Import {rawRows.length} Customers</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: RESULT */}
        {step === 'result' && importResult && (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h4 className="text-base font-bold text-slate-900">Import Complete!</h4>
              <p className="text-xs text-slate-500 mt-1">
                Your customer list has been updated safely.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <div>
                <p className="text-[11px] text-slate-500">New Customers</p>
                <p className="text-base font-bold text-emerald-600">{importResult.importedCount}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Updated / Merged</p>
                <p className="text-base font-bold text-blue-600">{importResult.updatedCount}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Skipped (Invalid)</p>
                <p className="text-base font-bold text-slate-500">{importResult.skippedCount}</p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="text-left text-xs bg-amber-50 p-3 rounded-lg text-amber-900 max-h-32 overflow-y-auto">
                <p className="font-semibold mb-1">Warnings / Skipped entries:</p>
                {importResult.errors.map((err, idx) => (
                  <p key={idx} className="text-[11px]">• {err}</p>
                ))}
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl"
            >
              Done & View Customer List
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
