// Firebase native modules are linked only when Firebase config files exist,
// matching app.config.ts. Mock/dev demo builds don't use Firebase.
const { existsSync } = require('node:fs');

const hasFirebase = existsSync('./google-services.json') || existsSync('./GoogleService-Info.plist');
const unlinked = { platforms: { android: null, ios: null } };

module.exports = {
  dependencies: hasFirebase
    ? {}
    : {
        '@react-native-firebase/app': unlinked,
        '@react-native-firebase/auth': unlinked,
        '@react-native-firebase/messaging': unlinked,
      },
};
