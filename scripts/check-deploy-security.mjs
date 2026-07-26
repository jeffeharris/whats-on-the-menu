import { readFileSync } from 'node:fs';

const workflow = readFileSync(
  new URL('../.github/workflows/deploy.yml', import.meta.url),
  'utf8',
);

const failures = [];
if (/runs-on:\s*(?:\[)?self-hosted/.test(workflow)) {
  failures.push('production deployment must not run on a self-hosted runner');
}
if (!workflow.includes('runs-on: ubuntu-latest')) {
  failures.push('production deployment must use a GitHub-hosted runner');
}
if (!workflow.includes('menu-deploy@$DEPLOY_HOST')) {
  failures.push('production deployment must use the scoped menu gateway');
}
if (!workflow.includes('StrictHostKeyChecking=yes')) {
  failures.push('deployment SSH must pin and enforce the host key');
}
if (!workflow.includes('${{ steps.build.outputs.digest }}')) {
  failures.push('the build job must export its immutable image digest');
}
if (
  !workflow.includes(
    'docker/setup-buildx-action@bb05f3f5519dd87d3ba754cc423b652a5edd6d2c',
  )
) {
  failures.push('attested image builds must initialize the pinned Buildx driver');
}
if (!workflow.includes('production $GITHUB_SHA $IMAGE_DIGEST')) {
  failures.push('the deploy request must carry the protected commit and image digest');
}

if (failures.length) {
  for (const failure of failures) {
    console.error(`ERROR: ${failure}`);
  }
  process.exit(1);
}

console.log('Deployment workflow uses the restricted off-host trust boundary.');
