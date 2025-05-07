// CRUD file for volunteering events and their details, stored in Firebase
const express = require('express');
const volunteerData = express.Router();
const db = require('../../../server.js');
volunteerData.get('/', async (req, res) => {
  try {
    const ref = db.ref('volunteer_opportunities');
    const data = await ref.once('value');
    const tasks = data.val();
    let filteredTasks;
    try
    {
      filteredTasks = Object.entries(tasks); 
    }
    catch(error)
    {
      return res.status(404).json({error: "No tasks in firebase"});
    }
    if (req.query.category) {
      filteredTasks = filteredTasks.filter(([_, task]) => task.category === req.query.category);
    }

    if (req.query.date) {
      filteredTasks = filteredTasks.filter(([_, task]) => task.date === req.query.date);
    }

    if (req.query.zipcode) {
      filteredTasks = filteredTasks.filter(([_, task]) => task.zipcode === req.query.zipcode);
    }

    if (req.query.timestamp) {
      filteredTasks = filteredTasks.filter(([_, task]) => task.timestamp === req.query.timestamp);
    }

    if (req.query.userId) {
      filteredTasks = filteredTasks.filter(([_, task]) => task.userId === req.query.userId);
    }

    const isInvalidQuery = Object.keys(req.query).some(key => !['category', 'date', 'zipcode', 'timestamp', 'userId'].includes(key));
    if (isInvalidQuery)
    {
      return res.status(400).json({error: "Invalid query"});
    }

    const result = Object.fromEntries(filteredTasks);

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({error: "Data cannot be fetched from firebase"});
  }

});
// CREATE route to add volunteer data to the server
volunteerData.post('/', async (req, res) => {
    const { storeAddress, category, start_time, end_time, spots, timestamp, task, location, date, description} = req.body;
    const userId = req.session.user.uid;
    try {
      const ref = db.ref('volunteer_opportunities');
      const newTask = ref.push(); 
      // Capture the reference to the new data
      await newTask.set({ storeAddress, category, start_time, end_time, spots, timestamp: timestamp.toString(), task, location, date, description, userId});
  
      res.status(200).json({message: "Data successfuly added to firebase"});
    } catch (error) {
      res.status(500).json({error: "Data cannot be added to firebase"});
      // there is an error that occurs (something about the location) but it is still adding to the server (idk why) figure it out later ig
    }
});

volunteerData.patch('/:timestamp', async (req, res) => {
  try {
    const ref = db.ref('volunteer_opportunities');
    const data = await ref.once('value');
    const tasks = data.val();

    // Filter to find task with matching timestamp
    const filteredTasks = Object.entries(tasks).filter(([_, task]) => task.timestamp === req.params.timestamp);

    if (filteredTasks.length === 0) {
      return res.status(404).json({error: "No tasks found with timestamp param in firebase"});
    }

    const [taskKey, task] = filteredTasks[0];

    // Verify task ownership
    if (task.userId !== req.session.user.uid) {
      return res.status(403).json({ error: "Task does not belong to logged in user" });
    }

    // Update with only provided fields
    const updatingFields = req.body;
    await ref.child(taskKey).update(updatingFields);

    res.status(200).json({message: "Data successfully updated to firebase"});

  } catch (error) {
    res.status(500).json({error: "Data could not be updated to firebase"});
  }
});

volunteerData.delete('/:timestamp', async (req, res) => {
  // possible formats: http://localhost:3000/volunteer-data/1742783993418 because its a param
  try {
    const ref = db.ref('volunteer_opportunities');
    const data = await ref.once('value');
    const tasks = data.val();

    // Filter to find task with matching timestamp
    const filteredTasks = Object.entries(tasks).filter(([_, task]) => task.timestamp === req.params.timestamp);

    if (filteredTasks.length === 0) {
      return res.status(404).json({error: "No tasks found with timestamp param in firebase"});
    }

    const [taskKey, task] = filteredTasks[0];

    // Verify task ownership
    if (task.userId !== req.session.user.uid) {
      return res.status(403).json({ error: "Task does not belong to logged in user" });
    }

    await ref.child(taskKey).remove();

    res.status(200).json({message: "Data successfully removed from firebase"});

  } catch (error) {
    res.status(500).json({error: "Data could not be updated to firebase"});
  }
});
module.exports = volunteerData;
