const { Expo } = require('expo-server-sdk');
const User = require('../models/User');

let expo = new Expo();

exports.sendPushNotification = async (userId, title, body, data = {}) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.expoPushToken || !Expo.isExpoPushToken(user.expoPushToken)) {
      console.log('No valid push token for user', userId);
      return false;
    }

    const messages = [];
    messages.push({
      to: user.expoPushToken,
      sound: 'default',
      title,
      body,
      data,
    });

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (let chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
      }
    }

    return true;
  } catch (error) {
    console.error('Push notification error:', error);
    return false;
  }
};
