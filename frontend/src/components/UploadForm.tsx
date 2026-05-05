import React, { useState } from 'react';
import { uploadTender, uploadBidder } from '../utils/api';
import { Upload, FileText, FolderPlus, Loader2 } from 'lucide-react';

export const UploadForm = ({ onTenderUpload }: { onTenderUpload: (id: number) => void }) => {
  const [tenderFile, setTenderFile] = useState<File | null>(null);
  const [vendorName, setVendorName] = useState('');
  const [folderPath, setFolderPath] = useState('');
  const [tenderId, setTenderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTenderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenderFile) return;
    setLoading(true);
    try {
      const res = await uploadTender(tenderFile);
      setTenderId(res.id);
      onTenderUpload(res.id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBidderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenderId || !vendorName || !folderPath) return;
    setLoading(true);
    try {
      await uploadBidder(tenderId, vendorName, folderPath);
      setVendorName('');
      setFolderPath('');
      alert("Bidder submitted successfully!");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
      {/* Tender Upload */}
      <div className="p-6 bg-gray-800 rounded-2xl border border-gray-700 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="text-blue-400" size={24} />
          <h2 className="text-xl font-semibold">1. Upload Tender</h2>
        </div>
        <form onSubmit={handleTenderSubmit} className="space-y-4">
          <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
            <input 
              type="file" 
              onChange={(e) => setTenderFile(e.target.files?.[0] || null)}
              className="hidden" 
              id="tender-input"
            />
            <label htmlFor="tender-input" className="cursor-pointer">
              <Upload className="mx-auto mb-3 text-gray-400" size={32} />
              <p className="text-sm text-gray-400">
                {tenderFile ? tenderFile.name : "Select PDF/DOCX Tender Document"}
              </p>
            </label>
          </div>
          <button 
            disabled={loading || !tenderFile}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="animate-spin" size={18} />}
            Process Tender
          </button>
        </form>
      </div>

      {/* Bidder Upload */}
      <div className={`p-6 bg-gray-800 rounded-2xl border border-gray-700 shadow-xl transition-opacity ${!tenderId ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex items-center gap-3 mb-6">
          <FolderPlus className="text-emerald-400" size={24} />
          <h2 className="text-xl font-semibold">2. Register Bidders</h2>
        </div>
        <form onSubmit={handleBidderSubmit} className="space-y-4">
          <input 
            type="text" 
            placeholder="Vendor Name"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-400"
          />
          <input 
            type="text" 
            placeholder="Folder Path (Local/S3)"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-400"
          />
          <button 
            disabled={loading || !vendorName || !folderPath}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="animate-spin" size={18} />}
            Add Bidder to Queue
          </button>
        </form>
      </div>
    </div>
  );
};
