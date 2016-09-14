'use strict';

var util = require('util');
var azureCommon = require('azure-common');
var msRestAzure = require('ms-rest-azure');
var Service = azureCommon.Service;
var WebResource = azureCommon.WebResource;
var config = require('../config');

var ServiceAppActions = ( /** @lends ServiceAppActions */ function() {

  function ServiceAppActions() {

    this.config = config.svc;
  
    this.init = init.bind(this);
  }

  function init(callback) {

    //service principal authentication
    msRestAzure.loginWithServicePrincipalSecret(this.config.clientId, this.config.secret, this.config.domain, function (err, credentials) {
      
      if (err) {
        console.error('There was a problem connecting to azure.', err);
        return callback(err);
      }

      // This is a fix to enable resource client and hdinsight client
      // to know the subscription through the credentials object 
      credentials.subscriptionId = this.config.subscriptionId;
      this.credentials = credentials;

      var appServiceClient = new ServiceAppActionsClient(this.credentials, this.config);

      return callback(null, appServiceClient);
    }.bind(this));
  }
  
  return ServiceAppActions;
})();

var ServiceAppActionsClient = ( /** @lends ServiceAppActionsClient */ function() {

  function ServiceAppActionsClient(credentials, config, filters) {

    this.config = config;
    this.credentials = credentials;
  
    ServiceAppActionsClient['super_'].call(this, credentials, filters);
  }
  util.inherits(ServiceAppActionsClient, Service);

  ServiceAppActionsClient.prototype.getActionRequestObject = function(webjobName, actionName, callback) {
    if (callback === null || callback === undefined) {
      throw new Error('callback cannot be null.');
    }
    // Validate
    if (webjobName === null || webjobName === undefined) {
      return callback(new Error('webjobName cannot be null.'));
    }
    
    // Tracing
    
    // Construct URL
    var url2 = '';
    url2 = url2 + 'https://' + encodeURIComponent(webjobName) + '.scm.azurewebsites.net/api/continuouswebjobs';
    url2 = url2 + '/' + config.apps.proxy.name;

    if (actionName) {
      url2 = url2 + '/';
      url2 = url2 + encodeURIComponent(actionName);
    }
    
    url2 = url2.replace(' ', '%20');
    
    // Create HTTP transport objects
    var httpRequest = new WebResource();
    httpRequest.method = actionName ? 'POST' : 'GET';
    httpRequest.headers = {};
    httpRequest.url = url2;
    // Set Headers
    if (this.generateClientRequestId) {
        httpRequest.headers['x-ms-client-request-id'] = msRestAzure.generateUuid();
    }
    if (this.acceptLanguage !== undefined && this.acceptLanguage !== null) {
      httpRequest.headers['accept-language'] = this.acceptLanguage;
    }

    // Set Headers
    httpRequest.headers['Content-Type'] = 'application/json; charset=utf-8';
    httpRequest.body = null;

    // Send Request
    return this.pipeline(httpRequest, function (err, response, body) {
      if (err !== null && err !== undefined) {
        return callback(err);
      }
      var statusCode = response.statusCode;
      if (statusCode !== 200 && statusCode !== 412) {
        var error = new Error(body);
        error.statusCode = response.statusCode;
        return callback(error);
      }
      
      // Create Result
      var result = null;

      // Deserialize Response
      if (statusCode === 200 || statusCode === 412) {
        var responseContent = body;
        result = {};
        var responseDoc = null;
        if (responseContent) {
          responseDoc = JSON.parse(responseContent);
        }
        
        if (responseDoc !== null && responseDoc !== undefined) {
          result.webjob = responseDoc;
        }
      }

      result.statusCode = statusCode;
      result.operationStatusLink = response.headers['x-ms-hdi-clusteruri'];
      result.requestId = response.headers['x-ms-request-id'];
      
      return callback(null, result);
    });
  };

  ServiceAppActionsClient.prototype.get = function(websiteName, callback) {
    var _websiteName = typeof websiteName === 'string' && websiteName || this.config.proxyAppName;
    var _callback = typeof websiteName === 'function' && websiteName || callback;
    this.getActionRequestObject(_websiteName, null, _callback);
  }

  ServiceAppActionsClient.prototype.start = function(websiteName, callback) {
    var _websiteName = typeof websiteName === 'string' && websiteName || this.config.proxyAppName;
    var _callback = typeof websiteName === 'function' && websiteName || callback;
    this.getActionRequestObject(_websiteName, 'start', _callback);
  }

  ServiceAppActionsClient.prototype.stop = function(websiteName, callback) {
    var _websiteName = typeof websiteName === 'string' && websiteName || this.config.proxyAppName;
    var _callback = typeof websiteName === 'function' && websiteName || callback;
    this.getActionRequestObject(_websiteName, 'stop', _callback);
  }
  
  return ServiceAppActionsClient;
})();

module.exports = ServiceAppActions;