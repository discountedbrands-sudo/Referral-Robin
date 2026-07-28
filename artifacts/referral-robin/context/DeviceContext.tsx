import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DeviceContext = createContext<string | null>(null);

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    async function initDevice() {
      try {
        const stored = await AsyncStorage.getItem('deviceId');
        if (stored) {
          setDeviceId(stored);
          return;
        }
        const id = Crypto.randomUUID();
        await AsyncStorage.setItem('deviceId', id);
        setDeviceId(id);
      } catch (err) {
        console.error("Failed to init device ID", err);
      }
    }
    initDevice();
  }, []);

  return (
    <DeviceContext.Provider value={deviceId}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevice() {
  const id = useContext(DeviceContext);
  return id;
}
