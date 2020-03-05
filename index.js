const core = require("@actions/core");
const { GitHub } = require("@actions/github");
const moment = require("moment");

const devEnv = process.env.NODE_ENV === "dev";

if (devEnv) {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  require("dotenv-safe").config();
}

function isTrue(value) {
  return value === "true";
}

function getConfigs() {
  const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
  const [age, units] = devEnv
    ? process.env.AGE.split(" ")
    : core.getInput("age", { required: true }).split(" ");
  const maxAge = moment().subtract(age, units);

  console.log(
    "Maximum artifact age:",
    age,
    units,
    "( created before",
    maxAge.format(),
    ")"
  );

  return {
    token: devEnv
      ? process.env.PERSONAL_ACCESS_TOKEN
      : core.getInput("GITHUB_TOKEN", { required: true }),
    repoOptions: {
      owner,
      repo,
    },
    maxAge: moment().subtract(age, units),
    skipTags: devEnv
      ? isTrue(process.env.SKIP_TAGS)
      : isTrue(core.getInput("skip-tags")),
  };
}

async function run() {
  const configs = getConfigs();
  const octokit = new GitHub(configs.token);

  async function getTaggedCommits() {
    const tags = await octokit.request("GET /repos/:owner/:repo/tags", {
      ...configs.repoOptions,
    });

    return tags.data.map(tag => tag.commit.sha);
  }

  console.log(configs.skipTags);

  let taggedCommits;

  if (configs.skipTags) {
    try {
      console.log("Query ...");
      taggedCommits = await getTaggedCommits(octokit);
    } catch (err) {
      console.error("Error while requesting tags: ", err);

      throw err;
    }
  }

  const workflowRunsRequest = octokit.actions.listRepoWorkflowRuns.endpoint.merge(
    configs.repoOptions
  );

  return octokit.paginate(workflowRunsRequest).then(async workflowRuns => {
    const removableArtifactPromises = workflowRuns.reduce(
      (result, workflowRun) => {
        if (!workflowRun.id) {
          return result;
        }

        const skipWorkflow =
          configs.skipTags && taggedCommits.includes(workflowRun.head_sha);

        if (skipWorkflow) {
          console.log(`Tag found for ${workflowRun.head_sha}`);

          return result;
        }

        const workflowRunArtifactsRequest = octokit.actions.listWorkflowRunArtifacts.endpoint.merge(
          {
            ...configs.repoOptions,
            run_id: workflowRun.id,
          }
        );

        result.push(
          octokit.paginate(workflowRunArtifactsRequest).then(artifacts => {
            artifacts.forEach(async artifact => {
              const createdAt = moment(artifact.created_at);

              if (!createdAt.isBefore(configs.maxAge)) {
                return;
              }

              if (devEnv) {
                console.log(
                  `Recognized development environment, preventing ${artifact.id} from being removed`
                );

                return;
              }

              await octokit.actions
                .deleteArtifact({
                  ...configs.repoOptions,
                  artifact_id: artifact.id,
                })
                .then(() => {
                  console.log(
                    `Successfully removed artifact with id ${artifact.id}`
                  );
                });
            });
          })
        );

        return result;
      },
      []
    );

    await Promise.all(removableArtifactPromises);
  });
}

run();
