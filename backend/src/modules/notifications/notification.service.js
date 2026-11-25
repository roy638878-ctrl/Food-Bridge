export function createNotification(db, { userId, title, message, type = "system" }) {
  db.prepare(
    `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`
  ).run(userId, title, message, type);
}

export function getUserNotifications(db, userId) {
  return db
    .prepare(
      `SELECT notification_id, title, message, type, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY notification_id DESC
       LIMIT 40`
    )
    .all(userId);
}

export function markAllNotificationsRead(db, userId) {
  db.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?").run(userId);
}
