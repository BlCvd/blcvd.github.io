param(
    [string]$Message = 'docs: update research notes',
    [switch]$CheckOnly
)
$ErrorActionPreference = 'Stop'
$blogRoot = Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $blogRoot
try {
    & npm.cmd run preflight
    if ($LASTEXITCODE -ne 0) { throw 'Build, link check or publication approval check failed.' }
    if ($CheckOnly) { Write-Host 'Checks passed. No commit or push performed.'; return }
    $blogBranch = & git branch --show-current
    if ($LASTEXITCODE -ne 0 -or $blogBranch -ne 'main') { throw 'Publish from the main branch of the blog repository.' }
    $blogRemote = & git remote get-url origin
    if ($LASTEXITCODE -ne 0) { throw 'No origin remote. Complete first-time repository setup in DEPLOYMENT.md.' }
    $expectedRepo = & node -e "const p=require('./tools/profile.cjs').load('profile.yml');process.stdout.write(p.author.github_username+'/'+p.author.github_username.toLowerCase()+'.github.io')"
    $expectedEscaped = [regex]::Escape($expectedRepo)
    if ($blogRemote -notmatch "github\.com[:/]$expectedEscaped(?:\.git)?$" ) { throw 'origin does not match the configured GitHub Pages repository.' }
    & git add -- .github scaffolds scripts source tools .gitignore .gitattributes .nvmrc _config.yml _config.icarus.yml _config.post.yml profile.yml package.json package-lock.json README.md BLOG_GUIDE.md DEPLOYMENT.md THIRD_PARTY.md
    if ($LASTEXITCODE -ne 0) { throw 'Could not stage blog source.' }
    & git diff --cached --quiet
    if ($LASTEXITCODE -eq 1) {
        & git diff --cached --stat
        & git commit -m $Message
        if ($LASTEXITCODE -ne 0) { throw 'Commit failed.' }
    } elseif ($LASTEXITCODE -ne 0) { throw 'Could not inspect staged changes.' }
    & git push -u origin main
    if ($LASTEXITCODE -ne 0) { throw 'Push failed. The local commit is preserved; resolve authentication or remote conflicts and retry.' }
    Write-Host 'Source pushed. GitHub Actions will build and deploy; check the Actions tab for the result.'
} finally { Pop-Location }
