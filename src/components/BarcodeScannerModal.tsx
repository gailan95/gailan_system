import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, RefreshCw, Zap, AlertCircle, Upload, Image as ImageIcon } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ isOpen, onClose, onScan }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setError(null);
      setManualCode('');
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setError(null);
    setIsScanning(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('کامێرا لەم براوزەرەدا پشتگیری ناکرێت یان پێویستی بە HTTPS هەیە.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Start Barcode Detector if available
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e']
        });

        const detectLoop = async () => {
          if (!streamRef.current || !videoRef.current) return;
          try {
            if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                const scannedValue = barcodes[0].rawValue;
                if (scannedValue) {
                  stopCamera();
                  onScan(scannedValue);
                  onClose();
                  return;
                }
              }
            }
          } catch (err) {
            // Detection error or frame error
          }
          if (streamRef.current) {
            requestAnimationFrame(detectLoop);
          }
        };

        requestAnimationFrame(detectLoop);
      }
    } catch (err: any) {
      setError(err?.message || 'دەستگەیشتن بە کامێرا سەرکەوتوو نەبوو. تکایە وێنەی بارکۆد باربکە یان بە دەست بنووسە.');
      setIsScanning(false);
      // Automatically focus on manual input field when camera fails
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;
      if (capabilities && capabilities.torch) {
        const newTorchState = !torchOn;
        await track.applyConstraints({ advanced: [{ torch: newTorchState }] } as any);
        setTorchOn(newTorchState);
      } else {
        alert('فلاش / چۆچ لەم ئامێرەدا بەردەست نییە.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      stopCamera();
      onScan(manualCode.trim());
      onClose();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.src = imageUrl;
    img.onload = async () => {
      try {
        if ('BarcodeDetector' in window) {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e']
          });
          const barcodes = await barcodeDetector.detect(img);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            stopCamera();
            onScan(barcodes[0].rawValue);
            onClose();
            return;
          }
        }
        // Fallback if BarcodeDetector didn't detect
        setManualCode(file.name.replace(/\.[^/.]+$/, ""));
        setError('وێنەکە بارکرا. تکایە بارکۆدەکە لە خانەی خوارەوە پشتڕاست بکەرەوە.');
        inputRef.current?.focus();
      } catch (err) {
        setManualCode(file.name.replace(/\.[^/.]+$/, ""));
        setError('نەتوانرا بارکۆد لە وێنەکەدا دەستنیشان بکرێت. تکایە بە دەست بنووسە.');
        inputRef.current?.focus();
      }
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" dir="rtl">
      <div className="bg-slate-900 border border-white/15 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-slate-950 px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-black text-sm">سکانی بارکۆد بە کامێرا یان وێنە</h3>
              <p className="text-slate-600 text-[11px]">کامێرا بگرە یان وێنەی بارکۆد هەڵبژێرە</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 text-slate-600 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body / Video Feed or Error Fallback */}
        <div className="relative bg-black aspect-[4/3] flex items-center justify-center overflow-hidden">
          {!error ? (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover"
              />

              {/* Scanner Overlay Box */}
              <div className="absolute inset-12 border-2 border-dashed border-cyan-400/80 rounded-2xl pointer-events-none flex items-center justify-center">
                <div className="w-full h-0.5 bg-red-500/80 absolute animate-pulse"></div>
              </div>

              {/* Torch Button */}
              {streamRef.current && (
                <button
                  onClick={toggleTorch}
                  className={`absolute top-4 left-4 p-2.5 rounded-xl backdrop-blur-md transition-colors cursor-pointer ${
                    torchOn ? 'bg-amber-500 text-slate-950' : 'bg-black/50 text-white hover:bg-black/70'
                  }`}
                  title="فلاش"
                >
                  <Zap className="w-5 h-5" />
                </button>
              )}
            </>
          ) : (
            <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-950/60 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-white font-black text-xs">کامێرا بەردەست نییە یان مۆڵەت نەدراوە</p>
                <p className="text-slate-600 text-[11px]">{error}</p>
              </div>
              <div className="pt-1 flex flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-lg"
                >
                  <Upload className="w-4 h-4" />
                  <span>بارکردنی وێنەی بارکۆد (گالەری)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />

        {/* Footer / Manual Input & Upload Button */}
        <div className="p-4 bg-slate-950/80 border-t border-white/10 space-y-3">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="یان بارکۆد لێرە بنووسە..."
              className="flex-1 bg-slate-900 border border-white/15 px-3.5 py-2.5 rounded-xl text-xs text-white placeholder:text-slate-900 focus:outline-none focus:border-cyan-500 font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              دیاریبکە
            </button>
          </form>

          <div className="flex items-center justify-between text-[11px] text-slate-600">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 font-bold cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>هەڵبژاردنی وێنەی بارکۆد لە گالەری</span>
            </button>
            <button
              type="button"
              onClick={startCamera}
              className="text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              نوێکردنەوەی کامێرا
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
