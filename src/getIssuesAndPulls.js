const { subDays } = require('date-fns')

const { parseIssues, parsePulls } = require('./parse')
const { createGithubFetcher } = require('./createGithubFetcher')

module.exports = async ({ repositories, userBlacklist, accessToken, dayInterval, labels }) => {
  const since = subDays(new Date(), dayInterval).toISOString()
  const githubFetcher = createGithubFetcher({ accessToken })

  return await repositories.reduce(async (result, repositoryPath) => {
    return Object.assign(await result, {
      [repositoryPath]: {
        issues: await parseIssues({ githubFetcher, userBlacklist, repositoryPath, since, labels }),
        pulls: await parsePulls({ githubFetcher, userBlacklist, repositoryPath, since })
      }
    })
  }, Promise.resolve({}))
}
