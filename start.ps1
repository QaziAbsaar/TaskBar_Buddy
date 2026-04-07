$env:ELECTRON_RUN_AS_NODE = ''
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& "$projectDir\node_modules\electron\dist\electron.exe" $projectDir
