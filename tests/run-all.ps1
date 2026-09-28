# tests/run-all.ps1
$reportsDir = Join-Path $PSScriptRoot "reports"
if (-not (Test-Path $reportsDir)) { New-Item -ItemType Directory -Path $reportsDir -Force | Out-Null }

$reportPath = Join-Path $reportsDir "full-suite.report.txt"

$suites = @(
    @{ Name = "Category"; File = "category.test.ps1"; Report = "category.report.txt" },
    @{ Name = "Product";  File = "product.test.ps1";  Report = "product.report.txt"  },
    @{ Name = "User";     File = "user.test.ps1";     Report = "user.report.txt"     },
    @{ Name = "Order";    File = "order.test.ps1";    Report = "order.report.txt"    },
    @{ Name = "Review";   File = "review.test.ps1";   Report = "review.report.txt"   }
)

$summary = @()

foreach ($s in $suites) {
    $scriptPath = Join-Path $PSScriptRoot $s.File
    $reportFile = Join-Path $reportsDir $s.Report

    Write-Host "`n========== Running $($s.Name) tests ==========" -ForegroundColor Magenta

    if (-not (Test-Path $scriptPath)) {
        Write-Host "  MISSING: $scriptPath" -ForegroundColor Red
        $summary += [PSCustomObject]@{ Suite = $s.Name; Total = 0; Passed = 0; Failed = 0; Status = "MISSING" }
        continue
    }

    & powershell -ExecutionPolicy Bypass -File $scriptPath

    $total = 0; $passed = 0; $failed = 0
    if (Test-Path $reportFile) {
        foreach ($line in (Get-Content $reportFile)) {
            if ($line -match "^Total\s*:\s*(\d+)")  { $total  = [int]$Matches[1] }
            if ($line -match "^Passed\s*:\s*(\d+)") { $passed = [int]$Matches[1] }
            if ($line -match "^Failed\s*:\s*(\d+)") { $failed = [int]$Matches[1] }
        }
    }

    $status = if ($failed -eq 0 -and $total -gt 0) { "PASS" } else { "FAIL" }
    $summary += [PSCustomObject]@{ Suite = $s.Name; Total = $total; Passed = $passed; Failed = $failed; Status = $status }
}

# Build combined report
$lines = @()
$lines += "Full API Test Suite Report"
$lines += "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$lines += ("=" * 60); $lines += ""
$lines += "Suite Summary"
$lines += ("-" * 60)

$totalAll = 0; $passedAll = 0; $failedAll = 0
foreach ($s in $summary) {
    $lines += ("{0,-10} {1,10} {2,8} {3,8}   {4}" -f $s.Suite, $s.Total, $s.Passed, $s.Failed, $s.Status)
    $totalAll  += $s.Total; $passedAll += $s.Passed; $failedAll += $s.Failed
}
$lines += ("-" * 60)
$lines += ("{0,-10} {1,10} {2,8} {3,8}" -f "TOTAL", $totalAll, $passedAll, $failedAll)
$lines += ""
$lines += "Overall: " + $(if ($failedAll -eq 0 -and $totalAll -gt 0) { "ALL PASSED" } else { "FAILURES PRESENT" })
$lines += ""

foreach ($s in $suites) {
    $reportFile = Join-Path $reportsDir $s.Report
    $lines += ("=" * 60)
    $lines += "DETAIL: $($s.Name)"
    $lines += ("=" * 60)
    if (Test-Path $reportFile) { $lines += Get-Content $reportFile } else { $lines += "(no report file)" }
    $lines += ""
}

$lines -join "`r`n" | Out-File -FilePath $reportPath -Encoding utf8

Write-Host "`n`n===============================" -ForegroundColor Cyan
Write-Host " FULL SUITE SUMMARY" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
$summary | Format-Table -AutoSize | Out-String | Write-Host
Write-Host "Total : $totalAll"
Write-Host "Passed: $passedAll" -ForegroundColor Green
Write-Host "Failed: $failedAll" -ForegroundColor $(if ($failedAll -gt 0) { "Red" } else { "Green" })
Write-Host "`nCombined report: $reportPath" -ForegroundColor Cyan

if ($failedAll -gt 0) { exit 1 } else { exit 0 }