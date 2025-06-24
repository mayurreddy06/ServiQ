// file for viewing admin-only pages when logged in
const express = require('express');
const adminRouter = express.Router();
const admin = require('firebase-admin');
const multer = require('multer');
// firebase memory storage
const upload = multer({ storage: multer.memoryStorage() });
const db = admin.database();

// variables specifically for agencyName and Description on edit agnecy info modal (temporarily not used and commented out)
adminRouter.get('/view', async (req, res) => {
    try {
      let uid = res.locals.uid;
      const ref = db.ref(`agency_accounts/${uid}`);
      const data = await ref.once('value');
      const agency = data.val();
      let agencyName = agency.name;
      let agencyDescription = agency.agencyDescription;
      let googlePlacesToken = "https://maps.googleapis.com/maps/api/js?key=" + process.env.GOOGLE_PLACES_TOKEN + "&libraries=places";
      res.render('viewPosts.ejs', {agencyName, agencyDescription, googlePlacesToken});
    }
    catch(error)
    {
      res.status(500).json({error: error.message});
    }
    
});

// update agency info, including adding an image for the organization
adminRouter.patch('/agency', upload.single('file'), async (req, res) => {
  try {
    const userId = res.locals.uid;
    const {name, agencyDescription } = req.body;
    const updateData = {name, agencyDescription};
    
    const agencyRef = db.ref(`agency_accounts/${userId}`);
    
    // Handle file upload to Firebase Storage
    if (req.file) {
      const bucket = admin.storage().bucket();
      const fileName = `agency_files/${userId}/${req.file.originalname}`;
      const file = bucket.file(fileName);
      
      await file.save(req.file.buffer, {
        metadata: { contentType: req.file.mimetype }
      });
      
      updateData.fileName = req.file.originalname;
      updateData.filePath = fileName;
    }
    
    // Update Realtime Database
    await agencyRef.update(updateData);
    
    res.status(200).json({message: "Data successfully added to firebase"})
    
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

module.exports = adminRouter;