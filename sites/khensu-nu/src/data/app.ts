// The App Store's numeric Apple ID for nu.khensu.ptah, from App Store Connect (App Information > Apple ID).
// Until it is set, links go to khensu.nu/app.
export const APP_STORE_ID = '';
export const APP_STORE_URL = APP_STORE_ID ? `https://apps.apple.com/app/id${APP_STORE_ID}` : '/app';
