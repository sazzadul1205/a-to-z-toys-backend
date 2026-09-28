# tests/order.test.ps1
. "$PSScriptRoot\_common.ps1"

$orderBase   = "http://localhost:3000/orders"
$productBase = "http://localhost:3000/products"
$catBase     = "http://localhost:3000/categories"
$userBase    = "http://localhost:3000/users"

$stamp = [Guid]::NewGuid().ToString("N").Substring(0, 8)

# SETUP
$catR  = Invoke-Api -Method POST -Uri $catBase -BodyObj @{ name = "OrderCat_$stamp" }
$categoryId = $catR.Json._id

$prodR = Invoke-Api -Method POST -Uri $productBase -BodyObj @{ name = "OrderToy_$stamp"; price = 15.50; stock = 10; categoryId = $categoryId }
$productId = $prodR.Json._id

$userR = Invoke-Api -Method POST -Uri $userBase -BodyObj @{ name = "Order Tester"; email = "order_$stamp@example.com"; password = "testpass123" }
$userId = $userR.Json._id

Start-Sleep -Milliseconds 200   # allow nodemon (if not ignored) to settle

$setupOk = $categoryId -and $productId -and $userId
Add-Result "Setup completes (category+product+user created)" $setupOk "cat=$categoryId prod=$productId user=$userId"
if (-not $setupOk) { Write-Report -Title "Order API Test Report" -FileName "order.report.txt"; exit 1 }

# 1. CREATE with server-computed total
$id = $null
$r = Invoke-Api -Method POST -Uri $orderBase -BodyObj @{ userId = $userId; productId = $productId; quantity = 2; totalPrice = 99999 }
if ($r.Status -eq 201 -and $r.Json._id -and $r.Json.totalPrice -eq 31.00) {
    $id = $r.Json._id
    Add-Result "Create order returns 201 with server-computed totalPrice" $true
} else {
    Add-Result "Create order returns 201 with server-computed totalPrice" $false "HTTP $($r.Status) - total=$($r.Json.totalPrice) - $($r.Body)"
}

# 2. Stock decremented
$r = Invoke-Api -Method GET -Uri "$productBase/$productId"
Add-Result "Product stock decremented after order" ($r.Json.stock -eq 8) "Expected 8, got $($r.Json.stock)"

# 3. Over stock
$r = Invoke-Api -Method POST -Uri $orderBase -BodyObj @{ userId = $userId; productId = $productId; quantity = 100 }
Add-Result "Reject order exceeding stock (409)" ($r.Status -eq 409) "HTTP $($r.Status)"

# 4. Quantity 0
$r = Invoke-Api -Method POST -Uri $orderBase -BodyObj @{ userId = $userId; productId = $productId; quantity = 0 }
Add-Result "Reject quantity = 0 (400)" ($r.Status -eq 400) "HTTP $($r.Status)"

# 5. Non-existent userId
$r = Invoke-Api -Method POST -Uri $orderBase -BodyObj @{ userId = "000000000000000000000000"; productId = $productId; quantity = 1 }
Add-Result "Reject non-existent userId (400)" ($r.Status -eq 400) "HTTP $($r.Status)"

# 6. Non-existent productId
$r = Invoke-Api -Method POST -Uri $orderBase -BodyObj @{ userId = $userId; productId = "000000000000000000000000"; quantity = 1 }
Add-Result "Reject non-existent productId (400)" ($r.Status -eq 400) "HTTP $($r.Status)"

# 7. Filter by userId
$r = Invoke-Api -Method GET -Uri "$orderBase`?userId=$userId"
$items = @($r.Json)
$ok = ($r.Status -eq 200 -and $items.Count -ge 1 -and (@($items | Where-Object { $_.userId -eq $userId }).Count -eq $items.Count))
Add-Result "List orders filtered by userId" $ok "HTTP $($r.Status) - count=$($items.Count)"

# 8. GET one
$r = Invoke-Api -Method GET -Uri "$orderBase/$id"
Add-Result "Get order by id" ($r.Status -eq 200 -and $null -ne $id -and $r.Json._id -eq $id) "HTTP $($r.Status)"

# 9. Cannot modify quantity
$r = Invoke-Api -Method PUT -Uri "$orderBase/$id" -BodyObj @{ quantity = 5 }
Add-Result "Reject modifying quantity (400)" ($r.Status -eq 400) "HTTP $($r.Status)"

# 10. Cancel -> restore stock
$r = Invoke-Api -Method PUT -Uri "$orderBase/$id" -BodyObj @{ status = "Cancelled" }
$stockR = Invoke-Api -Method GET -Uri "$productBase/$productId"
Add-Result "Cancel order restores product stock" ($r.Status -eq 200 -and $stockR.Json.stock -eq 10) "HTTP $($r.Status) - stock=$($stockR.Json.stock) (expected 10)"

# 11. Reactivate -> decrement
$r = Invoke-Api -Method PUT -Uri "$orderBase/$id" -BodyObj @{ status = "Pending" }
$stockR = Invoke-Api -Method GET -Uri "$productBase/$productId"
Add-Result "Reactivate order decrements stock again" ($r.Status -eq 200 -and $stockR.Json.stock -eq 8) "HTTP $($r.Status) - stock=$($stockR.Json.stock) (expected 8)"

# 12. Invalid status
$r = Invoke-Api -Method PUT -Uri "$orderBase/$id" -BodyObj @{ status = "Teleported" }
Add-Result "Reject invalid status (400)" ($r.Status -eq 400) "HTTP $($r.Status)"

# 13. Delete -> restore
$r = Invoke-Api -Method DELETE -Uri "$orderBase/$id"
$stockR = Invoke-Api -Method GET -Uri "$productBase/$productId"
Add-Result "Delete active order restores stock" ($r.Status -eq 200 -and $stockR.Json.stock -eq 10) "HTTP $($r.Status) - stock=$($stockR.Json.stock) (expected 10)"

# 14. GET after delete
$r = Invoke-Api -Method GET -Uri "$orderBase/$id"
Add-Result "Get deleted order returns 404" ($r.Status -eq 404) "HTTP $($r.Status)"

# Cleanup
[void](Invoke-Api -Method DELETE -Uri "$productBase/$productId")
[void](Invoke-Api -Method DELETE -Uri "$catBase/$categoryId")
[void](Invoke-Api -Method DELETE -Uri "$userBase/$userId")

Write-Report -Title "Order API Test Report" -FileName "order.report.txt"