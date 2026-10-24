const { onObjectFinalized, onObjectDeleted } = require("firebase-functions/v2/storage");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// دەستپێکردنی بەرنامەی فایبەیس ئەدمین
initializeApp();

// بەکارهێنانی داتابەیسی تایبەت یان بنەڕەتی
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || "ai-studio-87aed850-3163-40be-bd71-4a5348fabb6b";
let db;
try {
  db = DATABASE_ID ? getFirestore(DATABASE_ID) : getFirestore();
} catch (e) {
  db = getFirestore();
}

/**
 * چاودێریکردنی سێرڤەری Storage بۆ هەر فایلێکی نوێ کە Upload دەکرێت
 */
exports.updateStorageStatsOnUpload = onObjectFinalized(async (event) => {
  const file = event.data;
  const fileSize = parseInt(file.size || 0, 10); // وەرگرتنی قەبارەی فایل بە باوەڕپێکراوی

  // خشتەی تایبەت بە پاشەکەوتکردنی ئامارەکان لە Firestore
  const statsRef = db.collection("system_stats").doc("storage_info");

  // بەکارهێنانی Transaction بۆ ڕێگریکردن لە کێشەی کاتی نوێکردنەوە
  await db.runTransaction(async (transaction) => {
    transaction.set(statsRef, {
      totalBytes: FieldValue.increment(fileSize),
      totalFiles: FieldValue.increment(1),
      lastUpdated: new Date().toISOString(),
      lastUploadedFile: {
        name: file.name || "unnamed",
        size: fileSize,
        bucket: file.bucket,
        timeCreated: file.timeCreated || new Date().toISOString()
      }
    }, { merge: true });
  });

  console.log(`فایلی ${file.name} بارکرا و قەبارەکەی سەر سێرڤەر نوێکرایەوە (+${fileSize} bytes).`);
});

/**
 * چاودێریکردنی سێرڤەری Storage بۆ هەر فایلێک کە دەسڕدرێتەوە
 * تا هەمیشە ئامارەکە ١٠٠٪ تەواو و هاوتا بێت
 */
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

  console.log(`فایلی ${file.name} سڕایەوە و ئاماری سێرڤەر کەمکرایەوە (-${fileSize} bytes).`);
});
