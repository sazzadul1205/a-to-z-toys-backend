# tests/_common.ps1 — dot-sourced by every test script
$script:ReportsDir = Join-Path $PSScriptRoot "reports"
if (-not (Test-Path $script:ReportsDir)) {
    New-Item -ItemType Directory -Path $script:ReportsDir -Force | Out-Null
}

$script:Results = @()
$script:TmpReq  = Join-Path $env:TEMP "api_req.json"
$script:TmpResp = Join-Path $env:TEMP "api_resp.json"

function Add-Result {
    param([string]$Name, [bool]$Passed, [string]$Detail = "")
    $script:Results += [PSCustomObject]@{ Name = $Name; Passed = $Passed; Detail = $Detail }
}

function Invoke-Api {
    param([string]$Method, [string]$Uri, [object]$BodyObj = $null)

    # CRITICAL: clear the response file BEFORE curl runs.
    # If curl fails to connect, we get an empty body — not stale data from the previous test.
    if (Test-Path $script:TmpResp) { Remove-Item $script:TmpResp -Force -ErrorAction SilentlyContinue }

    $curlArgs = @("-s", "-o", $script:TmpResp, "-w", "%{http_code}", "-X", $Method, $Uri)
    if ($null -ne $BodyObj) {
        $json = $BodyObj | ConvertTo-Json -Depth 10 -Compress
        [System.IO.File]::WriteAllText($script:TmpReq, $json, [System.Text.UTF8Encoding]::new($false))
        $curlArgs += @("-H", "Content-Type: application/json", "--data-binary", "@$($script:TmpReq)")
    }

    $statusText = & curl.exe @curlArgs
    $status = 0
    [void][int]::TryParse(($statusText | Out-String).Trim(), [ref]$status)

    $bodyText = ""
    if (Test-Path $script:TmpResp) { $bodyText = Get-Content $script:TmpResp -Raw -ErrorAction SilentlyContinue }
    $json = $null
    if ($bodyText) { try { $json = $bodyText | ConvertFrom-Json } catch { } }

    return [PSCustomObject]@{ Status = $status; Body = $bodyText; Json = $json }
}

function Write-Report {
    param([string]$Title, [string]$FileName)
    $lines = @()
    $lines += $Title
    $lines += "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    $lines += ("=" * 60); $lines += ""

    $passCount = @($script:Results | Where-Object { $_.Passed }).Count
    $failCount = @($script:Results | Where-Object { -not $_.Passed }).Count

    foreach ($r in $script:Results) {
        $status = if ($r.Passed) { "PASS" } else { "FAIL" }
        $lines += "[$status] $($r.Name)"
        if (-not $r.Passed -and $r.Detail) { $lines += "        Error: $($r.Detail)" }
    }
    $lines += ""; $lines += ("=" * 60)
    $lines += "Total : $($script:Results.Count)"
    $lines += "Passed: $passCount"
    $lines += "Failed: $failCount"

    $reportPath = Join-Path $script:ReportsDir $FileName
    $lines -join "`r`n" | Out-File -FilePath $reportPath -Encoding utf8
    Write-Host "`nReport written to: $reportPath" -ForegroundColor Cyan
    Get-Content $reportPath | Write-Host
}