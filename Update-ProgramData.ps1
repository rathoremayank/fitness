$ErrorActionPreference = "Stop"

$files = [ordered]@{
  body = "RewireMyLife_6Month_Plan-Body Analysis.csv"
  diet = "RewireMyLife_6Month_Plan-Diet Plan.csv"
  load = "RewireMyLife_6Month_Plan-Load Tracker.csv"
  weekly = "RewireMyLife_6Month_Plan-Weekly Log.csv"
  workout = "RewireMyLife_6Month_Plan-Workout Plan.csv"
}

$data = [ordered]@{}
foreach ($key in $files.Keys) {
  $path = Join-Path $PSScriptRoot $files[$key]
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Required program CSV was not found: $path"
  }
  $data[$key] = [IO.File]::ReadAllText($path).TrimStart([char]0xFEFF)
}

$content = "window.PROGRAM_CSV = $(ConvertTo-Json -InputObject $data -Compress -Depth 4);$([Environment]::NewLine)"
$outputPath = Join-Path $PSScriptRoot "program-data.js"
[IO.File]::WriteAllText($outputPath, $content, [Text.UTF8Encoding]::new($false))
Write-Output "Updated program-data.js from the five source CSV files."
