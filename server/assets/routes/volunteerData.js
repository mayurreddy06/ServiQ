// CRUD file for volunteering events and their details, stored in Firebase
const express = require('express');
const volunteerData = express.Router();
const db = require('../../server.js');
volunteerData.get('/', async (req, res) => {
  try {
    const ref = db.ref('volunteer_opportunities');
    const data = await ref.once('value');
    const tasks = data.val();
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
    // filter based on queries
    // key is not needed so left _ (or null) and value is the task information (still an object)
    if (req.query.secure)
    {
      filteredTasks = filteredTasks.filter(([_, task]) => {
        return (task.userId === res.locals.uid);
      });
      const result = Object.fromEntries(filteredTasks);
      return res.status(200).json(result);
    }
    
    filteredTasks = filteredTasks.filter(([_, task]) => {
    if (req.query.category)
    {
      return task.category === req.query.category;
    }
      // returns true (keeping the task)
      return true;
    });
    filteredTasks = filteredTasks.filter(([_, task]) => {
    if (req.query.date)
    {
      return task.date === req.query.date;
    }
      return true;
    });
    filteredTasks = filteredTasks.filter(([_, task]) => {
      if (req.query.timestamp)
      {
        return task.timestamp === req.query.timestamp;
      }
      return true;
    });

    const isInvalidQuery = Object.keys(req.query).some(key => !['category', 'date', 'zipcode', 'timestamp', 'userId', 'secure'].includes(key));
    if (isInvalidQuery)
    {
      return res.status(400).json({error: "Invalid query"});
    }

    const result = Object.fromEntries(filteredTasks);
    console.log(result);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({error: "Data cannot be fetched from firebase"});
  }

});
// route to add volunteer data to the server
volunteerData.post('/', async (req, res) => {
    const { storeAddress, category, start_time, end_time, minAge, timestamp, task, external, location, date, description} = req.body;
    const userId = res.locals.uid;
    try {
      const ref = db.ref('volunteer_opportunities');
      const newTask = ref.push(); 
      // Capture the reference to the new data
      await newTask.set({ storeAddress, category, start_time, end_time, minAge, timestamp: timestamp.toString(), task, external, location, date, description, userId});
  
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

    // converts to array
    let filteredTasks = Object.entries(tasks);
    // Filter to find task with matching timestamp
    filteredTasks = filteredTasks.filter(([_, task]) => {
      if (req.params.timestamp)
      {
        return task.timestamp === req.params.timestamp;
      }
      return true;
    });

    if (filteredTasks.length === 0) {
      return res.status(404).json({error: "No tasks found with timestamp param in firebase"});
    }

    const [taskKey, task] = filteredTasks[0];

    // Verify task ownership
    if (task.userId !== res.locals.uid) {
      return res.status(403).json({ error: "Task does not belong to logged in user" });
    }

    // Update with only provided fields
    const updatingFields = req.body;
    await ref.child(taskKey).update(updatingFields);

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
    const data = await ref.once('value');
    const tasks = data.val();

    // converts to array
    let filteredTasks = Object.entries(tasks);
    // Filter to find task with matching timestamp
    filteredTasks = filteredTasks.filter(([_, task]) => {
      if (req.params.timestamp)
      {
        return task.timestamp === req.params.timestamp;
      }
      return true;
    });

    if (filteredTasks.length === 0) {
      return res.status(404).json({error: "No tasks found with timestamp param in firebase"});
    }

    const [taskKey, task] = filteredTasks[0];

    // Verify task ownership
    if (task.userId !== res.locals.uid) {
      return res.status(403).json({ error: "Task does not belong to logged in user" });
    }

    await ref.child(taskKey).remove();

    res.status(200).json({message: "Data successfully removed from firebase"});

  } catch (error) {
    console.log(error);
    res.status(500).json({error: "Data could not be updated to firebase"});
  }
});
module.exports = volunteerData;
