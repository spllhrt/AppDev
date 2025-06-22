const Assessment = require('../models/assessment');

// Get all assessments (admin only)
exports.getAllAssessments = async (req, res) => {
  try {
    const assessments = await Assessment.find()
      .populate('user', 'name email city role')
      .sort({ assessedAt: -1 });

    res.status(200).json({ success: true, count: assessments.length, assessments });
  } catch (error) {
    console.error("Error fetching assessments:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get all assessments for the logged-in user
exports.getUserAssessments = async (req, res) => {
  try {
    const userId = req.user.id;

    const assessments = await Assessment.find({ user: userId }).sort({ assessedAt: -1 });

    res.status(200).json({ success: true, count: assessments.length, assessments });
  } catch (error) {
    console.error("Error fetching user assessments:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get single assessment by ID
exports.getAssessmentById = async (req, res) => {
  try {
    const assessmentId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const assessment = await Assessment.findById(assessmentId).populate('user', 'name email city');

    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    }

    // Allow if admin OR owner of assessment
    if (assessment.user._id.toString() !== userId && userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    res.status(200).json({ success: true, assessment });
  } catch (error) {
    console.error("Error fetching assessment:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete assessment by ID (admin only)
exports.deleteAssessment = async (req, res) => {
  try {
    const assessmentId = req.params.id;

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    }

    await assessment.remove();

    res.status(200).json({ success: true, message: 'Assessment deleted successfully' });
  } catch (error) {
    console.error("Error deleting assessment:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
