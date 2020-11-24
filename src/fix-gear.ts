require('dotenv').config()
import _ from 'lodash'
import strava from 'strava-v3'
import fs from 'fs'
import csv from 'csv-parser'
import path from 'path'
const sleep = (sec: number) => new Promise((resolve, reject) => {setTimeout(resolve, sec*1000)})

const isMatch = (strava: any) => {
  if (strava.type == 'Ride' && strava.trainer == false && strava.gear_id == null) {
    // update bike for every past ride
    return false
  }

  return true
}

const updateActivity = async (original: any) => {
  const update = {
   gear_id : 'b8264024',
   id: original.id
  }

  console.log(`${original.id} update ${JSON.stringify(update)}`)
  await strava.activities.update(update)
}

const loadActivities = async () => {
  let page = 1
  const start = new Date("16 September 2011")
  const end = new Date("07 October 2017")
  const after = Math.floor(start.getTime() / 1000)
  const before = Math.floor(end.getTime() / 1000)
  while (true) {
    const activities = await strava.athlete.listActivities({
      after,
      before,
      per_page: 150,
      page
    })
    if (activities.length === 0) {
      break
    }

    for(let activity of activities) {
      const id = activity.id
      console.log(`Processing activity ${id} (${activity.type})`)

      const match = isMatch(activity)
      if (!match) {
        await updateActivity(activity)
      }
    }

    // wait for limits
    console.log('resting...')
    await sleep(15*60)
    page++
  }
}

const main = async () => {
  await loadActivities()

}

main()