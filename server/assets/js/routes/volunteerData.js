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


volunteerDataRouter.get('/volunteer-data', async (req, res) => {
  try {
    if (!req.session.user?.email) {
      return res.status(403).json({ error: "Unauthorized: No user session" });
    }

    const ref = db.ref('volunteer_opportunities');
    const data = await ref.once('value');
    const tasks = data.val() || {};

    let filteredTasks = Object.entries(tasks).filter(([_, task]) =>
      task.email === req.session.user.email
    );

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
      filteredTasks = filteredTasks.filter(([_, task]) => task.timestamp === parseInt(req.query.timestamp));
    }

    const result = Object.fromEntries(filteredTasks);
    res.json(result);
  } catch (error) {
    console.error('Error fetching volunteer tasks:', error);
    res.status(500).json({
      status: "FAILED",
      message: "Internal error fetching tasks"
    });
  }
});


volunteerDataRouter.patch('/volunteer-data/:timestamp', async (req, res) => {
  try {
    if (!req.session.user?.email) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const ref = db.ref('volunteer_opportunities');
    const data = await ref.once('value');
    const tasks = data.val() || {};

    const taskKey = Object.keys(tasks).find(
      key => tasks[key].timestamp === parseInt(req.params.timestamp)
    );

    if (!taskKey) {
      return res.status(404).json({ error: "Task not found" });
    }

    const task = tasks[taskKey];
    if (task.email !== req.session.user.email) {
      return res.status(403).json({ error: "Forbidden: Task does not belong to user" });
    }

    const updates = req.body;
    await ref.child(taskKey).update(updates);

    res.json({
      status: "SUCCESS",
      message: "Task successfully updated"
    });

  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      status: "FAILED",
      message: "Error updating task"
    });
  }
});

volunteerDataRouter.delete('/volunteer-data/:timestamp', async (req, res) => {
  try {
    if (!req.session.user?.email) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const ref = db.ref('volunteer_opportunities');
    const data = await ref.once('value');
    const tasks = data.val() || {};

    const taskKey = Object.keys(tasks).find(
      key => tasks[key].timestamp === parseInt(req.params.timestamp)
    );

    if (!taskKey) {
      return res.status(404).json({ error: "Task not found" });
    }

    const task = tasks[taskKey];
    if (task.email !== req.session.user.email) {
      return res.status(403).json({ error: "Forbidden: Task does not belong to user" });
    }

    await ref.child(taskKey).remove();
    res.json({
      status: "SUCCESS",
      message: "Task successfully deleted"
    });

  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      status: "FAILED",
      message: "Error deleting task"
    });
  }
});


module.exports = volunteerDataRouter;
