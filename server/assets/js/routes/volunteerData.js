const express = require('express');
const volunteerDataRouter = express.Router();
const db = require('../../../server.js');


// CREATE route to add volunteer data to the server
volunteerDataRouter.post('/volunteer-data', async (req, res) => {
  const { storeAddress, category, start_time, end_time, spots, timestamp, task, location, date, description } = req.body;

  if (!storeAddress || !category || !start_time || !end_time || !spots || !timestamp || !task || !location || !date || !description) {
    return res.json({
      status: "FAILED",
      message: "Missing fields"
    });
  }

  try {
    const ref = db.ref('volunteer_opportunities');
    const newTask = ref.push(); 
    // Capture the reference to the new data
    await newTask.set({ storeAddress, category, start_time, end_time, spots, timestamp, task, location, date, description });

    // // Index into Typesense (only timestamp, category, and task)
    // const typesenseDocument = {
    //   id: newTaskRef.key, // Use Firebase key as the Typesense document ID
    //   timestamp: parseInt(timestamp, 10), // Ensure timestamp is an integer
    //   category,
    //   task,
    //   description,
    // };

    // console.log('Indexing document into Typesense:', typesenseDocument);

    // // Use typesenseClient to add the document to the collection
    // await typesenseClient.collections('volunteerTasks').documents().create(typesenseDocument);
    // console.log('Document indexed successfully');

    res.json({
      status: "SUCCESS",
      message: "Data successfully injected to Firebase"
    });
  } catch (error) {
    console.error('Error adding volunteer opportunity:', error);
    res.json({
      status: "FAILED",
      message: "Firebase data reference does not exist"
    });
  }
});


// READ route to fetch data from firebase, with optional parameters
// possible formats: http://localhost:3000/volunteer-data?category=val&date=val (because they are queries)
volunteerDataRouter.get('/volunteer-data', async (req, res) => {
  try {
    const ref = db.ref('volunteer_opportunities');
    const data = await ref.once('value');
    const tasks = data.val();
    
    if (!tasks) {
      return res.json({});
    }

    // Convert tasks to array while preserving IDs
    let filteredTasks = {};
    Object.entries(tasks).forEach(([id, task]) => {
      // Apply filters
      let includeTask = true;
      
      if (req.query.category && task.category !== req.query.category) {
        includeTask = false;
      }
      
      if (req.query.date && task.date !== req.query.date) {
        includeTask = false;
      }
      
      if (req.query.zipcode && task.zipcode !== req.query.zipcode) {
        includeTask = false;
      }
      
      if (includeTask) {
        filteredTasks[id] = task;
      }
    });

    console.log("Sending tasks with IDs:", Object.keys(filteredTasks));
    res.json(filteredTasks);
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

    res.json({
      status: "SUCCESS",
      message: "Data successfully updated to firebase"
    })

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

