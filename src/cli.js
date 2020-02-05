require('dotenv').config()

const yargs = require('yargs')
const { subDays } = require('date-fns')
const ora = require('ora')

const { parseIssues, parsePulls, parseReleases, parseCommitCounts } = require('./parse')
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

  const { repositories, userBlacklist, commitCountBlacklist } = config
  const labels = ['bug']
  const since = subDays(new Date(), argv.days).toISOString()
  const githubFetcher = createGithubFetcher({ accessToken: process.env.ACCESS_TOKEN })

  const spinner = ora()

  try {
    const results = {}

    for (const [index, repositoryPath] of repositories.entries()) {
      const progress = `${index + 1}/${repositories.length}`
      spinner.start(`(${progress}) Processing the repository: ${repositoryPath}`)

      results[repositoryPath] = {
        issues: await parseIssues({ githubFetcher, userBlacklist, repositoryPath, since, labels }),
        pulls: await parsePulls({ githubFetcher, userBlacklist, repositoryPath, since }),
        releases: await parseReleases({ githubFetcher, repositoryPath, since }),
        commitCounts: await parseCommitCounts({ githubFetcher, importantUsers: userBlacklist, userBlacklist: commitCountBlacklist, repositoryPath, since })
      }

      spinner.succeed(`(${progress}) Succesfully processed the repository: ${repositoryPath}`)
    }

    spinner.stop()

    console.log(JSON.stringify(results, null, 2))
  } catch (error) {
    spinner.fail('An error occured while processing the repositories')

    console.error('Full details:')
    console.error(error)

    console.error()
    console.error('Short explanation:')
    console.error(error.message)
    if (error.response) {
      console.error(await error.response.json())
    }

    process.exit(1)
  }
}
