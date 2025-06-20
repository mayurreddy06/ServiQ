// file for viewing admin-only pages when logged in
const express = require('express');
const adminRouter = express.Router();
const admin = require('firebase-admin');
const multer = require('multer');
// Configure multer for memory storage (since we're uploading to Firebase Storage)
const upload = multer({ storage: multer.memoryStorage() });
const db = admin.database();


adminRouter.get('/view', async (req, res) => {
    let uid = res.locals.uid;
    const ref = db.ref(`agency_accounts/${uid}`);
    const data = await ref.once('value');
    const agency = data.val();
    let agencyName = agency.name;
    let agencyDescription = agency.agencyDescription;
    res.render('viewPosts.ejs', {agencyName, agencyDescription});
});


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