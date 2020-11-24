require('dotenv').config()
import _ from 'lodash'
import strava from 'strava-v3'
import fs from 'fs'

import csv from 'csv-parser'
import path from 'path'
const sleep = (sec: number) => new Promise((resolve, reject) => {setTimeout(resolve, sec*1000)})


const isMatch = (strava: any, csv: any) => {
  if (csv['Activity Type'] == 'Ride') {
    return false
  }
  return strava.type == csv['Activity Type']
}

const updateActivity = async (original: any, csv: any) => {
  const update = {}
  if (csv['Activity Type'] == 'Ride' && original.trainer == false) {
    update.gear_id = 'b8264024'
  }

  update.type = csv['Activity Type']
  update.id = original.id

  console.log(`${original.id} update ${JSON.stringify(update)}`)
  await strava.activities.update(update)
}

const loadActivities = async (garmin: any[]) => {
  let page = 1
  const start = new Date("20 May 2020")
  const end = new Date("9 September 2020")
  const after = Math.floor(start.getTime() / 1000)
  const before = Math.floor(end.getTime() / 1000)
  while (true) {
    const activities = await strava.athlete.listActivities({
      after,
      before,
      per_page: 100,
      page
    })
    if (activities.length === 0) {
      break
    }
    for(let activity of activities) {
      const id = activity.id
      console.log(`Processing activity ${id}`)
      const external_id = activity.external_id.match(/(\d+)/)[1]
      const csvMatch = _.find(garmin, {external_id})
      if (!csvMatch) {
        console.log(`can't find activity.id ${id} external ${activity.external_id}`)
        continue
      }
//      activity = await strava.activities.get({id}) // load activity from API

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

const fixActivityType = (garmin: string) => {
  switch (garmin) {
    case 'Cycling':
      return 'Ride'
    case 'Virtual Cycling':
      return 'VirtualRide'
    case 'Running':
      return 'Run'
    case 'Indoor Cycling':
      return 'VirualRide'
    case 'Pool Swimming':
      return 'Swim'
    case 'Strength Training':
      return 'WeightTraining'
    case 'Cardio':
      return 'Workout'
    case 'Hiking':
      return 'Hike'
    default:
      return garmin
  }
}

const loadCSV = async ():Promise<any> => {
  return new Promise((resolve, reject) => {
    const result: any[] = []
    fs.createReadStream('../garmin-export/garmin-connect-export/2020-11-23_garmin_connect_export/activities.csv')
    .pipe(csv())
    .on('data', (data: any) => {
      data['Activity Type'] = fixActivityType(data['Activity Type'])
      data.external_id = data['Activity ID']
      result.push(data)
    })
    .on('end', () => {
      resolve(result)
    });
  })
}
const main = async () => {
  const data = await loadCSV()
  console.log(_.uniq(_.map(data, 'Activity Type')))
  await loadActivities(data)
}

main()