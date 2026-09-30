import React, { useState, useRef } from 'react';
import { X, Upload, Archive, Link as LinkIcon, Check, AlertCircle, FileImage, Plus } from 'lucide-react';
import { extractZipAssets } from '../../utils/customAssetsManager.js';

export default function ZipImportModal({
  isOpen,
  onClose,
  onImportAssets
}) {
  const [zipUrl, setZipUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [extractedFiles, setExtractedFiles] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Process local ZIP file
  const handleFileUpload = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setIsLoading(true);
    try {
      if (file.name.toLowerCase().endsWith('.zip')) {
        const extracted = await extractZipAssets(file);
        if (extracted.length === 0) {
          setErrorMsg('No compatible images (PNG, JPG, WEBP) found in the ZIP archive.');
        } else {
          setExtractedFiles(extracted);
          setSelectedIndices(new Set(extracted.map((_, i) => i)));
        }
      } else if (file.type.startsWith('image/')) {
        // Single image upload
        const reader = new FileReader();
        reader.onload = (evt) => {
          const item = {
            name: file.name.replace(/\.[^/.]+$/, ''),
            dataUrl: evt.target.result,
            size: file.size,
            type: file.type
          };
          setExtractedFiles([item]);
          setSelectedIndices(new Set([0]));
          setIsLoading(false);
        };
        reader.readAsDataURL(file);
        return;
      } else {
        setErrorMsg('Please select a .zip archive or an image file.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to extract assets from file.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch from direct URL (ZIP or Image)
  const handleFetchUrl = async () => {
    if (!zipUrl.trim()) return;

    setErrorMsg('');
    setIsLoading(true);
    try {
      const response = await fetch(zipUrl);
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }
      const contentType = response.headers.get('content-type') || '';
      
      if (zipUrl.toLowerCase().endsWith('.zip') || contentType.includes('zip')) {
        const blob = await response.blob();
        const extracted = await extractZipAssets(blob);
        if (extracted.length === 0) {
          setErrorMsg('No compatible images found in this ZIP URL.');
        } else {
          setExtractedFiles(extracted);
          setSelectedIndices(new Set(extracted.map((_, i) => i)));
        }
      } else {
        // Direct image URL
        const cleanName = zipUrl.split('/').pop()?.split('?')[0]?.replace(/\.[^/.]+$/, '') || 'Custom Asset';
        const item = {
          name: cleanName,
          dataUrl: zipUrl,
          size: 0,
          type: 'image/url'
        };
        setExtractedFiles([item]);
        setSelectedIndices(new Set([0]));
      }
    } catch (err) {
      setErrorMsg(`Could not fetch from URL: ${err.message}. If CORS blocks it, please upload the file directly.`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelect = (idx) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleConfirmImport = () => {
    const selected = extractedFiles.filter((_, idx) => selectedIndices.has(idx));
    if (selected.length === 0) {
      setErrorMsg('Please select at least one asset to import.');
      return;
    }

    // Convert into Blueprint objects
    const blueprints = selected.map(item => ({
      id: `bp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: item.name.charAt(0).toUpperCase() + item.name.slice(1),
      tag: 'Imported',
      role: 'decor', // Default role for imported visuals
      imageUrl: item.dataUrl,
      layer: 'background',
      isAnimated: false,
      frameCount: 1,
      fps: 8,
      loopMode: 'loop',
      width: 64,
      height: 64,
      createdAt: Date.now()
    }));

    onImportAssets(blueprints);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-neutral-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Import Level Assets (ZIP or Direct URL)
              </h2>
              <p className="text-xs text-neutral-400">
                Upload a .zip package or provide a direct asset URL to batch-import textures
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Direct URL input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              Asset or ZIP URL
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <LinkIcon className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={zipUrl}
                  onChange={(e) => setZipUrl(e.target.value)}
                  placeholder="https://... direct .zip archive or image URL"
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-neutral-950 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <button
                type="button"
                onClick={handleFetchUrl}
                disabled={isLoading || !zipUrl.trim()}
                className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 rounded-lg transition cursor-pointer"
              >
                {isLoading ? 'Loading...' : 'Fetch'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center text-xs text-neutral-500 uppercase tracking-widest font-semibold">
            — OR —
          </div>

          {/* Drag and drop upload box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-neutral-700 hover:border-amber-500/80 bg-neutral-950/40 hover:bg-neutral-950 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2.5"
          >
            <Upload className="w-8 h-8 text-neutral-400" />
            <div>
              <p className="text-sm font-bold text-white">Click to Upload .ZIP Archive or Image</p>
              <p className="text-xs text-neutral-400">Supports .zip with PNG, JPG, WEBP, or individual image files</p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".zip,image/png,image/jpeg,image/webp"
              className="hidden"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Extracted files list */}
          {extractedFiles.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">
                  Extracted Assets ({extractedFiles.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedIndices.size === extractedFiles.length) setSelectedIndices(new Set());
                    else setSelectedIndices(new Set(extractedFiles.map((_, i) => i)));
                  }}
                  className="text-xs text-amber-400 hover:text-amber-300 cursor-pointer"
                >
                  {selectedIndices.size === extractedFiles.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-56 overflow-y-auto p-1">
                {extractedFiles.map((item, idx) => {
                  const isSelected = selectedIndices.has(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleSelect(idx)}
                      className={`p-2 rounded-xl border flex flex-col items-center text-center gap-2 cursor-pointer transition relative group ${
                        isSelected
                          ? 'bg-neutral-800 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                          : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="w-14 h-14 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center overflow-hidden">
                        <img
                          src={item.dataUrl}
                          alt={item.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="text-[11px] font-medium text-white truncate w-full px-1">
                        {item.name}
                      </span>
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-4 h-4 bg-amber-500 text-neutral-950 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-950/60">
          <span className="text-xs text-neutral-400">
            {extractedFiles.length > 0
              ? `${selectedIndices.size} of ${extractedFiles.length} assets selected`
              : 'Select a zip file or image to start'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={extractedFiles.length === 0 || selectedIndices.size === 0}
              className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Import to Blueprints</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
