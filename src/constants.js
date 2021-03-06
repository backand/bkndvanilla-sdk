export const EVENTS = {
  SIGNIN: 'SIGNIN',
  SIGNOUT: 'SIGNOUT',
  SIGNUP: 'SIGNUP',
  START_OFFLINE_MODE: 'startOfflineMode',
  END_OFFLINE_MODE: 'endOfflineMode'
};

export const URLS = {
  token: 'token',
  signup: '1/user/signup',
  requestResetPassword: '1/user/requestResetPassword',
  resetPassword: '1/user/resetPassword',
  changePassword: '1/user/changePassword',
  // socialLoginWithCode: '1/user/PROVIDER/code',
  socialSigninWithToken: '1/user/PROVIDER/token',
  // socialSingupWithCode: '1/user/PROVIDER/signupCode',
  signout: '1/user/signout',
  profile: 'api/account/profile',
  objects: '1/objects',
  objectsAction: '1/objects/action',
  query: '1/query/data',
  bulk: '1/bulk',
  fn: '1/function/general',
  socialProviders: '1/user/socialProviders'
};

export const SOCIAL_PROVIDERS = {
  github: {name: 'github', label: 'Github', url: 'www.github.com', css: {backgroundColor: '#444'}, id: 1},
  google: {name: 'google', label: 'Google', url: 'www.google.com', css: {backgroundColor: '#dd4b39'}, id: 2},
  facebook: {name: 'facebook', label: 'Facebook', url: 'www.facebook.com', css: {backgroundColor: '#3b5998'}, id: 3},
  twitter: {name: 'twitter', label: 'Twitter', url: 'www.twitter.com', css: {backgroundColor: '#55acee'}, id: 4},
  azuread: {name: 'azuread', label: 'Azure Active Directory', url: 'www.azuread.com', css: {backgroundColor: '#3b9844'}, id: 5},
  adfs: {name: 'adfs', label: 'ADFS', url: 'www.adfs.com', css: {backgroundColor: '#3b9844'}, id: 6},
};
