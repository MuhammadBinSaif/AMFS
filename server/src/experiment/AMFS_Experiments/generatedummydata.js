// generateDummyData.js

const fs = require('fs');
const path = require('path');

const getRandomDecimal = (min, max, decimals = 2) => {
  const str = (Math.random() * (max - min) + min).toFixed(decimals);
  return parseFloat(str);
};

const getRandomInteger = (min, max) => {
  return Math.floor(Math.random() * (max - min) + min);
};

const generateDummyBlobData = (count) => {
  const dummyData = [];

  for (let i = 90; i < count; i++) {
    const record = {
      id: i + 1,
      bid: getRandomDecimal(0.01, 0.09, 9), //getRandomDecimal(0.00001440612352, 0.1619306873461146, 5)         
      size: getRandomDecimal(10.0, 50.0, 2),        
      waitTime: 0,
      processed: false,         
      priorityScore: 0.0,                         
      // Add other fields if necessary
    };

    dummyData.push(record);
  }

  return dummyData;
};

const saveDataToJSON = (data, filename) => {
  const filePath = path.join(__dirname, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Dummy data successfully saved to ${filePath}`);
};

const main = () => {

  let numberOfRecords = 120;

  console.log(`Generating dummy blobData records...`);

  const dummyData = generateDummyBlobData(numberOfRecords);

  const filename = `high-bid-medium-data-BlobData.json`;

  saveDataToJSON(dummyData, filename);
};

main();
