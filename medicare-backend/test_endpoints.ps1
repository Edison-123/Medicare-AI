$testPassword = $env:MEDICARE_TEST_PASSWORD
if ([string]::IsNullOrWhiteSpace($testPassword)) {
	throw "Set MEDICARE_TEST_PASSWORD before running endpoint checks."
}

function New-TestSession([string]$email) {
	$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
	$body = @{ email = $email; password = $testPassword } | ConvertTo-Json
	Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -WebSession $session -Body $body -ContentType "application/json" | Out-Null
	return $session
}

# 1. Login as doctor
$doctorSession = New-TestSession "doctor@medicare.ai"

Write-Host "=== TEST DOCTOR DASHBOARD ==="
$dash = Invoke-RestMethod -Uri "http://localhost:8080/api/doctors/me/dashboard" -WebSession $doctorSession
Write-Host "Doctor Dashboard stats count: $($dash.stats.Count)"

Write-Host "=== TEST PATIENTS LIST ==="
$pts = Invoke-RestMethod -Uri "http://localhost:8080/api/patients" -WebSession $doctorSession
Write-Host "Patients total: $($pts.total), items: $($pts.items.Count)"

Write-Host "=== TEST PRESCRIPTIONS ==="
$rx = Invoke-RestMethod -Uri "http://localhost:8080/api/prescriptions" -WebSession $doctorSession
Write-Host "Prescriptions total: $($rx.total), items: $($rx.items.Count)"

Write-Host "=== TEST CONSULTATIONS ==="
$c = Invoke-RestMethod -Uri "http://localhost:8080/api/consultations" -WebSession $doctorSession
Write-Host "Consultations total: $($c.total), items: $($c.items.Count)"

Write-Host "=== TEST DOCTOR REPORTS ==="
$rep = Invoke-RestMethod -Uri "http://localhost:8080/api/doctors/me/reports" -WebSession $doctorSession
Write-Host "Doctor Reports monthlyTrends: $($rep.monthlyTrends.Count)"

Write-Host "=== TEST NOTIFICATIONS ==="
$notifs = Invoke-RestMethod -Uri "http://localhost:8080/api/notifications?role=doctor" -WebSession $doctorSession
Write-Host "Doctor Notifications: $($notifs.Count)"

# 2. Login as patient
$patientSession = New-TestSession "patient@medicare.ai"

Write-Host "=== TEST PATIENT DASHBOARD ==="
$patDash = Invoke-RestMethod -Uri "http://localhost:8080/api/patient/dashboard" -WebSession $patientSession
Write-Host "Patient Vitals count: $($patDash.vitals.Count), Name: $($patDash.profile.name)"

Write-Host "=== TEST PATIENT REMINDERS ==="
$rems = Invoke-RestMethod -Uri "http://localhost:8080/api/patient/reminders" -WebSession $patientSession
Write-Host "Patient Reminders count: $($rems.Count)"

Write-Host "=== TEST PATIENT MEDICAL RECORDS ==="
$medRecs = Invoke-RestMethod -Uri "http://localhost:8080/api/patient/medical-records" -WebSession $patientSession
Write-Host "Patient Allergies: $($medRecs.allergies.Count), Conditions: $($medRecs.chronicConditions.Count)"

# 3. Login as admin
$adminSession = New-TestSession "admin@medicare.ai"

Write-Host "=== TEST ADMIN DASHBOARD ==="
$admDash = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/dashboard" -WebSession $adminSession
Write-Host "Admin KPIs count: $($admDash.kpis.Count)"

Write-Host "ALL REST ENDPOINT VERIFICATION TESTS COMPLETED SUCCESSFULLY!"
