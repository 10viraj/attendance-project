import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const GEOFENCE_TASK = 'GEOFENCE_TASK';

// Default office location if user didn't specify
const OFFICE_LAT = 28.6139;
const OFFICE_LNG = 77.2090;
const RADIUS = 150; // meters

let Notifications;
try {
  if (Constants.appOwnership !== 'expo' || Platform.OS !== 'android') {
    Notifications = require('expo-notifications');
  }
} catch (e) {
  console.log('Failed to load expo-notifications', e);
}

TaskManager.defineTask(GEOFENCE_TASK, ({ data: { eventType, region }, error }) => {
  if (error) {
    console.error(error.message);
    return;
  }
  if (!Notifications) return;

  if (eventType === Location.GeofencingEventType.Enter) {
    console.log("You've entered the office region!");
    Notifications.scheduleNotificationAsync({
      content: {
        title: "Welcome to the Office! 👋",
        body: "Don't forget to punch in for the day.",
      },
      trigger: null,
    });
  } else if (eventType === Location.GeofencingEventType.Exit) {
    console.log("You've left the office region!");
    Notifications.scheduleNotificationAsync({
      content: {
        title: "Leaving so soon? 🏃‍♂️",
        body: "Make sure you punched out before you head home.",
      },
      trigger: null,
    });
  }
});

export const startGeofencing = async () => {
  try {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') return;

    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') return;

    await Location.startGeofencingAsync(GEOFENCE_TASK, [
      {
        identifier: 'office',
        latitude: OFFICE_LAT,
        longitude: OFFICE_LNG,
        radius: RADIUS,
      },
    ]);
  } catch (error) {
    console.error('Error starting geofencing:', error);
  }
};
