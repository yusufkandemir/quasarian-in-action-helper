require('dotenv').config()

const yargs = require('yargs')

const config = require('../config.json')
const getIssuesAndPulls = require('./getIssuesAndPulls')

module.exports = async () => {
  const argv = yargs
    .option('days', {
      alias: 'd',
      description: 'Interval in days',
      type: 'number',
      default: 7
    })
    .help()
    .alias('help', 'h')
    .argv

  const result = await getIssuesAndPulls({
    accessToken: process.env.ACCESS_TOKEN,
    userBlacklist: config.userBlacklist,
    repositories: config.repositories,
    labels: ['bug'],
    dayInterval: argv.days
  })

  console.log(JSON.stringify(result, null, 2))
}
