$content = @'
NEXT_PUBLIC_USE_STUBS=false
NEXT_PUBLIC_AMPLIFY_USER_POOL_ID=us-east-1_AbgsYCrsv
NEXT_PUBLIC_AMPLIFY_USER_POOL_CLIENT_ID=642km9jkdicm34qs25pmdgqtl
NEXT_PUBLIC_AMPLIFY_IDENTITY_POOL_ID=us-east-1:c54ba4a1-b86c-4d0b-8979-b04e5e3bb274
NEXT_PUBLIC_AMPLIFY_REGION=us-east-1
NEXT_PUBLIC_AMPLIFY_GRAPHQL_ENDPOINT=https://gh4srboqrzhklloscjikd6yqoy.appsync-api.us-east-1.amazonaws.com/graphql
NEXT_PUBLIC_AMPLIFY_API_ENDPOINT=https://gh4srboqrzhklloscjikd6yqoy.appsync-api.us-east-1.amazonaws.com/graphql
# DynamoDB table suffix (AppSync internal API id) for server-side catalogue scans
AMPLIFY_APP_ID=t5nxxao3orh6za2bjj6uegulru
NEXT_PUBLIC_APP_STORE_IOS=https://apps.apple.com/app/tourguide/id0000000000
NEXT_PUBLIC_APP_STORE_ANDROID=https://play.google.com/store/apps/details?id=com.tourguideyeup
# NEXT_PUBLIC_MAP_TILE_URL — optional override for map tiles (e.g. MapTiler/Stadia).
# Defaults to OSM tiles when omitted. Format: https://provider.tld/path/{z}/{x}/{y}.png?key=...
# NEXT_PUBLIC_MAP_TILE_URL=
# NEXT_PUBLIC_MAP_TILE_ATTRIBUTION=
'@
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText('C:\Projects\Bmad\TourGuideWeb\.env.local', $content, $utf8)
Write-Host 'OK'
