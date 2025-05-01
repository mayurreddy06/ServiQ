const express = require('express');
const volunteerDataRouter = express.Router();
const db = require('../../../server.js');


// CREATE route to add volunteer data to the server
volunteerDataRouter.post('/volunteer-data', async (req, res) => {
  const { storeAddress, category, start_time, end_time, spots, timestamp, task, location, date, description, email } = req.body;

  try {
    const ref = db.ref('volunteer_opportunities');
    const newTask = ref.push(); 
    // Capture the reference to the new data
    await newTask.set({ storeAddress, category, start_time, end_time, spots, timestamp, task, location, date, description, email});

    res.json({
      status: "SUCCESS",
      message: "Data successfully injected to Firebase"
    });
  } catch (error) {
    console.log(error);
    throw error;
    // there is an error that occurs (something about the location) but it is still adding to the server (idk why) figure it out later ig
  }
});


// READ route to fetch data from firebase, with optional parameters
 // possible formats: http://localhost:3000/volunteer-data?category=val&date=val (because they are queries)
 volunteerDataRouter.get('/volunteer-data', async (req, res) => {
  try {
    const ref = db.ref('volunteer_opportunities');
    const data = await ref.once('value');
    const tasks = data.val();
    // receieves all volunteer opporutunity data from firebase

    let filteredTasks = Object.entries(tasks); // Fix here

    if (req.query.category) {
      filteredTasks = filteredTasks.filter(([_, task]) => task.category === req.query.category);
    }

    if (req.query.date) {
      filteredTasks = filteredTasks.filter(([_, task]) => task.date === req.query.date);
    }

    if (req.query.zipcode) {
      filteredTasks = filteredTasks.filter(([_, task]) => task.zipcode === req.query.zipcode);
    }

    if (req.query.email) {
      filteredTasks = filteredTasks.filter(([_, task]) => task.email === req.query.email);
    }

    if (req.query.timestamp) {
      filteredTasks = filteredTasks.filter(([_, task]) => task.timestamp === req.query.timestamp);
    }

    const result = Object.fromEntries(filteredTasks);

    res.json(result);
  } catch (error) {
    console.error('Error fetching volunteer tasks:', error);
    res.json({
      status: "FAILED",
      message: "Data could not be fetched from Firebase"
    });
  }
});

// UPDATE route to update specificed parameters
volunteerDataRouter.patch('/volunteer-data/:timestamp', async (req, res) => {
  // possible formats: http://localhost:3000/volunteer-data/1742783993418 because its a param
  // assuming the RES body has only the updating parameters, which includes the timestamp (the ID) to find the specific volunteer task
  try
  {
    const ref = db.ref('volunteer_opportunities');
    const data = await ref.once('value');
    const tasks = data.val();

    let filteredTask = Object.values(tasks);
    
    filteredTask = Object.keys(tasks).find(key => tasks[key].timestamp === parseInt(req.params.timestamp));
    // this is the corresponding task with the timestamp, which is passed as a parameter (not a query)

    if (!filteredTask)
    {
      return res.json({
        status: "FAILED",
        message: "Invalid timestamp"
      });
    }
    const updatingFields = req.body;
    await ref.child(filteredTask).update(updatingFields);
    alert("successfully deleted");
    res.json({
      status: "SUCCESS",
      message: "Data successfully updated to firebase"
    });

  }
  catch(error)
  {
    res.json({
      status: "FAILED",
      message: "Firebase data reference does not exist"
    });
  }
});

volunteerDataRouter.delete('/volunteer-data/:timestamp', async (req, res) => {
  // possible formats: http://localhost:3000/volunteer-data/1742783993418 because its a param
  try
  {
    const ref = db.ref('volunteer_opportunities');
    const data = await ref.once('value');
    const tasks = data.val();

    let filteredTask = Object.values(tasks);
    
    filteredTask = Object.keys(tasks).find(key => tasks[key].timestamp === parseInt(req.params.timestamp));
    // this is the corresponding task with the timestamp, which is passed as a parameter (not a query)

    if (!filteredTask)
    {
      return res.json({
        status: "FAILED",
        message: "Invalid timestamp"
      });
    }
    await ref.child(filteredTask).remove();

    res.json({filteredTask});

  }
  catch(error)
  {
    res.json({
      status: "FAILED",
      message: "Firebase data reference does not exist"
    });
  }
});

module.exports = volunteerDataRouter;
