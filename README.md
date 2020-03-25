# gha-remove-artifacts

#### GitHub Action to remove old artifacts

Status and support

- &#x2714; stable
- &#x2714; supported
- &#x2716; no ongoing development

[![CI](/../../workflows/CI/badge.svg)](/../../actions)

GitHub Action Artifacts are removed after [90 days](https://github.community/t5/GitHub-Actions/Managing-Actions-storage-space/m-p/41424/highlight/true#M4618). This cannot be configured either globally or per project. There's also a limit on free artifact space after which it becomes a payed resource. There's no configurable storage limit per project either, so some projects might use up all quota and not leave room for others.

We created this Action to solve these problems. It
- removes artifacts that are older than the specified age
- has the option to keep release (tagged) artifacts
- [respects](https://github.com/octokit/plugin-throttling.js) GitHub's rate limit

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
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        age: '1 month'
        skip-tags: true
```

## Conventions

This project follows [C-Hive guides](https://github.com/c-hive/guides) for code style, way of working and other development concerns.

## License

The project is available as open source under the terms of the [MIT License](http://opensource.org/licenses/MIT).
