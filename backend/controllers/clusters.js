const User = require('../models/user');

exports.getClusterStats = async (req, res) => {
  try {
    const clusterCounts = await User.aggregate([
      { $unwind: "$clusters" },
      { $group: { _id: "$clusters", count: { $sum: 1 } } },
      { $project: { cluster: "$_id", count: 1, _id: 0 } },
      { $sort: { count: -1 } }
    ]);

    return res.status(200).json({
      success: true,
      data: clusterCounts
    });
  } catch (error) {
    console.error("Error getting cluster stats:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};
