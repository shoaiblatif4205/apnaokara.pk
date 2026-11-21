import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import type { LocalFile } from './api';

// Pick or take photos, then make them smaller before upload (saves data).

async function shrink(asset: ImagePicker.ImagePickerAsset): Promise<LocalFile> {
  const actions = asset.width > 1600 || asset.height > 1600
    ? [{ resize: asset.width >= asset.height ? { width: 1600 } : { height: 1600 } }]
    : [];
  const out = await ImageManipulator.manipulateAsync(asset.uri, actions, {
    compress: 0.8,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return { uri: out.uri, name: `photo-${Date.now()}.jpg`, type: 'image/jpeg' };
}

export async function pickPhotos(max: number): Promise<LocalFile[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return [];
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: max > 1,
    selectionLimit: max,
    quality: 1,
  });
  if (res.canceled) return [];
  return Promise.all(res.assets.slice(0, max).map(shrink));
}

export async function takePhoto(): Promise<LocalFile | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
  if (res.canceled || !res.assets[0]) return null;
  return shrink(res.assets[0]);
}
