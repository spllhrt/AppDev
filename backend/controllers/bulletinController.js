const Bulletin = require('../models/bulletin');
const cloudinary = require("cloudinary").v2;

// Helper: upload one buffer to Cloudinary and return the result
const uploadBufferToCloudinary = (buffer, folder = "bulletins") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) {
          console.error("Cloudinary Upload Error:", error);
          reject(error);
        } else {
          console.log("Cloudinary Upload Success:", result.public_id);
          resolve(result);
        }
      }
    );
    stream.end(buffer);
  });
};

// Create bulletin with multiple images upload via buffers
exports.createBulletin = async (req, res) => {
  try {
    console.log("Received createBulletin request:", req.body);
    const { title, category, message } = req.body;
    const createdBy = req.user._id;

    if (!title || !message) {
      console.warn("Validation failed: Title and message required.");
      return res.status(400).json({ message: "Title and message are required." });
    }

    let photos = [];

    if (req.files && req.files.length > 0) {
      console.log(`Uploading ${req.files.length} images to Cloudinary...`);
      // Upload all images sequentially
      for (const file of req.files) {
        const uploadResult = await uploadBufferToCloudinary(file.buffer, "bulletins");
        photos.push({
          public_id: uploadResult.public_id,
          url: uploadResult.secure_url,
        });
      }
      console.log("All images uploaded successfully:", photos);
    } else {
      console.log("No images to upload.");
    }

    const bulletin = new Bulletin({
      title,
      category,
      message,
      photos,
      createdBy,
    });

    await bulletin.save();
    console.log("Bulletin created with ID:", bulletin._id);

    return res.status(201).json(bulletin);
  } catch (error) {
    console.error("Error creating bulletin:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Toggle reaction (upvote/downvote)
exports.toggleReaction = async (req, res) => {
  try {
    console.log("Toggle reaction request:", req.params.id, req.body);
    const bulletinId = req.params.id;
    const userId = req.user._id;
    const { type } = req.body;

    if (!['upvote', 'downvote'].includes(type)) {
      console.warn("Invalid reaction type:", type);
      return res.status(400).json({ message: 'Invalid reaction type' });
    }

    const bulletin = await Bulletin.findById(bulletinId);
    if (!bulletin) {
      console.warn("Bulletin not found:", bulletinId);
      return res.status(404).json({ message: 'Bulletin not found' });
    }

    const existingReactionIndex = bulletin.reactions.findIndex(r => r.user.equals(userId));

    if (existingReactionIndex !== -1) {
      const existingReaction = bulletin.reactions[existingReactionIndex];
      if (existingReaction.type === type) {
        console.log("Removing existing reaction");
        // Remove reaction
        bulletin.reactions.splice(existingReactionIndex, 1);
      } else {
        console.log("Switching reaction type");
        // Switch reaction
        bulletin.reactions[existingReactionIndex].type = type;
        bulletin.reactions[existingReactionIndex].createdAt = new Date();
      }
    } else {
      console.log("Adding new reaction");
      // Add new reaction
      bulletin.reactions.push({ user: userId, type });
    }

    await bulletin.save();
    console.log("Reaction updated successfully");

    res.json({ message: 'Reaction updated', reactions: bulletin.reactions });
  } catch (err) {
    console.error("Error toggling reaction:", err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add a comment
exports.addComment = async (req, res) => {
  try {
    console.log("Add comment request:", req.params.id, req.body);
    const bulletinId = req.params.id;
    const userId = req.user._id;
    const { text } = req.body;

    if (!text || text.trim().length === 0 || text.length > 200) {
      console.warn("Invalid comment text");
      return res.status(400).json({ message: 'Comment text required (max 200 chars)' });
    }

    const bulletin = await Bulletin.findById(bulletinId);
    if (!bulletin) {
      console.warn("Bulletin not found for comment:", bulletinId);
      return res.status(404).json({ message: 'Bulletin not found' });
    }

    bulletin.comments.push({ user: userId, text: text.trim() });
    await bulletin.save();
    console.log("Comment added successfully");

    res.status(201).json({ message: 'Comment added', comments: bulletin.comments });
  } catch (err) {
    console.error("Error adding comment:", err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all bulletins (with populated user info)
exports.getAllBulletins = async (req, res) => {
  try {
    console.log("Fetching all bulletins");
    const bulletins = await Bulletin.find()
      .populate('createdBy', 'name')
      .populate('reactions.user', 'name')
      .populate('comments.user', 'name')
      .sort({ createdAt: -1 });

    res.json(bulletins);
  } catch (err) {
    console.error("Error fetching all bulletins:", err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get one bulletin by ID
exports.getBulletinById = async (req, res) => {
  try {
    console.log("Fetching bulletin by ID:", req.params.id);
    const bulletin = await Bulletin.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('reactions.user', 'name')
      .populate('comments.user', 'name');

    if (!bulletin) {
      console.warn("Bulletin not found:", req.params.id);
      return res.status(404).json({ message: 'Bulletin not found' });
    }
    res.json(bulletin);
  } catch (err) {
    console.error("Error fetching bulletin by ID:", err);
    res.status(500).json({ message: 'Server error' });
  }
};


// Delete bulletin (admin only)
// Delete bulletin (admin only)
exports.deleteBulletin = async (req, res) => {
  try {
    console.log("Deleting bulletin:", req.params.id);
    const bulletin = await Bulletin.findById(req.params.id);
    if (!bulletin) {
      console.warn("Bulletin not found for deletion:", req.params.id);
      return res.status(404).json({ message: 'Bulletin not found' });
    }
    
    await Bulletin.deleteOne({ _id: req.params.id });
    
    
    console.log("Bulletin deleted:", req.params.id);
    res.json({ message: 'Bulletin deleted' });
  } catch (err) {
    console.error("Error deleting bulletin:", err);
    res.status(500).json({ message: 'Server error' });
  }
};
exports.updateBulletin = async (req, res) => {
  const id = req.params.id;

  try {
    const bulletin = await Bulletin.findById(id);

    if (!bulletin) {
      return res.status(404).json({ message: 'Bulletin not found' });
    }

    // Update text fields
    bulletin.title = req.body.title || bulletin.title;
    bulletin.category = req.body.category || bulletin.category;
    bulletin.message = req.body.message || bulletin.message;

    // Handle image updates
    if (req.files && req.files.length > 0) {
      console.log(`Uploading ${req.files.length} new images...`);

      const newPhotos = [];
      for (const file of req.files) {
        const uploadResult = await uploadBufferToCloudinary(file.buffer, "bulletins");
        newPhotos.push({
          public_id: uploadResult.public_id,
          url: uploadResult.secure_url,
        });
      }

      bulletin.photos = newPhotos;
    }

    await bulletin.save();

    res.json({ message: 'Bulletin updated successfully', bulletin });

  } catch (err) {
    console.error('Error updating bulletin:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
