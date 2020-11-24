require('dotenv').config()
import _ from 'lodash'
import strava from 'strava-v3'
import fs from 'fs'
import csv from 'csv-parser'

const loadActivity = async (id:string) => {
  const res = await strava.activities.get({
    id
  })

  console.log(res)
}

const loadCSV = async() => {
  fs.createReadStream('../archive/activities.csv')
  .pipe(csv())
  .on('data', (data) => console.log(data))
  .on('end', () => {
    console.log("done");
    // [
    //   { NAME: 'Daffy Duck', AGE: '24' },
    //   { NAME: 'Bugs Bunny', AGE: '22' }
    // ]
  });
}

const main = async () => {
  await loadActivity('4269940865')
}

main()