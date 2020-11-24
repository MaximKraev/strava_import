require('dotenv').config()
import _ from 'lodash'
import strava from 'strava-v3'
import fs from 'fs'
import csv from 'csv-parser'
import path from 'path'
import { exit } from 'process'
const sleep = (sec: number) => new Promise((resolve, reject) => {setTimeout(resolve, sec*1000)})


const uploadActivities = async (csvData: any[]) => {
  const activities = _.filter(csvData, i =>  _.isEmpty(i['Filename']))

  let stravaActivities = activities.map(csv => {
    return {
      name: csv['Activity Name'],
      type: csv['Activity Type'],
      start_date_local: (new Date(csv['Activity Date'])).toISOString(),
      elapsed_time: parseInt(csv['Elapsed Time'], 10),
      description: csv['Activity Description'],
      distance: parseFloat(csv['Distance'])
    }
  })
  stravaActivities = _.filter(stravaActivities, i => i.type != 'VirtualRide' && i.type != 'Ride' && i.elapsed_time > 120)
  let count = 0
  for (const i of stravaActivities) {
    console.log(i)
    try {
      const res = await strava.activities.create(i)
      console.log(res)
    } catch (_) {
      console.log(_)
      continue
    }
    count++
    if(count == 90) {
      console.log(`resting`)
      await sleep(15*60)
      count = 0
    }
  }
}

const loadCSV = async ():Promise<any> => {
  return new Promise((resolve, reject) => {
    const result: any[] = []
    fs.createReadStream('../archive/activities.csv')
    .pipe(csv())
    .on('data', (data: any) => {
      data['Activity Type'] = data['Activity Type'].replace(/\s/g, '')
      data.external_id = path.basename(data.Filename).split('.')[0]
      result.push(data)
    })
    .on('end', () => {
      resolve(result)
    });
  })
}

const main = async () => {
  const csvData = await loadCSV()
  console.log(csvData)
  await uploadActivities(csvData)
}

main()