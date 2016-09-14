'use strict';

var azure = require('azure-storage');
var async = require('async');
var request = require('request');
var _ = require('underscore');

var config = require('../config');
var WebJobsManager = require('./manage-webjobs');
var HDInsightManager = require('./manage-hdinsight');

var StatusCollector = ( /** @lends StatusCollector */ function() {

  function StatusCollector() {

    this.config = config.svc;
    this.status = {
      queueError: null,
      queueLength: 0,
      funcError: null,
      webjobActive: false,
      hdinsightError: null,
      hdinsightOperational: false,
      hdinsightStatus: null,
      hdinsightProvisioningSuccess: false,
      hdinsightProvisioningState: null,
      livyError: null,
      livyTotalJobs: 0,
      livyRunningJobs: 0
    };
    this.hdinsightManager = new HDInsightManager();
    this.webJobsManager = new WebJobsManager();
    this.appServiceClient = null;

    this.collect = collect.bind(this);
    this.checkQueue = checkQueue.bind(this);
    this.checkFunction = checkFunction.bind(this);
    this.checkHDInsight = checkHDInsight.bind(this);
    this.checkLivy = checkLivy.bind(this);
  }

  function collect(callback) {
    var self = this;

    async.parallel([
    
      // 1.1. Get queue count from azure storage queue
      this.checkQueue,
      
      // 1.2. Get function state from ARM
      this.checkFunction,
      
      // 1.3. Get HDInsight state from ARM
      this.checkHDInsight,
      
      // 1.4. If alive ==> Get livy jobs
      this.checkLivy

    ], function (err, result) {
      if (err) {
        return callback(err);
      }
      return callback(null, self.status);
    });
  }

  // 1.1. Get queue count from azure storage queue
  function checkQueue(callback) {
    var self = this;

    console.info('Checking queue size');
    var queueSvc = azure.createQueueService(self.config.clusterStorageAccountName, self.config.clusterStorageAccountKey);
    queueSvc.createQueueIfNotExists(self.config.inputQueueName, function(err, result, response){
      if (err) {
        self.status.queueError = err;
        return callback();
      }

      queueSvc.peekMessages(self.config.inputQueueName, function(err, result, response){
        if (err) {
          self.status.queueError = err;
          return callback();
        }

        self.status.queueLength = result && result.length; // result.approximateMessageCount - using metadata, returns 1 even if queue is empty
        console.info('Queue size: ' + self.status.queueLength);
        return callback();
      });
    });
  }

  // 1.2. Get function state from ARM
  function checkFunction(callback) {
    var self = this;

    console.info('Checking proxy app');
    self.webJobsManager.init(function (err, _appServiceClient) {
      if (err) {
        self.status.funcError = err;
        return callback();
      }
      
      self.appServiceClient = _appServiceClient;
      self.appServiceClient.get(function (err, result) {
        if (err) {
          self.status.funcError = err;
          return callback();
        }

        self.status.webjobActive = result && result.webjob && result.webjob.status == 'Running' || false;
        console.info('proxy app active: ' + self.status.webjobActive);
        return callback();
      })
    });
  }

  // 1.3. Get HDInsight state from ARM
  function checkHDInsight(callback) {
    var self = this;

    console.info('Checking hdinsight');
    self.hdinsightManager.init(function (err) {

      if (err) {
        self.status.hdinsightError = err;
        console.error('Error initializing hsinsight manager', err);
        return callback();
      }

      self.hdinsightManager.checkHDInsight(function (err, result) {

        if (err) {
          if (err.code != 'ResourceNotFound') {
            self.status.hdinsightError = err;
            console.error('Error checking hsinsight manager', err);
          } else {
            self.status.hdinsightStatus = err.code;
          }
          return callback();
        }

        if (result && result.cluster && result.cluster.properties && result.cluster.properties.provisioningState) {
          self.status.hdinsightProvisioningSuccess = result.cluster.properties.provisioningState == 'Succeeded';
          self.status.hdinsightProvisioningState = result.cluster.properties.provisioningState;
        } else {
          self.status.hdinsightError = new Error('The resulting resource is not in an expected format: ' + result);
        }

        if (result && result.cluster && result.cluster.properties && result.cluster.properties.clusterState) {
          self.status.hdinsightStatus = result.cluster.properties.clusterState;
          self.status.hdinsightOperational = result.cluster.properties.clusterState == 'Running' && self.status.hdinsightProvisioningSuccess;
        } else {
          self.status.hdinsightError = new Error('The resulting resource is not in an expected format: ' + result);
        }

        if (self.status.hdinsightError) {
          console.error('Error with hsinsight manager', self.status.hdinsightError);
        }

        console.info('hdinsight state: ' + self.status.hdinsightStatus + ' with provisioning ' + self.status.hdinsightProvisioningState);
        return callback();
      });

    });
  }

  // 1.4. If alive ==> Get livy jobs
  function checkLivy(callback) {
    var self = this;

    var authenticationHeader = 'Basic ' + new Buffer(self.config.clusterLoginUserName + ':' + self.config.clusterLoginPassword).toString('base64');
    var options = {
      uri: 'https://' + self.config.clusterName + '.azurehdinsight.net/livy/batches',
      method: 'GET',
      headers: { "Authorization": authenticationHeader },
      json: { }
    };

    console.info('Checking livy state');
    request(options, function (err, response, body) {

      if (err || !response || response.statusCode != 200) {
        
        if (err.code != 'ENOTFOUND' && err.code != 'EADDRNOTAVAIL') {
          console.error('livy error: ' + err);
          self.status.livyError = err ? err : new Error (!response ? 'No response received' : 'Status code is not 200');
        } else {
          console.info('livy is not online');
        }
        return callback();
      }

      // Need to check validity and probably filter only running jobs
      self.status.livyTotalJobs = body && body.sessions && body.sessions.length || 0;
      self.status.livyRunningJobs = _.where(body && body.sessions || [], { "state": "running" }).length;
      console.info('livy running jobs: ' + self.status.livyRunningJobs);
      return callback();
    });
  }
  
  return StatusCollector;
})();

module.exports = StatusCollector;