# tests/product.test.ps1
$base = "http://localhost:3000/products"
$catBase = "http://localhost:3000/categories"
$reportPath = Join-Path $PSScriptRoot "product.test.report.txt"

$tmpReq  = Join-Path $env:TEMP "api_req.json"
$tmpResp = Join-Path $env:TEMP "api_resp.json"

$results = @()

function Add-Result {
    param([string]$Name, [bool]$Passed, [string]$Detail = "")
    $script:results += [PSCustomObject]@{ Name = $Name; Passed = $Passed; Detail = $Detail }
}

function Invoke-Api {
    param([string]$Method, [string]$Uri, [object]$BodyObj = $null)
    $curlArgs = @("-s", "-o", $tmpResp, "-w", "%{http_code}", "-X", $Method, $Uri)
    if ($null -ne $BodyObj) {
        $json = $BodyObj | ConvertTo-Json -Depth 10 -Compress
        [System.IO.File]::WriteAllText($tmpReq, $json, [System.Text.UTF8Encoding]::new($false))
        $curlArgs += @("-H", "Content-Type: application/json", "--data-binary", "@$tmpReq")
    }
    $statusText = & curl.exe @curlArgs
    $status = 0
    [void][int]::TryParse(($statusText | Out-String).Trim(), [ref]$status)
    $bodyText = ""
    if (Test-Path $tmpResp) { $bodyText = Get-Content $tmpResp -Raw -ErrorAction SilentlyContinue }
    $json = $null
    if ($bodyText) { try { $json = $bodyText | ConvertFrom-Json } catch { } }
    return [PSCustomObject]@{ Status = $status; Body = $bodyText; Json = $json }
}

function Write-Report {
    $lines = @()
    $lines += "Product API Test Report"
    $lines += "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    $lines += ("=" * 60); $lines += ""
    $passCount = ($results | Where-Object { $_.Passed }).Count
    $failCount = ($results | Where-Object { -not $_.Passed }).Count
    foreach ($r in $results) {
        $status = if ($r.Passed) { "PASS" } else { "FAIL" }
        $lines += "[$status] $($r.Name)"
        if (-not $r.Passed -and $r.Detail) { $lines += "        Error: $($r.Detail)" }
    }
    $lines += ""; $lines += ("=" * 60)
    $lines += "Total : $($results.Count)"
    $lines += "Passed: $passCount"
    $lines += "Failed: $failCount"
    $lines -join "`r`n" | Out-File -FilePath $reportPath -Encoding utf8
    Write-Host "`nReport written to: $reportPath" -ForegroundColor Cyan
    Get-Content $reportPath | Write-Host
}

# ---------------------------------------------------------------
# Setup: create a category so we have a valid categoryId
# ---------------------------------------------------------------
$catR = Invoke-Api -Method POST -Uri $catBase -BodyObj @{ name = "Test Category $(Get-Random)"; description = "for product tests" }
$categoryId = $catR.Json._id

# ---------------------------------------------------------------
# 1. CREATE product with valid categoryId
# ---------------------------------------------------------------
$id = $null
$r = Invoke-Api -Method POST -Uri $base -BodyObj @{
    name = "Wooden Puzzle"
    description = "Classic wooden puzzle"
    price = 19.99
    stock = 25
    categoryId = $categoryId
    image = "https://example.com/puzzle.jpg"
    details = @{ material = "wood"; ageRange = "3-6" }
}
if ($r.Status -eq 201 -and $r.Json._id) {
    $id = $r.Json._id
    Add-Result "Create product with valid categoryId (201)" $true
} else {
    Add-Result "Create product with valid categoryId (201)" $false "HTTP $($r.Status) - $($r.Body)"
}

# ---------------------------------------------------------------
# 2. CREATE with non-existent categoryId -> 400
# ---------------------------------------------------------------
$r = Invoke-Api -Method POST -Uri $base -BodyObj @{
    name = "Ghost Toy"; price = 5; stock = 1; categoryId = "000000000000000000000000"
}
Add-Result "Reject non-existent categoryId (400)" ($r.Status -eq 400) "HTTP $($r.Status) - $($r.Body)"

# ---------------------------------------------------------------
# 3. CREATE with negative price -> 400
# ---------------------------------------------------------------
$r = Invoke-Api -Method POST -Uri $base -BodyObj @{
    name = "Bad Price Toy"; price = -5; stock = 1; categoryId = $categoryId
}
Add-Result "Reject negative price (400)" ($r.Status -eq 400) "HTTP $($r.Status) - $($r.Body)"

# ---------------------------------------------------------------
# 4. LIST all
# ---------------------------------------------------------------
$r = Invoke-Api -Method GET -Uri $base
$items = @($r.Json)
$found = (@($items | Where-Object { $_.name -eq "Wooden Puzzle" }).Count -ge 1)
Add-Result "List products contains created item" $found "HTTP $($r.Status) - item not found"

# ---------------------------------------------------------------
# 5. LIST filtered by categoryId
# ---------------------------------------------------------------
$r = Invoke-Api -Method GET -Uri "$base?categoryId=$categoryId"
$items = @($r.Json)
$ok = ($items.Count -ge 1 -and (@($items | Where-Object { $_.categoryId -eq $categoryId }).Count -eq $items.Count))
Add-Result "Filter products by categoryId" $ok "HTTP $($r.Status) - filter mismatch"

# ---------------------------------------------------------------
# 6. GET one
# ---------------------------------------------------------------
$r = Invoke-Api -Method GET -Uri "$base/$id"
$ok = ($r.Status -eq 200 -and $r.Json._id -eq $id)
Add-Result "Get product by id" $ok "HTTP $($r.Status) - $($r.Body)"

# ---------------------------------------------------------------
# 7. GET missing -> 404
# ---------------------------------------------------------------
$r = Invoke-Api -Method GET -Uri "$base/000000000000000000000000"
Add-Result "Get missing product returns 404" ($r.Status -eq 404) "HTTP $($r.Status) - $($r.Body)"

# ---------------------------------------------------------------
# 8. UPDATE price + stock
# ---------------------------------------------------------------
$r = Invoke-Api -Method PUT -Uri "$base/$id" -BodyObj @{ price = 24.50; stock = 30 }
$ok = ($r.Status -eq 200 -and $r.Json.price -eq 24.50 -and $r.Json.stock -eq 30)
Add-Result "Update product price and stock" $ok "HTTP $($r.Status) - $($r.Body)"

# ---------------------------------------------------------------
# 9. UPDATE to invalid categoryId -> 400
# ---------------------------------------------------------------
$r = Invoke-Api -Method PUT -Uri "$base/$id" -BodyObj @{ categoryId = "000000000000000000000000" }
Add-Result "Reject update to non-existent categoryId (400)" ($r.Status -eq 400) "HTTP $($r.Status) - $($r.Body)"

# ---------------------------------------------------------------
# 10. DELETE
# ---------------------------------------------------------------
$r = Invoke-Api -Method DELETE -Uri "$base/$id"
$ok = ($r.Status -eq 200 -and $r.Json.success -eq $true)
Add-Result "Delete product returns success" $ok "HTTP $($r.Status) - $($r.Body)"

# ---------------------------------------------------------------
# 11. GET after delete -> 404
# ---------------------------------------------------------------
$r = Invoke-Api -Method GET -Uri "$base/$id"
Add-Result "Get deleted product returns 404" ($r.Status -eq 404) "HTTP $($r.Status) - $($r.Body)"

# ---------------------------------------------------------------
# Cleanup: delete the category we created
# ---------------------------------------------------------------
[void](Invoke-Api -Method DELETE -Uri "$catBase/$categoryId")

Write-Report