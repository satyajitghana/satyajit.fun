import pako from 'pako';
import { AadhaarData } from '../types';

// Helper to parse the Reference ID (RefID = Last 4 Aadhaar + Timestamp)
const parseReferenceId = (refId: string) => {
  if (!refId || refId.length < 18) return undefined;

  // Format is Last 4 digits of Aadhaar code and date time stamp in "DDMMYYYYHHMMSSsss"
  const aadhaarLast4 = refId.substring(0, 4);
  const ts = refId.substring(4);

  // Basic sanity check on length
  if (ts.length < 14) return { aadhaarLast4, timestamp: ts, rawTimestamp: ts };

  const day = ts.substring(0, 2);
  const month = ts.substring(2, 4);
  const year = ts.substring(4, 8);
  const hour = ts.substring(8, 10);
  const min = ts.substring(10, 12);
  const sec = ts.substring(12, 14);
  const ms = ts.substring(14);

  return {
    aadhaarLast4,
    rawTimestamp: ts,
    timestamp: `${day}-${month}-${year} ${hour}:${min}:${sec}.${ms}`
  };
};

// XML Parser for Old QR Codes
const decodeXMLData = (xmlStr: string): AadhaarData => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlStr, "text/xml");

  // Usually the root is <PrintLetterBarcodeData> or <QPDB>
  const root = xmlDoc.getElementsByTagName("PrintLetterBarcodeData")[0] ||
               xmlDoc.getElementsByTagName("QPDB")[0];

  if (!root) {
    throw new Error("Invalid Aadhaar XML format");
  }

  const getAttr = (name: string) => root.getAttribute(name) || root.getAttribute(name.toLowerCase()) || "";

  // Map attributes
  // Note: Old XML usually doesn't have the photo embedded directly in base64 within the QR tag
  // due to size limits of standard QR codes at the time.

  return {
    qrType: 'XML_OLD',
    name: getAttr('name'),
    dob: getAttr('dob') || getAttr('yob'),
    gender: getAttr('gender'),
    referenceId: getAttr('uid'),
    parsedRefId: undefined,
    careOf: getAttr('co'),
    district: getAttr('dist'),
    landmark: getAttr('lm'),
    house: getAttr('house'),
    location: getAttr('loc'),
    pincode: getAttr('pc'),
    postOffice: getAttr('po'),
    state: getAttr('state'),
    street: getAttr('street'),
    subDistrict: getAttr('subdist'),
    vtc: getAttr('vtc'),
    emailMobileStatus: "Not Available in XML",
    emailMobileIndicatorChar: undefined,
    photoBase64: null,
    photoMimeType: 'image/png',
    emailHash: null,
    mobileHash: null,
    signature: null,
  };
};

// Secure QR (BigInt/Gzip) Parser
const decodeSecureV2Data = (qrData: string): AadhaarData => {
    // 1. Convert Base10 (BigInt) to Byte Array
    const bigIntToByteArray = (bigIntStr: string): Uint8Array => {
        let bigInt = BigInt(bigIntStr);
        let hex = bigInt.toString(16);
        if (hex.length % 2) hex = '0' + hex;
        const len = hex.length / 2;
        const u8 = new Uint8Array(len);
        let i = 0; let j = 0;
        while (i < len) {
            u8[i] = parseInt(hex.slice(j, j + 2), 16);
            i += 1; j += 2;
        }
        return u8;
    };

    const bytesToHex = (bytes: Uint8Array) => Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

    const compressedBytes = bigIntToByteArray(qrData);

    let decompressedBytes: Uint8Array;
    try {
        decompressedBytes = pako.inflate(compressedBytes);
    } catch (e) {
        console.warn("Decompression failed, attempting raw parse", e);
        decompressedBytes = compressedBytes;
    }

    const decoder = new TextDecoder('iso-8859-1');
    const DELIMITER = 255;
    const fields: string[] = [];
    let currentIdx = 0;

    for (let i = 0; i < 16; i++) {
        const endIdx = decompressedBytes.indexOf(DELIMITER, currentIdx);
        if (endIdx === -1) break;
        fields.push(decoder.decode(decompressedBytes.slice(currentIdx, endIdx)));
        currentIdx = endIdx + 1;
    }

    const emailMobileIndicator = parseInt(fields[0] || '0', 10);
    const refId = fields[1] || '';

    const totalLen = decompressedBytes.length;
    const sigLen = 256;
    const hashLen = 32;

    let mobileHash: Uint8Array | null = null;
    let emailHash: Uint8Array | null = null;
    let currentEndOffset = totalLen - sigLen;
    const signatureBytes = decompressedBytes.slice(currentEndOffset, totalLen);

    if (emailMobileIndicator === 1) {
            currentEndOffset -= hashLen;
            emailHash = decompressedBytes.slice(currentEndOffset, currentEndOffset + hashLen);
    } else if (emailMobileIndicator === 2) {
            currentEndOffset -= hashLen;
            mobileHash = decompressedBytes.slice(currentEndOffset, currentEndOffset + hashLen);
    } else if (emailMobileIndicator === 3) {
            currentEndOffset -= hashLen;
            mobileHash = decompressedBytes.slice(currentEndOffset, currentEndOffset + hashLen);
            currentEndOffset -= hashLen;
            emailHash = decompressedBytes.slice(currentEndOffset, currentEndOffset + hashLen);
    }

    const photoBytes = decompressedBytes.slice(currentIdx, currentEndOffset);
    let mimeType = 'image/jp2';
    if (photoBytes.length > 2) {
        if (photoBytes[0] === 0xFF && photoBytes[1] === 0xD8) mimeType = 'image/jpeg';
        else if (photoBytes[0] === 0x89 && photoBytes[1] === 0x50) mimeType = 'image/png';
    }

    // Convert photo to base64 safely
    let binary = '';
    const len = photoBytes.byteLength;
    const chunkSize = 8192;
    for (let i = 0; i < len; i += chunkSize) {
        const chunk = photoBytes.subarray(i, Math.min(i + chunkSize, len));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const photoBase64 = btoa(binary);

    return {
        qrType: 'SECURE_V2',
        emailMobileStatus: ['None', 'Email Only', 'Mobile Only', 'Both'][emailMobileIndicator] || 'Unknown',
        emailMobileIndicatorChar: emailMobileIndicator,
        referenceId: refId,
        parsedRefId: parseReferenceId(refId),
        name: fields[2] || '',
        dob: fields[3] || '',
        gender: fields[4] || '',
        careOf: fields[5] || '',
        district: fields[6] || '',
        landmark: fields[7] || '',
        house: fields[8] || '',
        location: fields[9] || '',
        pincode: fields[10] || '',
        postOffice: fields[11] || '',
        state: fields[12] || '',
        street: fields[13] || '',
        subDistrict: fields[14] || '',
        vtc: fields[15] || '',
        photoBase64: photoBase64,
        photoMimeType: mimeType,
        emailHash: emailHash ? bytesToHex(emailHash) : null,
        mobileHash: mobileHash ? bytesToHex(mobileHash) : null,
        signature: bytesToHex(signatureBytes),
    };
};

export const parseQRCodeData = (data: string): AadhaarData => {
  // Check if XML
  if (data.trim().startsWith('<') || data.includes('<?xml')) {
    return decodeXMLData(data);
  }

  // Assume Secure QR (BigInt String)
  // Basic validation: should be digits
  if (/^\d+$/.test(data)) {
    return decodeSecureV2Data(data);
  }

  throw new Error("Unknown QR Format. Not XML and not valid Secure QR BigInt.");
};
