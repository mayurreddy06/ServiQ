const db = require('./server');

// Create data
const createData = async(path, data) => {
    try{
        const ref = db.ref(path);
        await ref.set(data);
        console.log('Created data in database successfully');
    } catch(e){
        console.error('Error creating data:' + e);
    }
}

// Read data
const readData = async(path) => {
    try{
        const ref = db.ref(path);
        const snapshot = await ref.once('value');
        if(snapshot.exists()){
            console.log('Data: ' + snapshot.val());
            return snapshot.val();
        } else{
            console.log('There is no record found at path: ' + path);
            return null;
        }
    } catch(e){
        console.error('Error reading data:' + e);   
    }
}

// Update data
const updateData = async(path, data) => {
    try{
        const ref = db.ref(path);
        await ref.set(data)
        console.log('Updated data successfully');
    } catch(e){
        console.error('Error updating data: ' + e);
    }
}

// Delete data
const deleteData = async(path) => {
    try{
        const ref = db.ref(path);
        await ref.remove();
        console.log('Successfully deleted data');
    } catch(e){
        console.error('Error deleting data: ' + e);
    }
}

module.exports = {
    createData,
    readData,
    updateData,
    deleteData
};