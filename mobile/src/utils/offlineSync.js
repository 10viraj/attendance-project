import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import api from '../config/api';

export const syncOfflinePunches = async () => {
  try {
    const state = await NetInfo.fetch();
    if (!state.isConnected) return;

    const queueStr = await AsyncStorage.getItem('punchQueue');
    if (!queueStr) return;

    const queue = JSON.parse(queueStr);
    if (queue.length === 0) return;

    const token = await AsyncStorage.getItem('userToken');
    if (!token) return;

    console.log(`Syncing ${queue.length} offline punches...`);

    const failedPunches = [];

    for (const punch of queue) {
      try {
        // Send the offline timestamp as well
        const payload = { ...punch.payload, offlineTimestamp: punch.timestamp };
        await api.post(`/attendance/${punch.action}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.error('Failed to sync punch', punch, err);
        failedPunches.push(punch);
      }
    }

    // Keep the ones that still failed (e.g. server error)
    if (failedPunches.length > 0) {
      await AsyncStorage.setItem('punchQueue', JSON.stringify(failedPunches));
    } else {
      await AsyncStorage.removeItem('punchQueue');
    }
  } catch (error) {
    console.error('Error in syncOfflinePunches', error);
  }
};

export const startOfflineSyncListener = () => {
  return NetInfo.addEventListener(state => {
    if (state.isConnected) {
      syncOfflinePunches();
    }
  });
};
