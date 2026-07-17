import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_DIMENSION = 512;
const MAX_DATA_URL_LENGTH = 400000; // matches backend's photo maxlength (models/Parent.js)

async function resizeAndEncode(uri, width, height, quality) {
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);

  const context = ImageManipulator.manipulate(uri).resize({ width: targetWidth, height: targetHeight });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ compress: quality, format: SaveFormat.JPEG, base64: true });
  return `data:image/jpeg;base64,${result.base64}`;
}

/**
 * Opens the photo library, resizes the pick to fit under the backend's
 * ~400KB data-URL limit, and returns a data URI ready to submit as `photo`.
 * Mirrors web's handleEcPhoto (public/dashboard.html): max 512px side,
 * JPEG quality 0.8 first, 0.55 fallback if still too large.
 *
 * Returns null if the user cancels or permission is denied.
 * Throws if the image still can't be shrunk under the size limit.
 */
export async function pickAndResizeChildPhoto() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsEditing: false,
  });
  if (result.canceled || !result.assets || !result.assets[0]) return null;

  const asset = result.assets[0];
  let dataUrl = await resizeAndEncode(asset.uri, asset.width, asset.height, 0.8);
  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    dataUrl = await resizeAndEncode(asset.uri, asset.width, asset.height, 0.55);
  }
  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    throw new Error('Photo is too large — try a smaller image.');
  }
  return dataUrl;
}
