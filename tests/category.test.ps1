# tests/category.test.ps1
$base = "http://localhost:3000/categories"
$reportPath = Join-Path $PSScriptRoot "category.test.report.txt"

$tmpBody  = Join-Path $env:TEMP "api_body.json"
$tmpResp  = Join-Path $env:TEMP "api_resp.json"
$tmpReq   = Join-Path $env:TEMP "api_req.json"

$results = @()

function Add-Result {
    param([string]$Name, [bool]$Passed, [string]$Detail = "")
    $script:results += [PSCustomObject]@{ Name = $Name; Passed = $Passed; Detail = $Detail }
}

# ---------------------------------------------------------------
# HTTP helper: writes body to file to avoid PS quoting issues
# ---------------------------------------------------------------
function Invoke-Api {
    param(
        [string]$Method,
        [string]$Uri,
        [object]$BodyObj = $null
    )

    $curlArgs = @("-s", "-o", $tmpResp, "-w", "%{http_code}", "-X", $Method, $Uri)

    if ($null -ne $BodyObj) {
        # Write the JSON body to a file WITHOUT BOM
        $json = $BodyObj | ConvertTo-Json -Depth 10 -Compress
        [System.IO.File]::WriteAllText($tmpReq, $json, [System.Text.UTF8Encoding]::new($false))

        $curlArgs += @("-H", "Content-Type: application/json", "--data-binary", "@$tmpReq")
    }

    $statusText = & curl.exe @curlArgs
    $status = 0
    [void][int]::TryParse(($statusText | Out-String).Trim(), [ref]$status)

    $bodyText = ""
    if (Test-Path $tmpResp) {
        $bodyText = Get-Content $tmpResp -Raw -ErrorAction SilentlyContinue
    }

    $json = $null
    if ($bodyText) { try { $json = $bodyText | ConvertFrom-Json } catch { } }

    return [PSCustomObject]@{ Status = $status; Body = $bodyText; Json = $json }
}

function Write-Report {
    $lines = @()
    $lines += "Category API Test Report"
    $lines += "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    $lines += ("=" * 60)
    $lines += ""

    $passCount = ($results | Where-Object { $_.Passed }).Count
    $failCount = ($results | Where-Object { -not $_.Passed }).Count

    foreach ($r in $results) {
        $status = if ($r.Passed) { "PASS" } else { "FAIL" }
        $lines += "[$status] $($r.Name)"
        if (-not $r.Passed -and $r.Detail) {
            $lines += "        Error: $($r.Detail)"
        }
    }

    $lines += ""
    $lines += ("=" * 60)
    $lines += "Total : $($results.Count)"
    $lines += "Passed: $passCount"
    $lines += "Failed: $failCount"

    $lines -join "`r`n" | Out-File -FilePath $reportPath -Encoding utf8
    Write-Host "`nReport written to: $reportPath" -ForegroundColor Cyan
    Get-Content $reportPath | Write-Host
}

# ---------------------------------------------------------------
# 1. CREATE category
# ---------------------------------------------------------------
$id = $null
$r = Invoke-Api -Method POST -Uri $base -BodyObj @{ name = "Educational Toys"; description = "Toys that help kids learn" }
if ($r.Status -eq 201 -and $r.Json._id) {
    $id = $r.Json._id
    Add-Result "Create category returns 201 with _id" $true
} else {
    Add-Result "Create category returns 201 with _id" $false "HTTP $($r.Status) - $($r.Body)"
}

# ---------------------------------------------------------------
# 2. LIST all
# ---------------------------------------------------------------
$r = Invoke-Api -Method GET -Uri $base
$items = @($r.Json)
$found = (@($items | Where-Object { $_.name -eq "Educational Toys" }).Count -ge 1)
Add-Result "List categories contains created item" $found "HTTP $($r.Status) - item not found in response"

# ---------------------------------------------------------------
# 3. GET one
# ---------------------------------------------------------------
$r = Invoke-Api -Method GET -Uri "$base/$id"
$ok = ($r.Status -eq 200 -and $r.Json._id -eq $id)
Add-Result "Get category by id returns correct record" $ok "HTTP $($r.Status) - $($r.Body)"

# ---------------------------------------------------------------
# 4. UPDATE
# ---------------------------------------------------------------
$r = Invoke-Api -Method PUT -Uri "$base/$id" -BodyObj @{ description = "Learning-focused toys" }
$ok = ($r.Status -eq 200 -and $r.Json.description -eq "Learning-focused toys")
Add-Result "Update category description" $ok "HTTP $($r.Status) - $($r.Body)"

# ---------------------------------------------------------------
# 5. DUPLICATE name -> expect 409
# ---------------------------------------------------------------
$r = Invoke-Api -Method POST -Uri $base -BodyObj @{ name = "Educational Toys" }
Add-Result "Duplicate name rejected (409)" ($r.Status -eq 409) "HTTP $($r.Status) - $($r.Body)"

# ---------------------------------------------------------------
# 6. EMPTY name -> expect 400
# ---------------------------------------------------------------
$r = Invoke-Api -Method POST -Uri $base -BodyObj @{ name = "" }
Add-Result "Empty name rejected (400)" ($r.Status -eq 400) "HTTP $($r.Status) - $($r.Body)"

# ---------------------------------------------------------------
# 7. GET missing id -> expect 404
# ---------------------------------------------------------------
$r = Invoke-Api -Method GET -Uri "$base/000000000000000000000000"
Add-Result "Get missing id returns 404" ($r.Status -eq 404) "HTTP $($r.Status) - $($r.Body)"

# ---------------------------------------------------------------
# 8. DELETE
# ---------------------------------------------------------------
$r = Invoke-Api -Method DELETE -Uri "$base/$id"
$ok = ($r.Status -eq 200 -and $r.Json.success -eq $true)
Add-Result "Delete category returns success" $ok "HTTP $($r.Status) - $($r.Body)"

# ---------------------------------------------------------------
# 9. GET after delete -> expect 404
# ---------------------------------------------------------------
$r = Invoke-Api -Method GET -Uri "$base/$id"
Add-Result "Get deleted id returns 404" ($r.Status -eq 404) "HTTP $($r.Status) - $($r.Body)"

# ---------------------------------------------------------------
Write-Report