$password = $env:MEDICARE_TEST_PASSWORD
if ([string]::IsNullOrWhiteSpace($password)) {
    throw "Set MEDICARE_TEST_PASSWORD before running the login check."
}

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = @{ email = "doctor@medicare.ai"; password = $password } | ConvertTo-Json
$resp = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -WebSession $session -Body $body -ContentType "application/json"
$currentUser = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/me" -WebSession $session
$logoutCsrf = ($session.Cookies.GetCookies([uri]"http://localhost:8080/api") | Where-Object Name -eq "XSRF-TOKEN").Value
Invoke-RestMethod -Uri "http://localhost:8080/api/auth/logout" -Method Post -WebSession $session -Headers @{ "X-XSRF-TOKEN" = $logoutCsrf } | Out-Null

$resp | ConvertTo-Json -Depth 5
$currentUser | ConvertTo-Json -Depth 5
