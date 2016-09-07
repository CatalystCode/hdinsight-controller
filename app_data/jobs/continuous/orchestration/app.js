var azure = require('azure-storage');
var async = require('async');
var request = require('request');
var _ = require('underscore');

var FunctionsManager = require('../../../../lib/manage-functions');
var HDInsightManager = require('../../../../lib/manage-hdinsight');

var RUN_EVERY = 10; // Seconds
var lastInactiveCheck = null;
var MAX_INACTIVE_TIME = 15; // Minutes

// Initialize environment, return config
function init() {
  var config = null;
  try {
    config = require('../../../../lib/config');
  } catch (e) {
    console.error(e);
  }

  return config;
}

function run(callback) {
  var config = init();

  if (!config) {
    return callback(new Error('Config is not set'));
  }

  // Making sure to update the *run every* x seconds
  RUN_EVERY = config.jobExecutionIntervalInSeconds;

  // 1. Check statuses
  console.info('Initializing statuses');
  var hdinsightManager = new HDInsightManager();
  var functionsManager = new FunctionsManager();
  var appServiceClient = null;
  var status = {
    queueError: null,
    queueLength: 0,
    funcError: null,
    funcActive: false,
    hdinsightError: null,
    hdinsightOperational: false,
    hdinsightStatus: null,
    hdinsightProvisioningSuccess: false,
    hdinsightProvisioningState: null,
    livyError: null,
    livyTotalJobs: 0,
    livyRunningJobs: 0
  };

  async.parallel([
    
    // 1.1. Get queue count from azure storage queue
    checkQueue,
    
    // 1.2. Get function state from ARM
    checkFunction,
    
    // 1.3. Get HDInsight state from ARM
    checkHDInsight,
    
    // 1.4. If alive ==> Get livy jobs
    checkLivy

  ], function (err, result) {

    if (err) { return sendAlert({ error: error }); }
    if (status.queueError) { return sendAlert({ error: status.queueError }); }
    if (status.funcError) { return sendAlert({ error: status.funcError }); }
    if (status.hdinsightError) { return sendAlert({ error: status.hdinsightError }); }
    if (status.livyError) { return sendAlert({ error: status.livyError }); }

    // Queue not empty
    // ================
    // 2. If queue is not empty && HDInsight is ResourceNotFound ==> create HDInsight
    console.info('If queue is not empty && HDInsight is ResourceNotFound ==> create HDInsight');
    if (status.queueLength > 0 && status.hdinsightStatus == 'ResourceNotFound') {
      console.log('Creating hdinsight');
      return hdinsightManager.createHDInsight(function (err) {
        if (err) { sendAlert({ error: err }); }
        console.log('Operation completed successfully');
        return callback();
      })
    }

    // 3. If queue is not empty && HDInsight is operational && Livy is alive && function is down ==> wake up function
    console.info('If queue is not empty && HDInsight is Running && Livy is alive && function is down ==> wake up function');
    if (status.queueLength > 0 && status.hdinsightOperational && !status.funcActive) {
      console.log('Starting proxy app');
      return appServiceClient.start(function (err) {
        if (err) { sendAlert({ error: err }); }
        console.log('Operation completed successfully');
        return callback();
      });
    }

    // Queue is empty
    // ================
    // 4. If queue is empty && hdinsight = ResourceNotFound && function is up
    // This state is illigal and might happen after first deployment ==> shut down functions
    console.info('If queue is empty && Livy jobs == 0 && hdinsight = ResourceNotFound && function is up');
    if (status.queueLength === 0 && status.hdinsightStatus == 'ResourceNotFound' && status.funcActive) {
        console.log('Stopping proxy app');
        return appServiceClient.stop(function (err) {
          if (err) { sendAlert({ error: err }); }
          console.log('Operation completed successfully');
          return callback();
        })
    }

    // 5. If queue is empty && Livy jobs == 0 && function is up | more than 15 minutes ==> shut down functions
    console.info('If queue is empty && Livy jobs == 0 && function is up | more than 15 minutes ==> shut down functions');
    if (status.queueLength === 0 && status.livyRunningJobs === 0 && status.hdinsightOperational && status.funcActive) {
      var now = new Date();
      if (!lastInactiveCheck) {
        lastInactiveCheck = now;
        console.log('Operation completed successfully - initialized check time');
        return callback();
      }

      var minutesPassed = getMinutes(now - lastInactiveCheck);
      console.log('Minutes passed since inactivity of function app: ' + minutesPassed);
      if (minutesPassed >= MAX_INACTIVE_TIME) {
        console.log('Stopping proxy app');
        lastInactiveCheck = null;
        return appServiceClient.stop(function (err) {
          if (err) { sendAlert({ error: err }); }
          console.log('Operation completed successfully');
          return callback();
        });
      }
    }
    
    // 6. If queue is empty && Livy jobs == 0 && function is down | more than 15 minutes ==> shut down HDInsight
    console.info('If queue is empty && Livy jobs == 0 && function is down | more than 15 minutes ==> shut down HDInsight');
    if (status.queueLength === 0 && status.livyRunningJobs === 0 && status.hdinsightOperational && !status.funcActive) {
      var now = new Date();
      if (!lastInactiveCheck) {
        lastInactiveCheck = now;
        console.log('Operation completed successfully - initialized check time');
        return callback();
      }

      var minutesPassed = getMinutes(now - lastInactiveCheck);
      console.log('Minutes passed since inactivity of hdinsight: ' + minutesPassed);
      if (minutesPassed >= MAX_INACTIVE_TIME) {
        return hdinsightManager.deleteHDInsight(function (err) {
          if (err) { 
            sendAlert({ error: err }); 
          }
          else {
            lastInactiveCheck = null; // If after 15 minutes hdinsight not down, try to delete again
          }
          console.log('Operation completed successfully');
          return callback();
        })
      }
    }    
  });

  return callback();
  
  // 1.1. Get queue count from azure storage queue
  function checkQueue(callback) {

    console.info('Checking queue size');
    var queueSvc = azure.createQueueService(config.clusterStorageAccountName, config.clusterStorageAccountKey);
    queueSvc.createQueueIfNotExists(config.inputQueueName, function(err, result, response){
      if (err) {
        status.queueError = err;
        return callback();
      }

      queueSvc.getQueueMetadata(config.inputQueueName, function(err, result, response){
        if (err) {
          status.queueError = err;
          return callback();
        }

        status.queueLength = result.approximateMessageCount;
        console.info('Queue size: ' + status.queueLength);
        return callback();
      });
    });
  }

  // 1.2. Get function state from ARM
  function checkFunction(callback) {
    console.info('Checking proxy app');
    functionsManager.init(function (err, _appServiceClient) {
      if (err) {
        status.funcError = err;
        return callback();
      }
      
      appServiceClient = _appServiceClient;
      appServiceClient.get(function (err, result) {
        if (err) {
          status.funcError = err;
          return callback();
        }

        status.funcActive = result && result.properties && result.properties.state == 'Running' || false;
        console.info('proxy app active: ' + status.funcActive);
        return callback();
      })
    });
  }

  // 1.3. Get HDInsight state from ARM
  function checkHDInsight(callback) {

    console.info('Checking hdinsight');
    hdinsightManager.init(function (err) {

      if (err) {
        status.hdinsightError = err;
        return callback();
      }

      hdinsightManager.checkHDInsight(function (err, result) {

        if (err) {
          if (err.code != 'ResourceNotFound') {
            status.hdinsightError = err;
          } else {
            status.hdinsightStatus = err.code;
          }
          return callback();
        }

        if (result && result.cluster && result.cluster.properties && result.cluster.properties.provisioningState) {
          status.hdinsightProvisioningSuccess = result.cluster.properties.provisioningState == 'Succeeded';
          status.hdinsightProvisioningState = result.cluster.properties.provisioningState;
        } else {
          status.hdinsightError = new Error('The resulting resource is not in an expected format: ' + result);
        }

        if (result && result.cluster && result.cluster.properties && result.cluster.properties.clusterState) {
          status.hdinsightStatus = result.cluster.properties.clusterState;
          status.hdinsightOperational = result.cluster.properties.clusterState == 'Running' && status.hdinsightProvisioningSuccess;
        } else {
          status.hdinsightError = new Error('The resulting resource is not in an expected format: ' + result);
        }

        console.info('hdinsight state: ' + status.hdinsightStatus + ' with provisioning ' + status.hdinsightProvisioningState);
        return callback();
      });

    });
  }

  // 1.4. If alive ==> Get livy jobs
  function checkLivy(callback) {
    var authenticationHeader = 'Basic ' + new Buffer(config.clusterLoginUserName + ':' + config.clusterLoginPassword).toString('base64');
    var options = {
      uri: 'https://' + config.clusterName + '.azurehdinsight.net/livy/batches',
      method: 'GET',
      headers: { "Authorization": authenticationHeader },
      json: { }
    };

    console.info('Checking livy state');
    request(options, function (err, response, body) {

      if (err || !response || response.statusCode != 200) {
        
        if (err.code != 'ENOTFOUND') {
          console.error('livy error: ' + err);
          status.livyError = err ? err : new Error (!response ? 'No response received' : 'Status code is not 200');
        } else {
          console.info('livy is not online');
        }
        return callback();
      }

      // Need to check validity and probably filter only running jobs
      status.livyTotalJobs = body && body.sessions && body.sessions.length || 0;
      status.livyRunningJobs = _.where(body && body.sessions || [], { "state": "running" }).length;
      console.info('livy running jobs: ' + status.livyRunningJobs);
      return callback();
    });
  }

  function sendAlert(alert) {

    console.error('ALERT: ' + alert);

    var options = {
      uri: config.sendAlertUrl,
      method: 'POST',
      json: { alert: alert }
    };

    // Currently, not handling problems with alerts
    request(options);
  }

  function getMinutes(diffMs) {
    return Math.round(((diffMs % 86400000) % 3600000) / 60000);
  }
}

function executeContinuously() {
  try {
    console.log('running job...');

    run(function (err) {
      if (err) {
        console.error('There was an error running the job:');
        console.error(err);
      }

      console.info('job iteration ended.');      
    });
  } catch (err) {
      console.error('There was an unexpected error running the job:');
      console.error(err);    
  } finally {
    setTimeout(executeContinuously, RUN_EVERY * 1000);
  }
}

setTimeout(executeContinuously, 100);