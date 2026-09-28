# tests/user.test.ps1
. "$PSScriptRoot\_common.ps1"

$base = "http://localhost:3000/users"
$uniqueEmail = "alice_$([Guid]::NewGuid().ToString('N').Substring(0,6))@example.com"

# 1. CREATE
$id = $null
$r = Invoke-Api -Method POST -Uri $base -BodyObj @{ name = "Alice"; email = $uniqueEmail; password = "secret123"; role = "Customer" }
if ($r.Status -eq 201 -and $r.Json._id) { $id = $r.Json._id; Add-Result "Create user returns 201 with _id" $true }
else { Add-Result "Create user returns 201 with _id" $false "HTTP $($r.Status) - $($r.Body)" }

# 2. No password in response
$hasPwd = $r.Json.PSObject.Properties.Name -contains "password"
Add-Result "Create user response excludes password" (-not $hasPwd) "Response leaked 'password'"

# 3. No plaintext password on disk
$storedPath = Join-Path $PSScriptRoot "..\data\users.json"
$storedHasPlain = (Test-Path $storedPath) -and ((Get-Content $storedPath -Raw) -match "secret123")
Add-Result "Stored JSON does not contain plaintext password" (-not $storedHasPlain) "Plaintext password in users.json"

# 4. Duplicate email
$r = Invoke-Api -Method POST -Uri $base -BodyObj @{ name = "Alice2"; email = $uniqueEmail; password = "another123" }
Add-Result "Duplicate email rejected (409)" ($r.Status -eq 409) "HTTP $($r.Status)"

# 5-7. Validation cases
$r = Invoke-Api -Method POST -Uri $base -BodyObj @{ name = "Bob"; email = "not-an-email"; password = "secret123" }
Add-Result "Invalid email rejected (400)" ($r.Status -eq 400) "HTTP $($r.Status)"

$r = Invoke-Api -Method POST -Uri $base -BodyObj @{ name = "Bob"; email = "bob_$([Guid]::NewGuid().ToString('N').Substring(0,6))@example.com"; password = "123" }
Add-Result "Short password rejected (400)" ($r.Status -eq 400) "HTTP $($r.Status)"

$r = Invoke-Api -Method POST -Uri $base -BodyObj @{ name = "Bob"; email = "bob2_$([Guid]::NewGuid().ToString('N').Substring(0,6))@example.com"; password = "secret123"; role = "Superman" }
Add-Result "Invalid role rejected (400)" ($r.Status -eq 400) "HTTP $($r.Status)"

# 8. List hides passwords
$r = Invoke-Api -Method GET -Uri $base
$anyPwd = $false
foreach ($u in @($r.Json)) { if ($u.PSObject.Properties.Name -contains "password") { $anyPwd = $true } }
Add-Result "List users excludes passwords" (-not $anyPwd) "At least one user in list had 'password'"

# 9. GET one
$r = Invoke-Api -Method GET -Uri "$base/$id"
$ok = ($r.Status -eq 200 -and $r.Json._id -eq $id -and ($r.Json.PSObject.Properties.Name -notcontains "password"))
Add-Result "Get user by id excludes password" $ok "HTTP $($r.Status)"

# 10. GET missing
$r = Invoke-Api -Method GET -Uri "$base/000000000000000000000000"
Add-Result "Get missing user returns 404" ($r.Status -eq 404) "HTTP $($r.Status)"

# 11. UPDATE name + password
$r = Invoke-Api -Method PUT -Uri "$base/$id" -BodyObj @{ name = "Alice Updated"; password = "newsecret123" }
$ok = ($r.Status -eq 200 -and $r.Json.name -eq "Alice Updated" -and ($r.Json.PSObject.Properties.Name -notcontains "password"))
Add-Result "Update user changes name, hides password" $ok "HTTP $($r.Status)"

# 12. New password hashed
$storedHasNewPlain = (Test-Path $storedPath) -and ((Get-Content $storedPath -Raw) -match "newsecret123")
Add-Result "Updated password stored hashed (not plaintext)" (-not $storedHasNewPlain) "New plaintext password in users.json"

# 13. Update to duplicate email
$otherEmail = "bob_$([Guid]::NewGuid().ToString('N').Substring(0,6))@example.com"
$other = Invoke-Api -Method POST -Uri $base -BodyObj @{ name = "Bob"; email = $otherEmail; password = "bobsecret1" }
Start-Sleep -Milliseconds 200   # tiny breather to dodge nodemon races
$r = Invoke-Api -Method PUT -Uri "$base/$id" -BodyObj @{ email = $otherEmail }
Add-Result "Update to duplicate email rejected (409)" ($r.Status -eq 409) "HTTP $($r.Status) - $($r.Body)"

# Cleanup + 14
[void](Invoke-Api -Method DELETE -Uri "$base/$id")
if ($other.Json._id) { [void](Invoke-Api -Method DELETE -Uri "$base/$($other.Json._id)") }
$r = Invoke-Api -Method GET -Uri "$base/$id"
Add-Result "Deleted user returns 404 on GET" ($r.Status -eq 404) "HTTP $($r.Status)"

Write-Report -Title "User API Test Report" -FileName "user.report.txt"