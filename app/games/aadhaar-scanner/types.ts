export type QRCodeType = 'SECURE_V2' | 'XML_OLD';

export interface ParsedRefId {
  aadhaarLast4: string;
  timestamp: string;
  rawTimestamp: string;
}

export interface AadhaarData {
  qrType: QRCodeType;
  emailMobileStatus: string;
  emailMobileIndicatorChar?: number;
  referenceId: string;
  parsedRefId?: ParsedRefId;
  name: string;
  dob: string;
  gender: string;
  careOf: string;
  district: string;
  landmark: string;
  house: string;
  location: string;
  pincode: string;
  postOffice: string;
  state: string;
  street: string;
  subDistrict: string;
  vtc: string;
  photoBase64: string | null;
  photoMimeType: string;
  emailHash: string | null;
  mobileHash: string | null;
  signature: string | null;
  rawBytes?: Uint8Array;
}

export enum ScanningStatus {
  IDLE = 'IDLE',
  SCANNING = 'SCANNING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
