var azure = require('azure-storage');
var async = require('async');
var request = require('request');

var StatusCollector = require('../../../../lib/status-collector');

var RUN_EVERY = 10; // Seconds
var lastInactiveCheck = null;
var MAX_INACTIVE_TIME = 2; // Minutes

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
  var statusCollector = new StatusCollector(config);
  var hdinsightManager = statusCollector.hdinsightManager;

  statusCollector.collect(function (err, status) {

    if (err) { return sendAlert({ error: error }); }
    if (status.queueError) { return sendAlert({ error: status.queueError }); }
    if (status.funcError) { return sendAlert({ error: status.funcError }); }
    if (status.hdinsightError) { return sendAlert({ error: status.hdinsightError }); }
    if (status.livyError) { return sendAlert({ error: status.livyError }); }

    var appServiceClient = statusCollector.appServiceClient;

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
      } else {
        return callback();        
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
      } else {
        return callback();        
      }
    }    
  });

  return callback();
  
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