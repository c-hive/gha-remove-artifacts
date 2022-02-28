# gha-remove-artifacts

#### GitHub Action to customize artifact cleanup

Status and support

- &#x2714; stable
- &#x2714; supported
- &#x2716; no ongoing development

[![CI](/../../workflows/CI/badge.svg?branch=master)](/../../actions)

GitHub Action Artifacts are removed after [90 days](https://github.community/t5/GitHub-Actions/Managing-Actions-storage-space/m-p/41424/highlight/true#M4618) by default. [GitHub now supports changing this setting](https://github.blog/changelog/2020-10-08-github-actions-ability-to-change-retention-days-for-artifacts-and-logs/). This action allows you to further customize the cleanup. It
- removes artifacts that are older than the specified age
- has the option to keep release (tagged) artifacts
- has the option to keep a number of recent artifacts
- [respects](https://github.com/octokit/plugin-throttling.js) GitHub's rate limit

Example use cases:
- keep all release artifacts for a year, remove non-release artifacts after 30 days
- keep the most recent 10 artifacts

## Usage

Add the following workflow to your repository and configure options.

`.github/workflows/remove-old-artifacts.yml`
```yml
name: Remove old artifacts

on:
  schedule:
    # Every day at 1am
    - cron: '0 1 * * *'

jobs:
  remove-old-artifacts:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
    - name: Remove old artifacts
      uses: c-hive/gha-remove-artifacts@v1
      with:
        age: '1 month' # '<number> <unit>', e.g. 5 days, 2 years, 90 seconds, parsed by Moment.js
        # Optional inputs
        # skip-tags: true
        # skip-recent: 5
```

## Conventions

This project follows [C-Hive guides](https://github.com/c-hive/guides) for code style, way of working and other development concerns.

## License

The project is available as open source under the terms of the [MIT License](http://opensource.org/licenses/MIT).
