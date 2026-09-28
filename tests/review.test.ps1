# tests/review.test.ps1
. "$PSScriptRoot\_common.ps1"

$reviewBase  = "http://localhost:3000/reviews"
$productBase = "http://localhost:3000/products"
$catBase     = "http://localhost:3000/categories"

$stamp = [Guid]::NewGuid().ToString("N").Substring(0, 8)

$catR  = Invoke-Api -Method POST -Uri $catBase -BodyObj @{ name = "RevCat_$stamp" }
$categoryId = $catR.Json._id

$prodR = Invoke-Api -Method POST -Uri $productBase -BodyObj @{ name = "RevToy_$stamp"; price = 10; stock = 5; categoryId = $categoryId }
$productId = $prodR.Json._id

$setupOk = $categoryId -and $productId
Add-Result "Setup completes (category+product)" $setupOk "cat=$categoryId prod=$productId"
if (-not $setupOk) { Write-Report -Title "Review API Test Report" -FileName "review.report.txt"; exit 1 }

# 1. CREATE
$id = $null
$r = Invoke-Api -Method POST -Uri $reviewBase -BodyObj @{ productId = $productId; name = "Sarah"; rating = 5; comment = "Kids love it!" }
if ($r.Status -eq 201 -and $r.Json._id) { $id = $r.Json._id; Add-Result "Create review returns 201 with _id" $true }
else { Add-Result "Create review returns 201 with _id" $false "HTTP $($r.Status) - $($r.Body)" }

# 2. Second review
$r2 = Invoke-Api -Method POST -Uri $reviewBase -BodyObj @{ productId = $productId; name = "Mike"; rating = 3; comment = "Decent" }
Add-Result "Create second review" ($r2.Status -eq 201) "HTTP $($r2.Status)"

# 3-4. Rating bounds
$r = Invoke-Api -Method POST -Uri $reviewBase -BodyObj @{ productId = $productId; name = "Bad"; rating = 6 }
Add-Result "Reject rating > 5 (400)" ($r.Status -eq 400) "HTTP $($r.Status)"

$r = Invoke-Api -Method POST -Uri $reviewBase -BodyObj @{ productId = $productId; name = "Bad"; rating = 0 }
Add-Result "Reject rating < 1 (400)" ($r.Status -eq 400) "HTTP $($r.Status)"

# 5. Missing name
$r = Invoke-Api -Method POST -Uri $reviewBase -BodyObj @{ productId = $productId; rating = 4 }
Add-Result "Reject missing name (400)" ($r.Status -eq 400) "HTTP $($r.Status)"

# 6. Non-existent product
$r = Invoke-Api -Method POST -Uri $reviewBase -BodyObj @{ productId = "000000000000000000000000"; name = "Ghost"; rating = 4 }
Add-Result "Reject non-existent productId (400)" ($r.Status -eq 400) "HTTP $($r.Status)"

# 7. List all
$r = Invoke-Api -Method GET -Uri $reviewBase
Add-Result "List reviews returns array" ($r.Status -eq 200 -and @($r.Json).Count -ge 2) "HTTP $($r.Status)"

# 8. Filter by productId
$r = Invoke-Api -Method GET -Uri "$reviewBase`?productId=$productId"
$items = @($r.Json)
$ok = ($r.Status -eq 200 -and $items.Count -eq 2 -and (@($items | Where-Object { $_.productId -eq $productId }).Count -eq 2))
Add-Result "List reviews filtered by productId" $ok "count=$($items.Count)"

# 9. GET one
$r = Invoke-Api -Method GET -Uri "$reviewBase/$id"
Add-Result "Get review by id" ($r.Status -eq 200 -and $r.Json._id -eq $id) "HTTP $($r.Status)"

# 10. GET missing
$r = Invoke-Api -Method GET -Uri "$reviewBase/000000000000000000000000"
Add-Result "Get missing review returns 404" ($r.Status -eq 404) "HTTP $($r.Status)"

# 11. UPDATE
$r = Invoke-Api -Method PUT -Uri "$reviewBase/$id" -BodyObj @{ rating = 4; comment = "Updated after 1 month" }
$ok = ($r.Status -eq 200 -and $r.Json.rating -eq 4 -and $r.Json.comment -eq "Updated after 1 month")
Add-Result "Update review rating and comment" $ok "HTTP $($r.Status)"

# 12. Cannot change productId
$r = Invoke-Api -Method PUT -Uri "$reviewBase/$id" -BodyObj @{ productId = "000000000000000000000000" }
Add-Result "Reject productId change (400)" ($r.Status -eq 400) "HTTP $($r.Status)"

# 13. Invalid rating update
$r = Invoke-Api -Method PUT -Uri "$reviewBase/$id" -BodyObj @{ rating = 99 }
Add-Result "Reject update to invalid rating (400)" ($r.Status -eq 400) "HTTP $($r.Status)"

# 14. Summary: (4+3)/2 = 3.5
$r = Invoke-Api -Method GET -Uri "$reviewBase/product/$productId/summary"
$ok = ($r.Status -eq 200 -and $r.Json.count -eq 2 -and $r.Json.averageRating -eq 3.5)
Add-Result "Review summary returns avg 3.5 over 2 reviews" $ok "HTTP $($r.Status) - $($r.Body)"

# 15. Summary missing product
$r = Invoke-Api -Method GET -Uri "$reviewBase/product/000000000000000000000000/summary"
Add-Result "Summary for missing product returns 404" ($r.Status -eq 404) "HTTP $($r.Status)"

# 16. DELETE
$r = Invoke-Api -Method DELETE -Uri "$reviewBase/$id"
Add-Result "Delete review returns success" ($r.Status -eq 200 -and $r.Json.success) "HTTP $($r.Status)"

# 17. GET after delete
$r = Invoke-Api -Method GET -Uri "$reviewBase/$id"
Add-Result "Get deleted review returns 404" ($r.Status -eq 404) "HTTP $($r.Status)"

if ($r2.Json._id) { [void](Invoke-Api -Method DELETE -Uri "$reviewBase/$($r2.Json._id)") }
[void](Invoke-Api -Method DELETE -Uri "$productBase/$productId")
[void](Invoke-Api -Method DELETE -Uri "$catBase/$categoryId")

Write-Report -Title "Review API Test Report" -FileName "review.report.txt"