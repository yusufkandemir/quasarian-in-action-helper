require('dotenv').config()

const { subDays, parseISO, compareAsc } = require('date-fns')
const fetch = require('node-fetch')
const yargs = require('yargs')

const config = require('./config.json')

const fetchGithubAPI = async (url, options = {}) => {
  return fetch(url.startsWith('/') ? `https://api.github.com${url}` : url, {
    headers: {
      'Authorization': `token ${process.env.ACCESS_TOKEN}`
    },
    ...options
  })
}

const getParseResult = async (repositoryPath, definedInterval, issueLabels = []) => {
  const since = subDays(new Date(), definedInterval).toISOString()

  const issuesResponse = await fetchGithubAPI(`/repos/${repositoryPath}/issues?state=closed&since=${since}&labels=${issueLabels.join(',')}`)
  const rawIssues = await issuesResponse.json()

  const issuePromises = rawIssues
    .filter(issue => !config.userBlacklist.includes(issue.user.login) && issue.pull_request === void 0)
    .map(async issue => {
      const eventsResponse = await fetchGithubAPI(`/repos/${repositoryPath}/issues/${issue.number}/events`)
      const rawEvents = await eventsResponse.json()

      const referencedEvent = rawEvents.find(rawEvent => rawEvent.event === 'referenced')

      let fixInfo = {}

      if (referencedEvent !== void 0) {
        const commitResponse = await fetchGithubAPI(referencedEvent.commit_url)
        const rawCommit = await commitResponse.json()

        fixInfo.title = rawCommit.commit.message
        fixInfo.authorName = referencedEvent.actor.login
        fixInfo.authorUrl = referencedEvent.actor.html_url
      } else {
        // If closed directly rather than by a fix, return null, then filter it later
        return null
      }

      return {
        title: issue.title,
        url: issue.html_url,
        reporterName: issue.user.login,
        reporterUrl: issue.user.html_url,
        fixTitle: fixInfo.title,
        fixAuthorName: fixInfo.authorName,
        fixAuthorUrl: fixInfo.authorUrl
      }
    })
  const issues = (await Promise.all(issuePromises))
    .filter(issue => issue !== null)

  const pullsResponse = await fetchGithubAPI(`/repos/${repositoryPath}/pulls?state=closed`)
  const rawPulls = await pullsResponse.json()

  const pulls = rawPulls
    .filter(pull =>
      !config.userBlacklist.includes(pull.user.login) &&
      pull.merged_at !== null &&
      compareAsc(parseISO(pull.merged_at), parseISO(since)) > 0
    )
    .map(pull => {
      return {
        title: pull.title,
        url: pull.html_url,
        authorName: pull.user.login,
        authorUrl: pull.user.html_url
      }
    })

  return {
    issues,
    pulls
  }
}

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

const finalResultPromise = config.repositories.reduce(async (finalResult, repositoryPath) => {
  return Object.assign(await finalResult, {
    [repositoryPath]: await getParseResult(repositoryPath, argv.days, ['bug'])
  })
}, Promise.resolve({}))

finalResultPromise
  .then(result => console.log(JSON.stringify(result, null, 2)))
