const { PythonShell } = require("python-shell");
const path = require("path");
const PollutionSourceLog = require("../models/PollutionSourceLog");

exports.classifyPollutionSource = async (req, res) => {
  const { lat, lon, pollutants } = req.body;
  const userId = req.user?.id; // assuming auth middleware sets this

  if (!lat || !lon || !pollutants) {
    return res.status(400).json({ message: "Missing data" });
  }

  const options = {
    mode: "json",
    pythonOptions: ["-u"],
    scriptPath: path.join(__dirname, "../python"),
  };

  const pyshell = new PythonShell("classify.py", options);
  pyshell.send({ lat, lon, pollutants });

  let result;

  pyshell.on("message", (msg) => {
    result = msg;
  });

  pyshell.on("stderr", (stderr) => {
    console.error("Python STDERR:", stderr);
  });

  pyshell.end(async (err) => {
    if (err) {
      console.error("Python error:", err);
      return res.status(500).json({ error: "Python script failed" });
    }

    if (!userId) {
      console.log("No authenticated user, skipping DB save");
      return res.json(result);
    }

    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      // Count today's saves by user
      const todayCount = await PollutionSourceLog.countDocuments({
        user: userId,
        createdAt: { $gte: startOfDay },
      });

      if (todayCount >= 3) {
        console.log("User reached daily save limit.");
        return res.json(result);
      }

      // Check last save time
      const lastLog = await PollutionSourceLog.findOne({
        user: userId,
        createdAt: { $gte: startOfDay },
      }).sort({ createdAt: -1 });

      const now = new Date();
      const hoursSinceLast = lastLog ? (now - lastLog.createdAt) / 1000 / 60 / 60 : Infinity;

      if (hoursSinceLast < 4) {
        console.log("Last save was less than 4 hours ago, skipping save.");
        return res.json(result);
      }

      // Save new log
      await PollutionSourceLog.create({
        user: userId,
        lat,
        lon,
        pollutants,
        classificationResult: result,
      });
      console.log("Classification saved to DB.");

      return res.json(result);
    } catch (saveError) {
      console.error("Error saving classification log:", saveError);
      // Return result anyway
      return res.json(result);
    }
  });
};


exports.getPollutionLogs = async (req, res) => {
  try {
    const { sourceType, startDate, endDate } = req.query;

    const filter = {};

    // Optional filters
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (sourceType) {
      filter["classificationResult.predicted_source"] = sourceType;
    }

    const logs = await PollutionSourceLog.find(filter)
      .sort({ createdAt: -1 })
      .select("-__v") // optional: remove version field
      .populate("user", "name email"); // optional: show user info

    res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    console.error("Error fetching pollution logs:", err);
    res.status(500).json({ success: false, message: "Failed to fetch pollution logs" });
  }
};