import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Download, UploadCloud, Copy, RefreshCw, Info, Image as ImageIcon, CheckCircle } from 'lucide-react';

type ImageFormat = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif' | 'image/gif' | 'image/bmp';

export default function App() {
  const [inputMode, setInputMode] = useState<'url' | 'upload'>('url');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [url, setUrl] = useState('https://iptvreseller24.com/wp-content/uploads/2025/07/lion.webp');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [quality, setQuality] = useState(0.8);
  const [format, setFormat] = useState<ImageFormat>('image/webp');
  
  const [originalImage, setOriginalImage] = useState<{ src: string, sizeBytes: number } | null>(null);
  const [optimizedImage, setOptimizedImage] = useState<{ base64: string, blobUrl: string, sizeBytes: number } | null>(null);
  
  const [copiedBase64, setCopiedBase64] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Auto-fill filename
      if (!fileName) {
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        setFileName(nameWithoutExt);
      }
    }
  };

  const fetchAndCompress = async () => {
    if (inputMode === 'url' && !url.trim()) return;
    if (inputMode === 'upload' && !selectedFile) return;
    
    setLoading(true);
    setError(null);
    setOptimizedImage(null);
    
    try {
      let objectUrl = '';
      let originalBytes = 0;

      if (inputMode === 'url') {
        // Step 1: Proxy fetch to avoid canvas CORS tainting
        const proxyUrl = `/api/fetch-image?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        originalBytes = blob.size;
        objectUrl = URL.createObjectURL(blob);
      } else {
        if (!selectedFile) throw new Error('No file selected.');
        objectUrl = URL.createObjectURL(selectedFile);
        originalBytes = selectedFile.size;
      }
      
      setOriginalImage({ src: objectUrl, sizeBytes: originalBytes });
      
      // Step 2: Draw to canvas and compress
      const img = new window.Image();
      img.crossOrigin = 'anonymous'; // Ensure no taint even though proxy handles it
      
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) {
          setError('Canvas not found');
          setLoading(false);
          return;
        }
        
        // Draw real scale
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        // Output formats
        const base64Data = canvas.toDataURL(format, quality);
        
        // Calculate approx Base64 size or extract via base64 length
        // Base64 size formula: length * (3/4) - padding
        const base64Length = base64Data.length - (base64Data.indexOf(',') + 1);
        const padding = (base64Data.match(/=/g) || []).length;
        const compressedSize = Math.max(0, Math.floor((base64Length * 3) / 4 - padding));

        setOptimizedImage({
          base64: base64Data,
          blobUrl: base64Data, // Displaying base64 directly as src works smoothly 
          sizeBytes: compressedSize
        });
        
        setLoading(false);
      };
      
      img.onerror = () => {
        setError('Failed to load image to canvas. The URL might be broken or strictly blocking requests.');
        setLoading(false);
      };
      
      img.src = objectUrl;
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred while processing the image.');
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const copyToClipboard = async (text: string, isCode: boolean = false) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isCode) {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedBase64(true);
        setTimeout(() => setCopiedBase64(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const downloadOriginal = () => {
    if (!originalImage) return;
    const a = document.createElement('a');
    a.href = originalImage.src;
    const name = fileName.trim() || 'original_image';
    a.download = `${name}_original`;
    a.click();
  };

  const downloadCompressed = () => {
    if (!optimizedImage) return;
    const a = document.createElement('a');
    a.href = optimizedImage.base64;
    const ext = format.split('/')[1];
    const name = fileName.trim() || 'optimized_image';
    a.download = `${name}.${ext}`;
    a.click();
  };

  useEffect(() => {
    // Optionally trigger on mount for the default URL if desired
  }, []);

  const reactCodeSnippet = `
// Using optimized Base64 image in your React/Next.js App
import React from 'react';

// Recommended: Store large base64 strings in a separate file (e.g. data/images.ts)
const myOptimizedImage = "${optimizedImage?.base64.substring(0, 50)}...";

export function MyComponent() {
  return (
    <div className="p-4">
      <img src={myOptimizedImage} alt="Optimized Asset" className="w-full max-w-sm rounded" />
    </div>
  );
}
`.trim();

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans p-6 md:p-12">
      <div className="w-full max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <header className="space-y-4 text-center md:text-left">
          <div className="inline-flex items-center space-x-3 bg-neutral-900 text-white px-4 py-2 rounded-full font-medium text-sm">
            <UploadCloud size={18} />
            <span>OptiImage Converter</span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">
            Image Edge Optimizer
          </h1>
          <p className="text-neutral-500 max-w-2xl text-lg">
            Convert robust public URLs directly into highly compressed Base64 strings or Blob URLs designed perfectly for React and Next.js frontend embedding.
          </p>
        </header>

        {/* Notice Card for Google Drive */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-start space-x-4">
          <div className="bg-blue-100 text-blue-600 rounded-full p-2 mt-1">
            <Info size={20} />
          </div>
          <div className="space-y-1 text-sm text-blue-900">
            <h4 className="font-semibold text-base">Wait! A Note on Google Drive</h4>
            <p className="leading-relaxed">
              Google Drive is <strong>not designed for hosting production images on websites</strong>. Its image URLs are tightly restricted to thwart hotlinking—causing random broken images, slow load times, and rate limitations for your end-users. 
              Instead, you should: 
            </p>
            <ul className="list-disc pl-5 opacity-90 py-1 space-y-1">
              <li>Use the tool below to compress the image, then include it directly in your web app code (for small images).</li>
              <li>Or download the optimized version and upload it to a real CDN (like Vercel Blob, Firebase Storage, AWS S3, or Cloudinary) designed for speed and reliability.</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Controls Panel (Left) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm">
              <h2 className="text-xl font-medium mb-6 flex items-center">
                <RefreshCw size={20} className="mr-2 text-neutral-400" />
                Configure Optimization
              </h2>
              
              <div className="space-y-5">
                {/* Input Mode Toggle */}
                <div className="flex p-1 bg-neutral-100 rounded-xl">
                  <button
                    onClick={() => setInputMode('url')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${inputMode === 'url' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
                  >
                    Image URL
                  </button>
                  <button
                    onClick={() => setInputMode('upload')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${inputMode === 'upload' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
                  >
                    Upload File
                  </button>
                </div>

                {/* Input Area */}
                {inputMode === 'url' ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 block">Image Source URL</label>
                    <input 
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com/image.png"
                      className="w-full border border-neutral-300 bg-neutral-50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black focus:border-black transition-all font-mono text-sm"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 block">Upload Local Image</label>
                    <div 
                      className="border-2 border-dashed border-neutral-300 bg-neutral-50 rounded-xl p-6 text-center cursor-pointer hover:bg-neutral-100 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <UploadCloud className="mx-auto text-neutral-400 mb-2" size={24} />
                      <p className="text-sm text-neutral-600 font-medium">
                        {selectedFile ? selectedFile.name : 'Click to browse or drag file here'}
                      </p>
                      <p className="text-xs text-neutral-400 mt-1">Supports PNG, JPG, WebP, AVIF, GIF, BMP</p>
                      <input 
                        type="file"
                        accept="image/png, image/jpeg, image/webp, image/avif, image/gif, image/bmp"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                      />
                    </div>
                  </div>
                )}

                {/* File Name Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 block">Export File Name (Optional)</label>
                  <input 
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="e.g., hero-background"
                    className="w-full border border-neutral-300 bg-neutral-50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black focus:border-black transition-all font-mono text-sm"
                  />
                </div>

            {/* Settings Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 block text-nowrap">Output Format</label>
                    <div className="relative">
                      <select 
                        value={format}
                        onChange={(e) => setFormat(e.target.value as ImageFormat)}
                        className="w-full border border-neutral-300 bg-neutral-50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black focus:border-black transition-all appearance-none cursor-pointer text-sm font-medium text-neutral-800"
                      >
                        <option value="image/webp">WebP (Best for Web)</option>
                        <option value="image/jpeg">JPEG (Widely Supported)</option>
                        <option value="image/png">PNG (Lossless / Transparent)</option>
                        <option value="image/avif">AVIF (Next-Gen Compression)</option>
                        <option value="image/gif">GIF (Static Frame)</option>
                        <option value="image/bmp">BMP (Uncompressed)</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-neutral-700 flex justify-between items-center">
                      <span>Compression Quality</span>
                      <span className="text-neutral-600 bg-neutral-100 px-2.5 py-0.5 rounded-lg text-xs font-semibold">{Math.round(quality * 100)}%</span>
                    </label>
                    
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setQuality(0.9)}
                        className={`flex-1 text-xs py-1.5 rounded-lg border font-medium transition-all ${quality === 0.9 ? 'bg-black text-white border-black shadow-sm' : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50'}`}
                      >High</button>
                      <button
                        type="button"
                        onClick={() => setQuality(0.75)}
                         className={`flex-1 text-xs py-1.5 rounded-lg border font-medium transition-all ${quality === 0.75 ? 'bg-black text-white border-black shadow-sm' : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50'}`}
                      >Balanced</button>
                      <button
                        type="button"
                        onClick={() => setQuality(0.5)}
                         className={`flex-1 text-xs py-1.5 rounded-lg border font-medium transition-all ${quality === 0.5 ? 'bg-black text-white border-black shadow-sm' : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50'}`}
                      >Max</button>
                    </div>

                    <div className="pt-2">
                      <input 
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.01"
                        value={quality}
                        onChange={(e) => setQuality(parseFloat(e.target.value))}
                        disabled={['image/png', 'image/gif', 'image/bmp'].includes(format)}
                        className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer outline-none ${['image/png', 'image/gif', 'image/bmp'].includes(format) ? 'bg-neutral-200 accent-neutral-400 opacity-50' : 'bg-neutral-200 accent-black hover:accent-neutral-800'}`}
                      />
                    </div>
                    {['image/png', 'image/gif', 'image/bmp'].includes(format) && <p className="text-[10px] text-amber-600 leading-tight block -mt-1">This format is lossless or ignores quality settings.</p>}
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
                    {error}
                  </div>
                )}

                <button 
                  onClick={fetchAndCompress}
                  disabled={loading || (inputMode === 'url' ? !url.trim() : !selectedFile)}
                  className="w-full bg-black text-white rounded-xl py-3 font-medium hover:bg-neutral-800 transition-colors disabled:bg-neutral-300 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <span className="flex items-center space-x-2">
                      <RefreshCw className="animate-spin" size={18} />
                      <span>Processing...</span>
                    </span>
                  ) : (
                    <span>Optimize Asset</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Results Panel (Right) */}
          <div className="lg:col-span-7 space-y-6">
             {/* Hidden Canvas for Processing */}
            <canvas ref={canvasRef} className="hidden" />

            {!optimizedImage ? (
              <div className="h-full min-h-[400px] border-2 border-dashed border-neutral-200 rounded-3xl flex flex-col items-center justify-center text-neutral-400 bg-white shadow-sm p-12 text-center">
                <ImageIcon size={48} className="mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-neutral-700 mb-1">Awaiting Image</h3>
                <p className="text-sm">Enter a URL and hit process to see the optimized Base64 magic.</p>
              </div>
            ) : (
               <div className="space-y-6">
                
                {/* Visual Comparative Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Original Card */}
                  <div className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-sm flex flex-col items-center group">
                    <div className="flex justify-between w-full mb-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      <span>Original</span>
                      <span>{originalImage && formatBytes(originalImage.sizeBytes)}</span>
                    </div>
                    <div className="bg-neutral-100 w-full h-48 md:h-64 rounded-xl flex items-center justify-center overflow-hidden relative">
                      {originalImage && (
                        <img src={originalImage.src} alt="Original" className="max-w-full max-h-full object-contain" />
                      )}
                      <button onClick={downloadOriginal} className="absolute bottom-4 right-4 bg-white/90 backdrop-blur text-black p-2 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:scale-105 active:scale-95">
                         <Download size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Compressed Card */}
                  <div className="bg-white p-4 rounded-3xl border border-emerald-200 bg-emerald-50/10 shadow-sm flex flex-col items-center relative group">
                    <div className="absolute -top-3 -right-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md z-10 flex items-center">
                       {originalImage && <span className="mr-1">↓ {Math.round((1 - optimizedImage.sizeBytes / originalImage.sizeBytes) * 100)}%</span>}
                    </div>
                    <div className="flex justify-between w-full mb-3 text-xs font-bold text-emerald-600 uppercase tracking-wider">
                      <span>Optimized</span>
                      <span>{formatBytes(optimizedImage.sizeBytes)}</span>
                    </div>
                    <div className="bg-emerald-50/50 w-full h-48 md:h-64 rounded-xl flex items-center justify-center overflow-hidden relative border border-emerald-100/50">
                      <img src={optimizedImage.base64} alt="Optimized" className="max-w-full max-h-full object-contain" />
                      <button onClick={downloadCompressed} className="absolute bottom-4 right-4 bg-emerald-500 text-white p-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-emerald-600 hover:scale-105 active:scale-95">
                         <Download size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Developer Exports */}
                <div className="bg-neutral-900 rounded-3xl overflow-hidden shadow-lg border border-neutral-800">
                  <div className="flex bg-neutral-950 border-b border-neutral-800">
                    <div className="px-6 py-3 border-b-2 border-emerald-500 text-emerald-400 font-medium text-sm flex items-center tracking-wide">
                      Export Center
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-6">
                    {/* Base64 Information Note */}
                    <div className="bg-emerald-950/40 border border-emerald-900/50 p-4 rounded-xl flex items-start space-x-3 mb-4">
                      <div className="bg-emerald-900/50 text-emerald-400 rounded-full p-1.5 mt-0.5 shrink-0">
                        <Info size={16} />
                      </div>
                      <div className="text-sm text-emerald-100/90 leading-relaxed">
                        <strong className="text-emerald-400 block mb-1">Permanent Data (No storage needed)</strong>
                        Yes, this Base64 string will <strong className="text-white">always be the same</strong>. It contains the literal image data itself. If you embed this directly into your React app, the image will always show, even if the original URL is deleted. You do not need to upload it to Google Drive or any other storage service anymore!
                      </div>
                    </div>

                    {/* Base64 Copy */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                         <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Raw Base64 String</label>
                         <button 
                            onClick={() => copyToClipboard(optimizedImage.base64)}
                            className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium py-1.5 px-3 rounded-lg flex items-center transition-colors border border-neutral-700"
                         >
                            {copiedBase64 ? <CheckCircle size={14} className="mr-1.5 text-emerald-400" /> : <Copy size={14} className="mr-1.5" />}
                            {copiedBase64 ? 'Copied' : 'Copy Data'}
                         </button>
                      </div>
                      <div className="bg-black border border-neutral-800 p-4 rounded-xl overflow-hidden relative group">
                        <p className="font-mono text-xs text-neutral-500 break-all line-clamp-3">
                          {optimizedImage.base64}
                        </p>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black pointer-events-none" />
                      </div>
                    </div>

                    {/* Code Snippet */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">React Implementation</label>
                        <button 
                            onClick={() => copyToClipboard(reactCodeSnippet, true)}
                            className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium py-1.5 px-3 rounded-lg flex items-center transition-colors border border-neutral-700"
                         >
                            {copiedCode ? <CheckCircle size={14} className="mr-1.5 text-emerald-400" /> : <Copy size={14} className="mr-1.5" />}
                            {copiedCode ? 'Copied Code' : 'Copy JSX'}
                         </button>
                      </div>
                      <div className="bg-black border border-neutral-800 p-4 rounded-xl overflow-x-auto">
                        <pre className="font-mono text-xs text-emerald-400 leading-relaxed md:whitespace-pre-wrap">
                          {reactCodeSnippet}
                        </pre>
                      </div>
                    </div>

                  </div>
                </div>

               </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
