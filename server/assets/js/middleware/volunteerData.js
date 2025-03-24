const db = require('../../../server.js');
const volunteerDataExists = async (req, res, next) => {
    
    const ref = db.ref('volunteer_opportunities');
    const data = await ref.once('value');
    if (!(data.exists()))
    {
        return res.json({
            status: "FAILED",
            message: "Volunteer opporutunites does not contain any Firebase data to perform CRUD operations or carry out Postman tests"
        })
    }
    next();

}

module.exports = volunteerDataExists;