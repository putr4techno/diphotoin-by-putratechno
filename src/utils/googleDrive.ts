/**
 * Google Drive & Google Apps Script (GAS) Integration Utilities
 */

/**
 * Extracts Google Drive Folder or File ID from standard Drive sharing links or raw IDs.
 * Supports:
 * - https://drive.google.com/drive/folders/1ABCxyz...
 * - https://drive.google.com/drive/u/0/folders/1ABCxyz...
 * - https://drive.google.com/file/d/1ABCxyz...
 * - https://drive.google.com/open?id=1ABCxyz...
 * - Raw ID string
 */
export function extractDriveFolderId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();

  // /folders/ID
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    return folderMatch[1];
  }

  // /file/d/ID
  const fileDMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return fileDMatch[1];
  }

  // ?id=ID
  const idQueryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idQueryMatch && idQueryMatch[1]) {
    return idQueryMatch[1];
  }

  // raw ID (standard Google Drive IDs are at least 15 characters)
  if (/^[a-zA-Z0-9_-]{15,}$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
}

export const extractDriveFileId = extractDriveFolderId;

/**
 * Generates direct viewable image URLs from a Google Drive File ID.
 */
export function getDriveDirectImageUrl(input: string): string {
  if (!input) return '';
  if (input.startsWith('data:image/') || input.startsWith('blob:') || input.startsWith('http://') || (input.startsWith('https://') && !input.includes('drive.google.com'))) {
    return input;
  }

  const id = extractDriveFolderId(input);
  if (id && /^[a-zA-Z0-9_-]{15,}$/.test(id)) {
    return `https://lh3.googleusercontent.com/d/${id}`;
  }

  return input;
}

/**
 * Checks if the Google Apps Script Web App URL is accessible and active.
 */
export async function checkGoogleAppsScriptHealth(url: string): Promise<{ success: boolean; message: string }> {
  if (!url || !url.trim()) {
    return { success: false, message: 'URL Web App Google Apps Script masih kosong.' };
  }

  const cleanUrl = url.trim();
  if (!cleanUrl.startsWith('https://script.google.com/macros/s/')) {
    return {
      success: false,
      message: 'Format URL salah. URL harus berawalan "https://script.google.com/macros/s/..." dan berakhiran "/exec".',
    };
  }

  try {
    const res = await fetch(cleanUrl, {
      method: 'GET',
    });

    const text = await res.text();
    let data: { status?: string; message?: string } | null = null;
    try {
      data = JSON.parse(text);
    } catch {
      if (text.includes('accounts.google.com') || text.includes('Service Login')) {
        return {
          success: false,
          message: 'Akses Ditolak: Saat deploy Web App, pastikan opsi "Who has access" dipilih "Anyone" (Siapa saja).',
        };
      }
      return {
        success: false,
        message: 'Respon dari Google Script bukan JSON. Pastikan Anda menyalin URL Web App (/exec), bukan URL editor.',
      };
    }

    if (data && data.status === 'active') {
      return {
        success: true,
        message: '🟢 Koneksi Berhasil! Google Apps Script aktif dan siap menerima foto.',
      };
    }

    return {
      success: true,
      message: data?.message || '🟢 Terhubung ke Google Apps Script!',
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Gagal terhubung (${errorMsg}). Pastikan deployment Google Apps Script diatur ke "Anyone" (Siapa saja).`,
    };
  }
}

/**
 * Uploads captured photobooth image to Google Drive via Google Apps Script Web App.
 */
export async function uploadToGoogleDrive(params: {
  gasWebAppUrl?: string;
  folderId?: string;
  base64Image: string;
  eventName?: string;
  fileName?: string;
}): Promise<{ success: boolean; message: string; fileUrl?: string; fileId?: string }> {
  const { gasWebAppUrl, folderId, base64Image, eventName, fileName } = params;

  const endpoint = (gasWebAppUrl && gasWebAppUrl.trim()) || '';
  const parsedFolderId = folderId ? extractDriveFolderId(folderId) : '';

  if (!endpoint) {
    return {
      success: false,
      message: 'URL Web App Google Apps Script belum diisi di Panel Admin. Silakan buka menu Pengaturan Admin ➔ Google Drive untuk menghubungkannya.',
    };
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeEvent = (eventName || 'Photobooth').replace(/[^a-zA-Z0-9_-]/g, '_');
  const finalFileName = fileName || `Photobooth_${safeEvent}_${timestamp}.png`;

  // Strip data:image/...;base64, prefix if present
  const pureBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

  const payload = {
    image: pureBase64,
    filename: finalFileName,
    mimeType: 'image/png',
    folderId: parsedFolderId,
    folderName: 'HASILFOTO',
    eventName: eventName || 'Mobile Photobooth',
    createdAt: new Date().toISOString(),
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let data: {
      status?: string;
      message?: string;
      fileUrl?: string;
      url?: string;
      fileId?: string;
      id?: string;
      folderName?: string;
      error?: string;
    } | null = null;

    try {
      data = JSON.parse(text);
    } catch {
      if (text.includes('accounts.google.com') || text.includes('Service Login')) {
        return {
          success: false,
          message: 'Akses Google ditolak: Pastikan saat Deploy di Google Script, opsi "Who has access" disetel ke "Anyone" (Siapa saja).',
        };
      }
      return {
        success: false,
        message: 'Respon dari Google Script tidak valid. Silakan periksa kembali URL Web App Anda di panel admin.',
      };
    }

    if (data && data.status === 'success') {
      const publicUrl =
        data.fileUrl ||
        data.url ||
        (data.fileId ? `https://drive.google.com/file/d/${data.fileId}/view` : undefined);

      return {
        success: true,
        message: `Foto berhasil tersimpan di Google Drive (${data.folderName || 'Folder Target'})!`,
        fileUrl: publicUrl,
        fileId: data.fileId || data.id,
      };
    } else if (data && (data.error || data.message)) {
      return {
        success: false,
        message: `Gagal dari Google Script: ${data.error || data.message}`,
      };
    }

    return {
      success: false,
      message: 'Respon tidak dikenal dari Google Script.',
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('GAS Upload Error:', err);

    return {
      success: false,
      message: `Gagal menyimpan ke Google Drive: ${errorMsg}. Pastikan URL Web App benar dan opsi akses disetel ke "Anyone".`,
    };
  }
}

/**
 * Ready-to-copy Google Apps Script template code (Code.gs).
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * ========================================================
 * MOBILE PHOTOBOOTH - GOOGLE DRIVE AUTO UPLOADER (Code.gs)
 * ========================================================
 * 
 * SANGAT MUDAH:
 * Cukup tempel link folder Google Drive Anda (dengan izin akses: "Siapa saja yang memiliki link dapat mengedit").
 * Script ini otomatis mengenali Folder ID tersebut dan menyimpan semua foto ke dalamnya!
 */

function doPost(e) {
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return respondJson({ status: "error", message: "No data payload received" }, headers);
    }

    var data = JSON.parse(e.postData.contents);
    var base64Data = data.image;
    var filename = data.filename || ("Photobooth_" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd_HHmmss") + ".png");
    var mimeType = data.mimeType || "image/png";
    var folderId = data.folderId;
    var defaultFolderName = data.folderName || "HASILFOTO";

    if (!base64Data) {
      return respondJson({ status: "error", message: "Base64 image is empty" }, headers);
    }

    // 1. Tentukan target folder Google Drive berdasarkan Link/ID yang dimasukkan admin
    var targetFolder;
    if (folderId && folderId.trim() !== "") {
      try {
        targetFolder = DriveApp.getFolderById(folderId.trim());
      } catch (fErr) {
        // Jika folderId tidak ditemukan di akun ini, buat folder lokal bernama HASILFOTO
        targetFolder = getOrCreateFolder(defaultFolderName);
      }
    } else {
      targetFolder = getOrCreateFolder(defaultFolderName);
    }

    // 2. Decode Base64 menjadi file Blob PNG
    var decodedBytes = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decodedBytes, mimeType, filename);

    // 3. Simpan file ke dalam folder target Google Drive
    var file = targetFolder.createFile(blob);
    
    // Set file agar bisa dilihat melalui link publik
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch(shareErr) {
      // Abaikan jika akun workspace memiliki batasan organisasi
    }

    var result = {
      status: "success",
      message: "File berhasil disimpan ke folder " + targetFolder.getName(),
      fileId: file.getId(),
      fileUrl: file.getUrl(),
      downloadUrl: file.getDownloadUrl(),
      fileName: file.getName(),
      folderName: targetFolder.getName()
    };

    return respondJson(result, headers);

  } catch (error) {
    return respondJson({
      status: "error",
      message: error.toString()
    }, headers);
  }
}

function doGet(e) {
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  return respondJson({
    status: "active",
    service: "Mobile Photobooth Google Drive Endpoint",
    message: "Web App aktif dan siap menerima upload foto dari aplikasi photobooth!",
    timestamp: new Date().toISOString()
  }, headers);
}

function doOptions(e) {
  var output = ContentService.createTextOutput("");
  output.setMimeType(ContentService.MimeType.TEXT);
  return output;
}

function getOrCreateFolder(folderName) {
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

function respondJson(obj, headers) {
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
`;
