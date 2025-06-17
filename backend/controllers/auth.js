const User = require("../models/user");
const cloudinary = require("cloudinary").v2;
const sendToken = require("../utils/jwtToken");

exports.registerUser = async (req, res, next) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ error: "No image file uploaded" });
        }

        console.log("Uploading file to Cloudinary...");
        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder: "avatars", width: 150, crop: "scale" },
                (error, result) => {
                    if (error) {
                        console.error("Cloudinary Upload Error:", error);
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            );
            stream.end(req.file.buffer);
        });

        const { name, email, city, password } = req.body;

        const user = await User.create({
            name,
            email,
            password,
            city,
            avatar: {
                public_id: result.public_id,
                url: result.secure_url,
            },
        });

        sendToken(user, 200, res);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


exports.loginUser = async (req, res, next) => {
    const { email, password } = req.body;

    let user = await User.findOne({ email }).select('+password')
    if (!user) {
        return res.status(401).json({ message: 'Invalid Email or Password' })
    }

    const isPasswordMatched = await user.comparePassword(password);
    if (!isPasswordMatched) {
        return res.status(401).json({ message: 'Invalid Email or Password' })
    }
    sendToken(user, 200, res)
}

exports.logout = async (req, res, next) => {
    res.cookie('token', null, {
        expires: new Date(Date.now()),
        httpOnly: true
    })

    res.status(200).json({
        success: true,
        message: 'Logged out'
    })
}

exports.getUserProfile = async (req, res, next) => {
    const user = await User.findById(req.user.id);

    return res.status(200).json({
        success: true,
        user
    })
}
exports.updateProfile = async (req, res, next) => {
    try {
        const newUserData = {
            name: req.body.name,
            email: req.body.email,
            city: req.body.city,
        };

        if (req.file && req.file.buffer) {
            const user = await User.findById(req.user.id);
            if (user.avatar && user.avatar.public_id) {
                const image_id = user.avatar.public_id;
                console.log("Removing old avatar from Cloudinary...");
                const destroyResult = await cloudinary.uploader.destroy(image_id);
                console.log("Old avatar removed:", destroyResult);
            }

            console.log("Uploading new avatar to Cloudinary...");
            const result = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: "avatars", width: 150, crop: "scale" },
                    (error, result) => {
                        if (error) {
                            console.error("Cloudinary Upload Error:", error);
                            reject(error);
                        } else {
                            console.log("Cloudinary Upload Success:", result);
                            resolve(result);
                        }
                    }
                );
                stream.end(req.file.buffer);
            });

            newUserData.avatar = {
                public_id: result.public_id,
                url: result.secure_url
            };
        }

        const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
            new: true,
            runValidators: true,
        });

        if (!user) {
            return res.status(401).json({ message: 'User Not Updated' });
        }

        return res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        console.error("Error during profile update:", error);
        return res.status(500).json({ error: error.message });
    }
};
exports.updatePassword = async (req, res, next) => {
    try {
        const { oldPassword, password } = req.body;

        if (!oldPassword || !password) {
            return res.status(400).json({ message: "Please provide both old and new passwords." });
        }

        const user = await User.findById(req.user.id).select('+password');

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const isMatched = await user.comparePassword(oldPassword);
        if (!isMatched) {
            return res.status(400).json({ message: "Old password is incorrect." });
        }

        user.password = password;
        await user.save();

        const token = user.getJwtToken();

        return res.status(200).json({
            success: true,
            user,
            token,
        });
    } catch (error) {
        console.error("Error in updatePassword:", error);
        return res.status(500).json({ message: error.message });
    }
};

exports.getUserDetails = async (req, res, next) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        return res.status(400).json({ message: `User does not found with id: ${req.params.id}` })
    }

    return res.status(200).json({
        success: true,
        user
    })
}

exports.allUsers = async (req, res, next) => {
    const users = await User.find();
    if (!users) {
        return res.status(400).json({ error: 'no users found' })
    }

    return res.status(200).json({
        success: true,
        users
    })
}

exports.updateUser = async (req, res, next) => {
    try {
        const newUserData = {
            role: req.body.role,
            status: req.body.status
        };

        const user = await User.findByIdAndUpdate(req.params.id, newUserData, {
            new: true,
            runValidators: true,
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        console.error("Error during user update:", error);
        return res.status(500).json({ error: error.message });
    }
};