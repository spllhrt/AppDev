const express = require('express');
const router = express.Router();


const metroManilaCities = [
  'Caloocan',
  'Las Piñas',
  'Makati',
  'Malabon',
  'Mandaluyong',
  'Manila',
  'Marikina',
  'Muntinlupa',
  'Navotas',
  'Parañaque',
  'Pasay',
  'Pasig',
  'Quezon City',
  'San Juan',
  'Taguig',
  'Valenzuela'
];


// GET all cities
router.get('/cities', (req, res) => {
  res.status(200).json({
    success: true,
    cities: metroManilaCities
  });
});




router.get('/cities/:name', (req, res) => {
  const city = metroManilaCities.find(
    c => c.toLowerCase() === req.params.name.toLowerCase()
  );
 
  if (!city) {
    return res.status(404).json({
      success: false,
      message: 'City not found'
    });
  }


  res.status(200).json({
    success: true,
    city: {
      name: city,
     
    }
  });
});


module.exports = router;

