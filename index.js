const core = require("@actions/core");
const github = require("@actions/github");
const moment = require("moment");

async function run() {
  const token = core.getInput("GITHUB_TOKEN", { required: true });
  const octokit = new github.GitHub(token);

  const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
  console.log("Repo:", owner, "/", repo);

  const [age, units] = core.getInput("age", { required: true }).split(" ");
  const maxAge = moment().subtract(age, units);
  console.log(
    "Maximum artifact age:",
    age,
    units,
    "( created before",
    maxAge.format(),
    ")"
  );

  const repoOptions = { owner, repo };

  const workflowRunsRequest = octokit.actions.listRepoWorkflowRuns.endpoint.merge(
    repoOptions
  );

  function getWorkflowRunArtifacts(workflowRunId) {
    return octokit.paginate(
      octokit.actions.listWorkflowRunArtifacts.endpoint.merge({
        ...repoOptions,
        run_id: workflowRunId,
      })
    );
  }

  function getRemovableArtifacts(artifacts) {
    return artifacts.reduce((removableArtifactsResult, artifact) => {
      const createdAt = moment(artifact.created_at);

      if (!createdAt.isBefore(maxAge)) {
        return removableArtifactsResult;
      }

      removableArtifactsResult.push(
        octokit.actions
          .deleteArtifact({
            owner,
            repo,
            artifact_id: artifact.id,
          })
          .then(() => {
            console.log(`Successfully removed artifact with id ${artifact.id}`);
          })
      );

      return removableArtifactsResult;
    }, []);
  }

  octokit.paginate(workflowRunsRequest).then(workflowRuns => {
    const deleteArtifactPromises = workflowRuns.reduce((result, page) => {
      if (page.workflow_runs) {
        return page.workflow_runs.reduce((_, workflowRun) => {
          if (!workflowRun.id) {
            return result;
          }

          result.push(
            getWorkflowRunArtifacts(workflowRun.id).then(artifacts =>
              getRemovableArtifacts(artifacts)
            )
          );

          return result;
        }, []);
      }

      if (!page.id) {
        return result;
      }

      result.push(
        getWorkflowRunArtifacts(page.id).then(artifacts =>
          getRemovableArtifacts(artifacts)
        )
      );

      return result;
    }, []);

    Promise.all(deleteArtifactPromises);
  });
}

run();
