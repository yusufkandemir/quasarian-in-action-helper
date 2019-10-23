# Quasarian in Action Helper

This helper is aimed to be used for Quasarian in Action weekly. It parses issues and PRs, outputs the result.

## Usage

You can run the executable directly
```bash
./bin/parse-issues
```
or with some options
```bash
./bin/parse-issues --days=5
```
to see the help page
```bash
./bin/parse-issues --help
```

### Increase Github API rate limit (Optional)
This projects consumes Github API. Github applies [rate limiting](https://developer.github.com/v3/#rate-limiting). The limit is 60 requests per hours for unauthenticated users. You can follow the instructions below to increase this limit to 5000 requests per hour.

 - Create an access token by following [this guide](https://help.github.com/en/github/authenticating-to-github/creating-a-personal-access-token-for-the-command-line). You don't need to set any scopes to process only the public repos.
 - Create `.env` file by duplicating the `.env.example` (`cp .env.example .env`)
 - Set the value of `ACCESS_TOKEN` to the access token that you generated following the guide
