# npm publish setup — handoff

Current state of npm publishing for `@mintlayer/sdk` and the steps a
maintainer must complete once before the release-triggered workflow can
publish.

## Current state

- The package is `@mintlayer/sdk`, currently published at **1.0.39**.
- The `@mintlayer` scope is **user-owned** (there is no `@mintlayer` npm
  organization yet).
- npm maintainers on the package: **owlsua** \<allatsnow@gmail.com\> and
  **anyxem** \<anyxem@gmail.com\>.
- There is **no `NPM_TOKEN` secret** on the GitHub repository yet — the
  publish workflow (`.github/workflows/publish.yml`) will fail until it
  is added.

## One-time setup (maintainer)

1. **Create an npm access token**
   - Log in at npmjs.com as `owlsua` or `anyxem`.
   - Avatar → *Access Tokens* → *Generate New Token* → **Granular Access Token**.
   - Configure:
     - *Packages and scopes*: **Read and write**
     - *Scope*: select only **`@mintlayer/sdk`**
     - *Expiration*: **1 year or less** (and calendar a renewal reminder).
2. **Add the token to GitHub**
   - Repository → *Settings* → *Secrets and variables* → *Actions* →
     *New repository secret*.
   - Name: `NPM_TOKEN`
   - Secret: paste the token from step 1.

## Publishing a release

The workflow publishes on GitHub Releases:

1. Bump the version in `packages/sdk/package.json` (e.g. `release: 1.1.0`).
2. Merge to `main`.
3. Create a GitHub Release for the corresponding tag.
   - The `Publish SDK` workflow runs the SDK test suite, then publishes
     `@mintlayer/sdk` with `--access public` and npm provenance.

Do **not** publish manually from a local machine unless the workflow is
unavailable; the workflow keeps provenance and runs the test gate.

## Long-term recommendation

Convert `@mintlayer` from a user-owned scope into an **npm organization**
and add a dedicated **bot account** as maintainer:

- Tokens then belong to the org/bot, not to a personal account, so
  publishes survive contributor churn and personal 2FA changes.
- Granular tokens can be scoped per-package and rotated centrally.
- Provenance statements will reference the organization, which looks
  better in the npm UI and supply-chain audits.
