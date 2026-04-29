$content = @'
NEXT_PUBLIC_USE_STUBS=false
NEXT_PUBLIC_AMPLIFY_USER_POOL_ID=us-east-1_XuXa68i24
NEXT_PUBLIC_AMPLIFY_USER_POOL_CLIENT_ID=6qd743bgnv45p0veq5nosr8brb
NEXT_PUBLIC_AMPLIFY_IDENTITY_POOL_ID=us-east-1:df9a70dd-c5b8-4c81-a064-08eb927cf062
NEXT_PUBLIC_AMPLIFY_REGION=us-east-1
NEXT_PUBLIC_AMPLIFY_GRAPHQL_ENDPOINT=https://j5ergthsrre53glks3ec44kbpy.appsync-api.us-east-1.amazonaws.com/graphql
NEXT_PUBLIC_AMPLIFY_API_ENDPOINT=https://j5ergthsrre53glks3ec44kbpy.appsync-api.us-east-1.amazonaws.com/graphql
NEXT_PUBLIC_APP_STORE_IOS=https://apps.apple.com/app/tourguide/id0000000000
NEXT_PUBLIC_APP_STORE_ANDROID=https://play.google.com/store/apps/details?id=com.tourguideyeup
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIzaSyBX0VLDJAHrhzwq4AI3BwN-GmRJWrQs_as
'@
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText('C:\Projects\Bmad\TourGuideWeb\.env.local', $content, $utf8)
Write-Host 'OK'
