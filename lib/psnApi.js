"use strict";

const fetch = require('fetch-cookie')(require('node-fetch'));
const querystring = require('querystring');
const fs = require('fs');

const ApiEndpoints = require('./endpoints');

const auth_endpoint = 'https://auth.api.sonyentertainmentnetwork.com';
const auth_endpoints = {
  ssocookie: auth_endpoint + '/2.0/ssocookie',
  authorizeCheck: auth_endpoint + '/2.0/oauth/authorizeCheck',
  authorize: auth_endpoint + '/2.0/oauth/authorize',
  token: auth_endpoint + '/2.0/oauth/token',
};

class PsnApi{

  log(){
    if(this.debugLog)
      console.log.apply(undefined, arguments);
  }

  constructor(email, password, refreshToken){
    this.authed = false;
    this.expires = 0;

    this.email = email;
    this.password = password;
    this.debugLog = true;

    this.client_id = '4db3729d-4591-457a-807a-1cf01e60c3ac';
    this.scope = 'psn:sceapp,user:account.get,user:account.settings.privacy.get,user:account.settings.privacy.update,user:account.realName.get,user:account.realName.update,kamaji:get_account_hash,kamaji:ugc:distributor,oauth:manage_device_usercodes,kamaji:game_list,capone:report_submission,kamaji:get_internal_entitlements';
    this.service_entity = 'urn:service-entity:psn';
    this.client_secret = 'criemouwIuVoa4iU';

    this.refresh_token = refreshToken || '';
    this.npsso = '';

    ApiEndpoints.forEach(endpoint => {
      let name = endpoint.method.toLowerCase();
          name += endpoint.name.charAt(0).toUpperCase() + endpoint.name.slice(1);

      this[name] = (params, query) => {
        return this.query(endpoint, params, query);
      }

    });
    return this;
  }

  loginWithToken(refreshToken){

  }

  login(){
    return this.getNPSSO().then(response => {
      return this.authorizeCheck();
    }).then(res => {
      return this.authorize();
    }).then(code => {
      return this.token();
    }).then(response => {
      return this.getProfile();
    });
  }

  applyOptions(obj1, obj2) {
    if(Object.prototype.toString.call(obj2)  !== '[object Object]'){
      return obj1;
    }
    for(var key in obj2){
      if(Object.prototype.toString.call(obj2[key]) !== '[object Object]'){
          obj1[key] = obj2[key];
      }else if(Object.prototype.toString.call(obj1[key]) === '[object Object]'){
        obj1[key] = this.applyOptions(obj1[key], obj2[key]);
      }
    }
    return obj1;
  }

  parseUrl(url, params, query){
    params = params || {};
    query = query || {};
    for(var k in params){
      url = url.replace('{' + k + '}', params[k]);
    }
    return url + '?' + querystring.stringify(query);
  }

  query(endpoint, params, query) {

    if(!this.authed){
      throw new Error('Not authed!');
    }

    this.log('[LOG]', 'QUERY', endpoint.method, endpoint.url);

    params = this.applyOptions(endpoint.params, params);
    query = this.applyOptions(endpoint.query, query);

    if(query.fields)
      query.fields = query.fields.join(',');

    let options = {
      method: endpoint.method,
      headers: {
        'Authorization': 'Bearer ' + this.access_token
      }
    }

    return fetch(this.parseUrl(endpoint.url, params, query), options).then(response => {
      if(response.status === 401){
        let json = response.json();
        if ('error' in json) {
          if (json.error.code === 2105858 || json.error.code === 2138626) {
            this.log('[ERROR]', 'Token Expired...');
            return this.token(true).then(() => { return this.query(endpoint, params, query); });
          }
        }
      }

      if(response.status > 400){
        throw new Error(response.statusText);
      }
      this.log('[LOG]', 'QUERY', 'Successful');
      return response.json();
    });
  }

  authorize(){
    this.log('[LOG]', 'Authorizing...');

    let query = {
      state:	'bnswIoaVAj6RoaQr4Y6GVSeDBI',
      ui:	'pr',
      duid:	'0000000d00040080FE34F9B9DB114E54ABCF51FA19D9345F',
      app_context:	'inapp_ios',
      client_id:	'4db3729d-4591-457a-807a-1cf01e60c3ac',
      device_base_font_size:	10,
      device_profile:	'mobile',
      redirect_uri:	'com.playstation.PlayStationApp://redirect',
      response_type:	'code',
      scope:	this.scope,
      service_entity:	this.service_entity,
      service_logo:	'ps',
      smcid:	'psapp:signin',
      support_scheme:	'sneiprls'
    };

    return fetch(auth_endpoints.authorize + '?' + querystring.stringify(query), {
      redirect: 'manual',
      follow: 0
    }).then(response => {
      if(response.status >= 400){
        throw new Error(response.statusText);
      }
      let location = response.headers.get('Location');
      let authCode = location.substr(location.indexOf("redirect?code=") + 14, 6);
      this.code = authCode;
      this.log('[LOG]', 'Authorizing... Got Authcode:', this.code);
      return authCode;
    });
  }

  authorizeCheck(){
    this.log('[LOG]', 'Authorize Check...');

    let body = JSON.stringify({
      "npsso":this.npsso,
      "client_id":this.client_id,
      "scope":this.scope,
      "service_entity":this.service_entity});

    return fetch(auth_endpoints.authorizeCheck, {
      method: 'POST',
      body: body,
      headers: {
        'Content-Length': body.length,
        'Content-Type': 'application/json; charset=UTF-8'
      }
    }).then(response => {
      if(response.status > 400){
        this.log('ERROR', 'Authorize Check... Failed -', response.statusText);
        throw new Error(response.statusText);
      }
      this.log('[LOG]', 'Authorize Check... Successful');
    });
  }

  token(refresh){
    let body = {
      app_context:	'inapp_ios',
      client_id:	'4db3729d-4591-457a-807a-1cf01e60c3ac',
      client_secret:	this.client_secret,
      device_base_font_size:	10,
      device_profile:	'mobile',
      duid:	'0000000d00040080FE34F9B9DB114E54ABCF51FA19D9345F',
      redirect_uri:	'com.playstation.PlayStationApp://redirect',
      scope: this.scope,
      service_entity:	this.service_entity,
      service_logo:	'ps',
      smcid:	'psapp:signin',
      ui:	'pr'
    };

    if(refresh){
      body.grant_type = 'refresh_token';
      body.refresh_token = this.refresh_token;
      this.log('[LOG]', 'Get Token... Refresh');
    }else{
      body.grant_type = 'authorization_code';
      body.code = this.code;
      this.log('[LOG]', 'Get Token... Code');
    }

    body = querystring.stringify(body);

    return fetch(auth_endpoints.token, {
      method: 'POST',
      body: body,
      headers: {
        'Content-Length': body.length,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }).then(response => {
      if(response.status > 400){
        this.log('ERROR', 'Get Token...', response.statusText);
        throw new Error(response.statusText);
      }
      return response.json();
    }).then(json => {
      this.access_token = json.access_token;
      this.expires = json.expires_in;
      this.refresh_token = json.refresh_token;
      this.authed = true;
      this.log('[LOG]', 'Get Token... Got Token:', this.access_token);
      return json;
    });
  }

  getNPSSO(){
    this.log('[LOG]', 'Get NPSSO...');

     let body = querystring.stringify({
       authentication_type:	'password',
       username:	this.email,
       password:	this.password,
       client_id:	this.client_id
     });

    return fetch(auth_endpoints.ssocookie, {
      method: 'POST',
      body: body,
      headers: {
        'Content-Length': body.length,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }).then(response => {
      if(response.status > 400){
        this.log('ERROR', 'Get NPSSO...', response.statusText);
        throw new Error(response.statusText);
      }
      return response.json();
    }).then(json => {
      this.npsso = json.npsso;
      this.log('[LOG]', 'Get NPSSO...', this.npsso);
      return json.npsso;
    });
  }

}

module.exports = PsnApi;