# tests/product.test.ps1
. "$PSScriptRoot\_common.ps1"

$base    = "http://localhost:3000/products"
$catBase = "http://localhost:3000/categories"

$catR = Invoke-Api -Method POST -Uri $catBase -BodyObj @{ name = "ProdCat_$([Guid]::NewGuid().ToString('N').Substring(0,6))" }
$categoryId = $catR.Json._id

# 1. CREATE with valid category
$id = $null
$r = Invoke-Api -Method POST -Uri $base -BodyObj @{
    name = "Wooden Puzzle"; description = "Classic wooden puzzle"
    price = 19.99; stock = 25; categoryId = $categoryId
    image = "https://example.com/puzzle.jpg"
    details = @{ material = "wood"; ageRange = "3-6" }
}
if ($r.Status -eq 201 -and $r.Json._id) { $id = $r.Json._id; Add-Result "Create product with valid categoryId (201)" $true }
else { Add-Result "Create product with valid categoryId (201)" $false "HTTP $($r.Status) - $($r.Body)" }

# 2. Non-existent category
$r = Invoke-Api -Method POST -Uri $base -BodyObj @{ name = "Ghost Toy"; price = 5; stock = 1; categoryId = "000000000000000000000000" }
Add-Result "Reject non-existent categoryId (400)" ($r.Status -eq 400) "HTTP $($r.Status) - $($r.Body)"

# 3. Negative price
$r = Invoke-Api -Method POST -Uri $base -BodyObj @{ name = "Bad Price Toy"; price = -5; stock = 1; categoryId = $categoryId }
Add-Result "Reject negative price (400)" ($r.Status -eq 400) "HTTP $($r.Status)"

# 4. LIST all
$r = Invoke-Api -Method GET -Uri $base
$found = (@($r.Json) | Where-Object { $_.name -eq "Wooden Puzzle" }).Count -ge 1
Add-Result "List products contains created item" $found "HTTP $($r.Status)"

# 5. Filter by categoryId
$r = Invoke-Api -Method GET -Uri "$base`?categoryId=$categoryId"
$items = @($r.Json)
$ok = ($r.Status -eq 200 -and $items.Count -ge 1 -and (@($items | Where-Object { $_.categoryId -eq $categoryId }).Count -eq $items.Count))
Add-Result "Filter products by categoryId" $ok "HTTP $($r.Status) - count=$($items.Count)"

# 6. GET one
$r = Invoke-Api -Method GET -Uri "$base/$id"
Add-Result "Get product by id" ($r.Status -eq 200 -and $r.Json._id -eq $id) "HTTP $($r.Status)"

# 7. GET missing
$r = Invoke-Api -Method GET -Uri "$base/000000000000000000000000"
Add-Result "Get missing product returns 404" ($r.Status -eq 404) "HTTP $($r.Status)"

# 8. UPDATE
$r = Invoke-Api -Method PUT -Uri "$base/$id" -BodyObj @{ price = 24.50; stock = 30 }
Add-Result "Update product price and stock" ($r.Status -eq 200 -and $r.Json.price -eq 24.50 -and $r.Json.stock -eq 30) "HTTP $($r.Status)"

# 9. Invalid category on update
$r = Invoke-Api -Method PUT -Uri "$base/$id" -BodyObj @{ categoryId = "000000000000000000000000" }
Add-Result "Reject update to non-existent categoryId (400)" ($r.Status -eq 400) "HTTP $($r.Status)"

# 10. DELETE
$r = Invoke-Api -Method DELETE -Uri "$base/$id"
Add-Result "Delete product returns success" ($r.Status -eq 200 -and $r.Json.success) "HTTP $($r.Status)"

# 11. GET after delete
$r = Invoke-Api -Method GET -Uri "$base/$id"
Add-Result "Get deleted product returns 404" ($r.Status -eq 404) "HTTP $($r.Status)"

[void](Invoke-Api -Method DELETE -Uri "$catBase/$categoryId")
Write-Report -Title "Product API Test Report" -FileName "product.report.txt"