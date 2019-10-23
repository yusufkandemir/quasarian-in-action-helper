const fetch = require('node-fetch')

/**
 * Pass the url relative to 'https://api.github.com' with a trailing slash (e.g. /repos/author/repo/issues)
 * or an absolute URL (e.g. https://api.github.com/repos/author/repo/issues)
 * 
 * @callback githubFetcher
 * @param {string} url 
 * @param {object} options
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
 */

/**
 * Pass an 'accessToken' for increased rate limit
 * 
 * @see https://developer.github.com/v3/#rate-limiting
 * @see https://help.github.com/en/github/authenticating-to-github/creating-a-personal-access-token-for-the-command-line
 * 
 * @param {{accessToken?: string, fetchOptions: object}} config
 * @returns {githubFetcher}
 */
const createGithubFetcher = config => {
  return (url, options = {}) => {
    return fetch(url.startsWith('/') ? `https://api.github.com${url}` : url, {
      headers: config.accessToken !== void 0
        ? { 'Authorization': `token ${config.accessToken}` }
        : {},
      ...config.fetchOptions,
      ...options
    })
  }
}

module.exports = {
  createGithubFetcher
}
