$ErrorActionPreference = 'Stop'

$container = 'supabase_db_gestion-ass'
$phone = '+22507' + (Get-Random -Minimum 10000000 -Maximum 99999999)
$purpose = 'registration'

function Invoke-DatabaseScalar([string] $sql) {
  $result = & docker exec $container psql -v ON_ERROR_STOP=1 -U postgres -d postgres -At -c $sql
  if ($LASTEXITCODE -ne 0) { throw "Database command failed: $sql" }
  return ($result | Out-String).Trim()
}

function Invoke-Concurrently([string] $sql) {
  $jobs = 1..2 | ForEach-Object {
    Start-Job -ScriptBlock {
      param($jobContainer, $jobSql)
      & docker exec $jobContainer psql -v ON_ERROR_STOP=1 -U postgres -d postgres -At -c $jobSql
      if ($LASTEXITCODE -ne 0) { throw 'Concurrent database command failed' }
    } -ArgumentList $container, $sql
  }
  try {
    return @($jobs | Wait-Job | Receive-Job | ForEach-Object { $_.ToString().Trim() })
  } finally {
    $jobs | Remove-Job -Force
  }
}

try {
  $sendSql = "select public.issue_registration_otp('$phone', '$purpose', decode(repeat('01', 32), 'hex'));"
  $sendResults = Invoke-Concurrently $sendSql
  if (@($sendResults | Where-Object { $_ -eq 't' }).Count -ne 1 -or @($sendResults | Where-Object { $_ -eq 'f' }).Count -ne 1) {
    throw "Expected exactly one successful concurrent OTP send reservation, received: $($sendResults -join ', ')"
  }

  Invoke-DatabaseScalar "delete from public.auth_otps where phone = '$phone' and purpose = '$purpose';" | Out-Null
  Invoke-DatabaseScalar "insert into public.auth_otps (phone, purpose, code_hash, expires_at, attempts) values ('$phone', '$purpose', decode(repeat('02', 32), 'hex'), now() + interval '10 minutes', 4);" | Out-Null
  $verifySql = "select public.verify_and_consume_otp('$phone', '$purpose', decode(repeat('03', 32), 'hex'));"
  $verifyResults = Invoke-Concurrently $verifySql
  if ($verifyResults.Count -ne 2 -or @($verifyResults | Where-Object { $_ -eq 'f' }).Count -ne 2) {
    throw "Expected two rejected concurrent OTP verifications, received: $($verifyResults -join ', ')"
  }
  if ((Invoke-DatabaseScalar "select attempts from public.auth_otps where phone = '$phone' and purpose = '$purpose';") -ne '5') {
    throw 'Concurrent invalid OTP verification exceeded or bypassed the attempt limit'
  }

  Write-Output 'OTP concurrency regression checks passed.'
} finally {
  Invoke-DatabaseScalar "delete from public.auth_otps where phone = '$phone' and purpose = '$purpose';" | Out-Null
}
