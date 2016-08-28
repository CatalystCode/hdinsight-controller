'use strict';

var util = require('util');
var azureCommon = require('azure-common');
var msRestAzure = require('ms-rest-azure');
var Service = azureCommon.Service;
var WebResource = azureCommon.WebResource;

var ServiceAppActions = ( /** @lends HDInsightManagementClient */ function() {

  function ServiceAppActions() {

    this.config = null;
    this.baseUri = null;
  
    this.init = init.bind(this);
  }

  function init(callback) {

    if (!this.config) {
      try {
        this.config = require('../lib/config');
      } catch (e) {
        return callback(new Error("There was an error reading configuration: " + e));
      }
    }

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

      var appServiceClient = new ServiceAppActionsClient(this.credentials, this.baseUri, this.config);

      return callback(null, appServiceClient);
    }.bind(this));
  }
  
  return ServiceAppActions;
})();

var ServiceAppActionsClient = ( /** @lends HDInsightManagementClient */ function() {

  function ServiceAppActionsClient(credentials, baseUri, config, filters) {

    this.config = config;
    this.credentials = credentials;
    this.baseUri = baseUri;
  
    ServiceAppActionsClient['super_'].call(this, credentials, filters);

    if (this.baseUri === null || this.baseUri === undefined) {
      this.baseUri = 'https://management.azure.com';
    }
    if (this.apiVersion === null || this.apiVersion === undefined) {
      this.apiVersion = '2015-08-01';
    }
  }
  util.inherits(ServiceAppActionsClient, Service);

  ServiceAppActionsClient.prototype.getActionRequestObject = function(websiteName, actionName, callback) {
    if (callback === null || callback === undefined) {
      throw new Error('callback cannot be null.');
    }
    // Validate
    if (actionName === null || actionName === undefined) {
      return callback(new Error('actionName cannot be null.'));
    }
    
    // Tracing
    
    // Construct URL
    var url2 = '';
    url2 = url2 + '/subscriptions/';
    if (this.credentials.subscriptionId !== null && this.credentials.subscriptionId !== undefined) {
      url2 = url2 + encodeURIComponent(this.credentials.subscriptionId);
    }
    url2 = url2 + '/resourceGroups/';
    url2 = url2 + encodeURIComponent(this.config.resourceGroupName);
    url2 = url2 + '/providers/';
    url2 = url2 + 'Microsoft.Web';
    url2 = url2 + '/';
    url2 = url2 + 'sites';
    url2 = url2 + '/';
    url2 = url2 + encodeURIComponent(websiteName);
    url2 = url2 + '/';
    url2 = url2 + encodeURIComponent(actionName);
    
    var queryParameters = [];
    queryParameters.push('api-version=' + this.apiVersion);
    if (queryParameters.length > 0) {
      url2 = url2 + '?' + queryParameters.join('&');
    }
    var baseUrl = this.baseUri;
    // Trim '/' character from the end of baseUrl and beginning of url.
    if (baseUrl[baseUrl.length - 1] === '/') {
      baseUrl = baseUrl.substring(0, (baseUrl.length - 1) + 0);
    }
    if (url2[0] === '/') {
      url2 = url2.substring(1);
    }
    url2 = baseUrl + '/' + url2;
    url2 = url2.replace(' ', '%20');
    
    // Create HTTP transport objects
    var httpRequest = new WebResource();
    httpRequest.method = 'POST';
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
          var clusterInstance = { tags: {} };
          result.cluster = clusterInstance;
          
          var idValue = responseDoc['id'];
          if (idValue !== null && idValue !== undefined) {
            var idInstance = idValue;
            clusterInstance.id = idInstance;
          }
        }
      }

      result.statusCode = statusCode;
      result.operationStatusLink = response.headers['x-ms-hdi-clusteruri'];
      result.requestId = response.headers['x-ms-request-id'];
      
      return callback(null, result);
    });
  };

  ServiceAppActionsClient.prototype.start = function(websiteName, callback) {
    var _websiteName = typeof websiteName === 'string' && websiteName || this.config.functionAppName;
    var _callback = typeof websiteName === 'function' && websiteName || callback;
    this.getActionRequestObject(_websiteName, 'start', _callback);
  }

  ServiceAppActionsClient.prototype.stop = function(websiteName, callback) {
    var _websiteName = typeof websiteName === 'string' && websiteName || this.config.functionAppName;
    var _callback = typeof websiteName === 'function' && websiteName || callback;
    this.getActionRequestObject(_websiteName, 'stop', _callback);
  }
  
  return ServiceAppActionsClient;
})();

exports.ServiceAppActions = ServiceAppActions;