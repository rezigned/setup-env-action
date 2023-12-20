# Setup Environment Variable (dynamically)

<p>
  <a href="https://github.com/rezigned/setup-env-action/actions"><img alt="setup-env-action status" src="https://github.com/rezigned/setup-env-action/workflows/build-test/badge.svg"></a>
  <a href="https://github.com/rezigned/setup-env-action/actions"><img alt="setup-env-action status" src="https://github.com/rezigned/setup-env-action/workflows/CodeQL/badge.svg"></a>
</p>

This action sets up environment variables by evaluating the values with shell command first.

## Usage

**Basic**:

```yaml
steps:
  - uses: rezigned/setup-env-action@v1
    with:
      env: |
        GIT_SHORT_SHA: $(git rev-parse --short HEAD)

  - run: |
      echo ${{ env.GIT_SHORT_SHA }}
```
**Using variable name at input-level**:

> [!WARNING]
> Although this works. Github will send a warning message like 'VAR NAME' is not a valid input. This is because Github only allows input names defined in `action.yml`.

```yaml
steps:
  - uses: rezigned/setup-env-action@v1
    with:
      GIT_SHORT_SHA: $(git rev-parse --short HEAD)
```

**Specifying shell**:

The `sh` shell is used by default. User can speicfy other shell by using `shell` input. For example:

```yaml
  - uses: rezigned/setup-env-action@v1
    with:
      env: |
        GIT_SHORT_SHA: $(git rev-parse --short HEAD)
      shell: bash
```

## Why?

Github workflow currently [doesn't](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#env) allow user to set `env` value by referring to existing `env`.

> *Variables in the env `map` cannot be defined in terms of other variables in the map.*

For example, this won't work:

```yml
...
env:
  DOMAIN: https://example.com

steps:
  - name: Check status
    env:
      API_URL: ${{ env.DOMAIN }}/api
```

The current solution recommended by Github is to add extra step and add variable into `GITHUB_ENV` file.

For example:

```yml
steps:
  - name: Set up envs
    run: |
      echo "API_URL=$DOMAIN/api" >> $GITHUB_ENV

  - name: Check status
    run: |
      echo $API_URL // https://example.com/api
```
