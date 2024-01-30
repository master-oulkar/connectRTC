## This file guide you to review PR from another fork branch.

> **To push changes to fork branch you should have access to push/write from central repository. Otherwise you can test PR on your local new branch and then create new PR.**

### Method 1 : GitHub CLI Commands

#### Step 1 : Make sure your local system is installed with GitHub CLI

#### Step 2 : Go to local repo 'main' branch and set default remote repository for your local directory. Use command `gh repo set-default`.

#### Step 3 : Checkout branch same name as fork branch with PR number, use command `gh pr checkout <PR number>`

### Method 2 : Git CLI commands

### Step 1: Go to local repo 'main' branch and create new branch for your PR test. Use command `git checkout -b <newBranchName>`.

### Step 2 : Pull PR from fork HTTPS protocol with branch name. Use command `git pull <HTTPS address> <PR branchName>`.

### Step 3 : Solve merge conflicts.

### Step 4 : Setup fork remote for a local branch.

#### 4.1 : `git config --local branch.<localBranchName>.remote <fork url/HTTPS address>`

#### 4.2 : `git config --local branch.<localBranchName>.pushremote <fork url/HTTPS address>`

#### 4.3 : `git config --local branch.<localBranchName>.merge refs/heads/<PR branch name>`

### Step 5 : Push new changes to fork PR branch. Use command `git push <fork/>urlHTTPS address> <PR branchName>`.
