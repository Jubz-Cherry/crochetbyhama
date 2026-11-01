$ErrorActionPreference = 'Stop'
$gitExe = 'C:/Users/jujuk/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/git/cmd/git.exe'
Write-Host 'Ready for credential JSON on stdin (input is hidden).'
$line = ''
while ($true) {
  $key = [Console]::ReadKey($true)
  if ($key.Key -eq 'Enter') { break }
  $line += $key.KeyChar
}
$credential = $line | ConvertFrom-Json
$line = $null
try {
  if ($credential.auth_mode -ne 'http_extra_header') { throw 'Unsupported credential mode' }
  $manifest = Get-Content .openai/hosting.json -Raw | ConvertFrom-Json
  if ($manifest.project_id -ne 'appgprj_6ae54b79937881918d094f1dda87b55e') { throw 'Wrong project' }
  $remote = [Uri]$credential.remote_url
  if ($remote.Scheme -ne 'https' -or $remote.UserInfo -or $remote.Query) { throw 'Invalid remote' }
  $env:GIT_TERMINAL_PROMPT='0'
  $env:SITES_GIT_AUTHORIZATION='Authorization: Bearer '+$credential.token
  $auth=@('-c','http.sslBackend=openssl','-c','credential.helper=','-c','http.extraHeader=','-c','http.followRedirects=false',"--config-env=http.$($credential.remote_url).extraHeader=SITES_GIT_AUTHORIZATION")
  $ref='refs/heads/'+$credential.branch
  $existing=& $gitExe @auth ls-remote --heads $credential.remote_url $ref
  if ($LASTEXITCODE -ne 0) { throw 'Remote check failed' }
  if ($existing) { $current=(& $gitExe rev-parse HEAD).Trim(); if (-not $existing.StartsWith($current)) { throw 'Remote changed; reconcile before publishing' } }
  & $gitExe add --all -- .
  if ($LASTEXITCODE -ne 0) { throw 'Stage failed' }
  & $gitExe -c user.name=Sites -c user.email=sites@users.noreply.openai.com commit -m 'Create Jubis catalog and administrative application'
  if ($LASTEXITCODE -ne 0) { throw 'Commit failed' }
  $sha=(& $gitExe rev-parse HEAD).Trim()
  & $gitExe @auth push $credential.remote_url "${sha}:$ref"
  if ($LASTEXITCODE -ne 0) { throw 'Push failed' }
  $verified=& $gitExe @auth ls-remote --heads $credential.remote_url $ref
  if (-not $verified.StartsWith($sha)) { throw 'Source verification failed' }
  Write-Output ('COMMIT_SHA='+$sha)
} finally {
  Remove-Item Env:SITES_GIT_AUTHORIZATION -ErrorAction SilentlyContinue
  $credential=$null
}


