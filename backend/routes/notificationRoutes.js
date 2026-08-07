const express = require("express");
const authController = require("../controllers/authController");
const notificationController = require("../controllers/notificationController");

const router = express.Router();

router.use(authController.protect);

router.get("/", notificationController.getMyNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.post("/push-subscription", notificationController.savePushSubscription);
router.delete("/push-subscription", notificationController.deletePushSubscription);
router.get("/preferences", notificationController.getPreferences);
router.put("/preferences", notificationController.updatePreferences);
router.put("/read-all", notificationController.markAllAsRead);
router.put("/:id/read", notificationController.markAsRead);
router.post("/announcements", authController.requireRole("admin"), notificationController.createSystemAnnouncement);

module.exports = router;
