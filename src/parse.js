const { parseISO, compareAsc } = require('date-fns')

/**
 * Returns the closed issues that are referenced in a commit
 * 
 * @param {Object} config
 * @param {githubFetcher} config.githubFetcher Used in API calls, can be created using 'createGithubFetcher'
 * @param {string[]} config.userBlacklist List of users to be blacklisted
 * @param {string} config.repositoryPath Github repository path in form of 'author/repository'
 * @param {string} config.since Issues older than 'since' will be filtered out (in form of ISO 8061 date string)
 * @param {string[]} config.labels List of labels to be whitelisted
 */
const parseIssues = async ({ githubFetcher, userBlacklist = [], repositoryPath, since, labels = [] }) => {
  const issuesResponse = await githubFetcher(`/repos/${repositoryPath}/issues?state=closed&since=${since}&labels=${labels.join(',')}`)
  const rawIssues = await issuesResponse.json()

  const issuePromises = rawIssues
    .filter(issue => !userBlacklist.includes(issue.user.login) && issue.pull_request === void 0)
    .map(async issue => {
      const eventsResponse = await githubFetcher(`/repos/${repositoryPath}/issues/${issue.number}/events`)
      const rawEvents = await eventsResponse.json()

      const referencedEvent = rawEvents.find(rawEvent => rawEvent.event === 'referenced')

      let fixInfo = {}

      if (referencedEvent !== void 0) {
        const commitResponse = await githubFetcher(referencedEvent.commit_url)
        const rawCommit = await commitResponse.json()

        let title = rawCommit.commit.message
        // Strip everything after the newline (if there is one)
        let newlineIndex = title.indexOf('\n')
        if (newlineIndex !== -1) {
          title = title.substr(0, newlineIndex)
        }

        fixInfo.title = title
        fixInfo.authorName = await getUserName({ githubFetcher, login: referencedEvent.actor.login })
        fixInfo.authorUrl = referencedEvent.actor.html_url
      } else {
        // If closed directly rather than by a fix, return null, then filter it later
        return null
      }

      return {
        title: issue.title,
        url: issue.html_url,
        reporterName: await getUserName({ githubFetcher, login: issue.user.login }),
        reporterUrl: issue.user.html_url,
        fixTitle: fixInfo.title,
        fixAuthorName: fixInfo.authorName,
        fixAuthorUrl: fixInfo.authorUrl
      }
    })
  const issues = (await Promise.all(issuePromises))
    .filter(issue => issue !== null)

  return issues
}

/**
 * Returns the merged pull requests
 * 
 * @param {Object} config
 * @param {Function} config.githubFetcher Used in API calls, can be created using 'createGithubFetcher'
 * @param {string[]} config.userBlacklist List of users to be blacklisted
 * @param {string} config.repositoryPath Github repository path in form of 'author/repository'
 * @param {string} config.since Issues older than 'since' will be filtered out (in form of ISO 8061 date string)
 */
const parsePulls = async ({ githubFetcher, userBlacklist = [], repositoryPath, since }) => {
  const pullsResponse = await githubFetcher(`/repos/${repositoryPath}/pulls?state=closed`)
  const rawPulls = await pullsResponse.json()

  const pulls = rawPulls
    .filter(pull =>
      !userBlacklist.includes(pull.user.login) &&
      pull.merged_at !== null &&
      compareAsc(parseISO(pull.merged_at), parseISO(since)) > 0
    )
    .map(async pull => {
      return {
        title: pull.title,
        url: pull.html_url,
        authorName: await getUserName({ githubFetcher, login: pull.user.login }),
        authorUrl: pull.user.html_url
      }
    })

  return Promise.all(pulls)
}

/**
 * Returns the merged pull requests
 * 
 * @param {Object} config
 * @param {Function} config.githubFetcher Used in API calls, can be created using 'createGithubFetcher'
 * @param {string} config.repositoryPath Github repository path in form of 'author/repository'
 * @param {string} config.since Releases older than 'since' will be filtered out (in form of ISO 8061 date string)
 */
const parseReleases = async ({ githubFetcher, repositoryPath, since }) => {
  const releasesResponse = await githubFetcher(`/repos/${repositoryPath}/releases`)
  const rawReleases = await releasesResponse.json()

  const releases = rawReleases
    .filter(release =>
      release.published_at !== null &&
      compareAsc(parseISO(release.published_at), parseISO(since)) > 0
    )
    .map(release => {
      return {
        name: release.name,
        url: release.html_url
      }
    })

  return releases
}

/**
 * Returns the commit counts per user
 * 
 * @param {Object} config
 * @param {Function} config.githubFetcher Used in API calls, can be created using 'createGithubFetcher'
 * @param {string[]} config.userBlacklist List of users to be blacklisted
 * @param {string} config.repositoryPath Github repository path in form of 'author/repository'
 * @param {string} config.since Releases older than 'since' will be filtered out (in form of ISO 8061 date string)
 */
const parseCommitCounts = async ({ githubFetcher, userBlacklist = [], repositoryPath, since }) => {
  const params = new URLSearchParams({ since })

  const commitsResponse = await githubFetcher(`/repos/${repositoryPath}/commits?${params.toString()}`)
  const rawCommits = await commitsResponse.json()

  const commitCounts = rawCommits
    .map(rawCommit => userBlacklist.includes(rawCommit.author.login) ? rawCommit.author.login : '[others]')
    .reduce((result, author) => {
      if (result[author] === undefined) {
        result[author] = { author, count: 0 }
      }

      result[author].count++

      return result
    }, {})

  return Object.values(commitCounts)
}

const getUserName = async ({ githubFetcher, login }) => {
  const userResponse = await githubFetcher(`/users/${login}`)
  const rawUser = await userResponse.json()

  return rawUser.name || rawUser.login
}

module.exports = {
  parseIssues,
  parsePulls,
  parseReleases,
  parseCommitCounts
}
