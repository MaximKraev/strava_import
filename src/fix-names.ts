require('dotenv').config()
import _ from 'lodash'
import strava from 'strava-v3'
import fs from 'fs'
import csv from 'csv-parser'
import path from 'path'
const sleep = (sec: number) => new Promise((resolve, reject) => {setTimeout(resolve, sec*1000)})

const isMatch = (strava: any, csv: any) => {
  if (strava.type == 'Ride') {
    // update bike for every past ride
    return false
  }
  const description = strava.description || ''
  return strava.type == csv['Activity Type'] &&
    strava.name == csv['Activity Name'] &&
    description == csv['Activity Description']
}

const updateActivity = async (original: any, csv: any) => {
  const update = {}
  if (csv['Activity Type'] == 'Ride' && original.trainer == false && original.gear_id == null) {
    update.gear_id = 'b8264024'
  }
  update.name = csv['Activity Name']
  update.type = csv['Activity Type']
  update.description = csv['Activity Description']
  update.id = original.id

  console.log(`${original.id} update ${JSON.stringify(update)}`)
  await strava.activities.update(update)
}

const loadActivities = async (csvData: any[]) => {
  let page = 1
  const start = new Date("16 September 2011")
  const end = new Date("15 September 2018")
  const after = Math.floor(start.getTime() / 1000)
  const before = Math.floor(end.getTime() / 1000)
  while (true) {
    const activities = await strava.athlete.listActivities({
      after,
      before,
      per_page: 40,
      page
    })
    if (activities.length === 0) {
      break
    }
    for(let activity of activities) {
      const id = activity.id
      console.log(`Processing activity ${id}`)
      const external_id = activity.external_id.split('.')[0]
      const csvMatch = _.find(csvData, {external_id})
      if (!csvMatch) {
        console.log(`can't find activity.id ${id} external ${activity.external_id}`)
        continue
      }
      activity = await strava.activities.get({id}) // load activity from API

      const match = isMatch(activity, csvMatch)
      if (!match) {
        await updateActivity(activity, csvMatch)
      }
    }

    // wait for limits
    console.log('resting...')
    await sleep(15*60)
    page++
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
  await loadActivities(csvData)

}

main()