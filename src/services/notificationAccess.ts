import { registerPlugin } from '@capacitor/core';
export const NotificationAccess = registerPlugin<any>('NotificationAccess');
export async function notificationStatus(){try{return await NotificationAccess.status()}catch{return {enabled:false,connected:false}}}
export async function openNotificationSettings(){return NotificationAccess.openSettings()}
export async function recentNotifications(){try{return (await NotificationAccess.recent()).items||[]}catch{return []}}
