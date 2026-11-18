# fix-capacitor-android-permissions.ps1
#
# Removes the read-only attribute from pre-built Android output directories
# that Capacitor npm packages publish inside their own node_modules/*/android/build/ trees.
#
# Gradle (via HandleStaleOutputsStep) must delete these stale output dirs before
# re-running tasks. On Windows, the read-only flag blocks that deletion and causes:
#   "Unable to delete directory '...\build\generated\updated_navigation_xml\debug'"
#
# Run this once after every `npm install` or `cap sync` if the build fails with
# that error.  Ideally wire it into your cap:build npm script:
#
#   "cap:build": "vite build && cap sync android && powershell -File scripts/fix-capacitor-android-permissions.ps1 && npx cap sync android"
#
# Safe: only touches node_modules\@capacitor\*\android\build (generated output).
# Source files in node_modules are never modified.

$ErrorActionPreference = "Stop"

$capacitorPlugins = @(
    "android\capacitor",
    "camera\android",
    "geolocation\android"
)

$baseDir = Join-Path $PSScriptRoot "..\node_modules\@capacitor"

foreach ($plugin in $capacitorPlugins) {
    $buildDir = Join-Path $baseDir "$plugin\build"
    if (Test-Path $buildDir) {
        Write-Host "Clearing read-only flags: $buildDir"
        attrib -R "$buildDir\*" /S /D
    }
}

Write-Host "Done. Read-only flags cleared on Capacitor plugin build directories."
