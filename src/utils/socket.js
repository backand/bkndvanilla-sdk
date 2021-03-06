export default class Socket {
  constructor (url) {
    if (!window.io)
      throw new Error('runSocket is true but socketio-client is not included');
    this.url = url;
    // this.socket = io.connect(this.url, {'forceNew':true });
    this.socket = io.connect(this.url, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax : 5000,
      reconnectionAttempts: 99999
    });

    this.socket.on('connect', () => { this.socket.emit("login", this.auth.token, this.auth.anonymousToken, this.auth.appName); });
    this.socket.on('authorized', () => { console.info(`socket connected`); });
    this.socket.on('notAuthorized', () => { setTimeout(() => this.disconnect(), 1111); });
    this.socket.on('disconnect', () => { console.info(`socket disconnect`); });
    this.socket.on('reconnecting', () => { console.info(`socket reconnecting`); });
    this.socket.on('error', (error) => { console.warn(`error: ${error}`); });
  }
  on (eventName, callback) {
    this.socket.on(eventName, data => {
      callback.call(this, data);
    });
    return Promise.resolve({
      status: 200,
      statusText: 'OK',
      headers: {},
      data: `listener for ${eventName} has been set. pending for a broadcast from the server`,
      config: {}
    });
  }
  connect (token, anonymousToken, appName) {
    this.auth = {
      token,
      anonymousToken,
      appName
    };
    this.socket.connect();
  }
  disconnect () {
    this.socket.disconnect();
  }
}
