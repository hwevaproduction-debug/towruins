const express = require("express");
const authController = require("../controllers/authController");
const roomController = require("../controllers/roomController");

const router = express.Router();

router.get("/public/:id", roomController.getPublicRoom);
router.get("/:id/calendar", roomController.getRoomCalendar);
router.get("/:id/availability", roomController.getRoomAvailability);

router.use(authController.protect);
router.use(authController.requireRole("provider"));

router.post("/", roomController.createRoom);
router.get("/mine", roomController.getMyRooms);
router.get("/:id/blocks", roomController.listRoomBlocks);
router.post("/:id/blocks", roomController.createRoomBlock);
router.delete("/:id/blocks/:blockId", roomController.deleteRoomBlock);
router.post("/:id/images", roomController.addRoomImage);
router.patch("/:id/images/:imageId", roomController.updateRoomImage);
router.delete("/:id/images/:imageId", roomController.deleteRoomImage);
router.get("/:id/seasonal-rates", roomController.listSeasonalRates);
router.post("/:id/seasonal-rates", roomController.createSeasonalRate);
router.put("/:id/seasonal-rates/:rateId", roomController.updateSeasonalRate);
router.delete("/:id/seasonal-rates/:rateId", roomController.deleteSeasonalRate);
router.get("/:id/occupancy-pricing", roomController.getOccupancyPricingRule);
router.put("/:id/occupancy-pricing", roomController.upsertOccupancyPricingRule);
router.delete("/:id/occupancy-pricing", roomController.deleteOccupancyPricingRule);
router.get("/:id/fees", roomController.listRoomFees);
router.post("/:id/fees", roomController.createRoomFee);
router.put("/:id/fees/:feeId", roomController.updateRoomFee);
router.delete("/:id/fees/:feeId", roomController.deleteRoomFee);
router.put("/:id", roomController.updateRoom);
router.patch("/:id", roomController.updateRoom);
router.delete("/:id", roomController.deleteRoom);
router.post("/:id/block", roomController.createRoomBlock);
router.delete("/:id/block/:blockId", roomController.deleteRoomBlock);

module.exports = router;
