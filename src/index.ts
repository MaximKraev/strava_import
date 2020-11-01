require('dotenv').config()

import strava from 'strava-v3'
import { promises as fs } from 'fs'

const getDataType = (filePath: string):string =>filePath.split('.').slice(1).join('.')

const upload = async (file: string) => {
  const payload = await strava.uploads.post({
    data_type: getDataType(file),
    file: `activities/${file}`,
  }, (err, payload) => {
    console.log(`--- Done Callback`)
    if (err) {
      console.log(err)
    }
    console.log(payload)
    console.log(`--- Done Callback`)
  })
  return payload
}

const sleep = (sec: number) => new Promise((resolve, reject) => {setTimeout(resolve, sec*1000)})

const main = async () => {
  const files = await fs.readdir('activities')
  let rateLimitter = 0
  for(const file of files) {
    console.log(`Uploading ${file}`)
    try {
      const result = await upload(file)

      if (result.error) {
        console.log(`failed to upload ${file}`)
      } else {
        fs.rename(`activities/${file}`, `transferred/${file}`)
      }

      console.log(result)
      console.log(`fraction ${strava.rateLimiting.exceeded()}`)
      console.log(`fraction reached ${strava.rateLimiting.fractionReached()}`)
      rateLimitter++
    } catch(err) {
      rateLimitter = 100
    }

    if (rateLimitter === 90) {
      console.log(`Done ${rateLimitter} sleeping...`)
      await sleep(15*60)
      rateLimitter = 0
    }
  }
}

main()