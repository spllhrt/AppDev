const express = require('express');
const router = express.Router();

const {
  createBulletin,
  toggleReaction,
  addComment,
  getAllBulletins,
  getBulletinById,
  deleteBulletin,
  updateBulletin
} = require('../controllers/bulletinController');

const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');

const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Create bulletin (admin only) with multiple images upload
router.post(
  '/',
  isAuthenticatedUser,
  authorizeRoles('admin'),
  upload.array('photos'), // max 5 images with buffers
  createBulletin
);

// Toggle reaction (upvote/downvote)
router.patch('/:id/reactions', isAuthenticatedUser, toggleReaction);

// Add comment
router.post('/:id/comments', isAuthenticatedUser, addComment);

// Get all bulletins
router.get('/', isAuthenticatedUser, getAllBulletins);

// Get one bulletin by ID
router.get('/:id', isAuthenticatedUser, getBulletinById);

// Delete bulletin (admin only)
router.delete('/:id', isAuthenticatedUser, authorizeRoles('admin'), deleteBulletin);

router.put('/:id', isAuthenticatedUser, authorizeRoles('admin'), upload.array('photos'),updateBulletin);


module.exports = router;
