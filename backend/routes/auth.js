const express = require("express");
const router = express.Router();
const upload = require("../utils/multer");
const { registerUser,
    loginUser, 
    logout,
    getUserProfile,
    updateProfile,
    updatePassword,
    allUsers,
    updateUser,
    getUserDetails,
 } = require("../controllers/auth");

const { isAuthenticatedUser,  authorizeRoles } = require('../middlewares/auth');

router.post("/register", upload.single("avatar"), registerUser);
router.post('/login', loginUser);
router.get('/logout', logout);

router.get('/me', isAuthenticatedUser, getUserProfile)
router.put('/me/update', isAuthenticatedUser, upload.single('avatar'), updateProfile);
router.put('/password/update', isAuthenticatedUser, updatePassword)
router.route('/user/:id').get(isAuthenticatedUser,  getUserDetails)

router.get('/admin/users', isAuthenticatedUser, authorizeRoles('admin'), allUsers)
router.put('/admin/user/:id', isAuthenticatedUser, authorizeRoles('admin'), updateUser);

module.exports = router;