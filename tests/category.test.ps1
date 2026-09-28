# tests/category.test.ps1
. "$PSScriptRoot\_common.ps1"

$base = "http://localhost:3000/categories"

# 1. CREATE
$id = $null
$r = Invoke-Api -Method POST -Uri $base -BodyObj @{ name = "Educational Toys"; description = "Toys that help kids learn" }
if ($r.Status -eq 201 -and $r.Json._id) { $id = $r.Json._id; Add-Result "Create category returns 201 with _id" $true }
else { Add-Result "Create category returns 201 with _id" $false "HTTP $($r.Status) - $($r.Body)" }

# 2. LIST
$r = Invoke-Api -Method GET -Uri $base
$found = (@($r.Json) | Where-Object { $_.name -eq "Educational Toys" }).Count -ge 1
Add-Result "List categories contains created item" $found "HTTP $($r.Status) - item not found"

# 3. GET one
$r = Invoke-Api -Method GET -Uri "$base/$id"
$ok = ($r.Status -eq 200 -and $r.Json._id -eq $id)
Add-Result "Get category by id returns correct record" $ok "HTTP $($r.Status)"

# 4. UPDATE
$r = Invoke-Api -Method PUT -Uri "$base/$id" -BodyObj @{ description = "Learning-focused toys" }
$ok = ($r.Status -eq 200 -and $r.Json.description -eq "Learning-focused toys")
Add-Result "Update category description" $ok "HTTP $($r.Status)"

# 5. DUPLICATE name
$r = Invoke-Api -Method POST -Uri $base -BodyObj @{ name = "Educational Toys" }
Add-Result "Duplicate name rejected (409)" ($r.Status -eq 409) "HTTP $($r.Status)"

# 6. EMPTY name
$r = Invoke-Api -Method POST -Uri $base -BodyObj @{ name = "" }
Add-Result "Empty name rejected (400)" ($r.Status -eq 400) "HTTP $($r.Status)"

# 7. GET missing
$r = Invoke-Api -Method GET -Uri "$base/000000000000000000000000"
Add-Result "Get missing id returns 404" ($r.Status -eq 404) "HTTP $($r.Status)"

# 8. DELETE
$r = Invoke-Api -Method DELETE -Uri "$base/$id"
Add-Result "Delete category returns success" ($r.Status -eq 200 -and $r.Json.success) "HTTP $($r.Status)"

# 9. GET after delete
$r = Invoke-Api -Method GET -Uri "$base/$id"
Add-Result "Get deleted id returns 404" ($r.Status -eq 404) "HTTP $($r.Status)"

Write-Report -Title "Category API Test Report" -FileName "category.report.txt"