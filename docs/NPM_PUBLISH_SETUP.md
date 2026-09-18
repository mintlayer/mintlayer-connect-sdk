# npm publish setup — corporate access & release runbook

Publishing setup for `@mintlayer/sdk` (and other `@mintlayer/*` packages).
Reads in two parts: the **short-term bridge** that makes the release workflow
work today, and the **org migration** that removes the personal-account
dependency so Mintlayer-the-company can never lose publish access.

## Current state (verified 2026-09-18)

- Package: `@mintlayer/sdk`, published at **1.0.39** (also in the scope:
  `@mintlayer/wasm-lib` and others, same maintainers).
- There is **no npm organization** named `mintlayer` **and no user account**
  named `mintlayer`. The scope is held together only by **per-package
  maintainer lists** on two personal accounts:
  **owlsua** \<allatsnow@gmail.com\> and **anyxem** \<anyxem@gmail.com\>.
- There is **no `NPM_TOKEN` secret** on the GitHub repository yet — the
  publish workflow (`.github/workflows/publish.yml`) fails until one exists.

### Why this is a corporate risk

Publish access lives in two personal accounts with personal (gmail)
recovery emails. If an employee leaves, loses 2FA, or the account is
locked, Mintlayer cannot publish, add maintainers, or transfer the
packages without a slow npm-support identity claim. With both accounts
unavailable, the scope is effectively lost to the company.

Partly mitigating: the org/user name `mintlayer` is **still claimable**,
so the fix below can be done at any time — but do it before, not after,
an incident.

## Target setup (do this once)

1. **Create an npm Organization named `mintlayer`**
   - Register it under a **company-controlled email** (e.g.
     `npm@mintlayer.org` — an alias that reaches ≥2 employees, not a
     personal inbox). Enable **2FA requirement** for org members.
   - The org becomes the collective owner of the `@mintlayer` scope.
     Free tier covers unlimited public packages.
2. **Transfer existing packages into the org**
   - As `owlsua`/`anyxem`: each package → *Settings* → *Maintainers* →
     transfer to the `mintlayer` org (or package → *Add to organization*).
     For anything blocked, npm support handles org-scoped transfers with
     proof of trademark/domain ownership.
3. **Access via org teams, never via personal maintainer status**
   - Team `admins`: ≥2 humans **plus** one company-owned account.
   - Team `publishers`: employees who release + the CI identity (next
     step). Publish rights come from team membership; offboarding =
     remove the member from the team and access is gone with nothing
     personal left holding the packages.
4. **CI publishing identity — preferred: Trusted Publishing (OIDC)**
   - npm supports OIDC-based trusted publishing from GitHub Actions: the
     workflow authenticates as the package via OIDC with the repo +
     workflow name allowlisted on the npm package settings — **no
     long-lived token exists at all**. Configure it per package as an org
     maintainer; the workflow already runs with `id-token: write` and
     provenance enabled.
   - Fallback (if trusted publishing is unavailable for a package): a
     dedicated **bot account** (company email, 2FA) in the `publishers`
     team generates a **Granular Access Token** scoped to `@mintlayer/*`,
     ≤1-year expiry, stored as a **GitHub organization-level secret**
     `NPM_TOKEN` (org secret → every repo workflow can use it; rotate on
     expiry). Never a personal account's token.
5. **Remove personal maintainer entries** from the packages once the org
   owns them — after that, npm UI shows the org as owner and access is
   fully role-based.

## Short-term bridge (works today, until the org exists)

Only needed if you must release before the migration:

1. As `owlsua` or `anyxem`: npmjs.com → *Access Tokens* → *Generate New
   Token* → **Granular Access Token** — *Packages and scopes*: **Read and
   write**, scope limited to `@mintlayer/sdk`, expiry **≤ 1 year**
   (calendar the renewal).
2. GitHub repository → *Settings* → *Secrets and variables* → *Actions* →
   *New repository secret*: name `NPM_TOKEN`, value = the token.
3. When the org migration lands, delete this personal token and switch to
   step 4 of the target setup.

## Publishing a release

1. Bump the version in `packages/sdk/package.json` (e.g. `release: 1.1.0`).
2. Merge to `main`.
3. Create a GitHub Release for the corresponding tag.
   - The `Publish SDK` workflow runs the SDK test suite, then publishes
     `@mintlayer/sdk` with `--access public` and npm provenance. With
     trusted publishing the OIDC identity replaces `NPM_TOKEN`; with the
     token fallback the secret is used. The workflow checks out the
     tagged commit and asserts the tag matches `package.json`.

> **Tag protection:** protect release tags (GitHub *tag protection rules*
> / rulesets, e.g. `v*`). If a tag could be mutated or deleted between
> release creation and the workflow run, the version binding could be
> defeated. Protected tags close that TOCTOU window. This stays
> mandatory regardless of which publishing identity is used.

Do **not** publish manually from a local machine unless the workflow is
unavailable; the workflow keeps provenance and runs the test gate.

## Governance checklist (review quarterly)

- [ ] Org `mintlayer` exists, admin email is a company alias, 2FA enforced
- [ ] ≥2 org admins, one of them company-owned
- [ ] All `@mintlayer/*` packages owned by the org; no personal maintainers
- [ ] Publishing identity is trusted publishing (or org bot token, rotated)
- [ ] `NPM_TOKEN` is an org-level GitHub secret (or absent, with OIDC)
- [ ] Release tags protected on GitHub
- [ ] Offboarding runbook: remove member from npm org team + GitHub org
