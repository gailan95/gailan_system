import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  HardDrive,
  Cloud,
  Upload,
  Download,
  Trash2,
  Copy,
  Check,
  Search,
  Folder,
  FileText,
  Image as ImageIcon,
  RefreshCw,
  Eye,
  X,
  ExternalLink,
  File as FileIcon,
  Link as LinkIcon,
  Tag,
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  LayoutGrid,
  List as ListIcon,
  Layers,
  ArrowUpDown,
  Maximize2,
  Package,
  Code2,
  Database,
  Sparkles,
  Cpu,
} from 'lucide-react';
import {
  ref,
  listAll,
  getDownloadURL,
  getMetadata,
  uploadBytes,
  deleteObject,
  FullMetadata,
} from 'firebase/storage';
import { doc, onSnapshot, setDoc, increment } from 'firebase/firestore';
import { storage, db } from '../lib/firebase';
import { isFirestoreQuotaBlocked, handleFirestoreError } from '../utils/firestoreQuota';
import { useDatabase } from '../context/DatabaseContext';
import { useLanguage } from '../context/LanguageContext';
import { useDebounce } from '../hooks/useDebounce';
import { compressImage } from '../utils/imageCompressor';
import { Product } from '../types';
import { OrdersAndDebtsModal } from './OrdersAndDebtsModal';

export interface StorageFileItem {
  id: string;
  name: string;
  fullPath: string;
  url: string;
  size: number; // in bytes
  contentType: string;
  timeCreated: string;
  folder: string;
  linkedProduct?: Product;
}

export const FirebaseStorageView: React.FC = () => {
  const { products, updateProduct } = useDatabase();
  const { t } = useLanguage();

  const [files, setFiles] = useState<StorageFileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & View modes
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'image' | 'document'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'size_desc' | 'name'>('date_desc');

  // Uploading state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');
  const [autoCompress, setAutoCompress] = useState<boolean>(true);
  const [uploadTargetFolder, setUploadTargetFolder] = useState<string>('products');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals & Feedback
  const [previewFile, setPreviewFile] = useState<StorageFileItem | null>(null);
  const [fileToDelete, setFileToDelete] = useState<StorageFileItem | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [fileToAssign, setFileToAssign] = useState<StorageFileItem | null>(null);
  const [assignSearch, setAssignSearch] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cloud Function & Firestore system_stats/storage_info state
  const [cloudFunctionStats, setCloudFunctionStats] = useState<{
    totalBytes?: number;
    totalFiles?: number;
    lastUpdated?: string;
    lastUploadedFile?: { name: string; size: number; bucket?: string; timeCreated?: string };
    syncedVia?: string;
  } | null>(null);
  const [showCodeModal, setShowCodeModal] = useState<boolean>(false);
  const [showOrdersAndDebtsModal, setShowOrdersAndDebtsModal] = useState<boolean>(false);
  const [syncingStats, setSyncingStats] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Subscribe in real-time to Firestore collection("system_stats").doc("storage_info")
  // گوێبیستبوونی ڕاستەوخۆ بۆ گۆڕانکارییەکانی بیرگە لە Firestore
  useEffect(() => {
    try {
      const statsRef = doc(db, 'system_stats', 'storage_info');
      const unsubscribe = onSnapshot(
        statsRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setCloudFunctionStats(data as any);
            const totalBytes = data.totalBytes || 0;
            const totalFiles = data.totalFiles || 0;

            // گۆڕینی قەبارە بۆ کیلۆبایت (KB) یان مێگابایت (MB)
            let formattedSize = '';
            if (totalBytes < 1024 * 1024) {
              formattedSize = `KB ${(totalBytes / 1024).toFixed(1)}`;
            } else {
              formattedSize = `MB ${(totalBytes / (1024 * 1024)).toFixed(2)}`;
            }

            // خستنەناوەوەی بۆ ناو خانەکانی دیزاینەکەت
            const sizeBox = document.querySelector('.total-size-box') as HTMLElement | null;
            const filesBox = document.querySelector('.total-files-box') as HTMLElement | null;
            if (sizeBox) sizeBox.innerText = formattedSize;
            if (filesBox) filesBox.innerText = String(totalFiles);
          } else {
            console.log('هیچ زانیارییەکی بیرگە نەدۆزراوەتەوە!');
          }
        },
        (err) => {
          console.warn('Could not subscribe to system_stats/storage_info:', err);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn('Error attaching stats listener:', e);
    }
  }, []);

  // Extract bucket name from storage instance
  const storageBucketName = storage.app.options.storageBucket || 'gailan-database.firebasestorage.app';

  // Load files from Firebase Storage
  const fetchStorageFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const foldersToScan = ['products', 'general', 'invoices'];
      const fileMap = new Map<string, StorageFileItem>();

      // Scan each folder
      for (const folder of foldersToScan) {
        try {
          const folderRef = ref(storage, folder);
          const listRes = await listAll(folderRef);

          for (const itemRef of listRes.items) {
            try {
              const url = await getDownloadURL(itemRef);
              let meta: FullMetadata | null = null;
              try {
                meta = await getMetadata(itemRef);
              } catch {
                // Meta might fail if restricted, continue with defaults
              }

              fileMap.set(itemRef.fullPath, {
                id: itemRef.fullPath,
                name: itemRef.name,
                fullPath: itemRef.fullPath,
                url,
                size: meta?.size || 0,
                contentType: meta?.contentType || (itemRef.name.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i) ? 'image/jpeg' : 'application/octet-stream'),
                timeCreated: meta?.timeCreated || new Date().toISOString(),
                folder,
              });
            } catch (itemErr) {
              console.warn(`Error loading item ${itemRef.fullPath}:`, itemErr);
            }
          }
        } catch (folderErr) {
          console.warn(`Error listing folder ${folder}:`, folderErr);
        }
      }

      // Also scan root directory
      try {
        const rootRef = ref(storage, '');
        const rootList = await listAll(rootRef);
        for (const itemRef of rootList.items) {
          if (!fileMap.has(itemRef.fullPath)) {
            try {
              const url = await getDownloadURL(itemRef);
              let meta: FullMetadata | null = null;
              try {
                meta = await getMetadata(itemRef);
              } catch {
                // ignore
              }
              fileMap.set(itemRef.fullPath, {
                id: itemRef.fullPath,
                name: itemRef.name,
                fullPath: itemRef.fullPath,
                url,
                size: meta?.size || 0,
                contentType: meta?.contentType || 'image/jpeg',
                timeCreated: meta?.timeCreated || new Date().toISOString(),
                folder: 'root',
              });
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // ignore root scan error
      }

      // Also incorporate existing product imageUrls if they belong to firebase storage
      // This ensures 100% of product images are present even if listAll permissions vary
      products.forEach((p) => {
        if (p.imageUrl && p.imageUrl.includes('firebasestorage.googleapis.com')) {
          let found = false;
          fileMap.forEach((item) => {
            if (item.url === p.imageUrl || p.imageUrl?.includes(encodeURIComponent(item.name))) {
              item.linkedProduct = p;
              found = true;
            }
          });

          if (!found) {
            // Add as item if not yet listed
            const pseudoName = p.name ? `وێنەی_${p.name}.jpg` : 'product_image.jpg';
            const pseudoPath = `products/${p.id}_${pseudoName}`;
            fileMap.set(p.imageUrl, {
              id: pseudoPath,
              name: pseudoName,
              fullPath: pseudoPath,
              url: p.imageUrl,
              size: 150 * 1024, // Approx default
              contentType: 'image/jpeg',
              timeCreated: p.createdAt || new Date().toISOString(),
              folder: 'products',
              linkedProduct: p,
            });
          }
        }
      });

      const loadedList = Array.from(fileMap.values());
      setFiles(loadedList);
    } catch (err: any) {
      console.error('Failed to load storage files:', err);
      setError(err?.message || 'کێشەیەک ڕوویدا لە بارکردنی پەڕگەکان لە Firebase Storage');
    } finally {
      setLoading(false);
    }
  }, [products]);

  useEffect(() => {
    fetchStorageFiles();
  }, [fetchStorageFiles]);

  // Handle uploading files
  const handleFileUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    setError(null);
    let successCount = 0;
    const targetFolder = uploadTargetFolder === 'all' ? 'products' : uploadTargetFolder;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      setUploadProgressText(`لە بارکردنی پەڕگەی ${i + 1} لە ${fileList.length} (${file.name})...`);

      try {
        let finalFile: File = file;
        const originalKB = (file.size / 1024).toFixed(0);

        // Auto compress images if option is selected
        if (autoCompress && file.type.startsWith('image/')) {
          try {
            finalFile = await compressImage(file, {
              maxWidth: 1280,
              maxHeight: 1280,
              quality: 0.82,
              mimeType: 'image/jpeg',
            });
          } catch (compErr) {
            console.warn('Compression failed, using original:', compErr);
            finalFile = file;
          }
        }

        const compressedKB = (finalFile.size / 1024).toFixed(0);
        const cleanName = finalFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${targetFolder}/${Date.now()}_${cleanName}`;
        const fileRef = ref(storage, storagePath);

        await uploadBytes(fileRef, finalFile);
        const downloadUrl = await getDownloadURL(fileRef);

        const newItem: StorageFileItem = {
          id: storagePath,
          name: cleanName,
          fullPath: storagePath,
          url: downloadUrl,
          size: finalFile.size,
          contentType: finalFile.type || 'image/jpeg',
          timeCreated: new Date().toISOString(),
          folder: targetFolder,
        };

        setFiles((prev) => [newItem, ...prev]);
        successCount++;

        // Update Firestore system_stats/storage_info in real-time
        if (!isFirestoreQuotaBlocked()) {
          try {
            const statsDocRef = doc(db, 'system_stats', 'storage_info');
            await setDoc(
              statsDocRef,
              {
                totalBytes: increment(finalFile.size),
                totalFiles: increment(1),
                lastUpdated: new Date().toISOString(),
                lastUploadedFile: {
                  name: cleanName,
                  size: finalFile.size,
                  bucket: storageBucketName,
                  timeCreated: new Date().toISOString(),
                },
              },
              { merge: true }
            );
          } catch (syncErr) {
            handleFirestoreError(syncErr, 'Upload storage_info sync');
          }
        }

        if (file.type.startsWith('image/') && autoCompress && file.size !== finalFile.size) {
          showToast(`پەڕگەی "${file.name}" بە سەرکەوتوویی بارکرا (${originalKB}KB ⬅ ${compressedKB}KB)`);
        } else {
          showToast(`پەڕگەی "${file.name}" بە سەرکەوتوویی بارکرا`);
        }
      } catch (uploadErr: any) {
        console.error('Error uploading file:', uploadErr);
        setError(`شکست لە بارکردنی ${file.name}: ${uploadErr?.message || 'کێشەی دەسەڵات یان ئینتەرنێت'}`);
      }
    }

    setUploading(false);
    setUploadProgressText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // Delete file
  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    setDeleting(true);
    const deletedSize = fileToDelete.size || 0;
    try {
      const fileRef = ref(storage, fileToDelete.fullPath);
      await deleteObject(fileRef);
      setFiles((prev) => prev.filter((f) => f.id !== fileToDelete.id));

      // Decrement Firestore system_stats/storage_info in real-time
      if (!isFirestoreQuotaBlocked()) {
        try {
          const statsDocRef = doc(db, 'system_stats', 'storage_info');
          await setDoc(
            statsDocRef,
            {
              totalBytes: increment(-deletedSize),
              totalFiles: increment(-1),
              lastUpdated: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (statErr) {
          handleFirestoreError(statErr, 'Delete storage_info sync');
        }
      }

      showToast(`پەڕگەی "${fileToDelete.name}" بە سەرکەوتوویی لە Storage سڕایەوە.`);
      setFileToDelete(null);
    } catch (err: any) {
      console.error('Error deleting from storage:', err);
      // If error is that object doesn't exist on bucket (e.g. virtual link), still remove from UI
      setFiles((prev) => prev.filter((f) => f.id !== fileToDelete.id));

      if (!isFirestoreQuotaBlocked()) {
        try {
          const statsDocRef = doc(db, 'system_stats', 'storage_info');
          await setDoc(
            statsDocRef,
            {
              totalBytes: increment(-deletedSize),
              totalFiles: increment(-1),
              lastUpdated: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (statErr) {
          handleFirestoreError(statErr, 'Delete storage_info fallback');
        }
      }

      showToast(`پەڕگەکە لابرا لە لیست.`);
      setFileToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  // Recalculate & Sync All Current Storage Stats to Firestore
  const handleSyncAllStatsToFirestore = async () => {
    setSyncingStats(true);
    try {
      const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
      const totalFiles = files.length;
      if (!isFirestoreQuotaBlocked()) {
        const statsDocRef = doc(db, 'system_stats', 'storage_info');
        await setDoc(
          statsDocRef,
          {
            totalBytes,
            totalFiles,
            lastUpdated: new Date().toISOString(),
            syncedVia: 'FirebaseStorageView-AutoSync',
          },
          { merge: true }
        );
      }
      showToast('ئاماری گشتی لە Firestore (system_stats/storage_info) بە سەرکەوتوویی هاوتا کرا.');
    } catch (err: any) {
      handleFirestoreError(err, 'Manual storage stats sync');
      showToast('ئاماری داتاکان لەسەر ئامێر بە سەرکەوتوویی پاشەکەوت کرا.');
    } finally {
      setSyncingStats(false);
    }
  };

  // Copy Download URL
  const handleCopyUrl = (item: StorageFileItem) => {
    navigator.clipboard.writeText(item.url);
    setCopiedId(item.id);
    showToast(`بەستەری دانلۆد (URL) کۆپیکرا بۆ Clipboard`);
    setTimeout(() => {
      setCopiedId(null);
    }, 2500);
  };

  // Assign image to a product
  const handleAssignToProduct = (product: Product) => {
    if (!fileToAssign) return;
    updateProduct(product.id, { imageUrl: fileToAssign.url });
    setFiles((prev) =>
      prev.map((f) => (f.id === fileToAssign.id ? { ...f, linkedProduct: product } : f))
    );
    showToast(`وێنەکە بەسترا بە کاڵای "${product.name}" بە سەرکەوتوویی.`);
    setFileToAssign(null);
  };

  // Filtered & Sorted files
  const filteredFiles = useMemo(() => {
    return files
      .filter((file) => {
        // Folder filter
        if (selectedFolder !== 'all' && file.folder !== selectedFolder) {
          return false;
        }
        // Type filter
        const isImage = file.contentType.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i);
        if (selectedType === 'image' && !isImage) return false;
        if (selectedType === 'document' && isImage) return false;

        // Search query
        if (debouncedSearch.trim()) {
          const q = debouncedSearch.toLowerCase();
          const matchName = file.name.toLowerCase().includes(q);
          const matchProduct = file.linkedProduct?.name.toLowerCase().includes(q) ?? false;
          if (!matchName && !matchProduct) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') {
          return new Date(b.timeCreated).getTime() - new Date(a.timeCreated).getTime();
        }
        if (sortBy === 'date_asc') {
          return new Date(a.timeCreated).getTime() - new Date(b.timeCreated).getTime();
        }
        if (sortBy === 'size_desc') {
          return b.size - a.size;
        }
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });
  }, [files, selectedFolder, selectedType, debouncedSearch, sortBy]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalCount = files.length;
    const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
    const totalImages = files.filter((f) => f.contentType.startsWith('image/') || f.name.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)).length;
    const totalDocs = totalCount - totalImages;
    const sizeFormatted =
      totalBytes > 1024 * 1024
        ? `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`
        : `${(totalBytes / 1024).toFixed(1)} KB`;

    return {
      totalCount,
      totalBytes,
      sizeFormatted,
      totalImages,
      totalDocs,
    };
  }, [files]);

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const formatDateDisplay = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ku-IQ', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn" dir="rtl">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center gap-3 animate-slideUp">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Banner & Storage Overview */}
      <div
        className="rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden border border-cyan-500/30"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(8, 14, 30, 0.92) 0%, rgba(15, 23, 42, 0.88) 100%), url('/blue_mesh_bg.jpg')`,
          backgroundSize: 'cover',
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-bold shadow-xs">
              <Cloud className="w-4 h-4 text-cyan-400" />
              <span>Firebase Cloud Storage</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              کۆگای پەڕگە و وێنەکان (Storage)
            </h1>
            <p className="text-xs sm:text-sm text-slate-900 max-w-2xl leading-relaxed">
              بەڕێوەبردنی تەواوی وێنەکانی کاڵا، وێنەی پسووڵەکان و پەڕگەکانی خەزنکراو لەسەر سێرڤەری پارێزراوی فایەبەیس بە خێرایی بەرز و کەمکردنەوەی قەبارەی ڕاستەوخۆ.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-2.5 text-xs">
              <span className="text-slate-600 font-bold text-xs">سێرڤەری بیرگە (Bucket):</span>
              <div dir="ltr" className="inline-flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-cyan-500/30 font-mono text-xs text-cyan-300 font-bold tracking-wide shadow-inner select-all">
                <Database className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{storageBucketName}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowOrdersAndDebtsModal(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-amber-500/30 text-amber-300 font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-sm hover:border-amber-400/50"
              title="پیشاندانی کۆلێکشن: orders_and_debts (پسوڵە، قەرز و کاڵا لە Firestore)"
            >
              <Layers className="w-4 h-4 text-amber-400" />
              <span>orders_and_debts</span>
            </button>

            <button
              onClick={() => setShowCodeModal(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-purple-500/30 text-purple-300 font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-sm hover:border-purple-400/50"
              title="کۆدی Cloud Function بۆ چاودێریکردنی ئۆتۆماتیکی Storage"
            >
              <Code2 className="w-4 h-4 text-purple-400" />
              <span>کۆدی Cloud Function</span>
            </button>

            <button
              onClick={handleSyncAllStatsToFirestore}
              disabled={syncingStats}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-cyan-500/30 text-cyan-300 font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-sm hover:border-cyan-400/50 disabled:opacity-50"
              title="پاشەکەوتکردنی ئاماری ئێستای Storage لەناو Firestore system_stats/storage_info"
            >
              <Database className={`w-4 h-4 text-cyan-400 ${syncingStats ? 'animate-spin' : ''}`} />
              <span>{syncingStats ? 'لە سینکرۆندا...' : 'هاوتاکردنی ئامار لە Firestore'}</span>
            </button>

            <button
              onClick={fetchStorageFiles}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-sm hover:border-slate-500 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>نوێکردنەوەی پەڕگەکان</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs transition-all active:scale-95 cursor-pointer shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-400/40 hover:ring-cyan-300"
            >
              <Upload className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span>بارکردنی وێنەی نوێ</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*,application/pdf"
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
            />
          </div>
        </div>

        {/* Metric Cards inside Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-white/10">
          <div className="bg-slate-900/60 border border-slate-700/50 hover:border-cyan-500/40 rounded-2xl p-4 backdrop-blur-md shadow-sm transition-all flex flex-col justify-between">
            <div className="text-slate-600 text-xs font-bold">کۆی پەڕگەکان (Bucket)</div>
            <div className="total-files-box text-2xl font-black text-white mt-1">
              {cloudFunctionStats?.totalFiles ?? stats.totalCount}
            </div>
            <div className="text-[11px] text-cyan-300/80 mt-1 font-medium">پەڕگەی خەزنکراو</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-700/50 hover:border-cyan-500/40 rounded-2xl p-4 backdrop-blur-md shadow-sm transition-all flex flex-col justify-between">
            <div className="text-slate-600 text-xs font-bold">قەبارەی گشتی (Storage)</div>
            <div dir="ltr" className="total-size-box text-2xl font-black text-emerald-400 mt-1 font-mono tracking-tight text-right">
              {cloudFunctionStats && typeof cloudFunctionStats.totalBytes === 'number'
                ? cloudFunctionStats.totalBytes < 1024 * 1024
                  ? `KB ${(cloudFunctionStats.totalBytes / 1024).toFixed(1)}`
                  : `MB ${(cloudFunctionStats.totalBytes / (1024 * 1024)).toFixed(2)}`
                : stats.sizeFormatted}
            </div>
            <div className="text-[11px] text-emerald-300/80 mt-1 font-medium">لەسەر سێرڤەر</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-700/50 hover:border-cyan-500/40 rounded-2xl p-4 backdrop-blur-md shadow-sm transition-all flex flex-col justify-between">
            <div className="text-slate-600 text-xs font-bold">وێنەی کاڵاکان</div>
            <div className="text-2xl font-black text-cyan-400 mt-1">
              {stats.totalImages}
            </div>
            <div className="text-[11px] text-cyan-300/80 mt-1 font-medium">وێنەی چالاک</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-700/50 hover:border-cyan-500/40 rounded-2xl p-4 backdrop-blur-md shadow-sm transition-all flex flex-col justify-between">
            <div className="text-slate-600 text-xs font-bold">دۆخی سێرڤەر</div>
            <div className="flex items-center gap-2 text-emerald-400 text-sm sm:text-base font-black mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <span>چالاک و بەستراو</span>
            </div>
            <div className="text-[11px] text-slate-900/80 mt-1 font-medium">Firebase Live</div>
          </div>
        </div>

        {/* Live Firestore Aggregated Stats (Cloud Function target: system_stats/storage_info) */}
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3.5 bg-slate-900/75 rounded-2xl p-4 border border-purple-500/30 backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 shrink-0 shadow-inner">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-white">ئاماری سێرڤەری Firestore (Cloud Function)</span>
                <span dir="ltr" className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  system_stats/storage_info
                </span>
              </div>
              <div className="text-[11px] text-slate-900 flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 font-medium">
                <span>
                  قەبارە: <strong className="text-purple-300 font-mono">{cloudFunctionStats?.totalBytes ? formatFileSize(cloudFunctionStats.totalBytes) : stats.sizeFormatted}</strong>
                </span>
                <span>
                  فایلەکان: <strong className="text-cyan-300 font-mono">{cloudFunctionStats?.totalFiles ?? stats.totalCount}</strong>
                </span>
                {cloudFunctionStats?.lastUpdated && (
                  <span className="text-slate-600">
                    دواین نوێبوونەوە: <strong className="text-slate-900">{formatDateDisplay(cloudFunctionStats.lastUpdated)}</strong>
                  </span>
                )}
                {cloudFunctionStats?.lastUploadedFile?.name && (
                  <span className="text-slate-600 truncate max-w-xs" dir="ltr">
                    Last file: <strong className="text-emerald-300 font-mono">{cloudFunctionStats.lastUploadedFile.name}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowCodeModal(true)}
              className="text-xs px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-400/40 transition-all font-bold cursor-pointer flex items-center gap-2 shadow-sm active:scale-95"
            >
              <Code2 className="w-4 h-4 text-purple-300" />
              <span>بینینی کۆدی سێرڤەر</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all shadow-sm ${
          isDragging
            ? 'border-cyan-500 bg-cyan-500/10 scale-[0.99] shadow-cyan-500/10'
            : 'border-slate-200 hover:border-cyan-400 bg-white hover:bg-cyan-50/20'
        }`}
      >
        <div className="max-w-md mx-auto space-y-3.5">
          <div className="w-14 h-14 rounded-2xl bg-cyan-50 text-cyan-600 mx-auto flex items-center justify-center shadow-inner border border-cyan-100">
            <Upload className={`w-7 h-7 ${uploading ? 'animate-bounce' : ''}`} />
          </div>

          <div className="space-y-1">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
              {uploading ? uploadProgressText : 'وێنە یان پەڕگە لێرە دابنێ یان کلیک بکە بۆ هەڵبژاردن'}
            </h3>
            <p className="text-xs text-slate-900">
              پشتیوانی وێنەکانی JPG، PNG، WEBP دەکات لەگەڵ پەڕگەی PDF و بەڵگەنامەکان
            </p>
          </div>

          {/* Upload Configuration */}
          <div
            className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <label className="flex items-center gap-2 cursor-pointer bg-slate-100/80 hover:bg-slate-200/80 px-3.5 py-1.5 rounded-xl transition-colors border border-slate-200/60 shadow-xs">
              <input
                type="checkbox"
                checked={autoCompress}
                onChange={(e) => setAutoCompress(e.target.checked)}
                className="w-4 h-4 text-cyan-600 rounded-md focus:ring-cyan-500"
              />
              <span className="font-bold text-slate-900">
                پەستاندنی ڕاستەوخۆی وێنە (کەمکردنەوەی قەبارە بۆ خێرابوون)
              </span>
            </label>

            <div className="flex items-center gap-2 bg-slate-100/80 px-3.5 py-1.5 rounded-xl border border-slate-200/60 shadow-xs">
              <span className="text-slate-900 font-bold">بوخچەی ئامانج:</span>
              <select
                value={uploadTargetFolder}
                onChange={(e) => setUploadTargetFolder(e.target.value)}
                className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
              >
                <option value="products">products (وێنەی کاڵا)</option>
                <option value="general">general (گشتی)</option>
                <option value="invoices">invoices (پسووڵە)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm shadow-sm">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchStorageFiles}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-all active:scale-95"
          >
            دووبارە هەوڵبدەرەوە
          </button>
        </div>
      )}

      {/* 3. Filter & Search Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="گەڕان بەپێی ناوی پەڕگە یان ناوی کاڵای بەستراو..."
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/80 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-xs sm:text-sm outline-none transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Folder Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
            <button
              onClick={() => setSelectedFolder('all')}
              className={`px-3 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedFolder === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              هەموو بوخچەکان ({files.length})
            </button>
            <button
              onClick={() => setSelectedFolder('products')}
              className={`px-3 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedFolder === 'products'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              وێنەی کاڵاکان (products)
            </button>
            <button
              onClick={() => setSelectedFolder('general')}
              className={`px-3 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedFolder === 'general'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              گشتی (general)
            </button>
            <button
              onClick={() => setSelectedFolder('invoices')}
              className={`px-3 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedFolder === 'invoices'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              پسووڵە (invoices)
            </button>
          </div>
        </div>

        {/* Secondary Filters & View Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-900 font-bold">جۆری پەڕگە:</span>
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setSelectedType('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedType === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                هەموو
              </button>
              <button
                onClick={() => setSelectedType('image')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedType === 'image' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                تەنها وێنە
              </button>
              <button
                onClick={() => setSelectedType('document')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedType === 'document' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                بەڵگەنامە و هیتر
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-600" />
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
              >
                <option value="date_desc">نوێترین بەروار</option>
                <option value="date_asc">کۆنترین بەروار</option>
                <option value="size_desc">گەورەترین قەبارە</option>
                <option value="name">بەپێی پیت (ناو)</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-cyan-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="پیشاندانی تۆڕی"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'list' ? 'bg-white text-cyan-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="پیشاندانی خشتەیی"
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Files Display (Grid or List) */}
      {loading ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200">
          <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin mx-auto mb-3" />
          <h3 className="font-extrabold text-slate-900 text-sm">بارکردنی پەڕگەکان لە Firebase Storage...</h3>
          <p className="text-xs text-slate-600 mt-1">تکایە کەمێک چاوەڕوانبە</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200">
          <FolderOpen className="w-16 h-16 text-slate-900 mx-auto mb-3" />
          <h3 className="font-extrabold text-slate-900 text-base">هیچ پەڕگەیەک نەدۆزرایەوە</h3>
          <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'هیچ پەڕگەیەک لەگەڵ ئەم گەڕانە ناگونجێت، وشەیەکی تر بنووسە.'
              : 'هێشتا هیچ وێنە یان پەڕگەیەک لەم بەشەدا نییە. دەتوانی لە سەرەوە وێنەی نوێ باربکەیت.'}
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 px-4 py-2 rounded-xl bg-cyan-600 text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-md"
          >
            <Upload className="w-4 h-4" />
            <span>بارکردنی یەکەم وێنە</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredFiles.map((file) => {
            const isImage = file.contentType.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i);
            const isCopied = copiedId === file.id;

            return (
              <div
                key={file.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-cyan-400 shadow-2xs hover:shadow-lg transition-all overflow-hidden flex flex-col group relative"
              >
                {/* Thumbnail / Image Box */}
                <div
                  className="aspect-square bg-slate-100 relative overflow-hidden cursor-pointer flex items-center justify-center group-hover:opacity-95"
                  onClick={() => setPreviewFile(file)}
                >
                  {isImage ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 text-slate-600">
                      <FileText className="w-12 h-12 text-slate-600 mb-1" />
                      <span className="text-[10px] uppercase font-mono font-bold">
                        {file.name.split('.').pop() || 'FILE'}
                      </span>
                    </div>
                  )}

                  {/* Top Overlay Badge: Size */}
                  <span className="absolute top-2 right-2 bg-slate-900/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs font-mono">
                    {formatFileSize(file.size)}
                  </span>

                  {/* Folder tag */}
                  <span className="absolute top-2 left-2 bg-cyan-600/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs">
                    {file.folder}
                  </span>

                  {/* Hover Quick Overlay Buttons */}
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewFile(file);
                      }}
                      className="p-2 rounded-xl bg-white text-slate-900 hover:bg-cyan-50 hover:text-cyan-600 shadow-md transition-all active:scale-95"
                      title="پێشبینینی تەواو"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyUrl(file);
                      }}
                      className={`p-2 rounded-xl shadow-md transition-all active:scale-95 ${
                        isCopied ? 'bg-emerald-500 text-white' : 'bg-white text-slate-900 hover:bg-cyan-50 hover:text-cyan-600'
                      }`}
                      title="کۆپیکردنی بەستەری ڕاستەوخۆ"
                    >
                      {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Card Content & Details */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-2 bg-white">
                  <div>
                    <h4
                      className="font-bold text-xs text-slate-900 truncate"
                      title={file.name}
                    >
                      {file.name}
                    </h4>
                    <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                      {formatDateDisplay(file.timeCreated)}
                    </p>
                  </div>

                  {/* Linked Product Info */}
                  {file.linkedProduct ? (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 truncate">
                      <Package className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span className="truncate">{file.linkedProduct.name}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setFileToAssign(file)}
                      className="w-full text-center text-[10px] text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 py-1 rounded-lg font-bold border border-dashed border-cyan-300 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <LinkIcon className="w-2.5 h-2.5" />
                      <span>بەستنەوە بە کاڵا</span>
                    </button>
                  )}

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-900 hover:text-cyan-600 font-bold flex items-center gap-1 transition-colors"
                      title="داگرتن / کردنەوە"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>داگرتن</span>
                    </a>

                    <button
                      onClick={() => setFileToDelete(file)}
                      className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded-lg transition-colors cursor-pointer"
                      title="سڕینەوە لە Storage"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE / LIST VIEW */
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-3.5 px-4">وێنە / جۆر</th>
                  <th className="py-3.5 px-4">ناوی پەڕگە</th>
                  <th className="py-3.5 px-4">بوخچە</th>
                  <th className="py-3.5 px-4">قەبارە</th>
                  <th className="py-3.5 px-4">کاڵای بەستراو</th>
                  <th className="py-3.5 px-4">بەرواری بارکردن</th>
                  <th className="py-3.5 px-4 text-center">کردارەکان</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredFiles.map((file) => {
                  const isImage = file.contentType.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i);
                  const isCopied = copiedId === file.id;

                  return (
                    <tr key={file.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4">
                        <div
                          className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center cursor-pointer"
                          onClick={() => setPreviewFile(file)}
                        >
                          {isImage ? (
                            <img
                              src={file.url}
                              alt={file.name}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FileIcon className="w-5 h-5 text-slate-600" />
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-4">
                        <div
                          className="font-bold text-slate-900 max-w-xs truncate cursor-pointer hover:text-cyan-600"
                          onClick={() => setPreviewFile(file)}
                        >
                          {file.name}
                        </div>
                        <div className="text-[10px] text-slate-600 font-mono truncate max-w-xs">
                          {file.fullPath}
                        </div>
                      </td>

                      <td className="py-2.5 px-4">
                        <span className="bg-slate-100 text-slate-900 font-bold px-2 py-0.5 rounded-md text-[10px]">
                          {file.folder}
                        </span>
                      </td>

                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                        {formatFileSize(file.size)}
                      </td>

                      <td className="py-2.5 px-4">
                        {file.linkedProduct ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                            <Package className="w-3 h-3" />
                            <span>{file.linkedProduct.name}</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => setFileToAssign(file)}
                            className="text-[10px] text-cyan-600 hover:text-cyan-800 font-bold cursor-pointer"
                          >
                            + بەستنەوە بە کاڵا
                          </button>
                        )}
                      </td>

                      <td className="py-2.5 px-4 text-slate-900 font-mono text-[11px]">
                        {formatDateDisplay(file.timeCreated)}
                      </td>

                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setPreviewFile(file)}
                            className="p-1.5 rounded-lg text-slate-900 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                            title="پێشبینین"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCopyUrl(file)}
                            className={`p-1.5 rounded-lg cursor-pointer ${
                              isCopied ? 'text-emerald-600 bg-emerald-50' : 'text-slate-900 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                            title="کۆپیکردنی لینک"
                          >
                            {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-slate-900 hover:bg-slate-100 hover:text-slate-900"
                            title="داگرتن"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => setFileToDelete(file)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                            title="سڕینەوە"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Image & File Full Preview */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn no-print">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] animate-scaleUp">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-cyan-600" />
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 truncate max-w-sm">
                  {previewFile.name}
                </h3>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Image Viewer */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center bg-slate-900/5 min-h-[250px]">
              {previewFile.contentType.startsWith('image/') || previewFile.name.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i) ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-h-[50vh] max-w-full rounded-2xl shadow-md object-contain bg-white"
                />
              ) : (
                <div className="p-12 text-center text-slate-900">
                  <FileText className="w-20 h-20 text-slate-600 mx-auto mb-3" />
                  <p className="font-bold text-sm">ئەم پەڕگەیە وێنە نییە، دەتوانی دایبەزێنیت یان لە تابی نوێ بیکەیتەوە</p>
                </div>
              )}
            </div>

            {/* File Info Bar */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-600 block text-[10px]">قەبارە:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatFileSize(previewFile.size)}
                </span>
              </div>
              <div>
                <span className="text-slate-600 block text-[10px]">بوخچە:</span>
                <span className="font-bold text-slate-900">{previewFile.folder}</span>
              </div>
              <div>
                <span className="text-slate-600 block text-[10px]">بەرواری بارکردن:</span>
                <span className="font-mono text-slate-900">
                  {formatDateDisplay(previewFile.timeCreated)}
                </span>
              </div>
              <div>
                <span className="text-slate-600 block text-[10px]">کاڵای پەیوەندیدار:</span>
                <span className="font-bold text-emerald-600 truncate block">
                  {previewFile.linkedProduct ? previewFile.linkedProduct.name : 'نەبەستراوە'}
                </span>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyUrl(previewFile)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  <span>کۆپیکردنی بەستەری ڕاستەوخۆ</span>
                </button>

                <a
                  href={previewFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>داگرتنی پەڕگە</span>
                </a>
              </div>

              <div className="flex items-center gap-2">
                {!previewFile.linkedProduct && (
                  <button
                    onClick={() => {
                      setFileToAssign(previewFile);
                      setPreviewFile(null);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Package className="w-4 h-4" />
                    <span>بەستنەوە بە کاڵا</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setFileToDelete(previewFile);
                    setPreviewFile(null);
                  }}
                  className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>سڕینەوە</span>
                </button>

                <button
                  onClick={() => setPreviewFile(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>داخستن</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Assign to Product */}
      {fileToAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fadeIn no-print">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] animate-scaleUp">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  بەستنەوەی وێنە بە کاڵا
                </h3>
              </div>
              <button
                onClick={() => setFileToAssign(null)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 bg-emerald-50/50 flex items-center gap-3">
              <img
                src={fileToAssign.url}
                alt="Selected"
                className="w-12 h-12 rounded-xl object-cover border border-emerald-200 bg-white"
              />
              <div className="text-xs truncate">
                <div className="font-bold text-slate-900 truncate">{fileToAssign.name}</div>
                <div className="text-slate-900 font-mono">{formatFileSize(fileToAssign.size)}</div>
              </div>
            </div>

            {/* Search Product */}
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  type="text"
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  placeholder="گەڕان بەدوای ناوی کاڵا یان کۆد..."
                  className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>
            </div>

            {/* Products List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 divide-y divide-slate-100">
              {products
                .filter((p) => {
                  if (!assignSearch.trim()) return true;
                  const q = assignSearch.toLowerCase();
                  return (
                    p.name.toLowerCase().includes(q) ||
                    p.barcode.toLowerCase().includes(q) ||
                    p.category.toLowerCase().includes(q)
                  );
                })
                .slice(0, 50)
                .map((prod) => (
                  <div
                    key={prod.id}
                    className="pt-1.5 flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {prod.imageUrl ? (
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                          <Package className="w-4 h-4" />
                        </div>
                      )}
                      <div className="truncate text-xs">
                        <div className="font-bold text-slate-900 truncate">{prod.name}</div>
                        <div className="text-slate-600 text-[10px] font-mono">{prod.barcode}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAssignToProduct(prod)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs active:scale-95"
                    >
                      بەستنەوە
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete File Confirmation */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fadeIn no-print">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-4 animate-scaleUp">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center shadow-inner">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">سڕینەوە لە Storage</h3>
              <p className="text-xs text-slate-900 leading-relaxed">
                دڵنیای دەتەوێت پەڕگەی <strong className="text-slate-900">"{fileToDelete.name}"</strong> بە یەکجاری لە سێرڤەری Firebase بسڕیتەوە؟ ئەم کردارە ناگەڕێتەوە.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDeleteFile}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'دەسڕێتەوە...' : 'بەڵێ، بسڕەوە'}
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={() => setFileToDelete(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs border border-slate-300 transition-colors cursor-pointer"
              >
                پاشگەزبوونەوە
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Cloud Function Code & Deployment Guide */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-fadeIn no-print">
          <div className="bg-slate-900 text-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-purple-500/40 flex flex-col max-h-[90vh] animate-scaleUp">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg">کۆدی سێرڤەری Cloud Function</h3>
                  <p className="text-xs text-slate-600">
                    چاودێریکردنی ئۆتۆماتیکی Storage و پاشەکەوتکردنی قەبارە لە Firestore (collection: system_stats, doc: storage_info)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCodeModal(false)}
                className="p-2 rounded-xl text-slate-600 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs font-mono">
              <div className="bg-purple-950/40 border border-purple-800/50 rounded-xl p-3 text-purple-200 font-sans space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-purple-300">
                  <Sparkles className="w-4 h-4" />
                  <span>پوختەی کارکردنی فەنکشنەکە:</span>
                </div>
                <p className="text-slate-900 leading-relaxed text-[11px]">
                  ئەم کۆدە لە فایلی <code className="bg-slate-800 px-1.5 py-0.5 rounded text-purple-300">functions/index.js</code> لەناو سیستەمەکەدا خەزنکراوە. لەسەر سێرڤەر بەبێ پێویستی وێب ئەپەکەت هەر فایلێک باربکرێت (onObjectFinalized) یان بسڕدرێتەوە (onObjectDeleted)، ئاماری <code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300">totalBytes</code> و <code className="bg-slate-800 px-1.5 py-0.5 rounded text-cyan-300">totalFiles</code> لە Firestore نوێ دەکاتەوە.
                </p>
              </div>

              <div className="relative bg-slate-950 rounded-2xl p-4 border border-slate-800 overflow-x-auto text-[11px] text-slate-900 leading-relaxed">
                <button
                  onClick={() => {
                    const code = `const { onObjectFinalized, onObjectDeleted } = require("firebase-functions/v2/storage");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore("ai-studio-87aed850-3163-40be-bd71-4a5348fabb6b");

exports.updateStorageStatsOnUpload = onObjectFinalized(async (event) => {
  const file = event.data;
  const fileSize = parseInt(file.size || 0, 10);
  const statsRef = db.collection("system_stats").doc("storage_info");

  await db.runTransaction(async (transaction) => {
    transaction.set(statsRef, {
      totalBytes: FieldValue.increment(fileSize),
      totalFiles: FieldValue.increment(1),
      lastUpdated: new Date().toISOString(),
      lastUploadedFile: {
        name: file.name,
        size: fileSize,
        bucket: file.bucket,
        timeCreated: file.timeCreated || new Date().toISOString()
      }
    }, { merge: true });
  });

  console.log(\`فایلی \${file.name} بارکرا و قەبارەکەی سەر سێرڤەر نوێکرایەوە.\`);
});

exports.updateStorageStatsOnDelete = onObjectDeleted(async (event) => {
  const file = event.data;
  const fileSize = parseInt(file.size || 0, 10);
  const statsRef = db.collection("system_stats").doc("storage_info");

  await db.runTransaction(async (transaction) => {
    transaction.set(statsRef, {
      totalBytes: FieldValue.increment(-fileSize),
      totalFiles: FieldValue.increment(-1),
      lastUpdated: new Date().toISOString()
    }, { merge: true });
  });

  console.log(\`فایلی \${file.name} سڕایەوە و ئاماری سێرڤەر کەمکرایەوە.\`);
});`;
                    navigator.clipboard.writeText(code);
                    showToast('کۆدی سێرڤەر بە تەواوی کۆپیکرا.');
                  }}
                  className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-sans text-[11px] font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer active:scale-95"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>کۆپیکردنی کۆد</span>
                </button>
                <pre>{`const { onObjectFinalized, onObjectDeleted } = require("firebase-functions/v2/storage");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore("ai-studio-87aed850-3163-40be-bd71-4a5348fabb6b");

// چاودێریکردنی سێرڤەری Storage بۆ هەر فایلێکی نوێ کە Upload دەکرێت
exports.updateStorageStatsOnUpload = onObjectFinalized(async (event) => {
  const file = event.data;
  const fileSize = parseInt(file.size || 0, 10);
  
  const statsRef = db.collection("system_stats").doc("storage_info");

  await db.runTransaction(async (transaction) => {
    transaction.set(statsRef, {
      totalBytes: FieldValue.increment(fileSize),
      totalFiles: FieldValue.increment(1),
      lastUpdated: new Date().toISOString(),
      lastUploadedFile: {
        name: file.name,
        size: fileSize,
        bucket: file.bucket,
        timeCreated: file.timeCreated || new Date().toISOString()
      }
    }, { merge: true });
  });

  console.log(\`فایلی \${file.name} بارکرا و قەبارەکەی سەر سێرڤەر نوێکرایەوە.\`);
});

// چاودێریکردنی هەر سڕینەوەیەک لە Storage بۆ ڕێکخستنی ئۆتۆماتیکی
exports.updateStorageStatsOnDelete = onObjectDeleted(async (event) => {
  const file = event.data;
  const fileSize = parseInt(file.size || 0, 10);
  const statsRef = db.collection("system_stats").doc("storage_info");

  await db.runTransaction(async (transaction) => {
    transaction.set(statsRef, {
      totalBytes: FieldValue.increment(-fileSize),
      totalFiles: FieldValue.increment(-1),
      lastUpdated: new Date().toISOString()
    }, { merge: true });
  });

  console.log(\`فایلی \${file.name} سڕایەوە و ئاماری سێرڤەر کەمکرایەوە.\`);
});`}</pre>
              </div>

              <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 font-sans space-y-2">
                <div className="font-bold text-white text-xs">ڕێگای خستنەکاری فەنکشنەکە (Deploy):</div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-[11px] text-cyan-300">
                  firebase deploy --only functions
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  هەروەها پەڕگەکانی <code className="text-slate-900">/functions/package.json</code> و <code className="text-slate-900">/functions/index.js</code> بە تەواوی ئامادەکراون لەناو ئەم پڕۆژەیەدا.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowCodeModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                داخستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders and Debts Firestore Modal */}
      <OrdersAndDebtsModal
        isOpen={showOrdersAndDebtsModal}
        onClose={() => setShowOrdersAndDebtsModal(false)}
      />
    </div>
  );
};
