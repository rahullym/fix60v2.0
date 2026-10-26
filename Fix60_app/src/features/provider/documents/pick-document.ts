import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import {
  type AllowedDocumentMimeType,
  isAllowedMimeType,
  MAX_DOCUMENT_BYTES,
  resolveMimeType,
} from '@/entities/application/required-documents';

export type DocumentSource = 'camera' | 'gallery' | 'pdf';

export interface PickedFile {
  uri: string;
  mimeType: AllowedDocumentMimeType;
  sizeBytes: number;
  fileName: string;
}

/** Why a pick did not produce an uploadable file. Each maps to `provider:documents.errors.<reason>`. */
export type PickFailure = 'cancelled' | 'permission' | 'tooLarge' | 'badType' | 'unreadable';

export type PickResult = { ok: true; file: PickedFile } | { ok: false; reason: PickFailure };

const IMAGE_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.7,
  allowsEditing: false,
  exif: false,
};

/** Picker size, or the size read from disk when the picker did not report one. */
function resolveSize(uri: string, size: number | null | undefined): number | undefined {
  if (typeof size === 'number' && size > 0) {
    return size;
  }
  try {
    const diskSize = new File(uri).size;
    return typeof diskSize === 'number' && diskSize > 0 ? diskSize : undefined;
  } catch {
    return undefined;
  }
}

function check(uri: string, mime: string | null, pickerSize: number | null | undefined, name: string | null | undefined): PickResult {
  if (!isAllowedMimeType(mime)) {
    return { ok: false, reason: 'badType' };
  }
  const size = resolveSize(uri, pickerSize);
  if (size === undefined || size <= 0) {
    return { ok: false, reason: 'unreadable' };
  }
  if (size > MAX_DOCUMENT_BYTES) {
    return { ok: false, reason: 'tooLarge' };
  }
  const extension = mime === 'application/pdf' ? 'pdf' : mime === 'image/png' ? 'png' : 'jpg';
  return { ok: true, file: { uri, mimeType: mime, sizeBytes: size, fileName: name || `document.${extension}` } };
}

/** Opens the camera, gallery or file picker and enforces jpg/png/pdf ≤ 5 MB on the device. */
export async function pickDocument(source: DocumentSource): Promise<PickResult> {
  if (source === 'pdf') {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) {
      return { ok: false, reason: 'cancelled' };
    }
    return check(asset.uri, resolveMimeType(asset.mimeType, asset.name), asset.size, asset.name);
  }

  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { ok: false, reason: 'permission' };
  }
  const result =
    source === 'camera' ? await ImagePicker.launchCameraAsync(IMAGE_OPTIONS) : await ImagePicker.launchImageLibraryAsync(IMAGE_OPTIONS);
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) {
    return { ok: false, reason: 'cancelled' };
  }
  return check(asset.uri, resolveMimeType(asset.mimeType, asset.fileName), asset.fileSize, asset.fileName);
}
