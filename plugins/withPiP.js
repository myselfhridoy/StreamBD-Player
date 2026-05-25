const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withPiP(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];
    const mainActivity = application.activity.find(
      (a) => a.$['android:name'] === '.MainActivity'
    );

    if (mainActivity) {
      // Add Picture-in-Picture support
      mainActivity.$['android:supportsPictureInPicture'] = 'true';
      // Ensure the activity is resizeable
      mainActivity.$['android:resizeableActivity'] = 'true';
      
      // Prevent activity recreation on these configuration changes
      const currentConfigChanges = mainActivity.$['android:configChanges'] || '';
      const neededChanges = ['smallestScreenSize', 'screenLayout', 'orientation', 'screenSize'];
      let newConfigChanges = currentConfigChanges;
      
      neededChanges.forEach(change => {
        if (!newConfigChanges.includes(change)) {
          newConfigChanges += (newConfigChanges ? '|' : '') + change;
        }
      });
      
      mainActivity.$['android:configChanges'] = newConfigChanges;
    }

    return config;
  });
};
