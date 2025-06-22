const { PythonShell } = require("python-shell");
const path = require("path");
exports.classifyPollutionSource = async (req, res) => {
  const { lat, lon, pollutants } = req.body;

  if (!lat || !lon || !pollutants) {
    return res.status(400).json({ message: "Missing data" });
  }

  const { PythonShell } = require("python-shell");
  const path = require("path");

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

  pyshell.end((err, code, signal) => {
    if (err) {
      console.error("Python error:", err);
      return res.status(500).json({ error: "Python script failed" });
    }
    return res.json(result);
  });
};
