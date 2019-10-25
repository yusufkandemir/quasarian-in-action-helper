require('dotenv').config()

const yargs = require('yargs')
const { subDays } = require('date-fns')

const { parseIssues, parsePulls } = require('./parse')
const { createGithubFetcher } = require('./createGithubFetcher')

const config = require('../config.json')

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

  const { repositories, userBlacklist } = config
  const labels = ['bug']
  const since = subDays(new Date(), argv.days).toISOString()
  const githubFetcher = createGithubFetcher({ accessToken: process.env.ACCESS_TOKEN })

  const result = await repositories.reduce(async (result, repositoryPath) => {
    return Object.assign(await result, {
      [repositoryPath]: {
        issues: await parseIssues({ githubFetcher, userBlacklist, repositoryPath, since, labels }),
        pulls: await parsePulls({ githubFetcher, userBlacklist, repositoryPath, since })
      }
    })
  }, Promise.resolve({}))

  console.log(JSON.stringify(result, null, 2))
}
