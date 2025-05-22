import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Application from 'expo-application';

const DEVICE_FINGERPRINT_KEY = '@device_fingerprint';

export const generateDeviceFingerprint = async () => {
  try {
    // Get basic device info that's available on both platforms
    const deviceName = await Device.getDeviceNameAsync();
    const brand = Device.brand;
    const modelName = Device.modelName;
    const osVersion = Device.osVersion;
    const deviceType = Device.deviceType;
    
    // Get additional platform-specific identifiers
    let additionalInfo = '';
    if (Platform.OS === 'android') {
      const androidId = Application.androidId;
      additionalInfo = `-${androidId}`;
    } else if (Platform.OS === 'ios') {
      const iosId = Application.applicationId;
      additionalInfo = `-${iosId}`;
    }
    
    // Combine all identifiers to create a unique fingerprint
    const fingerprint = `${deviceName}-${brand}-${modelName}-${osVersion}-${deviceType}${additionalInfo}`;
    
    // Store the fingerprint
    await AsyncStorage.setItem(DEVICE_FINGERPRINT_KEY, fingerprint);
    
    return fingerprint;
  } catch (error) {
    console.error('Error generating device fingerprint:', error);
    // Fallback to a basic fingerprint if detailed info fails
    try {
      const basicFingerprint = `${Platform.OS}-${Device.brand}-${Device.modelName}`;
      await AsyncStorage.setItem(DEVICE_FINGERPRINT_KEY, basicFingerprint);
      return basicFingerprint;
    } catch (fallbackError) {
      console.error('Error generating fallback fingerprint:', fallbackError);
      return null;
    }
  }
};

export const getDeviceFingerprint = async () => {
  try {
    // Try to get existing fingerprint
    let fingerprint = await AsyncStorage.getItem(DEVICE_FINGERPRINT_KEY);
    
    // If no fingerprint exists, generate a new one
    if (!fingerprint) {
      fingerprint = await generateDeviceFingerprint();
    }
    
    return fingerprint;
  } catch (error) {
    console.error('Error getting device fingerprint:', error);
    return null;
  }
};

export const checkDeviceFingerprint = async (supabase) => {
  try {
    const fingerprint = await getDeviceFingerprint();
    if (!fingerprint) return true; // Allow if fingerprint generation fails
    
    // Check if this device has been used before
    const { data, error } = await supabase
      .from('device_fingerprints')
      .select('*')
      .eq('fingerprint', fingerprint);
      
    if (error) throw error;
    
    // If device has been used before, check if it's associated with an account
    if (data && data.length > 0) {
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('device_fingerprint', fingerprint)
        .single();
        
      if (userError) throw userError;
      
      // If device is already associated with an account, prevent new account creation
      if (userData) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error checking device fingerprint:', error);
    return true; // Allow if check fails
  }
};

export const associateDeviceWithUser = async (supabase, userId) => {
  try {
    const fingerprint = await getDeviceFingerprint();
    if (!fingerprint) return;
    
    // Store the device fingerprint
    const { error: fingerprintError } = await supabase
      .from('device_fingerprints')
      .insert([{ fingerprint, user_id: userId }]);
      
    if (fingerprintError) throw fingerprintError;
    
    // Update user profile with device fingerprint
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ device_fingerprint: fingerprint })
      .eq('id', userId);
      
    if (profileError) throw profileError;
  } catch (error) {
    console.error('Error associating device with user:', error);
  }
}; 