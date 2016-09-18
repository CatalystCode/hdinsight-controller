var path = require('path');
var fs = require('fs');

process.on('uncaughtException', handleError);

var config = require('../../../../config');
var continuousRunner = require('../../../../lib/queue-job/continuous');
var log = require('../../../../lib/log');

var webJobName = config.apps.proxy.name;

initLogStartWebJob();

/*
 * Initialize logging if anode is specified and start the web job
 */
function initLogStartWebJob() {
  if (process.env.USE_ANODE_LOGGING !== 'false') {
    log.init({
      domain: process.env.COMPUTERNAME || '',
      instanceId: log.getInstanceId(),
      app: webJobName,
      level: config.log.level,
      transporters: config.log.transporters
    },
      function(err) {
        if (err) return handleError(err);
        console.log('starting %s web job...', webJobName);

        return startContinuousRunner();
      });
  }
  else {
    return startContinuousRunner();
  }
}

/*
 * Initialize the web job runner and start running on the current process
 */
function startContinuousRunner() {
  
  var runnerInstance = new continuousRunner(); 
  return runnerInstance.start(function (err) {
    if (err) return console.error('error running %s, error:', webJobName, err);
    console.info(webJobName, 'worker exited');
  });
}

function handleError(err) {
  console.error((new Date).toUTCString() + ' uncaughtException:', err.message);
  console.error(err.stack);
  process.exit(1);
}