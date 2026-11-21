// Expo SDK 52+ detects the monorepo (npm workspaces) automatically,
// so packages/shared is resolved without extra setup.
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
