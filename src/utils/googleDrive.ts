/**
 * Google Drive & Google Apps Script (GAS) Integration Utilities
 */

/**
 * Extracts Google Drive File ID from standard Drive sharing links or raw IDs.
 */
export function extractDriveFileId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();

  // If it's already just an alphanumeric ID (typically 28-44 chars)
  if (/^[a-zA-Z0-9_-]{25,}$/.test(trimmed)) {
    return trimmed;
  }

  // Matches /file/d/ID or id=ID or open?id=ID
  const fileDMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return fileDMatch[1];
  }

  const idQueryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idQueryMatch && idQueryMatch[1]) {
    return idQueryMatch[1];
  }

  return trimmed;
}

/**
 * Generates direct viewable image URLs from a Google Drive File ID.
 */
export function getDriveDirectImageUrl(input: string): string {
  if (!input) return '';
  if (input.startsWith('data:image/') || input.startsWith('blob:') || input.startsWith('http://') || (input.startsWith('https://') && !input.includes('drive.google.com'))) {
    return input;
  }

  const id = extractDriveFileId(input);
  if (id && /^[a-zA-Z0-9_-]{25,}$/.test(id)) {
    // lh3.googleusercontent.com is fast, reliable, and avoids CORS issues for images with "Anyone with the link" permissions
    return `https://lh3.googleusercontent.com/d/${id}`;
  }

  return input;
}

/**
 * Uploads captured photobooth image to Google Drive via Google Apps Script Web App.
 */
export async function uploadToGoogleDrive(params: {
  gasWebAppUrl: string;
  folderId?: string;
  base64Image: string;
  eventName?: string;
  fileName?: string;
}): Promise<{ success: boolean; message: string; fileUrl?: string; fileId?: string }> {
  const { gasWebAppUrl, folderId, base64Image, eventName, fileName } = params;

  if (!gasWebAppUrl || !gasWebAppUrl.trim()) {
    return {
      success: false,
      message: 'URL Google Apps Script belum dikonfigurasi di Panel Admin.',
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
    folderId: folderId ? extractDriveFileId(folderId) : '',
    folderName: 'HASILFOTO',
    eventName: eventName || 'Mobile Photobooth',
    createdAt: new Date().toISOString(),
  };

  try {
    // Note: Google Apps Script Web Apps follow redirects (302).
    // Using standard fetch with Content-Type text/plain;charset=utf-8 avoids browser preflight OPTIONS issues.
    const response = await fetch(gasWebAppUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok && response.type !== 'opaque') {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }

    // Try parsing JSON response from GAS
    try {
      const data = await response.json();
      if (data && data.status === 'success') {
        return {
          success: true,
          message: 'Berhasil disimpan ke Google Drive!',
          fileUrl: data.fileUrl || data.url,
          fileId: data.fileId || data.id,
        };
      } else if (data && data.error) {
        return {
          success: false,
          message: `Gagal dari Google Script: ${data.error}`,
        };
      }
    } catch {
      // If response text was not JSON or redirected
      return {
        success: true,
        message: 'Foto berhasil dikirim ke Google Apps Script!',
      };
    }

    return {
      success: true,
      message: 'Foto berhasil diunggah ke Google Drive!',
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('GAS Upload Error:', err);

    // If fetch failed due to CORS redirect in standard browser mode,
    // Google Apps Script still frequently processes the POST request.
    return {
      success: false,
      message: `Gagal mengirim ke Google Drive: ${errorMsg}. Pastikan Apps Script di-deploy dengan akses "Anyone" (Siapa saja).`,
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
 * CARA MEMASANG:
 * 1. Buka https://script.google.com/
 * 2. Buat proyek baru (Beri nama: "Photobooth Uploader")
 * 3. Hapus semua kode default, lalu Tempel (Paste) kode ini seluruhnya
 * 4. Klik tombol "Deploy" (Terapkan) di pojok kanan atas -> "New deployment" (Penerapan baru)
 * 5. Pilih jenis: "Web app" (Aplikasi web)
 * 6. Pengaturan Penting:
 *    - Description: Photobooth API
 *    - Execute as: "Me" (Saya / email Anda)
 *    - Who has access: "Anyone" (Siapa saja)  <-- SANGAT PENTING!
 * 7. Klik "Deploy", beri izin (Authorize Access) jika diminta
 * 8. Salin "Web app URL" (akhiran /exec) dan masukkan ke Panel Admin Web App ini!
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

    // 1. Tentukan target folder Google Drive
    var targetFolder;
    if (folderId && folderId.trim() !== "") {
      try {
        targetFolder = DriveApp.getFolderById(folderId.trim());
      } catch (fErr) {
        // Jika ID tidak valid, buat/cari folder default HASILFOTO
        targetFolder = getOrCreateFolder(defaultFolderName);
      }
    } else {
      targetFolder = getOrCreateFolder(defaultFolderName);
    }

    // 2. Decode Base64 menjadi file Blob
    var decodedBytes = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decodedBytes, mimeType, filename);

    // 3. Simpan file ke dalam folder target
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
