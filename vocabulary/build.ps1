# Assemble src/ parts into a single index.html
# Usage: powershell -ExecutionPolicy Bypass -File build.ps1
# NOTE: keep this script ASCII-only; all Chinese text lives in src/shell.html
$root = $PSScriptRoot
$enc  = New-Object System.Text.UTF8Encoding($false)
$u8   = [System.Text.Encoding]::UTF8
$shell = [IO.File]::ReadAllText("$root\src\shell.html", $u8)
$css   = [IO.File]::ReadAllText("$root\src\bc.css", $u8)
$body  = [IO.File]::ReadAllText("$root\src\bc-body.html", $u8)
$data  = ([IO.File]::ReadAllText("$root\src\units-data.js", $u8) + "`n" +
          [IO.File]::ReadAllText("$root\src\books-extra.js", $u8))
$js    = ([IO.File]::ReadAllText("$root\src\bc-core.js", $u8) + "`n" +
          [IO.File]::ReadAllText("$root\src\bc-session.js", $u8) + "`n" +
          [IO.File]::ReadAllText("$root\src\bc-views.js", $u8) + "`n" +
          [IO.File]::ReadAllText("$root\src\bc-sync.js", $u8))
$html = $shell.Replace('{{CSS}}', $css).Replace('{{BODY}}', $body).Replace('{{DATA}}', $data).Replace('{{JS}}', $js)
[IO.File]::WriteAllText("$root\index.html", $html, $enc)
Write-Host ("OK -> index.html (" + [math]::Round((Get-Item "$root\index.html").Length/1kb) + " KB)")
