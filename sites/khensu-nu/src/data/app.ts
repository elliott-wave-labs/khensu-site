// The App Store's numeric Apple ID for nu.khensu.ptah, from App Store Connect (App Information > Apple ID).
// Until it is set, links go to khensu.nu/app. Apple's badge (public/badges, from Apple's marketing toolbox) only shows
// once it is set: Apple allows the badge only for apps available on the App Store.
export const APP_STORE_ID = '';
export const APP_STORE_URL = APP_STORE_ID ? `https://apps.apple.com/app/id${APP_STORE_ID}` : '/app';

// The Google Play package listing. Google's "Get it on Google Play" badge (public/badges, from Google's badge
// generator, trimmed of its transparent padding) only shows once the app is live on Google Play.
export const GOOGLE_PLAY_ID = '';
export const GOOGLE_PLAY_URL = GOOGLE_PLAY_ID ? `https://play.google.com/store/apps/details?id=${GOOGLE_PLAY_ID}` : '';
