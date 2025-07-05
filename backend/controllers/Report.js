const Report = require('../models/Report');
const cloudinary = require('cloudinary');

// Create Report
exports.submitReport = async (req, res) => {
  try {
    const {
      type,
      location,
      time,
      description,
      isAnonymous,
    } = req.body;

    let photoData = {};

    if (req.file) {
      const streamUpload = (req) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.v2.uploader.upload_stream(
            {
              folder: 'airnet_reports',
            },
            (error, result) => {
              if (result) {
                resolve(result);
              } else {
                reject(error);
              }
            }
          );
          stream.end(req.file.buffer);
        });
      };

      const result = await streamUpload(req);

      photoData = {
        public_id: result.public_id,
        url: result.secure_url,
      };
    }

    const report = await Report.create({
      user: isAnonymous === 'true' ? null : req.user._id,
      type,
      location,
      time,
      description,
      isAnonymous,
      photo: photoData,
    });

    return res.status(201).json({ success: true, report });
    console.log('Received file:', !!req.file);
  } catch (error) {
    console.error("Error submitting report:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get All Reports (Admin)
exports.getAllReports = async (req, res) => {
  try {
    const reports = await Report.find().populate('user', 'name email');
    return res.status(200).json({ success: true, reports });
  } catch (error) {
    console.error("Error getting all reports:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Report (status or response)
exports.updateReport = async (req, res) => {
  try {
    const { status, response } = req.body;

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    if (status) report.status = status;
    if (response) report.response = response;

    await report.save();

    return res.status(200).json({ success: true, message: 'Report updated', report });
  } catch (error) {
    console.error("Error updating report:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get My Reports (User)
exports.getMyReports = async (req, res) => {
  try {
    const reports = await Report.find({ user: req.user._id });
    return res.status(200).json({ success: true, reports });
  } catch (error) {
    console.error("Error getting my reports:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
