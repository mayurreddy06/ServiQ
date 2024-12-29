const {createData, readData, updateData, deleteData} = require('./crud');

const crudTest = async() => {
    await createData('sigma', 'Vishal');
}

crudTest();