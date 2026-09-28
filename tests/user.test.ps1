# tests/user.test.ps1
$base = "http://localhost:3000/users"
$reportPath = Join-Path $PSScriptRoot "user.test.report.txt"

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
    $lines += "User API Test Report"
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

$uniqueEmail = "alice_$(Get-Random)@example.com"

# ---------------------------------------------------------------
# 1. CREATE user (valid)
# ---------------------------------------------------------------
$id = $null
$r = Invoke-Api -Method POST -Uri $base -BodyObj @{
    name = "Alice"
    email = $uniqueEmail
    password = "secret123"
    role = "Customer"
}
if ($r.Status -eq 201 -and $r.Json._id) {
    $id = $r.Json._id
    Add-Result "Create user returns 201 with _id" $true
} else {
    Add-Result "Create user returns 201 with _id" $false "HTTP $($r.Status) - $($r.Body)"
}

# ---------------------------------------------------------------
# 2. Response must NOT contain password
# ---------------------------------------------------------------
$hasPassword = $r.Json.PSObject.Properties.Name -contains "password"
Add-Result "Create user response excludes password" (-not $hasPassword) "Response contained 'password' field"

# ---------------------------------------------------------------
# 3. Stored JSON must not contain plaintext password
# ---------------------------------------------------------------
$storedPath = Join-Path $PSScriptRoot "..\data\users.json"
$storedHasPlain = $false
if (Test-Path $storedPath) {
    $storedText = Get-Content $storedPath -Raw
    if ($storedText -match "secret123") { $storedHasPlain = $true }
}
Add-Result "Stored JSON does not contain plaintext password" (-not $storedHasPlain) "Plaintext password found in data/users.json"

# ---------------------------------------------------------------
# 4. DUPLICATE email -> 409
# ---------------------------------------------------------------
$r = Invoke-Api -Method POST -Uri $base -BodyObj @{
    name = "Alice2"; email = $uniqueEmail; password = "another123"
}
Add-Result "Duplicate email rejected (409)" ($r.Status -eq 409) "HTTP $($r.Status) - $($r.Body)"

# ---------------------------------------------------------------
# 5. INVALID email -> 400
# ---------------------------------------------------------------
$r = Invoke-Api -Method POST -Uri $base -BodyObj @{
    name = "Bob"; email = "not-an-email"; password = "secret123"
}
Add-Result "Invalid email rejected (400)" ($r.Status -eq 400) "HTTP $($r.Status) - $($r.Body)"

# ---------------------------------------------------------------
# 6. SHORT password -> 400
# ---------------------------------------------------------------
$r = Invoke-Api -Method POST -Uri $base -BodyObj @{
    name = "Bob"; email = "bob_$(Get-Random)@example.com"; password = "123"
}
Add-Result "Short password rejected (400)" ($r.Status -eq 400) "HTTP $($r.Status) - $($r.Body)"

# ---------------------------------------------------------------
# 7. INVALID role -> 400
# ---------------------------------------------------------------
$r = Invoke-Api -Method POST -Uri $base -BodyObj @{
    name = "Bob"; email = "bob2_$(Get-Random)@example.com"; password = "secret123"; role = "Superman"
}
Add-Result "Invalid role rejected (400)" ($r.Status -eq 400) "HTTP $($r.Status) - $($r.Body)"

# ---------------------------------------------------------------
# 8. LIST users (no passwords)
# ---------------------------------------------------------------
$r = Invoke-Api -Method GET -Uri $base
$items = @($r.Json)
$anyPassword = $false
foreach ($u in $items) { if ($u.PSObject.Properties.Name -contains "password") { $anyPassword = $true } }
Add-Result "List users excludes passwords" (-not $anyPassword) "At least one user in list had 'password'"

# ---------------------------------------------------------------
# 9. GET one
# ---------------------------------------------------------------
$r = Invoke-Api -Method GET -Uri "$base/$id"
$ok = ($r.Status -eq 200 -and $r.Json._id -eq $id -and ($r.Json.PSObject.Properties.Name -notcontains "password"))
Add-Result "Get user by id excludes password" $ok "HTTP $($r.Status) - $($r.Body)"

# ---------------------------------------------------------------
# 10. GET missing -> 404
# ---------------------------------------------------------------
$r = Invoke-Api -Method GET -Uri "$base/000000000000000000000000"
Add-Result "Get missing user returns 404" ($r.Status -eq 404) "HTTP $($r.Status) - $($r.Body)"

# ---------------------------------------------------------------
# 11. UPDATE name + password
# ---------------------------------------------------------------
$r = Invoke-Api -Method PUT -Uri "$base/$id" -BodyObj @{ name = "Alice Updated"; password = "newsecret123" }
$ok = ($r.Status -eq 200 -and $r.Json.name -eq "Alice Updated" -and ($r.Json.PSObject.Properties.Name -notcontains "password"))
Add-Result "Update user changes name, hides password" $ok "HTTP $($r.Status) - $($r.Body)"

# ---------------------------------------------------------------
# 12. Confirm new password was hashed (not plaintext)
# ---------------------------------------------------------------
$storedHasNewPlain = $false
if (Test-Path $storedPath) {
    $storedText = Get-Content $storedPath -Raw
    if ($storedText -match "newsecret123") { $storedHasNewPlain = $true }
}
Add-Result "Updated password stored hashed (not plaintext)" (-not $storedHasNewPlain) "New plaintext password found in data/users.json"

# ---------------------------------------------------------------
# 13. UPDATE to duplicate email -> 409
# ---------------------------------------------------------------
$otherEmail = "bob_$(Get-Random)@example.com"
$other = Invoke-Api -Method POST -Uri $base -BodyObj @{ name = "Bob"; email = $otherEmail; password = "bobsecret1" }
$r = Invoke-Api -Method PUT -Uri "$base/$id" -BodyObj @{ email = $otherEmail }
Add-Result "Update to duplicate email rejected (409)" ($r.Status -eq 409) "HTTP $($r.Status) - $($r.Body)"

# ---------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------
[void](Invoke-Api -Method DELETE -Uri "$base/$id")
if ($other.Json._id) { [void](Invoke-Api -Method DELETE -Uri "$base/$($other.Json._id)") }

# ---------------------------------------------------------------
# 14. DELETE -> success + 404 after
# ---------------------------------------------------------------
$r = Invoke-Api -Method GET -Uri "$base/$id"
Add-Result "Deleted user returns 404 on GET" ($r.Status -eq 404) "HTTP $($r.Status) - $($r.Body)"

Write-Report