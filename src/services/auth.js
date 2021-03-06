import {URLS, EVENTS, SOCIAL_PROVIDERS} from './../constants'
import defaults from './../defaults'
import utils from './../utils/utils'
import {__generateFakeResponse__, __dispatchEvent__} from './../utils/fns'

export default {
  __handleRefreshToken__,
  useAnonymousAuth,
  signin,
  signup,
  socialSignin,
  socialSigninWithToken,
  socialSignup,
  requestResetPassword,
  resetPassword,
  changePassword,
  signout,
  getSocialProviders,
  useBasicAuth,
  useAccessAuth,
  createBasicToken,
}

function __authorize__(tokenData) {
  let data = [];
  Object.keys(tokenData).forEach(key => {
    data.push(encodeURIComponent(key) + '=' + encodeURIComponent(tokenData[key]));
  });
  data = data.join("&");

  return utils.http({
    url: URLS.token,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: `${data}&appName=${defaults.appName}&grant_type=password`
  })
      .then(response => {
        utils.storage.set('user', {
          token: {
            Authorization: `Bearer ${response.data.access_token}`
          },
          details: response.data
        });
        __dispatchEvent__(EVENTS.SIGNIN);
        if (defaults.runSocket) {
          utils.socket.connect(utils.storage.get('user').token.Authorization, defaults.anonymousToken, defaults.appName);
        }
        return response;
      });
}
// A function that sets the authorization in the storage and therefore in the header as basic auth,
// the credentials are inserted in the init config.
function useBasicAuth() {
  return new Promise((resolve, reject) => {
    if (!defaults.userToken || !defaults.masterToken) {
      reject(__generateFakeResponse__(0, '', {}, 'userToken or masterToken are missing for basic authentication'))
    }
    else {
      let details = {
        "token_type": "Basic",
        "expires_in": 0,
        "appName": defaults.appName,
        "username": "",
        "role": "",
        "firstName": "",
        "lastName": "",
        "fullName": "",
        "regId": 0,
        "userId": null
      };
      let basicToken = 'Basic ' + createBasicToken(defaults.masterToken, defaults.userToken);
      utils.storage.set('user', {
        token: {
          Authorization:  basicToken
        },
        details: details
      });
      resolve(__generateFakeResponse__(200, 'OK', {}, details, {}));
    }
  });

}

// A function that sets the authorization in the storage and therefore in the header as Access Token auth,
// the credentials are inserted in the init config.
function useAccessAuth() {
  return new Promise((resolve, reject) => {
    if (!defaults.accessToken) {
      reject(__generateFakeResponse__(0, '', {}, 'accessToken is missing for Access authentication'))
    }
    else {
      let details = {
        "token_type": "",
        "expires_in": 0,
        "appName": defaults.appName,
        "username": "",
        "role": "",
        "firstName": "",
        "lastName": "",
        "fullName": "",
        "regId": 0,
        "userId": null
      };
      var aToken = defaults.accessToken.toLowerCase().startsWith('bearer') ? defaults.accessToken : 'Bearer ' + defaults.accessToken;
      utils.storage.set('user', {
        token: {
          Authorization:  aToken,
          appName: defaults.appName
        },
        details: details
      });
      resolve(__generateFakeResponse__(200, 'OK', {}, details, {}));
    }
  });

}
function createBasicToken(masterToken, userToken){
  return new Buffer(masterToken + ':' + userToken).toString('base64')
}
function __handleRefreshToken__() {
  return new Promise((resolve, reject) => {
    let user = utils.storage.get('user');
    if (!user || !user.details.refresh_token) {
      reject(__generateFakeResponse__(0, '', {}, 'No cached user or refreshToken found. authentication is required.', {}));
    }
    else {
      resolve(__authorize__({
        username: user.details.username,
        refreshToken: user.details.refresh_token,
      }));
    }
  });
}
function useAnonymousAuth() {
  return new Promise((resolve, reject) => {
    if (!defaults.anonymousToken) {
      reject(__generateFakeResponse__(0, '', {}, 'anonymousToken is missing', {}));
    }
    else {
      let details = {
        // "access_token": defaults.anonymousToken,
        "token_type": "AnonymousToken",
        "expires_in": 0,
        "appName": defaults.appName,
        "username": "Guest",
        "role": "",
        "firstName": "anonymous",
        "lastName": "anonymous",
        "fullName": "",
        "regId": 0,
        "userId": null
      }
      utils.storage.set('user', {
        token: {
          AnonymousToken: defaults.anonymousToken
        },
        details,
      });
      // __dispatchEvent__(EVENTS.SIGNIN);
      if (defaults.runSocket) {
        utils.socket.connect(null, defaults.anonymousToken, defaults.appName);
      }
      resolve(__generateFakeResponse__(200, 'OK', {}, details, {}));
    }
  });
}
function signin(username, password,) {
  return __authorize__({
    username,
    password,
  });
}
function signup(firstName, lastName, email, password, confirmPassword, parameters = {}) {
  return utils.http({
    url: URLS.signup,
    method: 'POST',
    headers: {
      'SignUpToken': defaults.signUpToken
    },
    data: {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      parameters
    }
  })
      .then(response => {
        __dispatchEvent__(EVENTS.SIGNUP);
        if (defaults.runSigninAfterSignup) {
          return signin(response.data.username, password);
        }
        else {
          return response;
        }
      });
}
function __getSocialUrl__(providerName, isSignup, isAutoSignUp) {
  let provider = SOCIAL_PROVIDERS[providerName];
  let action = isSignup ? 'up' : 'in';
  let autoSignUpParam = `&signupIfNotSignedIn=${(!isSignup && isAutoSignUp) ? 'true' : 'false'}`;
  return `/user/socialSign${action}?provider=${provider.name}${autoSignUpParam}&response_type=token&client_id=self&redirect_uri=${provider.url}&state=`;
}
function __socialAuth__(provider, isSignUp, spec, email) {
  return new Promise((resolve, reject) => {
    if (!SOCIAL_PROVIDERS[provider]) {
      reject(__generateFakeResponse__(0, '', {}, 'Unknown Social Provider', {}));
    }
    let url = `${defaults.apiUrl}/1/${__getSocialUrl__(provider, isSignUp, true)}&appname=${defaults.appName}${email ? '&email=' + email : ''}&returnAddress=` // ${location.href}
    let popup = null;
    if (defaults.isMobile) {
      if (defaults.mobilePlatform === 'ionic') {
        let dummyReturnAddress = 'http://www.backandblabla.bla';
        url += dummyReturnAddress;
        let handler = function (e) {
          if (e.url.indexOf(dummyReturnAddress) === 0) {
            let dataMatch = /(data|error)=(.+)/.exec(e.url);
            let res = {};
            if (dataMatch && dataMatch[1] && dataMatch[2]) {
              res.data = JSON.parse(decodeURIComponent(dataMatch[2].replace(/#.*/, '')));
              res.status = (dataMatch[1] === 'data') ? 200 : 0;
            }
            popup.removeEventListener('loadstart', handler, false);
            if (popup && popup.close) {
              popup.close()
            }
            if (res.status != 200) {
              reject(res);
            }
            else {
              resolve(res);
            }
          }
        }
        popup = cordova.InAppBrowser.open(url, '_blank');
        popup.addEventListener('loadstart', handler, false);
      }
      else if (defaults.mobilePlatform === 'react-native') {
        reject(__generateFakeResponse__(0, '', {}, 'react-native is not supported yet for socials', {}));
      }
      else {
        reject(__generateFakeResponse__(0, '', {}, `isMobile is true but mobilePlatform is not supported.
          'try contact us in request to add support for this platform`, {}));
      }
    }
    else if (utils.detector.env === 'browser') {
      let handler = function (e) {
        let url = e.type === 'message' ? e.origin : e.url;
        // ie-location-origin-polyfill
        if (!window.location.origin) {
          window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port : '');
        }
        if (url.indexOf(window.location.origin) === -1) {
          reject(__generateFakeResponse__(0, '', {}, 'Unknown Origin Message', {}));
        }

        let res = e.type === 'message' ? JSON.parse(e.data) : JSON.parse(e.newValue);
        window.removeEventListener('message', handler, false);
        window.removeEventListener('storage', handler, false);
        if (popup && popup.close) {
          popup.close()
        }
        e.type === 'storage' && localStorage.removeItem(e.key);

        if (res.status != 200) {
          reject(res);
        }
        else {
          resolve(res);
        }
      }
      if (utils.detector.type !== 'Internet Explorer') {
        popup = window.open(url, 'socialpopup', spec);
        window.addEventListener('message', handler, false);
      }
      else {
        popup = window.open('', '', spec);
        popup.location = url;
        window.addEventListener('storage', handler, false);
      }
    }
    else if (utils.detector.env === 'node') {
      reject(__generateFakeResponse__(0, '', {}, `socials are not supported in a nodejs environment`, {}));
    }

    if (popup && popup.focus) {
      popup.focus()
    }
  });
}
function socialSignin(provider, spec = 'left=1, top=1, width=500, height=560') {
  return __socialAuth__(provider, false, spec, '')
      .then(response => {
        __dispatchEvent__(EVENTS.SIGNUP);
        return __authorize__({
          accessToken: response.data.access_token
        });
      });
}
function socialSigninWithToken(provider, token) {
  return utils.http({
    url: URLS.socialSigninWithToken.replace('PROVIDER', provider),
    method: 'GET',
    params: {
      accessToken: token,
      appName: defaults.appName,
      signupIfNotSignedIn: true,
    },
  })
      .then(response => {
        utils.storage.set('user', {
          token: {
            Authorization: `Bearer ${response.data.access_token}`
          },
          details: response.data
        });
        __dispatchEvent__(EVENTS.SIGNIN);
        if (defaults.runSocket) {
          utils.socket.connect(utils.storage.get('user').token.Authorization, defaults.anonymousToken, defaults.appName);
        }
        // PATCH
        return utils.http({
          url: `${URLS.objects}/users`,
          method: 'GET',
          params: {
            filter: [
              {
                "fieldName": "email",
                "operator": "equals",
                "value": response.data.username
              }
            ]
          },
        })
            .then(patch => {
              let {id, firstName, lastName} = patch.data.data[0];
              let user = utils.storage.get('user');
              let newDetails = {userId: id.toString(), firstName, lastName};
              utils.storage.set('user', {
                token: user.token,
                details: Object.assign({}, user.details, newDetails)
              });
              user = utils.storage.get('user');
              return __generateFakeResponse__(response.status, response.statusText, response.headers, user.details);
            });
        // EOP
      });
}
function socialSignup(provider, email, spec = 'left=1, top=1, width=500, height=560') {
  return __socialAuth__(provider, true, spec, email)
      .then(response => {
        __dispatchEvent__(EVENTS.SIGNUP);
        if (defaults.runSigninAfterSignup) {
          return __authorize__({
            accessToken: response.data.access_token
          });
        }
        else {
          return response;
        }
      });
}
function requestResetPassword(username) {
  return utils.http({
    url: URLS.requestResetPassword,
    method: 'POST',
    data: {
      appName: defaults.appName,
      username
    }
  });
}
function resetPassword(newPassword, resetToken) {
  return utils.http({
    url: URLS.resetPassword,
    method: 'POST',
    data: {
      newPassword,
      resetToken
    }
  });
}
function changePassword(oldPassword, newPassword) {
  return utils.http({
    url: URLS.changePassword,
    method: 'POST',
    data: {
      oldPassword,
      newPassword
    }
  });
}
function __signoutBody__() {
  return new Promise((resolve, reject) => {
    utils.storage.remove('user');
    if (defaults.runSocket) {
      utils.socket.disconnect();
    }
    __dispatchEvent__(EVENTS.SIGNOUT);
    resolve(__generateFakeResponse__(200, 'OK', {}, utils.storage.get('user'), {}));
  });
}
function signout() {
  let storeUser = utils.storage.get('user');
  if (storeUser) {
    if (!storeUser.token["Authorization"]) {
      return __signoutBody__();
    }
    else {
      return utils.http({
        url: URLS.signout,
        method: 'GET',
      })
          .then(res => {
            return __signoutBody__();
          })
          .catch(res => {
            return __signoutBody__();
          });
    }
  }
  else {
    return Promise.reject(__generateFakeResponse__(0, '', {}, 'No cached user found. cannot signout.', {}));
  }
}
function getSocialProviders() {
  return utils.http({
    url: URLS.socialProviders,
    method: 'GET',
    params: {
      appName: defaults.appName,
    }
  });
}
