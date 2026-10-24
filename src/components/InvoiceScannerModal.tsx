import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  QrCode,
  Zap,
  AlertCircle,
  Upload,
  Search,
  CheckCircle2,
  Receipt,
  RotateCcw,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Sale } from '../types';
import { useDatabase } from '../context/DatabaseContext';
import { formatCurrency, formatNumber, formatDateOnly } from '../utils/formatters';
import {
  parseScannedInvoiceData,
  playScanSuccessSound,
  scanQRCodeFromImageElement,
} from '../utils/qrUtils';
import jsQR from 'jsqr';

interface InvoiceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectInvoice: (sale: Sale) => void;
}

export const InvoiceScannerModal: React.FC<InvoiceScannerModalProps> = ({
  isOpen,
  onClose,
  onSelectInvoice,
}) => {
  const { sales, settings } = useDatabase();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const animFrameIdRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastScannedValue, setLastScannedValue] = useState<string | null>(null);
  const [notFoundAlert, setNotFoundAlert] = useState<string | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    if (isOpen) {
      setNotFoundAlert(null);
      setSearchQuery('');
      setLastScannedValue(null);
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const stopCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setTorchOn(false);
  };

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('کامێرا لەم ئامێرە یان براوزەرەدا پشتگیری ناکرێت.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (!isMountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
      startDetectionLoop();
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setCameraError(
        err?.message || 'دەستگەیشتن بە کامێرا سەرکەوتوو نەبوو. دەتوانیت وێنە باربکەیت یان بە دەست بنووسیت.'
      );
      setIsCameraActive(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = (track.getCapabilities && track.getCapabilities()) as any;
      if (capabilities && capabilities.torch) {
        const nextState = !torchOn;
        await track.applyConstraints({ advanced: [{ torch: nextState }] } as any);
        setTorchOn(nextState);
      } else {
        alert('فلاش لەم کامێرایەدا بەردەست نییە.');
      }
    } catch {
      alert('نەتوانرا فلاش چالاک بکرێت.');
    }
  };

  const handleScannedRawText = (rawText: string) => {
    if (!rawText || !rawText.trim()) return;
    const trimmed = rawText.trim();
    setLastScannedValue(trimmed);

    const parsed = parseScannedInvoiceData(trimmed);
    const targetId = parsed.saleId?.trim().toLowerCase();
    const targetInvNum = parsed.invoiceNumber?.trim().toLowerCase();

    // Look for matching sale in database
    const matchedSale = sales.find((s) => {
      const sId = (s.id || '').toLowerCase();
      const sInv = (s.invoiceNumber || '').toLowerCase();
      const sCleanInv = sInv.replace(/[^a-z0-9]/gi, '');
      const targetClean = (parsed.raw || '').toLowerCase().replace(/[^a-z0-9]/gi, '');

      if (targetId && sId === targetId) return true;
      if (targetInvNum && sInv === targetInvNum) return true;
      if (targetClean && (sCleanInv === targetClean || sId.includes(targetClean))) return true;
      if (sInv && trimmed.toLowerCase().includes(sInv)) return true;
      return false;
    });

    if (matchedSale) {
      playScanSuccessSound();
      stopCamera();
      onSelectInvoice(matchedSale);
      onClose();
    } else {
      setNotFoundAlert(
        `پسووڵەکە لە داتابەیسدا نەدۆزرایەوە (کۆد: ${trimmed.slice(0, 30)}). تکایە دڵنیابەرەوە کە پسووڵەکە نەسڕاوەتەوە.`
      );
    }
  };

  // Continuous frame detection loop
  const startDetectionLoop = () => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    const hasBarcodeDetector = 'BarcodeDetector' in window;
    let barcodeDetector: any = null;
    if (hasBarcodeDetector) {
      try {
        barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'code_128', 'ean_13', 'ean_8'],
        });
      } catch {
        barcodeDetector = null;
      }
    }

    let lastJsQRTime = 0;

    const detect = async (now: number) => {
      if (!isMountedRef.current || !streamRef.current || !videoRef.current) return;

      const video = videoRef.current;
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        // 1. Try BarcodeDetector first (faster native)
        if (barcodeDetector) {
          try {
            const detected = await barcodeDetector.detect(video);
            if (detected && detected.length > 0 && detected[0].rawValue) {
              handleScannedRawText(detected[0].rawValue);
              return;
            }
          } catch {}
        }

        // 2. Fallback to jsQR canvas processing every 200ms
        if (now - lastJsQRTime > 200) {
          lastJsQRTime = now;
          try {
            const canvas = canvasRef.current!;
            const width = Math.min(640, video.videoWidth);
            const height = Math.round((width / video.videoWidth) * video.videoHeight);
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, width, height);
              const imgData = ctx.getImageData(0, 0, width, height);
              const code = jsQR(imgData.data, imgData.width, imgData.height, {
                inversionAttempts: 'attemptBoth',
              });
              if (code && code.data) {
                handleScannedRawText(code.data);
                return;
              }
            }
          } catch {}
        }
      }

      animFrameIdRef.current = requestAnimationFrame(detect);
    };

    animFrameIdRef.current = requestAnimationFrame(detect);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.src = url;
      img.onload = async () => {
        // Try native BarcodeDetector
        if ('BarcodeDetector' in window) {
          try {
            const detector = new (window as any).BarcodeDetector({
              formats: ['qr_code', 'code_128', 'ean_13'],
            });
            const codes = await detector.detect(img);
            if (codes && codes.length > 0 && codes[0].rawValue) {
              URL.revokeObjectURL(url);
              handleScannedRawText(codes[0].rawValue);
              return;
            }
          } catch {}
        }

        // Fallback to jsQR
        const decoded = await scanQRCodeFromImageElement(img);
        URL.revokeObjectURL(url);
        if (decoded) {
          handleScannedRawText(decoded);
        } else {
          setNotFoundAlert('هیچ QR کۆدێک لەم وێنەیەدا نەدۆزرایەوە. تکایە وێنەیەکی ڕوونتر هەڵبژێرە.');
        }
      };
    } catch {
      setNotFoundAlert('هەڵەیەک ڕوویدا لە خوێندنەوەی وێنەکە.');
    }
  };

  const handleManualSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    handleScannedRawText(searchQuery.trim());
  };

  // Recent 5 sales for fast 1-click access
  const recentSales = sales.slice(0, 5);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[220] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-950 px-4 sm:px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-black text-sm sm:text-base flex items-center gap-1.5">
                <span>سکانکردنی QR کۆدی پسووڵە</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
                  LIVE
                </span>
              </h3>
              <p className="text-slate-400 text-[11px]">
                کامێرا بگرە لەسەر QR کۆدی پسووڵەکە بۆ بینینی ڕاستەوخۆ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 overflow-y-auto space-y-3.5">
          {/* Camera Viewfinder */}
          <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-[4/3] flex items-center justify-center border border-slate-800 shadow-inner">
            {!cameraError && isCameraActive ? (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="w-full h-full object-cover"
                />

                {/* Target QR Frame Overlay */}
                <div className="absolute inset-10 border-2 border-emerald-400/90 rounded-2xl pointer-events-none flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  {/* Scanning beam */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent absolute animate-pulse"></div>
                  {/* Corner accents */}
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg"></div>
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg"></div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br-lg"></div>
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg"></div>
                </div>

                {/* Controls overlay */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`p-2 rounded-xl backdrop-blur-md transition-all cursor-pointer ${
                      torchOn
                        ? 'bg-amber-400 text-slate-950 font-bold shadow-md'
                        : 'bg-slate-900/70 text-white hover:bg-slate-900/90'
                    }`}
                    title="فلاش"
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="p-2 rounded-xl bg-slate-900/70 text-white hover:bg-slate-900/90 backdrop-blur-md transition-all cursor-pointer"
                    title="گۆڕینی کامێرا"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                <div className="absolute bottom-2 inset-x-0 text-center pointer-events-none">
                  <span className="bg-slate-900/80 backdrop-blur-xs text-emerald-300 font-bold px-3 py-1 rounded-full text-[10px] border border-emerald-500/30">
                    QR کۆدی پسووڵەکە بهێنە ناو ئەم چوارچێوەیە
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 w-full">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-white font-bold text-xs sm:text-sm">
                    {cameraError || 'کامێرا ناچالاکە'}
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    دەتوانیت وێنەی پسووڵەکە باربکەیت یان ژمارەی پسووڵەکە بە دەست بنووسیت
                  </p>
                </div>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>دووبارە تاقیکردنەوەی کامێرا</span>
                </button>
              </div>
            )}
          </div>

          {/* Alert Message */}
          {notFoundAlert && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-start gap-2.5 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1">
                <p className="font-bold">{notFoundAlert}</p>
              </div>
              <button
                type="button"
                onClick={() => setNotFoundAlert(null)}
                className="text-rose-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Image Upload Button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-4 bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:border-emerald-500/40"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>بارکردنی وێنەی پسووڵە / وێنەی QR کۆد لە گالەری</span>
            </button>
          </div>

          {/* Manual Input Form */}
          <form onSubmit={handleManualSearchSubmit} className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 block">
              یان ژمارەی پسووڵە بنووسە:
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="نموونە: GJA-1 یان 1001"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-white text-xs placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shrink-0"
              >
                گەڕان
              </button>
            </div>
          </form>

          {/* Quick Selection: Recent Invoices */}
          {recentSales.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-slate-800">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>دواین پسووڵە تۆمارکراوەکان:</span>
                </span>
                <span className="text-[10px] text-slate-500">{sales.length} پسووڵە لە سیستەم</span>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {recentSales.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      playScanSuccessSound();
                      stopCamera();
                      onSelectInvoice(s);
                      onClose();
                    }}
                    className="w-full p-2 bg-slate-950/70 hover:bg-slate-800 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-right transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1 rounded bg-slate-800 group-hover:bg-emerald-500/20 text-slate-400 group-hover:text-emerald-400">
                        <Receipt className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-white block truncate">
                          {s.customerName || 'کڕیاری گشتی'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono" dir="ltr">
                          #{s.invoiceNumber} • {formatDateOnly(s.date)}
                        </span>
                      </div>
                    </div>
                    <div className="text-left font-mono font-bold text-emerald-400 shrink-0 text-xs" dir="ltr">
                      {formatCurrency(s.total, settings.currency, settings.usdToIqdRate)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
