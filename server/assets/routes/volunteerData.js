// CRUD file for volunteering events and their details, stored in Firebase
const express = require('express');
const volunteerData = express.Router();
const db = require('../../server.js');

// route to add volunteer data to the server
volunteerData.post('/', async (req, res) => {
    const { storeAddress, category, start_time, end_time, minAge, timestamp, task, external, location, date, description} = req.body;
    const userId = res.locals.uid;
    try {
      const ref = db.ref('volunteer_opportunities');
      const newTask = ref.push(); 
      // Firebas set
      await newTask.set({ storeAddress, category, start_time, end_time, minAge, timestamp: timestamp.toString(), task, external, location, date, description, userId});
  
      res.status(200).json({message: "Data successfully added to firebase"});
    } catch (error) {
      console.log(error);
      res.status(500).json({error: "Data cannot be added to firebase"});
    }
});

volunteerData.patch('/:timestamp', async (req, res) => {
  try {
    const ref = db.ref('volunteer_opportunities');
    
    // Filter by timestamp to get the only unique task
    const snapshot = await ref
      .orderByChild('timestamp')
      .equalTo(req.params.timestamp)
      .once('value');

    const tasks = snapshot.val();
    
    if (!tasks) {
      return res.status(404).json({error: "No tasks found with timestamp param in firebase"});
    }

    // Object.keys to get the one and only task ID (an array)
    const taskKey = Object.keys(tasks)[0];
    const task = tasks[taskKey];

    // verify task belongs to user
    if (task.userId !== res.locals.uid) {
      return res.status(403).json({ error: "Task does not belong to logged in user" });
    }

    // Firebase update
    await ref.child(taskKey).update(req.body);

    res.status(200).json({message: "Data successfully updated to firebase"});

  } catch (error) {
    console.log(error);
    res.status(500).json({error: "Data could not be updated to firebase"});
  }
});

volunteerData.delete('/:timestamp', async (req, res) => {
  // possible formats: http://localhost:3000/volunteer-data/1742783993418 because its a param
  try {
    const ref = db.ref('volunteer_opportunities');
    const snapshot = await ref
      .orderByChild('timestamp')
      .equalTo(req.params.timestamp)
      .once('value');

    const tasks = snapshot.val();
    
    if (!tasks) {
      return res.status(404).json({error: "No tasks found with timestamp param in firebase"});
    }

    const taskKey = Object.keys(tasks)[0]
    const task = tasks[taskKey]

    if (task.userId !== res.locals.uid) {
      return res.status(403).json({ error: "Task does not belong to logged in user" });
    }

    // Firebase removal
    await ref.child(taskKey).remove();

    res.status(200).json({message: "Data successfully removed from firebase"});

  } catch (error) {
    console.log(error);
    res.status(500).json({error: "Data could not be updated to firebase"});
  }
});

// Supports getting task data for dashboard, and filling the edit modals based on timestamp, and the map on the homepage (filteration system using queries)
volunteerData.get('/', async (req, res) => {
  try {
    const ref = db.ref('volunteer_opportunities');

    // Getting User Tasks based on userId (dashboard access)
    if (req.query.secure)
    {
      const snapshot = await ref
        .orderByChild('userId')
        .equalTo(res.locals.uid)
        .once('value');
      const userTasks = snapshot.val();
      return res.status(200).json(userTasks);
    }

    // Getting Task based on timestamp (for edit modal in dashboard)
    else if (req.query.timestamp)
    {
      const snapshot = await ref
        .orderByChild('timestamp')
        .equalTo(req.query.timestamp)
        .once('value')

      const singleTask = snapshot.val();
      return res.status(200).json(singleTask);
    }

    // multiple query filters (date and category) firebase cannot filter 
    const snapshot = await ref.once('value');
    const tasks = snapshot.val();
    let filteredTasks;
    try
    {
      // converts to array
      filteredTasks = Object.entries(tasks); 
      // beforehand, it is stored in json {taskID: 1 {category: climate, userId: someID}} etc.
      // now, if is stored as an array that can be filtered, where the key is the taskID and the value is the task information such as category etc.
      // [taskID: 1, {category: climate, userId: someID}]
    }
    catch(error)
    {
      return res.status(500).json({error: "No volunteer tasks found"});
    }
    
    filteredTasks = filteredTasks.filter(([_, task]) => {
    if (req.query.category)
    {
      return task.category === req.query.category;
    }
      return true;
    });
    filteredTasks = filteredTasks.filter(([_, task]) => {
    if (req.query.date)
    {
      return task.date === req.query.date;
    }
      return true;
    });

    // convert back to JSON
    const result = Object.fromEntries(filteredTasks);
    console.log(result);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({error: "Data cannot be fetched from firebase"});
  }

});

module.exports = volunteerData;
