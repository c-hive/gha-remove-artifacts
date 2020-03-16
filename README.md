# gha-remove-artifacts

#### GitHub Action to remove old artifacts

GitHub Action Artifacts are removed after [90 days](https://github.community/t5/GitHub-Actions/Managing-Actions-storage-space/m-p/41424/highlight/true#M4618). This cannot be configured either globally or per project. There's also a limit on free artifact space after which it becomes a payed resource. There's no configurable storage limit per project either, so some projects might use up all quota and not leave room for others.

We created this Action to solve these problems. It can
- remove artifacts that are older than some custom timeframe
- keep release (tagged) artifacts

`.github/workflows/remove-old-artifacts.yml`
```
name: Remove old artifacts

on:
  schedule:
    # Every day at 1am
    - cron: '0 1 * * *'

jobs:
  remove-old-artifacts:
    runs-on: ubuntu-latest

    steps:
    - name: Remove old artifacts
      uses: c-hive/gha-remove-artifacts
      with:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        age: '1 month'
        skip-tags: true
```

## Conventions

This project follows [C-Hive guides](https://github.com/c-hive/guides) for code style, way of working and other development concerns.

## License

The project is available as open source under the terms of the [MIT License](http://opensource.org/licenses/MIT).
