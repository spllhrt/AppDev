const express = require("express");
const app = express();
const connectDatabase = require('./config/database');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
require('dotenv').config();

const cookieParser = require('cookie-parser');
app.use(cookieParser());

const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const corsOptions = {
  origin: function (origin, callback) {
    callback(null, true); 
  },
  credentials: true,
};
app.use(cors(corsOptions));

const auth = require('./routes/auth');
const sourceRoutes = require('./routes/sourceRoutes');
// const aqiwea = require('./routes/aqiwea');
const health = require('./routes/health');
const assessment = require('./routes/assessment');
const clusters = require('./routes/clusters');
const bulletinRoutes = require('./routes/bulletinRoutes');

connectDatabase();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

app.use('/api/', auth);
app.use('/api/', sourceRoutes);
// app.use('/api/', aqiwea);
app.use('/api/', health);
app.use('/api/', assessment);
app.use('/api/', clusters);
app.use('/api/', bulletinRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
